'use strict';
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const TOKEN_PATH = path.join(__dirname, '..', 'calendar-token.json');
const REDIRECT_URI = 'http://localhost:3001/api/calendar/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// ---------------------------------------------------------------------------
// Timezone helpers (no external packages — Intl API only)
// ---------------------------------------------------------------------------

/**
 * Get a UTC Date object for a specific local clock hour on a given date string.
 * Example: localHourToUtc('2026-03-09', 8, 'America/New_York') => Date at 13:00 UTC
 */
function localHourToUtc(dateStr, hour, tz) {
  // 1. Probe: assume the desired hour is at that UTC position
  const probe = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`);
  // 2. Format the probe in target tz to see what local hour it actually represents
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(probe);
  const localHour = parseInt(parts.find((p) => p.type === 'hour').value, 10);
  const effectiveLocalHour = localHour === 24 ? 0 : localHour;
  // 3. Adjust: shift probe by the difference between wanted and actual local hour
  const adjustMs = (hour - effectiveLocalHour) * 3600000;
  return new Date(probe.getTime() + adjustMs);
}

/**
 * Format a UTC Date as a local ISO string (YYYY-MM-DDTHH:MM:SS) in the given timezone.
 */
function utcToLocalIso(date, tz) {
  return date.toLocaleString('sv-SE', { timeZone: tz }).replace(' ', 'T');
}

/**
 * Get the UTC day-of-week for a date string (avoids local machine timezone).
 * Returns 0 (Sun) through 6 (Sat).
 */
function getUtcDayOfWeek(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/**
 * Advance a YYYY-MM-DD date string by n days.
 */
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Internal: merge overlapping busy intervals
// ---------------------------------------------------------------------------

/**
 * Sort and merge overlapping/adjacent busy intervals.
 * Input: Array of { start: Date, end: Date }
 * Output: Array of { start: Date, end: Date } (non-overlapping, sorted)
 */
function _mergeBusy(periods) {
  if (!periods.length) return [];
  periods.sort((a, b) => a.start - b.start);
  const merged = [{ start: periods[0].start, end: periods[0].end }];
  for (let i = 1; i < periods.length; i++) {
    const cur = merged[merged.length - 1];
    const next = periods[i];
    if (next.start <= cur.end) {
      cur.end = cur.end > next.end ? cur.end : next.end;
    } else {
      merged.push({ start: next.start, end: next.end });
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// OAuth2 helpers
// ---------------------------------------------------------------------------

/**
 * Create and return a new OAuth2 client using env credentials.
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Generate the Google OAuth consent screen URL.
 */
function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchange an authorization code for OAuth tokens.
 * Returns the full token object.
 */
async function getTokenFromCode(oauth2Client, code) {
  const { tokens } = await oauth2Client.getToken(code);
  return { tokens };
}

// ---------------------------------------------------------------------------
// Calendar API helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the authenticated user's calendar timezone setting.
 * Falls back to 'America/New_York' on any error.
 */
async function getTimezone(oauth2Client) {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendar.settings.get({ setting: 'timezone' });
    return res.data.value;
  } catch {
    return 'America/New_York';
  }
}

/**
 * Query Google Calendar freebusy for the given calendar IDs and time window.
 * Returns the `calendars` map from the API response.
 */
async function getFreeBusy(oauth2Client, { calendarIds, timeMin, timeMax }) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    },
  });
  return res.data.calendars;
}

// ---------------------------------------------------------------------------
// Slot algorithm — ported from google_calendar.py find_available_slots()
// ---------------------------------------------------------------------------

/**
 * Find available calendar slots given freebusy data.
 *
 * @param {object} params
 * @param {object} params.freeBusyByCalendar - Google Calendar freebusy API `calendars` map
 * @param {number} params.durationMinutes    - Slot duration in minutes
 * @param {Date}   params.timeMin            - Search window start (UTC)
 * @param {Date}   params.timeMax            - Search window end (UTC)
 * @param {string} params.timezone           - IANA timezone string (e.g. 'America/New_York')
 * @param {number} [params.slotIncrement]    - Slot stride in minutes (defaults to durationMinutes)
 * @returns {{ slots: Array, errors: object }}
 */
function findAvailableSlots({
  freeBusyByCalendar,
  durationMinutes,
  timeMin,
  timeMax,
  timezone,
  slotIncrement,
}) {
  const tz = timezone || 'America/New_York';
  const stride = slotIncrement || durationMinutes;
  const durationMs = durationMinutes * 60 * 1000;
  const strideMs = stride * 60 * 1000;
  const startHour = 8;
  const endHour = 18;

  // Step 1: collect all busy intervals and errors from all calendars
  const allBusy = [];
  const errors = {};

  for (const [calId, calData] of Object.entries(freeBusyByCalendar)) {
    const calErrors = calData.errors || [];
    if (calErrors.length > 0) {
      errors[calId] = calErrors;
    }
    for (const period of calData.busy || []) {
      allBusy.push({
        start: new Date(period.start),
        end: new Date(period.end),
      });
    }
  }

  // Step 2: merge overlapping busy intervals globally
  const mergedBusy = _mergeBusy(allBusy);

  // Step 3: iterate over each date in the [timeMin, timeMax) window.
  // timeMax is an exclusive upper bound — match Python semantics where end_date is derived
  // from local timezone conversion of time_max, keeping dates within the requested range.
  const slots = [];
  let curDate = timeMin.toISOString().split('T')[0];
  const endDate = timeMax.toISOString().split('T')[0];

  while (curDate < endDate) {
    // Skip weekends (UTC-based day-of-week to avoid machine timezone issues)
    const dow = getUtcDayOfWeek(curDate);
    if (dow === 0 || dow === 6) {
      curDate = addDays(curDate, 1);
      continue;
    }

    // Compute 8am and 6pm in the user's timezone for this date (as UTC instants)
    const dayStartUtc = localHourToUtc(curDate, startHour, tz);
    const dayEndUtc = localHourToUtc(curDate, endHour, tz);

    // Step 4: clip merged busy intervals to this day's working window
    const dayBusy = [];
    for (const { start, end } of mergedBusy) {
      if (start >= dayEndUtc || end <= dayStartUtc) continue;
      dayBusy.push({
        start: start < dayStartUtc ? dayStartUtc : start,
        end: end > dayEndUtc ? dayEndUtc : end,
      });
    }

    // Step 5: compute free periods (complement of busy within the window)
    const freePeriods = [];
    let cursor = dayStartUtc;
    for (const { start: busyStart, end: busyEnd } of dayBusy) {
      if (busyStart > cursor) {
        freePeriods.push({ start: cursor, end: busyStart });
      }
      if (busyEnd > cursor) cursor = busyEnd;
    }
    if (cursor < dayEndUtc) {
      freePeriods.push({ start: cursor, end: dayEndUtc });
    }

    // Step 6: walk each free period, emitting slots at stride intervals
    for (const { start: freeStart, end: freeEnd } of freePeriods) {
      let slotStart = freeStart;
      while (slotStart.getTime() + durationMs <= freeEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          start_local: utcToLocalIso(slotStart, tz),
          end_local: utcToLocalIso(slotEnd, tz),
          date: curDate,
        });
        slotStart = new Date(slotStart.getTime() + strideMs);
      }
    }

    curDate = addDays(curDate, 1);
  }

  return { slots, errors };
}

// ---------------------------------------------------------------------------
// Event creation
// ---------------------------------------------------------------------------

/**
 * Create a Google Calendar event on the primary calendar.
 *
 * @param {object} oauth2Client  - Authorized OAuth2 client
 * @param {object} params
 * @param {string} params.title       - Event summary/title
 * @param {string} params.start       - ISO 8601 start datetime string
 * @param {string} params.end         - ISO 8601 end datetime string
 * @param {string[]} params.attendees - Array of email strings (may include empty strings)
 * @param {string} params.description - Event description
 * @returns {Promise<object>} The created event resource
 */
async function createEvent(oauth2Client, { title, start, end, attendees, description }) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const res = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: title,
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: attendees
        .filter((e) => e && e.trim())
        .map((email) => ({ email: email.trim() })),
      description: description || '',
      reminders: { useDefault: true },
    },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  getOAuth2Client,
  getAuthUrl,
  getTokenFromCode,
  getTimezone,
  getFreeBusy,
  findAvailableSlots,
  createEvent,
};

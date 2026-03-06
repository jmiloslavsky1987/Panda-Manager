'use strict';
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const asyncWrapper = require('../middleware/asyncWrapper');
const calendarService = require('../services/calendarService');

const TOKEN_PATH = path.join(__dirname, '..', 'calendar-token.json');

// ---------------------------------------------------------------------------
// Auth middleware — checks for a valid persisted token before protected routes
// ---------------------------------------------------------------------------

function requireCalendarAuth(req, res, next) {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return res.status(401).json({ error: 'calendar_not_authorized' });
    }
    const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
    const token = JSON.parse(raw);
    if (!token || !token.access_token) {
      return res.status(401).json({ error: 'calendar_not_authorized' });
    }
    req.calendarToken = token;
    next();
  } catch {
    return res.status(401).json({ error: 'calendar_not_authorized' });
  }
}

// ---------------------------------------------------------------------------
// Helper: build oauth2Client with persisted credentials and auto-refresh handler
// ---------------------------------------------------------------------------

function buildAuthorizedClient(token) {
  const oauth2Client = calendarService.getOAuth2Client();
  oauth2Client.setCredentials(token);
  // Persist refreshed tokens automatically so they survive across restarts
  oauth2Client.on('tokens', (newTokens) => {
    try {
      const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...newTokens }));
    } catch {
      /* ignore — token persistence is best-effort */
    }
  });
  return oauth2Client;
}

// ---------------------------------------------------------------------------
// GET /api/calendar/status
// Returns { authorized: true/false } — no auth required
// ---------------------------------------------------------------------------

router.get(
  '/status',
  asyncWrapper(async (req, res) => {
    try {
      if (!fs.existsSync(TOKEN_PATH)) {
        return res.json({ authorized: false });
      }
      const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
      const token = JSON.parse(raw);
      return res.json({ authorized: !!(token && token.access_token) });
    } catch {
      return res.json({ authorized: false });
    }
  })
);

// ---------------------------------------------------------------------------
// GET /api/calendar/auth
// Redirects the browser to the Google OAuth consent screen
// ---------------------------------------------------------------------------

router.get('/auth', (req, res) => {
  const oauth2Client = calendarService.getOAuth2Client();
  const authUrl = calendarService.getAuthUrl(oauth2Client);
  res.redirect(authUrl);
});

// ---------------------------------------------------------------------------
// GET /api/calendar/callback
// Handles OAuth2 redirect, exchanges code for tokens, saves to disk, redirects home
// ---------------------------------------------------------------------------

router.get(
  '/callback',
  asyncWrapper(async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    const oauth2Client = calendarService.getOAuth2Client();
    const { tokens } = await calendarService.getTokenFromCode(oauth2Client, code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.redirect('/');
  })
);

// ---------------------------------------------------------------------------
// POST /api/calendar/availability
// Returns available time slots for a set of calendar IDs
// Requires: calendarIds (string[]), durationMinutes (number)
// Optional: weeksAhead (number, default 2), slotIncrement (number)
// ---------------------------------------------------------------------------

router.post(
  '/availability',
  requireCalendarAuth,
  asyncWrapper(async (req, res) => {
    const { calendarIds, durationMinutes, weeksAhead, slotIncrement } = req.body;

    if (!Array.isArray(calendarIds) || calendarIds.length < 1 || !durationMinutes) {
      return res
        .status(400)
        .json({ error: 'calendarIds (non-empty array) and durationMinutes are required' });
    }

    const oauth2Client = buildAuthorizedClient(req.calendarToken);
    const timezone = await calendarService.getTimezone(oauth2Client);

    const timeMin = new Date();
    const timeMax = new Date(Date.now() + (weeksAhead ?? 2) * 7 * 86400000);

    const freeBusyByCalendar = await calendarService.getFreeBusy(oauth2Client, {
      calendarIds,
      timeMin,
      timeMax,
    });

    const { slots, errors } = calendarService.findAvailableSlots({
      freeBusyByCalendar,
      durationMinutes,
      timeMin,
      timeMax,
      timezone,
      slotIncrement,
    });

    res.json({ slots, errors, timezone });
  })
);

// ---------------------------------------------------------------------------
// POST /api/calendar/events
// Books a calendar event for a given slot
// Requires: slot ({ start, end }), title (string), attendees (string[])
// Optional: description (string)
// ---------------------------------------------------------------------------

router.post(
  '/events',
  requireCalendarAuth,
  asyncWrapper(async (req, res) => {
    const { slot, title, attendees, description } = req.body;

    if (!slot?.start || !slot?.end || !title || !Array.isArray(attendees)) {
      return res
        .status(400)
        .json({ error: 'slot (with start and end), title, and attendees (array) are required' });
    }

    const oauth2Client = buildAuthorizedClient(req.calendarToken);

    const event = await calendarService.createEvent(oauth2Client, {
      title,
      start: slot.start,
      end: slot.end,
      attendees,
      description: description ?? '',
    });

    res.json({ event });
  })
);

module.exports = router;

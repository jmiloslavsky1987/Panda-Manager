'use strict';
const { describe, it, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'calendar-token.json');
const TEST_TOKEN = { access_token: 'test-access', token_type: 'Bearer' };

// ---------------------------------------------------------------------------
// Mock calendarService BEFORE requiring app (module-level mock injection)
// ---------------------------------------------------------------------------

const mockFindAvailableSlots = mock.fn(() => ({ slots: [], errors: {} }));
const mockGetTimezone = mock.fn(() => Promise.resolve('America/New_York'));
const mockGetFreeBusy = mock.fn(() => Promise.resolve({}));
const mockCreateEvent = mock.fn(() =>
  Promise.resolve({ id: 'evt-1', summary: 'Test Session', htmlLink: 'https://calendar.google.com/event?eid=1' })
);
const mockOAuth2Client = {
  setCredentials: () => {},
  on: () => {},
  generateAuthUrl: () => 'https://accounts.google.com/o/oauth2/auth?mock=1',
  getToken: () => Promise.resolve({ tokens: TEST_TOKEN }),
};

before(() => {
  // Ensure no real token file exists at test start
  try { fs.unlinkSync(TOKEN_PATH); } catch { /* ignore */ }

  require.cache[require.resolve('../services/calendarService')] = {
    id: require.resolve('../services/calendarService'),
    filename: require.resolve('../services/calendarService'),
    loaded: true,
    exports: {
      getOAuth2Client: mock.fn(() => mockOAuth2Client),
      getAuthUrl: mock.fn(() => 'https://accounts.google.com/o/oauth2/auth?mock=1'),
      getTokenFromCode: mock.fn(() => Promise.resolve({ tokens: TEST_TOKEN })),
      getTimezone: mockGetTimezone,
      getFreeBusy: mockGetFreeBusy,
      findAvailableSlots: mockFindAvailableSlots,
      createEvent: mockCreateEvent,
    },
  };
});

let request;
before(async () => {
  const supertest = require('supertest');
  const app = require('../index');
  request = supertest(app);
});

// ---------------------------------------------------------------------------
// GET /api/calendar/status — no auth required
// ---------------------------------------------------------------------------

describe('GET /api/calendar/status', () => {
  it('returns 200 { authorized: false } when no token file on disk', async () => {
    // Ensure token file absent
    try { fs.unlinkSync(TOKEN_PATH); } catch { /* ignore */ }

    const res = await request.get('/api/calendar/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.authorized, false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/calendar/auth — redirects to Google OAuth
// ---------------------------------------------------------------------------

describe('GET /api/calendar/auth', () => {
  it('redirects to Google OAuth URL', async () => {
    const res = await request.get('/api/calendar/auth');
    assert.ok(res.status === 302 || res.status === 301);
    assert.ok(res.headers.location.includes('accounts.google.com'));
  });
});

// ---------------------------------------------------------------------------
// POST /api/calendar/availability — unauthenticated (no token file)
// ---------------------------------------------------------------------------

describe('POST /api/calendar/availability (unauthorized)', () => {
  it('returns 401 { error: calendar_not_authorized } when no token', async () => {
    try { fs.unlinkSync(TOKEN_PATH); } catch { /* ignore */ }

    const res = await request
      .post('/api/calendar/availability')
      .send({ calendarIds: ['user@example.com'], durationMinutes: 60 })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'calendar_not_authorized');
  });

  it('returns 400 when calendarIds is missing (even if authorized)', async () => {
    // Write a valid token file so requireCalendarAuth passes, then send invalid body
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(TEST_TOKEN));
    const res = await request
      .post('/api/calendar/availability')
      .send({ durationMinutes: 60 })
      .set('Content-Type', 'application/json');
    fs.unlinkSync(TOKEN_PATH);
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/calendar/events — unauthenticated (no token file)
// ---------------------------------------------------------------------------

describe('POST /api/calendar/events (unauthorized)', () => {
  it('returns 401 { error: calendar_not_authorized } when no token', async () => {
    try { fs.unlinkSync(TOKEN_PATH); } catch { /* ignore */ }

    const res = await request
      .post('/api/calendar/events')
      .send({ slot: { start: '2026-01-01T10:00:00Z', end: '2026-01-01T11:00:00Z' }, title: 'Test', attendees: [] })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'calendar_not_authorized');
  });
});

// ---------------------------------------------------------------------------
// POST /api/calendar/availability — authorized (token file present)
// ---------------------------------------------------------------------------

describe('POST /api/calendar/availability (authorized)', () => {
  before(() => { fs.writeFileSync(TOKEN_PATH, JSON.stringify(TEST_TOKEN)); });
  after(() => { try { fs.unlinkSync(TOKEN_PATH); } catch { /* ignore */ } });

  it('returns 200 with slots, errors, timezone', async () => {
    const res = await request
      .post('/api/calendar/availability')
      .send({ calendarIds: ['user@example.com'], durationMinutes: 60, weeksAhead: 2 })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.slots));
    assert.ok('errors' in res.body);
    assert.ok('timezone' in res.body);
  });
});

// ---------------------------------------------------------------------------
// POST /api/calendar/events — authorized (token file present)
// ---------------------------------------------------------------------------

describe('POST /api/calendar/events (authorized)', () => {
  before(() => { fs.writeFileSync(TOKEN_PATH, JSON.stringify(TEST_TOKEN)); });
  after(() => { try { fs.unlinkSync(TOKEN_PATH); } catch { /* ignore */ } });

  it('returns 200 with { event } object', async () => {
    const res = await request
      .post('/api/calendar/events')
      .send({
        slot: { start: '2026-01-01T10:00:00Z', end: '2026-01-01T11:00:00Z' },
        title: 'Test Session',
        attendees: ['user@example.com'],
        description: 'Phase 8 test',
      })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.ok('event' in res.body);
    assert.equal(res.body.event.id, 'evt-1');
  });
});

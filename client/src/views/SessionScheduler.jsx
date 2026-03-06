import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCalendarStatus } from '../api';

export default function SessionScheduler() {
  const { customer } = useOutletContext();
  const { customerId } = useParams();

  const { data: calStatus, isPending: isCheckingAuth } = useQuery({
    queryKey: ['calendarStatus'],
    queryFn: getCalendarStatus,
    retry: false,
    staleTime: 30_000,
  });

  const isAuthorized = calStatus?.authorized === true;

  // Pre-fill attendees from customer YAML contact data
  const contactEmail = customer?.customer?.email ?? '';
  const contactName  = customer?.customer?.contact ?? '';

  if (isCheckingAuth) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <ConnectCalendarCard />;
  }

  return <SchedulerForm customerId={customerId} contactEmail={contactEmail} contactName={contactName} />;
}

function ConnectCalendarCard() {
  return (
    <div className="p-6 flex items-center justify-center">
      <div className="bg-white border border-teal-200 rounded-lg p-8 max-w-md w-full text-center shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Google Calendar</h2>
        <p className="text-sm text-gray-500 mb-6">
          To find availability and schedule sessions, connect your Google Calendar account.
          This is a one-time setup — you won't need to reconnect.
        </p>
        <a
          href="/api/calendar/auth"
          className="inline-block px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors"
        >
          Connect Google Calendar
        </a>
      </div>
    </div>
  );
}

function SchedulerForm({ customerId, contactEmail, contactName }) {
  const [attendees, setAttendees] = React.useState(
    contactEmail ? [contactEmail] : []
  );
  const [newAttendee, setNewAttendee] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState(60);
  const [weeksAhead, setWeeksAhead] = React.useState(2);

  function addAttendee() {
    const email = newAttendee.trim();
    if (email && !attendees.includes(email)) {
      setAttendees(prev => [...prev, email]);
    }
    setNewAttendee('');
  }

  function removeAttendee(email) {
    setAttendees(prev => prev.filter(a => a !== email));
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Session Scheduler</h2>
        {contactName && (
          <p className="text-sm text-gray-500">Customer contact: {contactName}</p>
        )}
      </div>

      {/* Attendees section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Attendees</h3>
        <ul className="flex flex-col gap-1">
          {attendees.map(email => (
            <li key={email} className="flex items-center justify-between text-sm">
              <span className="text-gray-800">{email}</span>
              <button
                onClick={() => removeAttendee(email)}
                className="text-xs text-red-500 hover:text-red-700 ml-2"
              >
                Remove
              </button>
            </li>
          ))}
          {attendees.length === 0 && (
            <li className="text-sm text-gray-400">No attendees added yet.</li>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Add attendee email"
            value={newAttendee}
            onChange={e => setNewAttendee(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAttendee()}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
          />
          <button
            onClick={addAttendee}
            disabled={!newAttendee.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Duration + Weeks selectors */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Duration</label>
          <select
            value={durationMinutes}
            onChange={e => setDurationMinutes(Number(e.target.value))}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-teal-400"
          >
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>120 min</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Look ahead</label>
          <select
            value={weeksAhead}
            onChange={e => setWeeksAhead(Number(e.target.value))}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-teal-400"
          >
            <option value={1}>1 week</option>
            <option value={2}>2 weeks</option>
            <option value={3}>3 weeks</option>
            <option value={4}>4 weeks</option>
          </select>
        </div>
      </div>

      {/* Find slots button — wired in Plan 03 */}
      <div>
        <button
          disabled={attendees.length === 0}
          className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
        >
          Find Available Slots
        </button>
        {attendees.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">Add at least one attendee to search.</p>
        )}
      </div>

      {/* Slot results placeholder — replaced in Plan 03 */}
      <div className="text-sm text-gray-400">
        Select duration and look-ahead window, then click Find Available Slots.
      </div>
    </div>
  );
}

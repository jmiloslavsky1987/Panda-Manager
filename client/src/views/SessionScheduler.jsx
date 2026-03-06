import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCalendarStatus, getCalendarAvailability, postCalendarEvent, postArtifact } from '../api';

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

  return <SchedulerForm customerId={customerId} contactEmail={contactEmail} contactName={contactName} customer={customer} />;
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

function formatTime(isoLocal) {
  // isoLocal is "YYYY-MM-DDTHH:MM:SS" — extract time part
  const timePart = isoLocal.split('T')[1] ?? '';
  const [h, m] = timePart.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  // dateStr = "YYYY-MM-DD" — format as "Mon Mar 9"
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const SLOT_CLASSES = {
  selected: 'border-2 border-teal-500 bg-teal-50 text-teal-700',
  normal:   'border border-gray-200 bg-white hover:border-teal-300 text-gray-700',
};

function SchedulerForm({ customerId, contactEmail, contactName, customer }) {
  const [attendees, setAttendees] = React.useState(
    contactEmail ? [contactEmail] : []
  );
  const [newAttendee, setNewAttendee] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState(60);
  const [weeksAhead, setWeeksAhead] = React.useState(2);

  const [slots, setSlots] = React.useState([]);
  const [errors, setErrors] = React.useState({});
  const [timezone, setTimezone] = React.useState('');
  const [selectedSlot, setSelectedSlot] = React.useState(null);
  const [eventTitle, setEventTitle] = React.useState('');
  const [successEvent, setSuccessEvent] = React.useState(null);

  const queryClient = useQueryClient();

  const availMutation = useMutation({
    mutationFn: () => getCalendarAvailability({
      calendarIds: attendees,
      durationMinutes,
      weeksAhead,
    }),
    onSuccess: (data) => {
      setSlots(data.slots ?? []);
      setErrors(data.errors ?? {});
      setTimezone(data.timezone ?? '');
      setSelectedSlot(null);
      setSuccessEvent(null);
    },
  });

  const eventMutation = useMutation({
    mutationFn: () => postCalendarEvent({
      slot: selectedSlot,
      title: eventTitle,
      attendees,
      description: `Session for ${customer?.customer?.name ?? 'customer'}. Attendees: ${attendees.join(', ')}`,
    }),
    onSuccess: async (data) => {
      setSuccessEvent(data.event);
      // Save session as artifact in customer YAML
      await postArtifact(customerId, {
        type: 'session',
        title: eventTitle,
        description: `Attendees: ${attendees.join(', ')}`,
        status: 'active',
        owner: '',
        date: selectedSlot.date,
      });
      // Invalidate customer query so ArtifactManager reflects new session
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setSelectedSlot(null);
      setSlots([]);
      setEventTitle('');
    },
  });

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

  const slotsByDate = slots.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

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

      {/* Find slots button */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => availMutation.mutate()}
          disabled={attendees.length === 0 || availMutation.isPending}
          className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
        >
          {availMutation.isPending ? 'Searching...' : 'Find Available Slots'}
        </button>
        {attendees.length === 0 && (
          <p className="text-xs text-gray-400">Add at least one attendee to search.</p>
        )}

        {/* Calendar errors inline */}
        {Object.keys(errors).length > 0 && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
            <p className="font-medium mb-1">Some calendars were inaccessible:</p>
            <ul className="list-disc list-inside">
              {Object.entries(errors).map(([calId, err]) => (
                <li key={calId}>{calId}: {Array.isArray(err) ? err.map(e => e.reason || e).join(', ') : String(err)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* API error state */}
        {availMutation.isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            Failed to fetch availability: {availMutation.error?.message}
          </div>
        )}
      </div>

      {/* Slot results */}
      {availMutation.isSuccess && slots.length === 0 && (
        <p className="text-sm text-gray-500">
          No available slots found in the selected window. Try extending the look-ahead period or adjusting attendees.
        </p>
      )}

      {slots.length > 0 && (
        <div className="flex flex-col gap-4">
          {timezone && (
            <p className="text-xs text-gray-400">Times shown in {timezone}</p>
          )}
          {Object.entries(slotsByDate).map(([date, dateSlots]) => (
            <div key={date} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{formatDate(date)}</h4>
              <div className="flex flex-wrap gap-2">
                {dateSlots.map((s, i) => {
                  const isSelected = selectedSlot === s;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(s)}
                      className={`px-3 py-1.5 text-xs rounded cursor-pointer transition-colors ${SLOT_CLASSES[isSelected ? 'selected' : 'normal']}`}
                    >
                      {formatTime(s.start_local)} – {formatTime(s.end_local)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create event panel — shown when a slot is selected */}
      {selectedSlot && !successEvent && (
        <div className="bg-white border border-teal-200 rounded-lg p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-700">Create Event</h3>
          <p className="text-sm text-gray-600">
            {formatDate(selectedSlot.date)} — {formatTime(selectedSlot.start_local)} to {formatTime(selectedSlot.end_local)}
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Event title</label>
            <input
              type="text"
              placeholder="e.g. BigPanda Implementation Session"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => eventMutation.mutate()}
              disabled={!eventTitle.trim() || eventMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
            >
              {eventMutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
            <button
              onClick={() => setSelectedSlot(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          {eventMutation.isError && (
            <p className="text-xs text-red-600">
              Failed to create event: {eventMutation.error?.message}
            </p>
          )}
        </div>
      )}

      {/* Success state */}
      {successEvent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">Session scheduled successfully.</p>
          <p className="text-xs text-green-600 mt-1">
            Event created in Google Calendar.
            Session saved as artifact in customer YAML.
          </p>
          {successEvent.htmlLink && (
            <a
              href={successEvent.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 hover:text-teal-800 underline mt-2 inline-block"
            >
              View in Google Calendar
            </a>
          )}
          <button
            onClick={() => { setSuccessEvent(null); setSlots([]); }}
            className="mt-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 block"
          >
            Schedule Another
          </button>
        </div>
      )}
    </div>
  );
}

import TimeTrackingSettings from '@/components/TimeTrackingSettings';

export default function TimeTrackingSettingsPage() {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Time Tracking Settings</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Configure global time tracking behavior, capacity limits, categories, and submission rules.
      </p>
      <TimeTrackingSettings />
    </div>
  );
}

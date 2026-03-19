import type { ActivityItem } from '@/lib/queries';

interface ActivityFeedProps {
  items: ActivityItem[];
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 2) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const displayItems = items.slice(0, 20);

  return (
    <div data-testid="activity-feed" className="flex flex-col gap-2">
      {displayItems.length === 0 ? (
        <p className="text-zinc-400 text-sm italic">No recent activity in the last 7 days.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {displayItems.map((item, index) => (
            <li key={index} className="flex items-start gap-3 py-2">
              <span className="text-base leading-none mt-0.5" aria-hidden="true">
                {item.type === 'output' ? '⚡' : '📝'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 truncate">{item.label}</p>
              </div>
              <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">
                {formatRelativeDate(item.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

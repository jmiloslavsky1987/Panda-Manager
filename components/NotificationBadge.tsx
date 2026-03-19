import { Badge } from '@/components/ui/badge';

interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <span data-testid="notification-badge">
      <Badge variant="destructive" className="rounded-full min-w-[1.5rem] text-center">
        {count}
      </Badge>
    </span>
  );
}

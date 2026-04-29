'use client';
import { useSession, signOut } from '@/lib/auth-client';
import { Icon } from './Icon';
import { useRouter } from 'next/navigation';

export function SidebarUserIsland() {
  const { data: session } = useSession();
  const router = useRouter();
  const name = session?.user?.name ?? '...';

  return (
    <div
      className="px-4 py-3 border-t flex items-center justify-between shrink-0"
      style={{ borderColor: 'var(--kata-gray-800)' }}
    >
      <span className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {name}
      </span>
      <button
        onClick={() =>
          signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })
        }
        className="transition-colors"
        style={{ color: 'rgba(255,255,255,0.4)' }}
        title="Log out"
      >
        <Icon name="logout" size={16} />
      </button>
    </div>
  );
}

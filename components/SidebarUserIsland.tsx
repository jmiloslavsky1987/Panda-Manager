'use client';
import { useSession, signOut } from '@/lib/auth-client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SidebarUserIsland() {
  const { data: session } = useSession();
  const router = useRouter();
  const name = session?.user?.name ?? '...';

  return (
    <div className="px-4 py-3 border-t border-zinc-700 flex items-center justify-between shrink-0">
      <span className="text-sm text-zinc-300 truncate">{name}</span>
      <button
        onClick={() =>
          signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })
        }
        className="text-zinc-400 hover:text-zinc-100 transition-colors"
        title="Log out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import { UserRole } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';

interface AppLayoutProps {
  children: React.ReactNode;
  /** If provided, renders this button in the header right area (e.g. "+ New Ticket") */
  headerAction?: React.ReactNode;
}

export default function AppLayout({ children, headerAction }: AppLayoutProps) {
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  const navLinkClass = (path: string) =>
    `inline-flex items-center gap-[6px] px-4 py-[8px] rounded-lg font-mono text-xs uppercase tracking-wider cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap border ${
      pathname === path
        ? 'bg-accent-theme/15 text-accent-theme border-accent-theme/40 shadow-glow font-bold'
        : 'bg-transparent text-text-secondary border-border-color/60 hover:bg-bg-hover hover:text-text-primary hover:border-accent-theme/30'
    }`;

  return (
    <>
      <header className="bg-bg-secondary/80 border-b border-border-color/50 backdrop-blur-[20px] sticky top-0 z-[100] shadow-md">
        <div className="max-w-[1200px] mx-auto py-3 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[1.6rem] filter drop-shadow-[0_0_8px_var(--accent-theme-glow)]">🎫</span>
            <Link
              to="/"
              className="text-[1.3rem] font-bold font-heading bg-gradient-to-r from-accent-theme to-[#6c63ff] bg-clip-text text-transparent tracking-widest hover:opacity-90 transition-opacity uppercase"
            >
              Helpdesk
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary pr-3 border-r border-border-color/60 tracking-wider">
              Welcome, {session?.user.name}
            </span>

            {/* Tickets nav link — visible to all */}
            <Link to="/tickets" className={`${navLinkClass('/tickets')} before:content-['//'] before:mr-1 before:opacity-50`}>
              Tickets
            </Link>

            {/* Users nav link — admins only */}
            {session?.user.role === UserRole.ADMIN && (
              <Link to="/users" className={`${navLinkClass('/users')} before:content-['//'] before:mr-1 before:opacity-50`}>
                Users
              </Link>
            )}

            {/* Optional page-specific action button */}
            {headerAction}

            {/* Theme Toggle Button */}
            <ThemeToggle />

            <button
              className="inline-flex items-center gap-[6px] px-4 py-[8px] rounded-lg font-mono text-xs uppercase tracking-wider cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap bg-transparent text-text-secondary border border-border-color/60 hover:bg-bg-hover hover:text-text-primary hover:border-danger/40 hover:text-danger"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto py-8 px-6 min-h-[calc(100vh-65px)] bg-bg-primary">{children}</main>
    </>
  );
}


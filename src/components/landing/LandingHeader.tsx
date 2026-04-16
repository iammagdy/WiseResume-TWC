import { Link, useNavigate } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  LayoutDashboard, Settings, LogOut, Sun, Moon, Menu, Tag, Zap, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import triggerHaptic from '@/lib/haptics';
import { LandingToggle } from '@/components/landing/LandingToggle';

interface LandingHeaderProps {
  mode: 'jobseeker' | 'wisehire';
  isDark: boolean;
  scrolled: boolean;
  themeLogo: string;
  profile: { fullName: string | null; avatarUrl: string | null } | null;
  user: { id: string; email: string } | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  prefersReducedMotion: boolean | null;
  onModeChange: (m: 'jobseeker' | 'wisehire', origin: { x: number; y: number }) => void;
  onThemeToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenWaitlist: () => void;
  onSignOut: () => Promise<void>;
}

export function LandingHeader({
  mode, isDark, scrolled, themeLogo, profile, user,
  isAuthenticated, authLoading, prefersReducedMotion,
  onModeChange, onThemeToggle, onOpenWaitlist, onSignOut,
}: LandingHeaderProps) {
  const navigate = useNavigate();
  const { login: kindeLogin } = useKindeAuth();

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
    }
    if (user?.email) return user.email[0].toUpperCase();
    return null;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 relative ${scrolled ? 'lp-header-scrolled' : 'bg-transparent'}`}
      style={{ transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease', paddingTop: 'env(safe-area-inset-top)', willChange: 'transform' }}
    >
      {scrolled && <GlassSurface className="absolute inset-0" />}
      <div className="relative z-[1]">
      {/* Product toggle strip — hidden on mobile, sits above the nav row on sm+ */}
      <div className="hidden sm:block">
        <LandingToggle
          uid="hdr"
          mode={mode}
          prefersReducedMotion={prefersReducedMotion}
          onModeChange={onModeChange}
        />
      </div>

      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
        <button
          onClick={() => { triggerHaptic.light(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="flex items-center gap-2.5 touch-manipulation min-w-0"
          aria-label={mode === 'wisehire' ? 'WiseHire – scroll to top' : 'WiseResume – scroll to top'}
        >
          <img
            alt={mode === 'wisehire' ? 'WiseHire' : 'WiseResume'}
            loading="lazy"
            className="w-10 h-10 object-contain rounded-xl"
            src={themeLogo}
            style={{
              filter: mode === 'wisehire' ? 'hue-rotate(220deg) saturate(2) brightness(0.85)' : undefined,
              transition: 'filter 0.35s ease',
            }}
          />
          <span
            className="font-display font-extrabold text-base tracking-tight truncate"
            style={{ color: 'var(--lp-logo-text)', transition: 'color 0.35s ease' }}
          >
            {mode === 'wisehire' ? 'WiseHire' : 'WiseResume'}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {/* Nav links */}
          {mode === 'wisehire' ? (
            <button
              className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lp-text)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lp-text-muted)'; }}
              onClick={() => {
                const el = document.getElementById('wisehire-pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Pricing
            </button>
          ) : (
            <Link
              to="/pricing"
              className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text-muted)'; }}
            >
              Pricing
            </Link>
          )}
          {mode === 'jobseeker' && (
            <Link
              to="/whats-new"
              className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{ color: 'var(--lp-text-muted)', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--lp-text-muted)'; }}
            >
              What's New
            </Link>
          )}

          {/* Mobile hamburger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="sm:hidden lp-theme-toggle" aria-label="Navigation menu">
                <Menu className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {mode === 'wisehire' ? (
                <DropdownMenuItem
                  onClick={() => {
                    const el = document.getElementById('wisehire-pricing');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Pricing
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => navigate('/pricing')}>
                  <Tag className="w-4 h-4 mr-2" />
                  Pricing
                </DropdownMenuItem>
              )}
              {mode === 'jobseeker' && (
                <DropdownMenuItem onClick={() => navigate('/whats-new')}>
                  <Zap className="w-4 h-4 mr-2" />
                  What's New
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <button
            className="lp-theme-toggle"
            onClick={onThemeToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {authLoading ? (
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--lp-border-card)' }} />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="touch-manipulation active:scale-95 transition-transform" aria-label="Account menu">
                  <Avatar className="h-8 w-8" style={{ border: '1px solid var(--lp-border-card)' }}>
                    <AvatarImage src={profile?.avatarUrl ?? undefined} />
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{
                        background: mode === 'wisehire' ? 'rgba(29,78,216,0.15)' : 'rgba(158,27,34,0.15)',
                        color: mode === 'wisehire' ? '#3B82F6' : '#E53E3E',
                      }}
                    >
                      {getInitials() ?? <User className="w-3.5 h-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { triggerHaptic.light(); navigate('/settings'); }}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => { triggerHaptic.medium(); await onSignOut(); navigate('/'); }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : mode === 'jobseeker' ? (
            <button
              onClick={() => {
                triggerHaptic.light();
                void Promise.resolve(kindeLogin()).catch(() => {
                  toast.error('Unable to sign in. Please try again or contact support.');
                });
              }}
              className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0"
              style={{
                color: 'var(--lp-signin-color)',
                background: 'var(--lp-signin-bg)',
                border: '1px solid var(--lp-signin-border)',
              }}
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={onOpenWaitlist}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0"
              style={{
                color: '#fff',
                background: '#1D4ED8',
                border: '1px solid #1D4ED8',
              }}
            >
              Join Waitlist
            </button>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useT } from '@/lib/useT';

const STEP_PATHS = ['/', '/draft', '/xi', '/simulate'];

function currentStepIndex(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/draft')) return 1;
  if (pathname.startsWith('/xi')) return 2;
  return 3;
}

export default function Nav() {
  const pathname = usePathname();
  const { formation, pickedPlayers, simulatedSeason, theme, setTheme, language, setLanguage } = useGameStore();
  const t = useT();
  const currentStep = currentStepIndex(pathname);

  const stepReachable = [
    true,
    !!formation,
    pickedPlayers.length >= 11,
    !!simulatedSeason,
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      {/* Belgian stripe */}
      <div className="flex h-[3px]">
        <div className="flex-1" style={{ background: '#1A1A1A' }} />
        <div className="flex-1" style={{ background: 'var(--gold)' }} />
        <div className="flex-1" style={{ background: 'var(--red)' }} />
      </div>

      {/* Nav bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6"
        style={{
          background: 'rgba(7,7,10,0.88)',
          borderBottom: '1px solid var(--border)',
          height: 52,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            letterSpacing: '0.1em',
            color: 'var(--gold)',
          }}>
            PINTJES<span style={{ color: 'var(--text)' }}>LIGA</span>
          </span>
        </Link>

        {/* Step progress — center */}
        <nav className="flex items-center">
          {t.nav.steps.map((label, i) => {
            const isActive  = currentStep === i;
            const isDone    = currentStep > i;
            const canNav    = stepReachable[i];

            return (
              <div key={STEP_PATHS[i]} className="flex items-center">
                {i > 0 && (
                  <div className="w-3 sm:w-5 h-px mx-0.5 sm:mx-1"
                    style={{ background: isDone ? 'var(--gold-dim)' : 'var(--border)' }} />
                )}
                <Link
                  href={canNav ? STEP_PATHS[i] : '#'}
                  className="flex items-center gap-1 sm:gap-1.5 rounded"
                  style={{
                    textDecoration: 'none',
                    padding: isActive ? '3px 6px' : '3px 4px',
                    background: isActive ? 'var(--gold-glow)' : 'transparent',
                    border: isActive ? '1px solid var(--gold-dim)' : '1px solid transparent',
                    cursor: canNav ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  <span className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: isActive ? 'var(--gold)' : isDone ? 'var(--gold-dim)' : 'var(--border-2)',
                      fontSize: '0.58rem', fontWeight: 700,
                      color: isActive || isDone ? '#07070A' : 'var(--muted)',
                    }}>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline" style={{
                    fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: isActive ? 'var(--gold)' : isDone ? 'var(--text-2)' : 'var(--muted)',
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Rechts: leaderboard + taal + theme */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 rounded transition-all"
            style={{
              textDecoration: 'none',
              padding: '4px 7px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: pathname === '/leaderboard' ? 'var(--gold)' : 'var(--muted)',
            }}
          >
            <span>🏆</span>
            <span className="hidden sm:inline" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.nav.board}
            </span>
          </Link>

          {/* Taal toggle */}
          <button
            onClick={() => setLanguage(language === 'nl' ? 'en' : 'nl')}
            title={language === 'nl' ? 'Switch to English' : 'Schakel naar Nederlands'}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '4px 7px',
              cursor: 'pointer',
              fontSize: '0.6rem',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-display)',
              color: 'var(--muted)',
              lineHeight: 1,
            }}
          >
            {language === 'nl' ? 'EN' : 'NL'}
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '4px 7px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              lineHeight: 1,
              color: 'var(--muted)',
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/lib/store';

const STEPS = [
  { label: 'Formatie', path: '/' },
  { label: 'Draft',    path: '/draft' },
  { label: 'XI',       path: '/xi' },
  { label: 'Seizoen',  path: '/simulate' },
];

function currentStepIndex(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/draft')) return 1;
  if (pathname.startsWith('/xi')) return 2;
  return 3;
}

export default function Nav() {
  const pathname = usePathname();
  const { formation, pickedPlayers, simulatedSeason, theme, setTheme } = useGameStore();
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
          {STEPS.map((step, i) => {
            const isActive  = currentStep === i;
            const isDone    = currentStep > i;
            const canNav    = stepReachable[i];

            return (
              <div key={step.path} className="flex items-center">
                {/* Connector line */}
                {i > 0 && (
                  <div className="w-3 sm:w-5 h-px mx-0.5 sm:mx-1"
                    style={{ background: isDone ? 'var(--gold-dim)' : 'var(--border)' }} />
                )}

                <Link
                  href={canNav ? step.path : '#'}
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
                  {/* Circle */}
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: isActive ? 'var(--gold)' : isDone ? 'var(--gold-dim)' : 'var(--border-2)',
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      color: isActive || isDone ? '#07070A' : 'var(--muted)',
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>

                  {/* Label — verborgen op mobiel */}
                  <span
                    className="hidden sm:inline"
                    style={{
                      fontSize: '0.65rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: isActive ? 'var(--gold)' : isDone ? 'var(--text-2)' : 'var(--muted)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Rechts: leaderboard + theme */}
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
            {/* Text — verborgen op mobiel */}
            <span className="hidden sm:inline" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Board
            </span>
          </Link>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Licht' : 'Donker'}
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

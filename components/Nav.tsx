'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/lib/store';

const STEPS = [
  { label: 'Formatie', path: '/' },
  { label: 'Draft', path: '/draft' },
  { label: 'XI', path: '/xi' },
  { label: 'Seizoen', path: '/simulate' },
];

function currentStepIndex(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/draft')) return 1;
  if (pathname.startsWith('/xi')) return 2;
  return 3;
}

export default function Nav() {
  const pathname = usePathname();
  const { formation, pickedPlayers, simulatedSeason } = useGameStore();
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
      <div style={{ display: 'flex', height: 3 }}>
        <div style={{ flex: 1, background: '#1A1A1A' }} />
        <div style={{ flex: 1, background: 'var(--gold)' }} />
        <div style={{ flex: 1, background: 'var(--red)' }} />
      </div>

      {/* Nav bar */}
      <div
        style={{
          background: 'rgba(7,7,10,0.88)',
          borderBottom: '1px solid var(--border)',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              letterSpacing: '0.1em',
              color: 'var(--gold)',
            }}
          >
            PINTJES<span style={{ color: 'var(--text)' }}>LIGA</span>
          </span>
        </Link>

        {/* Step progress */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((step, i) => {
            const isActive = currentStep === i;
            const isDone = currentStep > i;
            const canNavigate = stepReachable[i];

            return (
              <div key={step.path} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div
                    style={{
                      width: 24,
                      height: 1,
                      background: isDone ? 'var(--gold-dim)' : 'var(--border)',
                      margin: '0 4px',
                    }}
                  />
                )}
                <Link
                  href={canNavigate ? step.path : '#'}
                  style={{
                    textDecoration: 'none',
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: isActive ? 'var(--gold-glow)' : 'transparent',
                    border: isActive ? '1px solid var(--gold-dim)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: canNavigate ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: isActive ? 'var(--gold)' : isDone ? 'var(--gold-dim)' : 'var(--border-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: isActive || isDone ? '#07070A' : 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
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

        {/* Leaderboard link */}
        <Link
          href="/leaderboard"
          style={{
            textDecoration: 'none',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: pathname === '/leaderboard' ? 'var(--gold)' : 'var(--muted)',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            transition: 'all 0.15s',
          }}
        >
          🏆 Board
        </Link>
      </div>
    </header>
  );
}

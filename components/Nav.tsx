'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Sluit menu bij klik buiten
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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
                  <span
                    className={isActive ? '' : 'hidden sm:inline'}
                    style={{
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

        {/* Rechts: leaderboard + settings menu */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Leaderboard */}
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 rounded transition-all"
            style={{
              textDecoration: 'none',
              padding: '5px 9px',
              border: `1px solid ${pathname === '/leaderboard' ? 'var(--gold-dim)' : 'var(--border)'}`,
              background: pathname === '/leaderboard' ? 'var(--gold-glow)' : 'transparent',
              borderRadius: 4,
              color: pathname === '/leaderboard' ? 'var(--gold)' : 'var(--text-2)',
              fontSize: '0.85rem',
              lineHeight: 1,
            }}
          >
            <span>🏆</span>
            <span className="hidden sm:inline" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
              {t.nav.board}
            </span>
          </Link>

          {/* Settings dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              style={{
                background: menuOpen ? 'var(--surface)' : 'transparent',
                border: `1px solid ${menuOpen ? 'var(--gold-dim)' : 'var(--border)'}`,
                borderRadius: 4,
                padding: '5px 8px',
                cursor: 'pointer',
                color: menuOpen ? 'var(--gold)' : 'var(--text-2)',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s',
              }}
            >
              {/* Hamburger icoon */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="2" y1="4" x2="14" y2="4" />
                <line x1="2" y1="8" x2="14" y2="8" />
                <line x1="2" y1="12" x2="14" y2="12" />
              </svg>
            </button>

            {/* Dropdown panel */}
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: 220,
                  background: 'rgba(7,7,10,0.97)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  zIndex: 100,
                }}
              >
                {/* Taal sectie */}
                <div style={{ padding: '6px 8px 2px', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {language === 'nl' ? 'Taal' : 'Language'}
                </div>
                <div style={{ display: 'flex', gap: 4, padding: '0 4px 6px' }}>
                  {(['nl', 'en'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1,
                        background: language === lang ? 'var(--gold)' : 'transparent',
                        color: language === lang ? '#07070A' : 'var(--text-2)',
                        border: `1px solid ${language === lang ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 4,
                        padding: '5px 8px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.08em',
                        fontWeight: language === lang ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {lang === 'nl' ? '🇧🇪  NL' : '🇬🇧  EN'}
                    </button>
                  ))}
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                {/* Thema sectie */}
                <div style={{ padding: '6px 8px 2px', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {language === 'nl' ? 'Thema' : 'Theme'}
                </div>
                <div style={{ display: 'flex', gap: 4, padding: '0 4px 6px' }}>
                  {(['dark', 'light'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      style={{
                        flex: 1,
                        background: theme === mode ? 'var(--gold)' : 'transparent',
                        color: theme === mode ? '#07070A' : 'var(--text-2)',
                        border: `1px solid ${theme === mode ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 4,
                        padding: '5px 8px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.08em',
                        fontWeight: theme === mode ? 700 : 400,
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{mode === 'dark' ? '🌙' : '☀️'}</span>
                      {language === 'nl'
                        ? mode === 'dark' ? 'Donker' : 'Licht'
                        : mode === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  ))}
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                {/* Stats link */}
                <Link
                  href="/stats"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: 4,
                    color: pathname === '/stats' ? 'var(--gold)' : 'var(--text-2)',
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    transition: 'all 0.15s',
                    background: pathname === '/stats' ? 'var(--gold-glow)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (pathname !== '/stats') {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (pathname !== '/stats') {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="2" y="9" width="3" height="5" />
                    <rect x="6.5" y="5" width="3" height="9" />
                    <rect x="11" y="2" width="3" height="12" />
                  </svg>
                  <span style={{ flex: 1 }}>{t.stats.navLink}</span>
                </Link>

                {/* Datacorrectie link */}
                <Link
                  href="/corrections"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: 4,
                    color: pathname === '/corrections' ? 'var(--gold)' : 'var(--text-2)',
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    transition: 'all 0.15s',
                    background: pathname === '/corrections' ? 'var(--gold-glow)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (pathname !== '/corrections') {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (pathname !== '/corrections') {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M11.5 2.5 L13.5 4.5 L5 13 L2 14 L3 11 Z" />
                    <line x1="9.5" y1="4.5" x2="11.5" y2="6.5" />
                  </svg>
                  <span style={{ flex: 1 }}>{t.corrections.navLink}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

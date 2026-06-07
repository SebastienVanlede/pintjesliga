'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Formation, FORMATIONS } from '@/lib/types';
import { useGameStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import FormationCard from '@/components/FormationCard';

export default function HomePage() {
  const router = useRouter();
  const { setFormation, draftMode, setDraftMode, dailyResults, dailyStreak } = useGameStore();
  const t = useT();
  const [selected, setSelected] = useState<Formation | null>(null);
  const [hovered, setHovered] = useState<Formation | null>(null);
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const activeFormation = hovered ?? selected;

  // Lokale tijd in Brussel — alleen client-side berekenen om hydration mismatch te voorkomen
  useEffect(() => {
    import('@/lib/daily').then(({ getTodayDateKey }) => setTodayKey(getTodayDateKey()));
  }, []);

  const dailyPlayedToday = todayKey ? !!dailyResults[todayKey] : false;

  function handleStart() {
    if (!selected) return;
    setFormation(selected);
    router.push('/draft');
  }

  return (
    <div className="min-h-[calc(100svh-56px)] flex flex-col lg:flex-row">

      {/* ── Left: Hero ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col justify-between px-6 py-6 lg:px-16 lg:py-16 lg:w-[44%] lg:min-h-[calc(100svh-56px)]"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 lg:gap-5"
        >
          <span className="label-xs">{t.home.subtitle}</span>

          <h1
            className="leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 10vw, 8rem)',
              lineHeight: 0.9,
              color: 'var(--text)',
              letterSpacing: '0.02em',
            }}
          >
            PINTJES
            <br />
            <span style={{ color: 'var(--gold)', textShadow: '0 0 80px rgba(212,148,10,0.4)' }}>
              LIGA
            </span>
          </h1>

          <p className="hidden lg:block" style={{ color: 'var(--text-2)', maxWidth: '36ch', lineHeight: 1.6, fontSize: '0.95rem' }}>
            {t.home.heroDesc}
          </p>
        </motion.div>

        {/* How it works — verborgen op mobiel (te lange scroll voor je kan kiezen) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="hidden lg:flex flex-col gap-4 mt-12 lg:mt-0"
        >
          <span className="label-xs">{t.home.howItWorks}</span>
          <div className="flex flex-col gap-3">
            {t.home.steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-4 p-4 rounded-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', letterSpacing: '0.05em', lineHeight: 1, flexShrink: 0, opacity: 0.7 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text)', marginBottom: 2 }}>{step.title}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats bar — verborgen op mobiel om scroll te beperken */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="hidden lg:flex items-center gap-4 pt-8 mt-4 flex-wrap"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {(['129', '8', '3', 'PO1 · PO2'] as string[]).map((val, i) => (
            <div key={i} className="flex flex-col">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '0.05em' }}>{val}</span>
              <span className="label-xs" style={{ marginTop: 1 }}>{t.home.statsLabels[i]}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right: Formation selector ─────────────────────────────────── */}
      <div className="flex flex-col justify-center px-6 py-6 lg:px-16 lg:py-16 flex-1 gap-5 lg:gap-8">

        {/* Daily Challenge banner */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Link
            href="/daily"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 10,
              background: dailyPlayedToday ? 'var(--surface)' : 'rgba(212,148,10,0.08)',
              border: `1px solid ${dailyPlayedToday ? 'var(--border)' : 'var(--gold-dim)'}`,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: dailyPlayedToday ? 'none' : '0 0 24px rgba(212,148,10,0.1)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{dailyPlayedToday ? '✓' : '🎯'}</span>
              <div className="min-w-0">
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  color: dailyPlayedToday ? 'var(--text-2)' : 'var(--gold)',
                  letterSpacing: '0.1em',
                  lineHeight: 1.2,
                }}>
                  {t.daily.navLink.toUpperCase()}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {dailyPlayedToday ? t.daily.alreadyPlayed : t.daily.subtitle}
                </p>
              </div>
            </div>
            {dailyStreak > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span style={{ fontSize: '1rem' }}>🔥</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: '0.02em' }}>
                  {dailyStreak}
                </span>
              </div>
            )}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="label-xs block mb-2">{t.home.step1of4}</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--text)', letterSpacing: '0.06em', lineHeight: 1 }}>
            {t.home.chooseFormation}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            {t.home.chooseFormationDesc}
          </p>
        </motion.div>

        {/* Formation grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        >
          {FORMATIONS.map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              onMouseEnter={() => setHovered(f)}
              onMouseLeave={() => setHovered(null)}
            >
              <FormationCard
                formation={f}
                selected={selected === f}
                onClick={() => setSelected(f)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Formation description */}
        <div style={{ minHeight: 56 }}>
          <AnimatePresence mode="wait">
            {activeFormation && t.home.formations[activeFormation] && (
              <motion.div
                key={activeFormation}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-3 rounded-lg px-4 py-3"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--gold-dim)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#07070A',
                  background: 'var(--gold)',
                  padding: '2px 7px',
                  borderRadius: 3,
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  {t.home.formations[activeFormation].tag}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginRight: 6, letterSpacing: '0.06em' }}>
                    {activeFormation}
                  </span>
                  {t.home.formations[activeFormation].desc}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Draft mode toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-2"
        >
          <span className="label-xs">{t.home.gameMode}</span>
          <div className="flex gap-2">
            {([
              { value: 'normal' as const, label: t.home.modeNormal, desc: t.home.modeNormalDesc },
              { value: 'blind'  as const, label: t.home.modeBlind,  desc: t.home.modeBlindDesc },
            ]).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setDraftMode(value)}
                className="flex-1 flex flex-col items-start px-4 py-3 rounded-lg transition-all duration-150"
                style={{
                  background: draftMode === value ? 'rgba(212,148,10,0.1)' : 'var(--surface)',
                  border: `1.5px solid ${draftMode === value ? 'var(--gold)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: draftMode === value ? 'var(--gold)' : 'var(--text)' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{desc}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleStart}
            disabled={!selected}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              letterSpacing: '0.15em',
              padding: '14px 40px',
              background: selected ? 'var(--gold)' : 'var(--surface)',
              color: selected ? '#07070A' : 'var(--muted)',
              border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 8,
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: selected ? '0 0 40px rgba(212,148,10,0.25)' : 'none',
              alignSelf: 'flex-start',
            }}
          >
            {selected ? t.home.startBtn(selected) : t.home.selectFirst}
          </button>

          {selected && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs"
              style={{ color: 'var(--muted)' }}
            >
              {t.home.willFill}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

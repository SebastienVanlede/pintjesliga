'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { generateDailyChallenge, getTodayDateKey } from '@/lib/daily';

export default function DailyPage() {
  const router = useRouter();
  const t = useT();
  const { language, startDailyChallenge, dailyResults, dailyStreak } = useGameStore();
  const [mounted, setMounted] = useState(false);
  const [showOpponents, setShowOpponents] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const todayKey  = useMemo(() => mounted ? getTodayDateKey() : '', [mounted]);
  const challenge = useMemo(() => mounted ? generateDailyChallenge(todayKey) : null, [mounted, todayKey]);
  const result    = mounted ? dailyResults[todayKey] : undefined;

  if (!mounted || !challenge) return null;

  function handleStart() {
    if (!challenge) return;
    startDailyChallenge(challenge.formation, challenge.opponents, challenge.rollDeck);
    router.push('/draft');
  }

  // Datum mooi formatteren
  const localeDate = new Date(challenge.dateKey + 'T12:00:00').toLocaleDateString(
    language === 'nl' ? 'nl-BE' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <main className="min-h-[calc(100svh-56px)] px-4 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <span className="label-xs">{t.daily.todayDate(localeDate)}</span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem,6vw,3rem)',
            color: 'var(--gold)',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}>
            {t.daily.title}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.daily.subtitle}</p>
        </motion.div>

        {/* Streak banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
          style={{
            background: dailyStreak > 0 ? 'rgba(212,148,10,0.08)' : 'var(--surface)',
            border: `1px solid ${dailyStreak > 0 ? 'var(--gold-dim)' : 'var(--border)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🔥</span>
            <div>
              <p className="label-xs">{t.daily.streak}</p>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                color: dailyStreak > 0 ? 'var(--gold)' : 'var(--muted)',
                letterSpacing: '0.04em',
                marginTop: 2,
              }}>
                {dailyStreak > 0 ? t.daily.streakDays(dailyStreak) : t.daily.noStreak}
              </p>
            </div>
          </div>
          {dailyStreak > 0 && (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem,6vw,2.6rem)',
              color: 'var(--gold)',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}>
              {dailyStreak}
            </span>
          )}
        </motion.div>

        {/* Resultaat van vandaag (als al gespeeld) — anders challenge-info + start */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-xl px-5 py-5 flex flex-col gap-3"
                style={{
                  background: result.isChampion ? 'rgba(212,148,10,0.06)' : 'var(--surface)',
                  border: `1px solid ${result.isChampion ? 'var(--gold-dim)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="label-xs mb-1">{t.daily.yourResult}</p>
                    <p style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.3rem',
                      color: result.isChampion ? 'var(--gold)' : 'var(--text)',
                      letterSpacing: '0.04em',
                    }}>
                      {result.resultLabel}
                    </p>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.4rem',
                    color: 'var(--gold)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                  }}>
                    {result.totalScore.toLocaleString('nl-BE')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                  <span>🏆 {result.champion}</span>
                  <span style={{ color: 'var(--border-2)' }}>·</span>
                  <span>{result.formation}</span>
                  <span style={{ color: 'var(--border-2)' }}>·</span>
                  <span>OVR {result.avgOverall}</span>
                </div>
              </div>

              <p className="text-xs text-center mt-2" style={{ color: 'var(--muted)' }}>
                {t.daily.comeBackTomorrow}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              {/* Hoe werkt het */}
              <div className="rounded-xl px-5 py-4 flex flex-col gap-2.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="label-xs">{t.daily.howItWorks}</p>
                {[t.daily.rule1, t.daily.rule2, t.daily.rule3].map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              {/* Vandaag's formatie */}
              <div className="rounded-xl px-5 py-4 flex items-center justify-between"
                style={{ background: 'var(--surface)', border: '1px solid var(--gold-dim)' }}
              >
                <div>
                  <p className="label-xs mb-1">{t.daily.todaysFormation}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {t.home.formations[challenge.formation]?.tag}
                  </p>
                </div>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  color: 'var(--gold)',
                  letterSpacing: '0.06em',
                }}>
                  {challenge.formation}
                </span>
              </div>

              {/* Tegenstanders (inklapbaar) */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowOpponents(v => !v)}
                  className="w-full flex items-center justify-between rounded-xl px-5 py-3.5 transition-all"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.1rem' }}>🏟️</span>
                    <div className="text-left">
                      <p className="label-xs">{t.daily.todaysOpponents}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {showOpponents ? t.daily.hideOpponents : t.daily.viewAllOpponents}
                      </p>
                    </div>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{showOpponents ? '▲' : '▼'}</span>
                </button>

                <AnimatePresence>
                  {showOpponents && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        {challenge.opponents.map((opp, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderLeft: `3px solid ${opp.primaryColor}`,
                            }}>
                            <span className="flex-1 truncate" style={{ color: 'var(--text)' }}>{opp.teamName}</span>
                            <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)', fontSize: '0.65rem' }}>{opp.season}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Start knop */}
              <motion.button
                onClick={handleStart}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl mt-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  letterSpacing: '0.14em',
                  background: 'var(--gold)',
                  color: '#07070A',
                  border: '2px solid var(--gold)',
                  cursor: 'pointer',
                  boxShadow: '0 0 40px rgba(212,148,10,0.3)',
                }}
              >
                {t.daily.startBtn}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

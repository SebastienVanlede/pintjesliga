'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { LeaderboardEntry, DailyLeaderboardEntry } from '@/lib/supabase';
import { useT } from '@/lib/useT';

const MEDAL = ['🥇', '🥈', '🥉'];

type Tab = 'today' | 'all';

export default function LeaderboardPage() {
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<Tab>('today');

  // All-time
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [allError, setAllError] = useState<string | null>(null);

  // Daily
  const [dailyEntries, setDailyEntries] = useState<DailyLeaderboardEntry[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState<string>('');
  const [todayLabel, setTodayLabel] = useState<string>('');

  useEffect(() => {
    import('@/lib/daily').then(({ getTodayDateKey }) => {
      const key = getTodayDateKey();
      setTodayKey(key);
      setTodayLabel(new Date(key + 'T12:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' }));
    });

    fetch('/api/scores')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllEntries(data);
        else setAllError(t.leaderboard.error);
      })
      .catch(() => setAllError(t.leaderboard.loadError))
      .finally(() => setAllLoading(false));
  }, []);

  useEffect(() => {
    if (!todayKey) return;
    setDailyLoading(true);
    fetch(`/api/daily-scores?date=${todayKey}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDailyEntries(data);
        else setDailyError(t.leaderboard.error);
      })
      .catch(() => setDailyError(t.leaderboard.loadError))
      .finally(() => setDailyLoading(false));
  }, [todayKey]);

  return (
    <div className="min-h-[calc(100svh-56px)] flex flex-col items-center px-4 py-10 gap-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <span className="label-xs block mb-2">Pintjesliga</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,6vw,3.5rem)', color: 'var(--gold)', letterSpacing: '0.08em', lineHeight: 1 }}>
          LEADERBOARD
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          {t.leaderboard.subtitle}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="w-full flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {([
          { id: 'today' as const, label: t.leaderboard.tabToday, sub: todayLabel },
          { id: 'all'   as const, label: t.leaderboard.tabAll,   sub: t.leaderboard.tabAllSub },
        ]).map(({ id, label, sub }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 py-2.5 rounded-lg transition-all"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              background: tab === id ? 'var(--gold)' : 'transparent',
              color: tab === id ? '#07070A' : 'var(--text-2)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span>{id === 'today' ? '🎯' : '🏆'}</span>
              <span>{label}</span>
            </div>
            {sub && (
              <span style={{ display: 'block', fontSize: '0.6rem', opacity: 0.7, marginTop: 2, letterSpacing: '0.06em' }}>
                {sub}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'today' ? (
          <motion.div
            key="today"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-4"
          >
            {dailyLoading ? (
              <LoadingState label={t.leaderboard.loading} />
            ) : dailyError ? (
              <ErrorState msg={dailyError} sub={t.leaderboard.errorSub} />
            ) : dailyEntries.length === 0 ? (
              <EmptyState
                title={t.leaderboard.dailyEmpty}
                desc={t.leaderboard.dailyEmptyDesc}
              />
            ) : (
              <DailyTable entries={dailyEntries} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="all"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-4"
          >
            {/* Score explanation */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {t.leaderboard.explanations.map(({ label, desc }) => (
                <div key={label} className="card p-3 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-1">
                  <p className="text-xs font-medium shrink-0" style={{ color: 'var(--text)', minWidth: '5.5rem' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</p>
                </div>
              ))}
            </div>

            {allLoading ? (
              <LoadingState label={t.leaderboard.loading} />
            ) : allError ? (
              <ErrorState msg={allError} sub={t.leaderboard.errorSub} />
            ) : allEntries.length === 0 ? (
              <EmptyState title={t.leaderboard.empty} desc={t.leaderboard.emptyDesc} />
            ) : (
              <AllTimeTable entries={allEntries} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => router.push('/')}
          className="px-8 py-3.5 rounded-lg text-sm transition-all"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.12em', background: 'var(--gold)', color: '#07070A', border: '2px solid var(--gold)', cursor: 'pointer', boxShadow: '0 0 30px rgba(212,148,10,0.2)' }}
        >
          {t.leaderboard.newGame}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-componenten ──────────────────────────────────────────────────────────

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
      <p style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  );
}

function ErrorState({ msg, sub }: { msg: string; sub: string }) {
  return (
    <div className="text-center py-8">
      <p style={{ color: 'var(--muted)' }}>{msg}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--border-2)' }}>{sub}</p>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-12 card w-full">
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
        {title}
      </p>
      <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{desc}</p>
    </div>
  );
}

function AllTimeTable({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useT();
  return (
    <div className="w-full flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid items-center px-3 sm:px-4 py-2 text-xs uppercase tracking-widest"
        style={{ background: 'var(--surface-2)', color: 'var(--muted)', gridTemplateColumns: '2rem 1fr auto' }}>
        <span>#</span>
        <span>{t.leaderboard.colName}</span>
        <span className="text-right">{t.leaderboard.colScore}</span>
      </div>
      {entries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="grid items-center px-3 sm:px-4 py-3 text-sm"
          style={{
            gridTemplateColumns: '2rem 1fr auto',
            borderTop: '1px solid var(--border)',
            background: i === 0 ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i < 3 ? 'var(--gold)' : 'var(--muted)' }}>
            {MEDAL[i] ?? i + 1}
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{entry.player_name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{entry.result_label}</p>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '0.6rem' }}>
                {entry.formation}
              </span>
              <span className="text-xs" style={{ color: entry.avg_overall >= 75 ? 'var(--muted)' : entry.avg_overall >= 70 ? 'var(--text-2)' : 'var(--gold)', fontSize: '0.7rem' }}>
                OVR {entry.avg_overall}
              </span>
            </div>
          </div>
          <div className="text-right pl-3">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i === 0 ? 'var(--gold)' : 'var(--text)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {entry.score.toLocaleString('nl-BE')}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DailyTable({ entries }: { entries: DailyLeaderboardEntry[] }) {
  const t = useT();
  return (
    <div className="w-full flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid items-center px-3 sm:px-4 py-2 text-xs uppercase tracking-widest"
        style={{ background: 'var(--surface-2)', color: 'var(--muted)', gridTemplateColumns: '2rem 1fr auto' }}>
        <span>#</span>
        <span>{t.leaderboard.colName}</span>
        <span className="text-right">{t.leaderboard.colScore}</span>
      </div>
      {entries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="grid items-center px-3 sm:px-4 py-3 text-sm"
          style={{
            gridTemplateColumns: '2rem 1fr auto',
            borderTop: '1px solid var(--border)',
            background: i === 0 ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i < 3 ? 'var(--gold)' : 'var(--muted)' }}>
            {MEDAL[i] ?? i + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{entry.player_name}</p>
              {entry.streak > 1 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  padding: '1px 6px', borderRadius: 3,
                  background: 'rgba(212,148,10,0.12)', border: '1px solid var(--gold-dim)',
                  fontSize: '0.6rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
                  flexShrink: 0,
                }}>
                  🔥 {entry.streak}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs" style={{ color: entry.is_champion ? 'var(--gold)' : 'var(--muted)' }}>
                {entry.result_label}
              </p>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '0.6rem' }}>
                {entry.formation}
              </span>
              <span className="text-xs" style={{ color: entry.avg_overall >= 75 ? 'var(--muted)' : entry.avg_overall >= 70 ? 'var(--text-2)' : 'var(--gold)', fontSize: '0.7rem' }}>
                OVR {entry.avg_overall}
              </span>
            </div>
          </div>
          <div className="text-right pl-3">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i === 0 ? 'var(--gold)' : 'var(--text)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {entry.score.toLocaleString('nl-BE')}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

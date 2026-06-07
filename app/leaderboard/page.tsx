'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { LeaderboardEntry } from '@/lib/supabase';
import { useT } from '@/lib/useT';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    fetch('/api/scores')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        else setError(t.leaderboard.error);
      })
      .catch(() => setError(t.leaderboard.loadError))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100svh-56px)] flex flex-col items-center px-4 py-10 gap-8 max-w-3xl mx-auto w-full">
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

      {/* Score explanation */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {t.leaderboard.explanations.map(({ label, desc }) => (
          <div key={label} className="card p-3 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-1">
            <p className="text-xs font-medium shrink-0" style={{ color: 'var(--text)', minWidth: '5.5rem' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--muted)' }}>{t.leaderboard.loading}</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p style={{ color: 'var(--muted)' }}>{error}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--border-2)' }}>
            {t.leaderboard.errorSub}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 card w-full">
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
            {t.leaderboard.empty}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            {t.leaderboard.emptyDesc}
          </p>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Header row */}
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
              transition={{ delay: i * 0.04 }}
              className="grid items-center px-3 sm:px-4 py-3 text-sm"
              style={{
                gridTemplateColumns: '2rem 1fr auto',
                borderTop: '1px solid var(--border)',
                background: i === 0 ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}
            >
              {/* Rank */}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i < 3 ? 'var(--gold)' : 'var(--muted)' }}>
                {MEDAL[i] ?? i + 1}
              </span>

              {/* Name + result + meta */}
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

              {/* Score */}
              <div className="text-right pl-3">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i === 0 ? 'var(--gold)' : 'var(--text)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {entry.score.toLocaleString('nl-BE')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
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

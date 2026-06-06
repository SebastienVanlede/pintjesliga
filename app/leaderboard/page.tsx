'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { LeaderboardEntry } from '@/lib/supabase';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/scores')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        else setError('Leaderboard niet beschikbaar');
      })
      .catch(() => setError('Kon leaderboard niet laden'))
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
          De beste Pintjesliga coaches aller tijden
        </p>
      </motion.div>

      {/* Score explanation */}
      <div className="w-full grid grid-cols-3 gap-3">
        {[
          { label: 'Resultaat', desc: 'Kampioen = 1000 pts, degradatie = 0 pts' },
          { label: 'Underdog', desc: 'Lager gem. overall = meer bonuspunten' },
          { label: 'Diversiteit', desc: 'Meer unieke clubs = meer bonuspunten' },
        ].map(({ label, desc }) => (
          <div key={label} className="card p-3 text-center">
            <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--muted)' }}>Laden…</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p style={{ color: 'var(--muted)' }}>{error}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--border-2)' }}>
            Het leaderboard is actief zodra Supabase geconfigureerd is.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 card w-full">
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
            WEES DE EERSTE
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Er zijn nog geen scores ingediend. Speel het spel en zet jouw naam op de board!
          </p>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Header row */}
          <div className="grid items-center px-4 py-2 text-xs uppercase tracking-widest"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)', gridTemplateColumns: '2.5rem 1fr 5rem 5rem 6rem' }}>
            <span>#</span>
            <span>Naam</span>
            <span className="text-center">Formatie</span>
            <span className="text-center">OVR</span>
            <span className="text-right">Score</span>
          </div>

          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid items-center px-4 py-3 text-sm"
              style={{
                gridTemplateColumns: '2.5rem 1fr 5rem 5rem 6rem',
                borderTop: '1px solid var(--border)',
                background: i === 0 ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}
            >
              {/* Rank */}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i < 3 ? 'var(--gold)' : 'var(--muted)' }}>
                {MEDAL[i] ?? i + 1}
              </span>

              {/* Name + result */}
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{entry.player_name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{entry.result_label}</p>
              </div>

              {/* Formation */}
              <div className="text-center">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                  {entry.formation}
                </span>
              </div>

              {/* Avg overall */}
              <span className="text-center text-sm" style={{ color: entry.avg_overall >= 75 ? 'var(--muted)' : entry.avg_overall >= 70 ? 'var(--text-2)' : 'var(--gold)' }}>
                {entry.avg_overall}
              </span>

              {/* Score */}
              <div className="text-right">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: i === 0 ? 'var(--gold)' : 'var(--text)', letterSpacing: '0.04em' }}>
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
          className="px-6 py-3 rounded text-sm transition-all"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', background: 'var(--gold)', color: '#07070A', border: '2px solid var(--gold)' }}
        >
          Nieuw spel
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded text-sm transition-all"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          Vernieuwen
        </button>
      </div>
    </div>
  );
}

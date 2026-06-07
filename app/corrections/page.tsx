'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/useT';

export default function CorrectionsPage() {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim() || status === 'submitting') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const c = t.corrections;

  return (
    <main className="min-h-[calc(100svh-56px)] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg flex flex-col gap-6"
      >
        {/* Header */}
        <div>
          <span className="label-xs block mb-2">{c.label}</span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem,5vw,2.8rem)',
            color: 'var(--gold)',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}>
            {c.title}
          </h1>
          <p className="text-sm mt-3" style={{ color: 'var(--muted)', lineHeight: 1.6, maxWidth: '44ch' }}>
            {c.desc}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {status === 'done' ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 rounded-2xl py-12 px-8 text-center"
              style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}
            >
              <span style={{ fontSize: '3rem', lineHeight: 1 }}>✓</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#4ade80', letterSpacing: '0.08em' }}>
                  {c.successTitle}
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{c.successDesc}</p>
              </div>
              <button
                onClick={() => router.push('/')}
                style={{
                  fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
                  padding: '10px 28px', borderRadius: 8,
                  background: 'var(--gold)', color: '#07070A',
                  border: '2px solid var(--gold)', cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {c.backHome}
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  {c.nameLabel} <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 64))}
                  placeholder={c.namePlaceholder}
                  maxLength={64}
                  required
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  {c.messageLabel} <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 1000))}
                  placeholder={c.messagePlaceholder}
                  maxLength={1000}
                  required
                  rows={5}
                  className="rounded-lg px-4 py-3 text-sm resize-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <p className="text-xs text-right" style={{ color: 'var(--muted)' }}>
                  {message.length}/1000
                </p>
              </div>

              {/* Error */}
              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.3)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--red)' }}>{c.errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="text-xs underline ml-3 shrink-0"
                    style={{ color: 'var(--red)', cursor: 'pointer' }}
                  >
                    {c.clearError}
                  </button>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 rounded-lg text-sm transition-all"
                  style={{
                    fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
                    background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  {c.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !message.trim() || status === 'submitting'}
                  className="flex-1 py-3 rounded-lg transition-all"
                  style={{
                    fontFamily: 'var(--font-display)', letterSpacing: '0.1em', fontSize: '1rem',
                    background: name.trim() && message.trim() ? 'var(--gold)' : 'var(--surface)',
                    color: name.trim() && message.trim() ? '#07070A' : 'var(--muted)',
                    border: `1px solid ${name.trim() && message.trim() ? 'var(--gold)' : 'var(--border)'}`,
                    cursor: name.trim() && message.trim() ? 'pointer' : 'default',
                    opacity: status === 'submitting' ? 0.6 : 1,
                  }}
                >
                  {status === 'submitting' ? '…' : c.submit}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

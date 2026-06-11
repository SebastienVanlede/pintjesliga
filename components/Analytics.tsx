'use client';
import { Analytics as VercelAnalytics, type BeforeSendEvent } from '@vercel/analytics/next';

const SKIP_PREFIXES = ['/admin', '/corrections', '/api'];
const STRIP_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
];

function beforeSend(event: BeforeSendEvent) {
  const url = new URL(event.url);
  const path = url.pathname;
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) {
    return null;
  }
  for (const key of STRIP_PARAMS) url.searchParams.delete(key);
  return { ...event, url: url.toString() };
}

export default function Analytics() {
  return <VercelAnalytics beforeSend={beforeSend} />;
}

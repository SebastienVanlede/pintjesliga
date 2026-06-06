export interface LeaderboardEntry {
  id: string;
  created_at: string;
  player_name: string;
  score: number;
  formation: string;
  avg_overall: number;
  result_label: string;
  result_score: number;
  underdog_bonus: number;
  diversity_bonus: number;
  unique_teams: number;
}

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // Dynamic import to avoid SSG issues
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}

export const supabaseReady =
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

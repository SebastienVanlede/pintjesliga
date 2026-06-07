import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export interface DailyLeaderboardEntry {
  id: string;
  created_at: string;
  daily_date: string;
  player_name: string;
  score: number;
  formation: string;
  avg_overall: number;
  result_label: string;
  is_champion: boolean;
  streak: number;
}

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseReady = !!(url && key);

// Singleton — herbruikt dezelfde client per server instantie
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseReady) return null;
  if (!_client) _client = createClient(url, key);
  return _client;
}

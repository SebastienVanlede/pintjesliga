import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json([]);

  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Missing date param' }, { status: 400 });

  const { data, error } = await supabase
    .from('daily_scores')
    .select('*')
    .eq('daily_date', date)
    .order('score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Daily leaderboard fetch error:', JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Leaderboard not configured' }, { status: 503 });

  const body = await req.json();
  const { player_name, score, daily_date, formation, avg_overall, result_label, is_champion, streak } = body;

  if (!player_name?.trim() || typeof score !== 'number' || !daily_date) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase
    .from('daily_scores')
    .insert({
      player_name: player_name.trim().slice(0, 32),
      score,
      daily_date,
      formation,
      avg_overall,
      result_label,
      is_champion: !!is_champion,
      streak: typeof streak === 'number' ? streak : 0,
    });

  if (error) {
    console.error('Daily score insert error:', JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

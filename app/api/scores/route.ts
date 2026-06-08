import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Leaderboard not configured' }, { status: 503 });

  const body = await req.json();
  const {
    player_name, score, formation, avg_overall, result_label,
    result_score, underdog_bonus, diversity_bonus, unique_teams,
    // ── Stats-velden (optioneel; pre-migratie clients kunnen ontbreken) ──
    draft_mode, is_champion, goals_scored, unique_seasons, picked_players,
  } = body;

  if (!player_name?.trim() || typeof score !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase
    .from('scores')
    .insert({
      player_name: player_name.trim().slice(0, 32),
      score,
      formation,
      avg_overall,
      result_label,
      result_score,
      underdog_bonus,
      diversity_bonus,
      unique_teams,
      // Alleen meesturen als ze gedefinieerd zijn — undefined wordt geen kolom-update
      ...(draft_mode      !== undefined && { draft_mode      }),
      ...(is_champion     !== undefined && { is_champion     }),
      ...(goals_scored    !== undefined && { goals_scored    }),
      ...(unique_seasons  !== undefined && { unique_seasons  }),
      ...(picked_players  !== undefined && { picked_players  }),
    });

  if (error) {
    console.error('Supabase insert error:', JSON.stringify(error));
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

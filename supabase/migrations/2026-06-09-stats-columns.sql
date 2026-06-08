-- Pintjesliga — verrijk leaderboard tabellen met admin-stats velden
-- Run dit in de Supabase SQL editor. Idempotent (IF NOT EXISTS).
--
-- Nieuwe velden op `scores`:
--   draft_mode      — 'classic' of 'blind' (from-memory mode tracker)
--   is_champion     — boolean (directe win-rate ipv result_label parsen)
--   goals_scored    — totaal goals door user-spelers
--   unique_seasons  — aantal verschillende seizoenen in XI
--   picked_players  — JSONB array van [{name, teamId, season, position, overall}]
--
-- Nieuwe velden op `daily_scores`:
--   draft_mode      — 'classic' of 'blind'
--   picked_players  — zelfde JSONB shape

ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS draft_mode     TEXT,
  ADD COLUMN IF NOT EXISTS is_champion    BOOLEAN,
  ADD COLUMN IF NOT EXISTS goals_scored   INTEGER,
  ADD COLUMN IF NOT EXISTS unique_seasons INTEGER,
  ADD COLUMN IF NOT EXISTS picked_players JSONB;

ALTER TABLE daily_scores
  ADD COLUMN IF NOT EXISTS draft_mode     TEXT,
  ADD COLUMN IF NOT EXISTS picked_players JSONB;

-- GIN-index op picked_players geeft snelle "is speler X in deze XI?" lookups
-- en versnelt jsonb_array_elements aggregations. Optioneel maar aanbevolen.
CREATE INDEX IF NOT EXISTS idx_scores_picked_players       ON scores       USING GIN (picked_players);
CREATE INDEX IF NOT EXISTS idx_daily_scores_picked_players ON daily_scores USING GIN (picked_players);

-- B-tree-index op draft_mode + is_champion voor snelle filter-queries vanuit admin
CREATE INDEX IF NOT EXISTS idx_scores_draft_mode  ON scores  (draft_mode);
CREATE INDEX IF NOT EXISTS idx_scores_is_champion ON scores  (is_champion);

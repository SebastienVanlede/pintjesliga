'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Formation, PickedPlayer, SimulatedSeason } from './types';
import { Lang } from './i18n';

export interface PendingRoll {
  teamId: string;
  teamName: string;
  season: string;
  primaryColor: string;
}

export interface ClassicOpponent {
  teamId: string;
  teamName: string;
  season: string;
  primaryColor: string;
}

export type ResultCategory =
  | 'champion'         // 1e in PO1
  | 'po1'              // 2e-6e in PO1
  | 'po2'              // PO2 (7-12)
  | 'rel_survived'     // Relegate PO, plek 1-2 (gered)
  | 'rel_relegated'    // Relegate PO, plek 3-4 (gedegradeerd)
  | 'direct_relegated' // rechtstreeks gedegradeerd
  | 'unknown';

export interface DailyResult {
  dateKey: string;
  totalScore: number;
  isChampion: boolean;
  resultLabel: string;
  formation: string;
  champion: string;
  avgOverall: number;
  playedAt: number;
}

export interface PlayedGame {
  id: string;
  playedAt: number;
  formation: string;
  draftMode: 'normal' | 'blind';
  opponentMode: 'classic' | 'season';
  opponentSeason?: string;
  teamName: string;
  avgOverall: number;
  totalScore: number;
  resultLabel: string;
  resultCategory?: ResultCategory; // optioneel voor backwards-compat met oude entries
  isChampion: boolean;
  champion: string;
  players: { name: string; teamName: string; season: string; position: string; overall: number }[];
  uniqueTeams: number;
  uniqueSeasons: number;
  goalsScored: number;
}

interface GameState {
  formation: Formation | null;
  pickedPlayers: PickedPlayer[];
  currentPositionIndex: number;
  simulatedSeason: SimulatedSeason | null;
  teamName: string;
  draftMode: 'normal' | 'blind';
  simSeason: string;
  theme: 'dark' | 'light';
  language: Lang;
  rerollsUsed: number;
  pendingRoll: PendingRoll | null;
  classicSquads: ClassicOpponent[] | null;
  playHistory: PlayedGame[];

  // Daily challenge
  isDailyChallenge: boolean;
  dailyDeck: { teamId: string; season: string }[] | null;
  dailyResults: Record<string, DailyResult>;
  dailyStreak: number;
  lastDailyDate: string | null;

  setFormation: (f: Formation) => void;
  pickPlayer: (p: PickedPlayer) => void;
  setSimulatedSeason: (s: SimulatedSeason) => void;
  setTeamName: (n: string) => void;
  setDraftMode: (m: 'normal' | 'blind') => void;
  setSimSeason: (s: string) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setLanguage: (l: Lang) => void;
  useReroll: () => void;
  setPendingRoll: (r: PendingRoll | null) => void;
  setClassicSquads: (s: ClassicOpponent[] | null) => void;
  recordPlayedGame: (g: Omit<PlayedGame, 'id' | 'playedAt'>) => void;
  clearPlayHistory: () => void;

  // Daily actions
  startDailyChallenge: (
    formation: Formation, opponents: ClassicOpponent[],
    rollDeck: { teamId: string; season: string }[]
  ) => void;
  recordDailyResult: (r: DailyResult) => void;
  endDailyChallenge: () => void;

  reset: () => void;
  resetKeepFormation: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      formation: null,
      pickedPlayers: [],
      currentPositionIndex: 0,
      simulatedSeason: null,
      teamName: 'Mijn Droomelftal',
      draftMode: 'normal',
      simSeason: '2025-26',
      theme: 'dark',
      language: 'nl',
      rerollsUsed: 0,
      pendingRoll: null,
      classicSquads: null,
      playHistory: [],
      isDailyChallenge: false,
      dailyDeck: null,
      dailyResults: {},
      dailyStreak: 0,
      lastDailyDate: null,

      setFormation: (formation) =>
        set({ formation, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0, classicSquads: null }),

      pickPlayer: (player) =>
        set((state) => ({
          pickedPlayers: [...state.pickedPlayers, player],
          currentPositionIndex: state.currentPositionIndex + 1,
          pendingRoll: null,
        })),

      setSimulatedSeason: (simulatedSeason) => set({ simulatedSeason }),

      setTeamName: (teamName) => set({ teamName }),

      setDraftMode: (draftMode) => set({ draftMode }),

      setSimSeason: (simSeason) => set({ simSeason }),

      setTheme: (theme) => set({ theme }),

      setLanguage: (language) => set({ language }),

      useReroll: () => set(state => ({ rerollsUsed: state.rerollsUsed + 1 })),

      setPendingRoll: (pendingRoll) => set({ pendingRoll }),

      setClassicSquads: (classicSquads) => set({ classicSquads }),

      recordPlayedGame: (game) =>
        set(state => {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const newEntry: PlayedGame = { ...game, id, playedAt: Date.now() };
          // Trim oude entries (max 200)
          const trimmed = [newEntry, ...state.playHistory].slice(0, 200);
          return { playHistory: trimmed };
        }),

      clearPlayHistory: () => set({ playHistory: [] }),

      startDailyChallenge: (formation, opponents, rollDeck) =>
        set({
          formation,
          pickedPlayers: [],
          currentPositionIndex: 0,
          simulatedSeason: null,
          rerollsUsed: 0,
          pendingRoll: null,
          draftMode: 'normal',
          classicSquads: opponents,
          isDailyChallenge: true,
          dailyDeck: rollDeck,
        }),

      recordDailyResult: (result) =>
        set(state => {
          // Streak: gisteren ook gespeeld? → +1; anders reset naar 1
          const yesterday = (() => {
            const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' });
            return fmt.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
          })();
          const newStreak = state.lastDailyDate === yesterday
            ? state.dailyStreak + 1
            : state.lastDailyDate === result.dateKey
              ? state.dailyStreak
              : 1;
          return {
            dailyResults: { ...state.dailyResults, [result.dateKey]: result },
            dailyStreak: newStreak,
            lastDailyDate: result.dateKey,
          };
        }),

      endDailyChallenge: () => set({
        isDailyChallenge: false,
        dailyDeck: null,
        classicSquads: null,
      }),

      reset: () =>
        set({ formation: null, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0, pendingRoll: null, classicSquads: null, isDailyChallenge: false, dailyDeck: null }),

      resetKeepFormation: () =>
        set({ pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0, pendingRoll: null, classicSquads: null, isDailyChallenge: false, dailyDeck: null }),
    }),
    {
      name: 'pintjesliga-state',
      partialize: (state) => ({
        formation:        state.formation,
        pickedPlayers:    state.pickedPlayers,
        currentPositionIndex: state.currentPositionIndex,
        simulatedSeason:  state.simulatedSeason,
        teamName:         state.teamName,
        draftMode:        state.draftMode,
        simSeason:        state.simSeason,
        theme:            state.theme,
        language:         state.language,
        rerollsUsed:      state.rerollsUsed,
        pendingRoll:      state.pendingRoll,
        classicSquads:    state.classicSquads,
        playHistory:      state.playHistory,
        isDailyChallenge: state.isDailyChallenge,
        dailyDeck:        state.dailyDeck,
        dailyResults:     state.dailyResults,
        dailyStreak:      state.dailyStreak,
        lastDailyDate:    state.lastDailyDate,
      }),
    }
  )
);

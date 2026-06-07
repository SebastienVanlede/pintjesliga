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

      reset: () =>
        set({ formation: null, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0, pendingRoll: null, classicSquads: null }),

      resetKeepFormation: () =>
        set({ pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0, pendingRoll: null, classicSquads: null }),
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
      }),
    }
  )
);

'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Formation, PickedPlayer, SimulatedSeason } from './types';
import { Lang } from './i18n';

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

  setFormation: (f: Formation) => void;
  pickPlayer: (p: PickedPlayer) => void;
  setSimulatedSeason: (s: SimulatedSeason) => void;
  setTeamName: (n: string) => void;
  setDraftMode: (m: 'normal' | 'blind') => void;
  setSimSeason: (s: string) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setLanguage: (l: Lang) => void;
  useReroll: () => void;
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
      simSeason: '2024-25',
      theme: 'dark',
      language: 'nl',
      rerollsUsed: 0,

      setFormation: (formation) =>
        set({ formation, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0 }),

      pickPlayer: (player) =>
        set((state) => ({
          pickedPlayers: [...state.pickedPlayers, player],
          currentPositionIndex: state.currentPositionIndex + 1,
        })),

      setSimulatedSeason: (simulatedSeason) => set({ simulatedSeason }),

      setTeamName: (teamName) => set({ teamName }),

      setDraftMode: (draftMode) => set({ draftMode }),

      setSimSeason: (simSeason) => set({ simSeason }),

      setTheme: (theme) => set({ theme }),

      setLanguage: (language) => set({ language }),

      useReroll: () => set(state => ({ rerollsUsed: state.rerollsUsed + 1 })),

      reset: () =>
        set({ formation: null, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0 }),

      resetKeepFormation: () =>
        set({ pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null, rerollsUsed: 0 }),
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
      }),
    }
  )
);

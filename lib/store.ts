'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Formation, PickedPlayer, SimulatedSeason } from './types';

interface GameState {
  formation: Formation | null;
  pickedPlayers: PickedPlayer[];
  currentPositionIndex: number;
  simulatedSeason: SimulatedSeason | null;
  teamName: string;
  draftMode: 'normal' | 'blind';

  setFormation: (f: Formation) => void;
  pickPlayer: (p: PickedPlayer) => void;
  setSimulatedSeason: (s: SimulatedSeason) => void;
  setTeamName: (n: string) => void;
  setDraftMode: (m: 'normal' | 'blind') => void;
  reset: () => void;
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

      setFormation: (formation) =>
        set({ formation, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null }),

      pickPlayer: (player) =>
        set((state) => ({
          pickedPlayers: [...state.pickedPlayers, player],
          currentPositionIndex: state.currentPositionIndex + 1,
        })),

      setSimulatedSeason: (simulatedSeason) => set({ simulatedSeason }),

      setTeamName: (teamName) => set({ teamName }),

      setDraftMode: (draftMode) => set({ draftMode }),

      reset: () =>
        set({ formation: null, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null }),
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
      }),
    }
  )
);

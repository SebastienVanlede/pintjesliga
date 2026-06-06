'use client';
import { create } from 'zustand';
import { Formation, PickedPlayer, SimulatedSeason } from './types';

interface GameState {
  formation: Formation | null;
  pickedPlayers: PickedPlayer[];
  currentPositionIndex: number;
  simulatedSeason: SimulatedSeason | null;

  setFormation: (f: Formation) => void;
  pickPlayer: (p: PickedPlayer) => void;
  setSimulatedSeason: (s: SimulatedSeason) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  formation: null,
  pickedPlayers: [],
  currentPositionIndex: 0,
  simulatedSeason: null,

  setFormation: (formation) =>
    set({ formation, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null }),

  pickPlayer: (player) =>
    set((state) => ({
      pickedPlayers: [...state.pickedPlayers, player],
      currentPositionIndex: state.currentPositionIndex + 1,
    })),

  setSimulatedSeason: (simulatedSeason) => set({ simulatedSeason }),

  reset: () =>
    set({ formation: null, pickedPlayers: [], currentPositionIndex: 0, simulatedSeason: null }),
}));

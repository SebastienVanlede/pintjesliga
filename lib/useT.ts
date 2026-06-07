'use client';
import { useGameStore } from './store';
import { translations } from './i18n';

export function useT() {
  const language = useGameStore(s => s.language);
  return translations[language];
}

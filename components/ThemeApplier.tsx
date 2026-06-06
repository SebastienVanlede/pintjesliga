'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';

export default function ThemeApplier() {
  const theme = useGameStore(s => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}

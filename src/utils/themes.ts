import { VisualTheme, ThemeColors } from '../types';

export const THEMES: Record<VisualTheme, ThemeColors> = {
  cosmic: {
    name: 'Multiverso Cósmico',
    bg: '#050714',
    bgSecondary: '#0c102b',
    gridColor: 'rgba(79, 70, 229, 0.08)',
    mainLaneColor: '#38bdf8', // bright sky blue
    branchColors: [
      '#a855f7', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // emerald
      '#6366f1', // indigo
      '#06b6d4', // cyan
    ],
    textColor: '#f8fafc',
    textMuted: '#94a3b8',
    nodeGlow: 'rgba(56, 189, 248, 0.45)',
    mergeGlow: 'rgba(236, 72, 153, 0.65)',
    pulseColor: '#38bdf8',
    starfield: true,
  },
  neon: {
    name: 'Cyberpunk Neon',
    bg: '#040711',
    bgSecondary: '#0b1329',
    gridColor: 'rgba(6, 182, 212, 0.12)',
    mainLaneColor: '#00f5d4', // neon teal
    branchColors: [
      '#f72585', // neon rose
      '#7209b7', // neon violet
      '#3a0ca3', // deep electric
      '#4cc9f0', // neon cyan
      '#fee440', // neon yellow
      '#00bbf9', // neon sky
    ],
    textColor: '#ffffff',
    textMuted: '#a5f3fc',
    nodeGlow: 'rgba(0, 245, 212, 0.6)',
    mergeGlow: 'rgba(247, 37, 133, 0.8)',
    pulseColor: '#00f5d4',
    starfield: false,
  },
  'minimal-dark': {
    name: 'Blueprint Minimal',
    bg: '#090d16',
    bgSecondary: '#111827',
    gridColor: 'rgba(148, 163, 184, 0.07)',
    mainLaneColor: '#60a5fa', // clean blue
    branchColors: [
      '#34d399', // mint
      '#fbbf24', // warm yellow
      '#f87171', // soft coral
      '#818cf8', // lavender
      '#2dd4bf', // teal
      '#c084fc', // purple
    ],
    textColor: '#f1f5f9',
    textMuted: '#64748b',
    nodeGlow: 'rgba(96, 165, 250, 0.35)',
    mergeGlow: 'rgba(52, 211, 153, 0.5)',
    pulseColor: '#60a5fa',
    starfield: false,
  },
  solar: {
    name: 'Solar Multiverse',
    bg: '#0a0705',
    bgSecondary: '#1c130d',
    gridColor: 'rgba(245, 158, 11, 0.08)',
    mainLaneColor: '#fbbf24', // sun gold
    branchColors: [
      '#f97316', // orange
      '#ef4444', // red
      '#eab308', // yellow
      '#fb923c', // light orange
      '#f43f5e', // rose
      '#d97706', // dark amber
    ],
    textColor: '#fffbeb',
    textMuted: '#d97706',
    nodeGlow: 'rgba(251, 191, 36, 0.55)',
    mergeGlow: 'rgba(249, 115, 22, 0.75)',
    pulseColor: '#fbbf24',
    starfield: true,
  },
};

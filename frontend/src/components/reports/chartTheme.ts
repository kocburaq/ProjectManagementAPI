import { useMemo } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { ProjectStatus, TaskPriority, TaskStatus } from '@/types/enums';

/**
 * Grafik renkleri.
 *
 * Recharts renkleri SVG özniteliği olarak yazdığı için CSS değişkenleri yerine
 * çözümlenmiş renk değerleri veriyoruz. Koyu temada tonlar açılır ki koyu zeminde
 * kontrast korunsun.
 */
export interface ChartTheme {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  series: string[];
  taskStatus: Record<TaskStatus, string>;
  priority: Record<TaskPriority, string>;
  projectStatus: Record<ProjectStatus, string>;
  primary: string;
  success: string;
  warning: string;
  danger: string;
}

const LIGHT: ChartTheme = {
  grid: '#e2e8f0',
  axis: '#64748b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText: '#0f172a',
  series: ['#4f46e5', '#0ea5e9', '#8b5cf6', '#f59e0b', '#16a34a', '#dc2626'],
  taskStatus: {
    [TaskStatus.Todo]: '#94a3b8',
    [TaskStatus.InProgress]: '#4f46e5',
    [TaskStatus.InReview]: '#f59e0b',
    [TaskStatus.Done]: '#16a34a',
  },
  priority: {
    [TaskPriority.Low]: '#94a3b8',
    [TaskPriority.Medium]: '#0ea5e9',
    [TaskPriority.High]: '#f59e0b',
    [TaskPriority.Critical]: '#dc2626',
  },
  projectStatus: {
    [ProjectStatus.Planning]: '#94a3b8',
    [ProjectStatus.Active]: '#4f46e5',
    [ProjectStatus.OnHold]: '#f59e0b',
    [ProjectStatus.Completed]: '#16a34a',
    [ProjectStatus.Cancelled]: '#dc2626',
  },
  primary: '#4f46e5',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const DARK: ChartTheme = {
  grid: '#24314a',
  axis: '#94a3b8',
  tooltipBg: '#111a2e',
  tooltipBorder: '#24314a',
  tooltipText: '#e2e8f0',
  series: ['#818cf8', '#38bdf8', '#a78bfa', '#fbbf24', '#4ade80', '#f87171'],
  taskStatus: {
    [TaskStatus.Todo]: '#94a3b8',
    [TaskStatus.InProgress]: '#818cf8',
    [TaskStatus.InReview]: '#fbbf24',
    [TaskStatus.Done]: '#4ade80',
  },
  priority: {
    [TaskPriority.Low]: '#94a3b8',
    [TaskPriority.Medium]: '#38bdf8',
    [TaskPriority.High]: '#fbbf24',
    [TaskPriority.Critical]: '#f87171',
  },
  projectStatus: {
    [ProjectStatus.Planning]: '#94a3b8',
    [ProjectStatus.Active]: '#818cf8',
    [ProjectStatus.OnHold]: '#fbbf24',
    [ProjectStatus.Completed]: '#4ade80',
    [ProjectStatus.Cancelled]: '#f87171',
  },
  primary: '#818cf8',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return useMemo(() => (resolvedTheme === 'dark' ? DARK : LIGHT), [resolvedTheme]);
}

/** Recharts `Tooltip` bileşeni için ortak stil. */
export function tooltipStyles(theme: ChartTheme) {
  return {
    contentStyle: {
      backgroundColor: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: 8,
      fontSize: 12,
      color: theme.tooltipText,
      boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
    },
    labelStyle: { color: theme.tooltipText, fontWeight: 500, marginBottom: 2 },
    itemStyle: { color: theme.tooltipText },
  };
}

import { LineChart as LineChartIcon } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';
import type { Task } from '@/types/models';
import { TaskStatus } from '@/types/enums';
import { formatDayShort, parseApiDate } from '@/utils/date';

import { tooltipStyles, useChartTheme } from './chartTheme';

export interface WeeklyCompletionChartProps {
  tasks: Task[];
  /** Kaç günlük pencere gösterilsin. */
  days?: number;
  height?: number;
}

/**
 * Son N gün içinde tamamlanan görev sayısı.
 *
 * Veri kaynağı gerçektir: `TaskResponseDto.completedAt` alanı backend tarafından
 * görev "Done" durumuna geçtiğinde yazılır. Backend zaman serisi döndüren bir uç
 * sunmadığı için (FRONTEND_API_GAPS.md #5) gruplama istemcide yapılır; bu yüzden
 * yalnızca yüklenmiş görevler sayılır.
 */
export function WeeklyCompletionChart({ tasks, days = 14, height = 260 }: WeeklyCompletionChartProps) {
  const theme = useChartTheme();

  const buckets = new Map<string, number>();
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }

  let hasAny = false;

  for (const task of tasks) {
    if (task.status !== TaskStatus.Done || !task.completedAt) continue;

    const completed = parseApiDate(task.completedAt);
    if (!completed) continue;

    const key = completed.toISOString().slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
      hasAny = true;
    }
  }

  if (!hasAny) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="Bu dönemde tamamlanan görev yok"
        description={`Son ${days} günde "Tamamlandı" durumuna geçen görev bulunmuyor.`}
        bare
        className="py-10"
      />
    );
  }

  const data = Array.from(buckets.entries()).map(([key, value]) => {
    const date = parseApiDate(`${key}T00:00:00Z`);
    return { name: date ? formatDayShort(date) : key, value };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          stroke={theme.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          stroke={theme.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip {...tooltipStyles(theme)} formatter={(value: number) => [`${value} görev`, '']} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={theme.success}
          strokeWidth={2}
          dot={{ r: 2.5, fill: theme.success, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

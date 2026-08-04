import { PieChart as PieChartIcon } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, type TaskStatus } from '@/types/enums';

import { tooltipStyles, useChartTheme } from './chartTheme';

export interface TaskStatusChartProps {
  /** Durum → görev sayısı. */
  counts: Record<TaskStatus, number>;
  height?: number;
}

/** Görev durumu dağılımı (halka grafik). */
export function TaskStatusChart({ counts, height = 260 }: TaskStatusChartProps) {
  const theme = useChartTheme();

  const data = TASK_STATUS_ORDER.map((status) => ({
    status,
    name: TASK_STATUS_LABELS[status],
    value: counts[status] ?? 0,
  })).filter((entry) => entry.value > 0);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="Gösterilecek görev yok"
        description="Görev eklendiğinde durum dağılımı burada görünecek."
        bare
        className="py-10"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={theme.taskStatus[entry.status]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyles(theme)} formatter={(value: number) => [`${value} görev`, '']} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ color: theme.axis, fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

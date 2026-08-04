import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';

import { tooltipStyles, useChartTheme } from './chartTheme';

export interface BarDatum {
  name: string;
  value: number;
  /** Satır bazlı renk (öncelik/durum grafiklerinde). */
  color?: string;
}

export interface SimpleBarChartProps {
  data: BarDatum[];
  height?: number;
  /** Uzun etiketler için yatay çubuk düzeni. */
  layout?: 'vertical' | 'horizontal';
  /** Tooltip'te değerin yanına eklenecek birim (ör. "saat"). */
  unit?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Tek serili çubuk grafik.
 *
 * `layout="vertical"` seçildiğinde Recharts'ta kategori ekseni Y eksenidir;
 * proje/kullanıcı adları gibi uzun etiketlerde okunabilirliği korur.
 */
export function SimpleBarChart({
  data,
  height = 280,
  layout = 'horizontal',
  unit,
  emptyTitle = 'Gösterilecek veri yok',
  emptyDescription,
}: SimpleBarChartProps) {
  const theme = useChartTheme();

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={emptyTitle}
        description={emptyDescription}
        bare
        className="py-10"
      />
    );
  }

  const isVertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 12, bottom: 4, left: isVertical ? 8 : 0 }}
      >
        <CartesianGrid
          stroke={theme.grid}
          strokeDasharray="3 3"
          horizontal={!isVertical}
          vertical={isVertical}
        />
        {isVertical ? (
          <>
            <XAxis
              type="number"
              stroke={theme.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke={theme.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={130}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              stroke={theme.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={theme.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={32}
            />
          </>
        )}
        <Tooltip
          {...tooltipStyles(theme)}
          cursor={{ fill: theme.grid, opacity: 0.35 }}
          formatter={(value: number) => [unit ? `${value} ${unit}` : value, '']}
        />
        <Bar dataKey="value" radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={44}>
          {data.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={entry.color ?? theme.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

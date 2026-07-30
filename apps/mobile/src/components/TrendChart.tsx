import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import type { ProgressTrendPointDTO } from '@gym-app/shared';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

interface TrendChartProps {
  points: ProgressTrendPointDTO[];
  unit?: string;
  height?: number;
}

const CHART_WIDTH = 320;
const PADDING = 24;

export function TrendChart({ points, unit, height = 200 }: TrendChartProps) {
  const { colors, spacing } = useTheme();

  if (!points.length) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text color="inkMuted">Not enough data yet</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const coords = points.map((p, i) => {
    const x =
      points.length === 1 ? CHART_WIDTH / 2 : PADDING + (i / (points.length - 1)) * (CHART_WIDTH - PADDING * 2);
    const y = height - PADDING - ((p.value - minValue) / range) * (height - PADDING * 2);
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const latest = points[points.length - 1];

  return (
    <View style={{ gap: spacing.s8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="title">
          {latest.value}
          {unit ?? ''}
        </Text>
        {latest.label && <Text color="inkMuted">{latest.label}</Text>}
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        <Line
          x1={PADDING}
          y1={height - PADDING}
          x2={CHART_WIDTH - PADDING}
          y2={height - PADDING}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3} fill={colors.accent} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="inkMuted">
          {formatShortDate(points[0].date)}
        </Text>
        <Text variant="caption" color="inkMuted">
          {formatShortDate(latest.date)}
        </Text>
      </View>
    </View>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

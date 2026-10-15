import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { FintechTheme } from '@/constants/fintechTheme';
import type { ChartPoint } from '@/types/market';
import { formatNumber } from '@/utils/format';

interface PriceChartProps {
  points: ChartPoint[];
  width: number;
  height?: number;
  isPositive?: boolean;
  isLoading?: boolean;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  points,
  width,
  height = 200,
  isPositive = true,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="small" color={FintechTheme.colors.accent} />
        <Text style={styles.loadingText}>Grafik verisi yükleniyor...</Text>
      </View>
    );
  }

  if (!points || points.length < 2) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.emptyText}>Bu periyot için grafik verisi bulunamadı</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const paddingLeft = 10;
  const paddingRight = 60; // Fiyat etiketleri için sağ boşluk
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartWidth = Math.max(10, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(10, height - paddingTop - paddingBottom);

  const stepX = chartWidth / (points.length - 1);

  const coords = points.map((p, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = paddingTop + chartHeight - ((p.value - minVal) / range) * chartHeight;
    return { x, y };
  });

  const pathD = coords.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`),
    '',
  );

  const lastPt = coords[coords.length - 1];
  const firstPt = coords[0];
  const fillD = `${pathD} L ${lastPt.x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z`;

  const strokeColor = isPositive ? FintechTheme.colors.up : FintechTheme.colors.down;
  const gradientId = `detail_grad_${isPositive ? 'up' : 'down'}`;

  // Referans seviyeler
  const yMax = paddingTop;
  const yMid = paddingTop + chartHeight / 2;
  const yMin = paddingTop + chartHeight;
  const midVal = (maxVal + minVal) / 2;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
            <Stop offset="75%" stopColor={strokeColor} stopOpacity={0.05} />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Yatay Kılavuz Çizgileri */}
        <Line
          x1={paddingLeft}
          y1={yMax}
          x2={width - paddingRight + 5}
          y2={yMax}
          stroke={FintechTheme.colors.border}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={paddingLeft}
          y1={yMid}
          x2={width - paddingRight + 5}
          y2={yMid}
          stroke={FintechTheme.colors.border}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={paddingLeft}
          y1={yMin}
          x2={width - paddingRight + 5}
          y2={yMin}
          stroke={FintechTheme.colors.border}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Fiyat Etiketleri */}
        <SvgText
          x={width - paddingRight + 10}
          y={yMax + 4}
          fill={FintechTheme.colors.textMuted}
          fontSize={10}
          fontWeight="600"
        >
          {formatNumber(maxVal)}
        </SvgText>
        <SvgText
          x={width - paddingRight + 10}
          y={yMid + 4}
          fill={FintechTheme.colors.textMuted}
          fontSize={10}
          fontWeight="600"
        >
          {formatNumber(midVal)}
        </SvgText>
        <SvgText
          x={width - paddingRight + 10}
          y={yMin + 4}
          fill={FintechTheme.colors.textMuted}
          fontSize={10}
          fontWeight="600"
        >
          {formatNumber(minVal)}
        </SvgText>

        {/* Alan Dolgusu ve Çizgi */}
        <Path d={fillD} fill={`url(#${gradientId})`} />
        <Path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Son Nokta Vurgusu */}
        <Line
          x1={lastPt.x}
          y1={paddingTop}
          x2={lastPt.x}
          y2={paddingTop + chartHeight}
          stroke={strokeColor}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.6}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loadingText: {
    color: FintechTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  emptyText: {
    color: FintechTheme.colors.textMuted,
    fontSize: 12,
  },
});

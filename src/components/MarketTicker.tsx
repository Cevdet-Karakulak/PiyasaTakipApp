import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';

import { ASSETS } from '@/api/config';
import { FintechTheme, useThemeColors } from '@/constants/fintechTheme';
import type { MarketQuote, MarketSymbol } from '@/types/market';
import { formatPercent, formatPrice, getTrend } from '@/utils/format';

interface MarketTickerProps {
  quotes: Partial<Record<MarketSymbol, MarketQuote>>;
  onSelectSymbol: (quote: MarketQuote) => void;
}

const HIGHLIGHT_SYMBOLS: MarketSymbol[] = [
  'USDTRY=X',
  'EURTRY=X',
  'GRAM_ALTIN',
  'XU100.IS',
  'BZ=F',
];

export const MarketTicker: React.FC<MarketTickerProps> = ({ quotes, onSelectSymbol }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {HIGHLIGHT_SYMBOLS.map((sym) => {
          const q = quotes[sym];
          if (!q) return null;

          const trend = getTrend(q.changePercent);
          const isUp = trend === 'up';
          const isDown = trend === 'down';
          const assetDef = ASSETS[sym];
          const decimals = assetDef?.decimals ?? 2;

          const badgeColor = isUp
            ? colors.up
            : isDown
            ? colors.down
            : colors.neutral;

          return (
            <Pressable
              key={sym}
              style={({ pressed }) => [
                styles.pillCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => onSelectSymbol(q)}
            >
              <View style={styles.topRow}>
                <Text style={[styles.symbolText, { color: colors.textMuted }]}>
                  {q.shortName}
                </Text>
                <View style={styles.badgeRow}>
                  {isUp && <ArrowUpRight size={11} color={badgeColor} strokeWidth={2.5} />}
                  {isDown && <ArrowDownRight size={11} color={badgeColor} strokeWidth={2.5} />}
                  <Text style={[styles.changeText, { color: badgeColor }]}>
                    {formatPercent(q.changePercent)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.priceText, { color: colors.text }]}>
                {formatPrice(q.price, q.currency, decimals)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  pillCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 125,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  symbolText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    ...FintechTheme.typography.tabularNums,
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Star } from 'lucide-react-native';

import { ASSETS } from '@/api/config';
import { AssetIcon } from '@/components/AssetIcon';
import { MiniSparkline } from '@/components/MiniSparkline';
import { FintechTheme, useThemeColors } from '@/constants/fintechTheme';
import { useFavoritesStore } from '@/store/favoritesStore';
import type { MarketQuote } from '@/types/market';
import { formatPercent, formatPrice, getTrend } from '@/utils/format';
import { isDerivedGoldSymbol } from '@/utils/goldCalculator';

interface AssetCardProps {
  quote: MarketQuote;
  onPress: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ quote, onPress }) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const colors = useThemeColors();
  const compact = useWindowDimensions().width < 420;
  const favorited = isFavorite(quote.symbol);
  const trend = getTrend(quote.changePercent);
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const theoreticalTrend = isDerivedGoldSymbol(quote.symbol) && !!quote.goldTrend;
  const chartIsPositive = theoreticalTrend && quote.sparkline.length >= 2
    ? quote.sparkline[quote.sparkline.length - 1] >= quote.sparkline[0]
    : isUp || trend === 'flat';

  const assetDef = ASSETS[quote.symbol];
  const decimals = assetDef?.decimals ?? (quote.price >= 1000 ? 2 : 2);

  const badgeBg = isUp
    ? colors.upSoft
    : isDown
    ? colors.downSoft
    : 'rgba(148, 163, 184, 0.12)';

  const badgeColor = isUp
    ? colors.up
    : isDown
    ? colors.down
    : colors.neutral;

  const miniChart = (
    <View style={[styles.chartSection, compact && styles.compactChart]} testID={`trend-${quote.symbol}`} accessible
        accessibilityLabel={theoreticalTrend ? 'Teorik günlük altın trendi' : 'Günlük fiyat trendi'}>
        {quote.sparkline && quote.sparkline.length >= 2 ? (
          <MiniSparkline
            data={quote.sparkline}
            width={58}
            height={26}
            isPositive={chartIsPositive}
          />
        ) : (
          <View style={{ width: 58 }} />
        )}
        {theoreticalTrend && <Text style={[styles.trendLabel, { color: colors.textMuted }]}>Teorik</Text>}
      </View>
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && {
          backgroundColor: colors.surfaceHighlight,
          borderColor: colors.borderLight,
        },
      ]}
      onPress={onPress}
    >
      {/* Sol: İkon Rozeti + Sembol ve Başlık */}
      <View style={[styles.leftSection, compact && styles.compactLeft]}>
        <AssetIcon symbol={quote.symbol} category={quote.category} size={38} />
        
        <View style={styles.textContainer}>
          <View style={styles.symbolRow}>
            <Text
              style={[styles.symbolText, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {quote.shortName}
            </Text>
            {quote.isStale && (
              <View style={[styles.staleTag, { backgroundColor: colors.goldSoft }]}>
                <Text style={[styles.staleTagText, { color: colors.gold }]}>Eski</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.nameText, { color: colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {quote.name}
          </Text>
          {compact && miniChart}
        </View>
      </View>

      {/* Orta: Mini Grafik */}
      {!compact && miniChart}

      {/* Sağ: Fiyat & Değişim Rozeti & Favori Butonu */}
      <View style={[styles.rightSection, compact && styles.compactRight]}>
        <View style={[styles.priceContainer, compact && styles.compactPrice]}>
          <Text
            style={[styles.priceText, compact && { fontSize: 14 }, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatPrice(quote.price, quote.currency, decimals)}
          </Text>

          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            {isUp && <ArrowUpRight size={13} color={badgeColor} strokeWidth={2.5} />}
            {isDown && <ArrowDownRight size={13} color={badgeColor} strokeWidth={2.5} />}
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {formatPercent(quote.changePercent)}
            </Text>
          </View>
        </View>

        {/* Favori Yıldızı */}
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(quote.symbol);
          }}
          style={styles.starButton}
        >
          <Star
            size={18}
            color={favorited ? colors.gold : colors.borderLight}
            fill={favorited ? colors.gold : 'transparent'}
          />
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.5,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  symbolText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  staleTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  staleTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  nameText: {
    maxWidth: '100%',
    fontSize: 12,
  },
  chartSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  compactLeft: { flex: 1, flexBasis: 0, flexShrink: 1, minWidth: 0 },
  compactRight: { width: 134, flexBasis: 134, flex: 0, flexShrink: 0, gap: 6 },
  compactPrice: { width: 105 },
  compactChart: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 0 },
  trendLabel: { fontSize: 8, marginTop: 2 },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-end',
    flex: 1.4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    ...FintechTheme.typography.tabularNums,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  starButton: {
    padding: 2,
  },
});


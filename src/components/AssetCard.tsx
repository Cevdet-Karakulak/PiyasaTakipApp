import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Star } from 'lucide-react-native';

import { ASSETS } from '@/api/config';
import { AssetIcon } from '@/components/AssetIcon';
import { MiniSparkline } from '@/components/MiniSparkline';
import { FintechTheme } from '@/constants/fintechTheme';
import { useFavoritesStore } from '@/store/favoritesStore';
import type { MarketQuote } from '@/types/market';
import { formatPercent, formatPrice, getTrend } from '@/utils/format';

interface AssetCardProps {
  quote: MarketQuote;
  onPress: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ quote, onPress }) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorite(quote.symbol);
  const trend = getTrend(quote.changePercent);
  const isUp = trend === 'up';
  const isDown = trend === 'down';

  const assetDef = ASSETS[quote.symbol];
  const decimals = assetDef?.decimals ?? (quote.price >= 1000 ? 2 : 2);

  const badgeBg = isUp
    ? FintechTheme.colors.upSoft
    : isDown
    ? FintechTheme.colors.downSoft
    : 'rgba(148, 163, 184, 0.12)';

  const badgeColor = isUp
    ? FintechTheme.colors.up
    : isDown
    ? FintechTheme.colors.down
    : FintechTheme.colors.neutral;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Sol: İkon Rozeti + Sembol ve Başlık */}
      <View style={styles.leftSection}>
        <AssetIcon symbol={quote.symbol} category={quote.category} size={38} />
        
        <View style={styles.textContainer}>
          <View style={styles.symbolRow}>
            <Text
              style={styles.symbolText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {quote.shortName}
            </Text>
            {quote.isStale && (
              <View style={styles.staleTag}>
                <Text style={styles.staleTagText}>Eski</Text>
              </View>
            )}
          </View>
          <Text
            style={styles.nameText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {quote.name}
          </Text>
        </View>
      </View>

      {/* Orta: Mini Grafik */}
      <View style={styles.chartSection}>
        {quote.sparkline && quote.sparkline.length >= 2 ? (
          <MiniSparkline
            data={quote.sparkline}
            width={58}
            height={26}
            isPositive={isUp || trend === 'flat'}
          />
        ) : (
          <View style={{ width: 58 }} />
        )}
      </View>

      {/* Sağ: Fiyat & Değişim Rozeti & Favori Butonu */}
      <View style={styles.rightSection}>
        <View style={styles.priceContainer}>
          <Text
            style={styles.priceText}
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
            color={favorited ? FintechTheme.colors.gold : FintechTheme.colors.borderLight}
            fill={favorited ? FintechTheme.colors.gold : 'transparent'}
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
    backgroundColor: FintechTheme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  cardPressed: {
    backgroundColor: FintechTheme.colors.surfaceHighlight,
    borderColor: FintechTheme.colors.borderLight,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.5,
  },
  textContainer: {
    flex: 1,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
    letterSpacing: 0.2,
  },
  staleTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  staleTagText: {
    color: FintechTheme.colors.gold,
    fontSize: 10,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  chartSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
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
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
    marginBottom: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  starButton: {
    padding: 4,
  },
});

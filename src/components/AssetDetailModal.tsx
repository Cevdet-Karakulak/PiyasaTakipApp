import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowDownRight, ArrowUpRight, Calculator, CheckCircle2, Clock, Star, X } from 'lucide-react-native';

import { ASSETS } from '@/api/config';
import { AssetIcon } from '@/components/AssetIcon';
import { fetchHistoricalChart } from '@/api/marketService';
import { PriceChart } from '@/components/PriceChart';
import { isDerivedGoldSymbol } from '@/utils/goldCalculator';
import { FintechTheme } from '@/constants/fintechTheme';
import { useFavoritesStore } from '@/store/favoritesStore';
import type { ChartPoint, HistoricalRange, MarketQuote } from '@/types/market';
import { formatNumber, formatPercent, formatPrice, formatTime, getTrend } from '@/utils/format';

interface AssetDetailModalProps {
  quote: MarketQuote | null;
  visible: boolean;
  onClose: () => void;
}

const RANGES: { key: HistoricalRange; label: string }[] = [
  { key: '1d', label: '1G' },
  { key: '1w', label: '1H' },
  { key: '1mo', label: '1A' },
  { key: '1y', label: '1Y' },
];

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ quote, visible, onClose }) => {
  const [range, setRange] = useState<HistoricalRange>('1d');
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartKey, setChartKey] = useState('');
  const [retry, setRetry] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [calcQuantity, setCalcQuantity] = useState('1');

  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const symbol = quote?.symbol;
  const activeChartKey = `${symbol}:${range}`;

  useEffect(() => {
    if (!visible || !symbol) return;

    let isMounted = true;

    // Asenkron mikrogörev ile tetikleyerek senkron render kaskadı önlenir
    queueMicrotask(async () => {
      if (!isMounted) return;
      setIsLoadingChart(true);
      setChartPoints([]);
      setChartError(null);
      setChartKey(`${symbol}:${range}`);
      try {
        const points = await fetchHistoricalChart(symbol, range);
        if (!isMounted) return;
        setChartPoints(points);
      } catch (error) {
        if (isMounted) setChartError(error instanceof Error ? error.message : 'Geçmiş fiyatlar yüklenemedi.');
      } finally {
        if (isMounted) setIsLoadingChart(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visible, symbol, range, retry]);

  if (!quote) return null;

  const favorited = isFavorite(quote.symbol);
  const trend = getTrend(quote.changePercent);
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const assetDef = ASSETS[quote.symbol];
  const decimals = assetDef?.decimals ?? 2;

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = measuredWidth || Math.min(screenWidth - 64, 568);

  // Hızlı hesaplama
  const parsedQty = parseFloat(calcQuantity.replace(',', '.')) || 0;
  const calculatedTotal = parsedQty * quote.price;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Üst Bar / Başlık */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AssetIcon symbol={quote.symbol} category={quote.category} size={42} />
              <View style={styles.headerTitleContainer}>
                <View style={styles.badgeCategory}>
                  <Text style={styles.badgeCategoryText}>
                    {quote.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.headerTitle}>{quote.name}</Text>
                <Text style={styles.headerSubtitle}>{quote.symbol}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => toggleFavorite(quote.symbol)}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Star
                  size={20}
                  color={favorited ? FintechTheme.colors.gold : FintechTheme.colors.borderLight}
                  fill={favorited ? FintechTheme.colors.gold : 'transparent'}
                />
              </Pressable>

              <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
                <X size={22} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Büyük Fiyat Alanı */}
            <View style={styles.priceHero}>
              <Text style={styles.heroPrice}>
                {formatPrice(quote.price, quote.currency, decimals)}
              </Text>

              <View style={styles.changeRow}>
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor: isUp
                        ? FintechTheme.colors.upSoft
                        : isDown
                        ? FintechTheme.colors.downSoft
                        : 'rgba(148, 163, 184, 0.12)',
                    },
                  ]}
                >
                  {isUp && <ArrowUpRight size={15} color={FintechTheme.colors.up} strokeWidth={2.5} />}
                  {isDown && <ArrowDownRight size={15} color={FintechTheme.colors.down} strokeWidth={2.5} />}
                  <Text
                    style={[
                      styles.changeBadgeText,
                      {
                        color: isUp
                          ? FintechTheme.colors.up
                          : isDown
                          ? FintechTheme.colors.down
                          : FintechTheme.colors.neutral,
                      },
                    ]}
                  >
                    {formatPercent(quote.changePercent)}
                  </Text>
                </View>

                {quote.change != null && (
                  <Text style={styles.changeAmount}>
                    ({quote.change > 0 ? '+' : ''}
                    {formatNumber(quote.change, decimals)} {quote.currency})
                  </Text>
                )}
              </View>

              {/* Borsa Son İşlem Saati ve 15dk Gecikme Bilgisi */}
              <View style={styles.marketTimeBlock}>
                <View style={styles.marketTimeRow}>
                  <Clock size={12} color={FintechTheme.colors.textMuted} />
                  <Text style={styles.marketTimeText}>
                    {quote.category === 'stock' || quote.category === 'index' || quote.symbol.endsWith('.IS')
                      ? `Son İşlem (Borsa): ${formatTime(quote.marketTime)}`
                      : `Son İşlem (Piyasa): ${formatTime(quote.marketTime)}`}
                  </Text>
                </View>
                {(quote.category === 'stock' || quote.category === 'index' || quote.symbol.endsWith('.IS')) && (
                  <Text style={styles.delayNoticeText}>
                    (BIST verileri yasal olarak 15dk gecikmelidir)
                  </Text>
                )}
              </View>
            </View>

            {/* Periyot Seçici Sekmeleri (1G, 1H, 1A, 1Y) */}
            <View style={styles.rangeSelector}>
              {RANGES.map((r) => {
                const isActive = range === r.key;
                return (
                  <Pressable
                    key={r.key}
                    style={[styles.rangeTab, isActive && styles.rangeTabActive]}
                    onPress={() => setRange(r.key)}
                  >
                    <Text style={[styles.rangeTabText, isActive && styles.rangeTabTextActive]}>
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Fiyat Grafiği */}
            <View style={styles.chartWrapper} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}>
              {chartError && chartKey === activeChartKey ? (
                <View style={{ padding: 20, gap: 16 }} accessibilityLiveRegion="polite">
                  <Text style={styles.statLabel}>{chartError}</Text>
                  <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={styles.iconBtn}>
                    <Text style={styles.statValue}>Yeniden dene</Text>
                  </Pressable>
                </View>
              ) : (
              <PriceChart
                points={chartKey === activeChartKey ? chartPoints : []}
                width={chartWidth}
                height={200}
                isPositive={chartPoints.length > 1 ? chartPoints[chartPoints.length - 1].value >= chartPoints[0].value : true}
                isLoading={isLoadingChart || chartKey !== activeChartKey}
              />
              )}
            </View>
            {isDerivedGoldSymbol(quote.symbol) && (
              <Text style={[styles.statLabel, { paddingHorizontal: 4, marginTop: 8 }]}>
                Grafik: Yahoo ons altın vadeli fiyatı × dönemin USD/TL kuru ile hesaplanan teorik has değer. Truncgil alış/satış geçmişi değildir; prim ve işçilik içermez.
              </Text>
            )}
            {chartKey === activeChartKey && chartPoints.length > 1 && !isLoadingChart && (
              <Text style={[styles.statLabel, { marginTop: 8 }]}>
                {new Date(chartPoints[0].timestamp).toLocaleString('tr-TR')} – {new Date(chartPoints[chartPoints.length - 1].timestamp).toLocaleString('tr-TR')}
              </Text>
            )}

            {/* Gün İçi En Yüksek / En Düşük & İstatistik Kutuları */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Piyasa İstatistikleri</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Gün İçi En Yüksek</Text>
                  <Text style={[styles.statValue, { color: FintechTheme.colors.up }]}>
                    {quote.dayHigh ? formatPrice(quote.dayHigh, quote.currency, decimals) : '—'}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Gün İçi En Düşük</Text>
                  <Text style={[styles.statValue, { color: FintechTheme.colors.down }]}>
                    {quote.dayLow ? formatPrice(quote.dayLow, quote.currency, decimals) : '—'}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Önceki Kapanış</Text>
                  <Text style={styles.statValue}>
                    {quote.previousClose ? formatPrice(quote.previousClose, quote.currency, decimals) : '—'}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Veri Kaynağı</Text>
                  <View style={styles.sourceTag}>
                    <CheckCircle2 size={12} color={FintechTheme.colors.up} />
                    <Text style={styles.sourceTagText}>
                      {quote.source === 'yahoo'
                        ? 'Yahoo Finance'
                        : quote.source === 'truncgil'
                        ? 'Truncgil API'
                        : quote.source === 'calculated'
                        ? 'Hesaplanan (Has Altın)'
                        : 'Önbellek'}
                    </Text>
                  </View>
                </View>

                {quote.bid && quote.ask && (
                  <>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Alış (Bid)</Text>
                      <Text style={styles.statValue}>
                        {formatPrice(quote.bid, quote.currency, decimals)}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Satış (Ask)</Text>
                      <Text style={styles.statValue}>
                        {formatPrice(quote.ask, quote.currency, decimals)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Hızlı Hesaplama Kutusu */}
            <View style={styles.calcCard}>
              <View style={styles.calcHeader}>
                <Calculator size={18} color={FintechTheme.colors.accent} />
                <Text style={styles.calcTitle}>Hızlı Hesaplama</Text>
              </View>

              <View style={styles.calcRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Miktar ({quote.shortName}):</Text>
                  <TextInput
                    style={styles.calcInput}
                    keyboardType="numeric"
                    value={calcQuantity}
                    onChangeText={setCalcQuantity}
                    placeholder="1"
                    placeholderTextColor={FintechTheme.colors.textMuted}
                  />
                </View>

                <View style={styles.calcResultContainer}>
                  <Text style={styles.inputLabel}>Tahmini Toplam:</Text>
                  <Text style={styles.calcResultText}>
                    {formatPrice(calculatedTotal, quote.currency, decimals)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: FintechTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: FintechTheme.colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  badgeCategory: {
    alignSelf: 'flex-start',
    backgroundColor: FintechTheme.colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  badgeCategoryText: {
    color: FintechTheme.colors.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: FintechTheme.colors.surfaceHighlight,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  priceHero: {
    marginBottom: 16,
  },
  heroPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  changeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  changeAmount: {
    fontSize: 13,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  marketTimeBlock: {
    marginTop: 8,
    gap: 2,
  },
  marketTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marketTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  delayNoticeText: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    fontStyle: 'italic',
    paddingLeft: 16,
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  rangeTabActive: {
    backgroundColor: FintechTheme.colors.accent,
  },
  rangeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  rangeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chartWrapper: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.text,
  },
  calcCard: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginBottom: 20,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  calcTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    marginBottom: 4,
  },
  calcInput: {
    backgroundColor: FintechTheme.colors.surface,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: FintechTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  calcResultContainer: {
    flex: 1.3,
  },
  calcResultText: {
    fontSize: 18,
    fontWeight: '800',
    color: FintechTheme.colors.accent,
    ...FintechTheme.typography.tabularNums,
  },
});


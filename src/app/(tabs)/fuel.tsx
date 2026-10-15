import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Droplet,
  Flame,
  Fuel,
  Gauge,
  Info,
  MapPin,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

import {
  calculateFuelPrediction,
  fetchProvinceFuelPrices,
  FUEL_PROVINCES,
  type FuelPrices,
  type FuelProvince,
} from '@/api/fuelService';
import { FintechTheme } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { formatNumber, formatPercent } from '@/utils/format';

type FuelType = 'motorin' | 'benzin' | 'lpg';

export default function FuelScreen() {
  const { quotes, isRefreshing: isMarketRefreshing, refresh: refreshMarkets } = useMarketData();

  const [selectedProvince, setSelectedProvince] = useState<FuelProvince>(FUEL_PROVINCES[0]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Depo Hesaplayıcı state
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('motorin');
  const [tankLiters, setTankLiters] = useState<number>(50);
  const [customLitersInput, setCustomLitersInput] = useState<string>('50');

  const brentQuote = quotes['BZ=F'];
  const usdTryQuote = quotes['USDTRY=X'];

  const brentChange = brentQuote?.changePercent ?? 0;
  const usdTryChange = usdTryQuote?.changePercent ?? 0;

  // Akaryakıt fiyatlarını çek
  const loadFuelPrices = useCallback(async (province = selectedProvince, force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setIsLoadingPrices(true);

      const data = await fetchProvinceFuelPrices(province, force);
      setFuelPrices(data);
    } catch (err) {
      console.warn('Akaryakıt verisi alınamadı:', err);
    } finally {
      setIsLoadingPrices(false);
      setIsRefreshing(false);
    }
  }, [selectedProvince]);

  useEffect(() => {
    queueMicrotask(() => {
      loadFuelPrices(selectedProvince, false);
    });
  }, [selectedProvince, loadFuelPrices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      loadFuelPrices(selectedProvince, true),
      refreshMarkets(),
    ]);
    setIsRefreshing(false);
  };

  const handleProvinceSelect = (province: FuelProvince) => {
    setSelectedProvince(province);
  };

  // Tahmin Motoru Hesaplaması
  const benzinCurrent = fuelPrices?.benzin ?? 84.0;
  const motorinCurrent = fuelPrices?.motorin ?? 97.0;

  const prediction = useMemo(() => {
    return calculateFuelPrediction(brentChange, usdTryChange, benzinCurrent, motorinCurrent);
  }, [brentChange, usdTryChange, benzinCurrent, motorinCurrent]);

  // Depo Hesaplayıcı Verileri
  const currentLiterPrice = useMemo(() => {
    if (!fuelPrices) return 0;
    if (selectedFuelType === 'benzin') return fuelPrices.benzin;
    if (selectedFuelType === 'motorin') return fuelPrices.motorin;
    return fuelPrices.lpg;
  }, [fuelPrices, selectedFuelType]);

  const estimatedDelta = useMemo(() => {
    if (selectedFuelType === 'benzin') return prediction.estimatedBenzinDelta;
    if (selectedFuelType === 'motorin') return prediction.estimatedMotorinDelta;
    return Number((prediction.estimatedBenzinDelta * 0.4).toFixed(2));
  }, [selectedFuelType, prediction]);

  const currentTotal = tankLiters * currentLiterPrice;
  const deltaTotal = tankLiters * estimatedDelta;
  const newTotal = currentTotal + deltaTotal;

  const handleLitersChange = (num: number) => {
    setTankLiters(num);
    setCustomLitersInput(String(num));
  };

  const handleCustomLitersText = (text: string) => {
    setCustomLitersInput(text);
    const parsed = parseFloat(text.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
      setTankLiters(parsed);
    }
  };

  // Risk Bar Pozisyonu (-100 ile +100 arasını %0 - %100'e haritala)
  const clampedChange = Math.max(-5, Math.min(5, prediction.compositeChange));
  const pointerPercent = ((clampedChange + 5) / 10) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <View style={styles.iconCircle}>
              <Fuel size={20} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <Text style={styles.headerTitle}>Akaryakıt & Zam Takibi</Text>
          </View>
          <Text style={styles.headerSub}>Canlı pompa fiyatları ve EPDK zam/indirim tahmin motoru</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
          onPress={handleRefresh}
          disabled={isRefreshing || isMarketRefreshing}
          hitSlop={8}
        >
          {isRefreshing || isMarketRefreshing ? (
            <ActivityIndicator size="small" color={FintechTheme.colors.accent} />
          ) : (
            <RefreshCw size={18} color={FintechTheme.colors.text} />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={FintechTheme.colors.accent}
            colors={[FintechTheme.colors.accent]}
          />
        }
      >
        {/* İl Seçici Yatay Kaydırma */}
        <View style={styles.provinceSection}>
          <View style={styles.provinceHeader}>
            <MapPin size={14} color={FintechTheme.colors.accent} />
            <Text style={styles.provinceSectionTitle}>Şehir Seçimi (Opet & EPDK)</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.provinceList}
          >
            {FUEL_PROVINCES.map((prov) => {
              const active = selectedProvince.id === prov.id;
              return (
                <Pressable
                  key={prov.id}
                  style={[styles.provincePill, active && styles.provincePillActive]}
                  onPress={() => handleProvinceSelect(prov)}
                >
                  <Text style={[styles.provinceText, active && styles.provinceTextActive]}>
                    {prov.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Canlı Akaryakıt Pompa Fiyat Kartları */}
        {isLoadingPrices && !fuelPrices ? (
          <View style={styles.priceLoadingBox}>
            <ActivityIndicator size="small" color={FintechTheme.colors.accent} />
            <Text style={styles.priceLoadingText}>Pompa fiyatları yükleniyor...</Text>
          </View>
        ) : (
          <View style={styles.fuelCardsGrid}>
            {/* Kurşunsuz Benzin 95 */}
            <View style={styles.fuelCard}>
              <View style={styles.fuelCardHeader}>
                <View style={[styles.fuelIconBadge, { backgroundColor: FintechTheme.colors.energySoft }]}>
                  <Flame size={18} color={FintechTheme.colors.energy} strokeWidth={2.4} />
                </View>
                <View style={styles.fuelBadge}>
                  <Text style={styles.fuelBadgeText}>95 Oktan</Text>
                </View>
              </View>
              <Text style={styles.fuelName}>Benzin</Text>
              <Text style={styles.fuelPrice}>
                {formatNumber(fuelPrices?.benzin, 2)} <Text style={styles.currencyUnit}>TL / Lt</Text>
              </Text>
              <Text style={styles.fuelSubText}>{selectedProvince.name}</Text>
            </View>

            {/* Motorin (Dizel) */}
            <View style={styles.fuelCard}>
              <View style={styles.fuelCardHeader}>
                <View style={[styles.fuelIconBadge, { backgroundColor: 'rgba(41, 98, 255, 0.15)' }]}>
                  <Droplet size={18} color={FintechTheme.colors.accent} strokeWidth={2.4} />
                </View>
                <View style={styles.fuelBadge}>
                  <Text style={styles.fuelBadgeText}>UltraForce</Text>
                </View>
              </View>
              <Text style={styles.fuelName}>Motorin</Text>
              <Text style={styles.fuelPrice}>
                {formatNumber(fuelPrices?.motorin, 2)} <Text style={styles.currencyUnit}>TL / Lt</Text>
              </Text>
              <Text style={styles.fuelSubText}>{selectedProvince.name}</Text>
            </View>

            {/* LPG / Otogaz */}
            <View style={styles.fuelCard}>
              <View style={styles.fuelCardHeader}>
                <View style={[styles.fuelIconBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Zap size={18} color="#8B5CF6" strokeWidth={2.4} />
                </View>
                <View style={styles.fuelBadge}>
                  <Text style={styles.fuelBadgeText}>Otogaz</Text>
                </View>
              </View>
              <Text style={styles.fuelName}>LPG</Text>
              <Text style={styles.fuelPrice}>
                {formatNumber(fuelPrices?.lpg, 2)} <Text style={styles.currencyUnit}>TL / Lt</Text>
              </Text>
              <Text style={styles.fuelSubText}>{selectedProvince.name}</Text>
            </View>
          </View>
        )}

        {/* Akaryakıt Zam / İndirim Tahmin Motoru Kartı */}
        <View style={styles.predictionCard}>
          <View style={styles.predCardHeader}>
            <View style={styles.predTitleRow}>
              <Gauge size={18} color={FintechTheme.colors.accent} />
              <Text style={styles.predCardTitle}>Akaryakıt Zam / İndirim Tahmin Motoru</Text>
            </View>
            <View style={styles.epdkBadge}>
              <Scale size={11} color={FintechTheme.colors.textMuted} />
              <Text style={styles.epdkBadgeText}>EPDK Simülasyonu</Text>
            </View>
          </View>

          {/* Girdiler: Brent Petrol + USD/TRY Canlı Değişimleri */}
          <View style={styles.factorRow}>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Brent Petrol (%60)</Text>
              <View style={styles.factorValueRow}>
                {brentChange >= 0 ? (
                  <TrendingUp size={14} color={FintechTheme.colors.down} />
                ) : (
                  <TrendingDown size={14} color={FintechTheme.colors.up} />
                )}
                <Text
                  style={[
                    styles.factorValue,
                    { color: brentChange >= 0 ? FintechTheme.colors.down : FintechTheme.colors.up },
                  ]}
                >
                  {formatPercent(brentChange)}
                </Text>
              </View>
            </View>

            <View style={styles.factorDivider} />

            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Dolar / TL (%40)</Text>
              <View style={styles.factorValueRow}>
                {usdTryChange >= 0 ? (
                  <TrendingUp size={14} color={FintechTheme.colors.down} />
                ) : (
                  <TrendingDown size={14} color={FintechTheme.colors.up} />
                )}
                <Text
                  style={[
                    styles.factorValue,
                    { color: usdTryChange >= 0 ? FintechTheme.colors.down : FintechTheme.colors.up },
                  ]}
                >
                  {formatPercent(usdTryChange)}
                </Text>
              </View>
            </View>

            <View style={styles.factorDivider} />

            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Bileşik Maliyet</Text>
              <Text
                style={[
                  styles.factorValue,
                  {
                    color:
                      prediction.compositeChange > 0.5
                        ? FintechTheme.colors.down
                        : prediction.compositeChange < -0.5
                        ? FintechTheme.colors.up
                        : FintechTheme.colors.neutral,
                  },
                ]}
              >
                {formatPercent(prediction.compositeChange)}
              </Text>
            </View>
          </View>

          {/* Görsel Risk Barı / İbresi */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeScaleLabels}>
              <Text style={[styles.gaugeLabelText, { color: FintechTheme.colors.up }]}>İndirim (-5%)</Text>
              <Text style={[styles.gaugeLabelText, { color: FintechTheme.colors.neutral }]}>Stabil (0%)</Text>
              <Text style={[styles.gaugeLabelText, { color: FintechTheme.colors.down }]}>Zam (+5%)</Text>
            </View>

            <View style={styles.gaugeTrack}>
              <View style={styles.gaugeSegmentGreen} />
              <View style={styles.gaugeSegmentNeutral} />
              <View style={styles.gaugeSegmentRed} />
              {/* İbre İğnesi */}
              <View style={[styles.gaugePointer, { left: `${pointerPercent}%` }]} />
            </View>
          </View>

          {/* Tahmin Karar Kutusu */}
          <View
            style={[
              styles.decisionBox,
              prediction.status === 'HIKE_RISK' && styles.decisionBoxHike,
              prediction.status === 'DISCOUNT_CHANCE' && styles.decisionBoxDiscount,
              prediction.status === 'STABLE' && styles.decisionBoxStable,
            ]}
          >
            <View style={styles.decisionTopRow}>
              {prediction.status === 'HIKE_RISK' && (
                <AlertTriangle size={20} color={FintechTheme.colors.down} />
              )}
              {prediction.status === 'DISCOUNT_CHANCE' && (
                <CheckCircle2 size={20} color={FintechTheme.colors.up} />
              )}
              {prediction.status === 'STABLE' && (
                <Scale size={20} color={FintechTheme.colors.neutral} />
              )}

              <Text
                style={[
                  styles.decisionTitle,
                  prediction.status === 'HIKE_RISK' && { color: FintechTheme.colors.down },
                  prediction.status === 'DISCOUNT_CHANCE' && { color: FintechTheme.colors.up },
                  prediction.status === 'STABLE' && { color: FintechTheme.colors.neutral },
                ]}
              >
                {prediction.title}
              </Text>
            </View>

            <Text style={styles.decisionDescription}>{prediction.description}</Text>

            {/* Tahmini Pompa Yansıması */}
            <View style={styles.impactGrid}>
              <View style={styles.impactItem}>
                <Text style={styles.impactLabel}>Benzin Beklenen Pompa Etkisi:</Text>
                <Text
                  style={[
                    styles.impactValue,
                    prediction.estimatedBenzinDelta > 0
                      ? { color: FintechTheme.colors.down }
                      : prediction.estimatedBenzinDelta < 0
                      ? { color: FintechTheme.colors.up }
                      : { color: FintechTheme.colors.neutral },
                  ]}
                >
                  {prediction.estimatedBenzinDelta > 0 ? '+' : ''}
                  {formatNumber(prediction.estimatedBenzinDelta, 2)} TL / Lt
                </Text>
              </View>

              <View style={styles.impactItem}>
                <Text style={styles.impactLabel}>Motorin Beklenen Pompa Etkisi:</Text>
                <Text
                  style={[
                    styles.impactValue,
                    prediction.estimatedMotorinDelta > 0
                      ? { color: FintechTheme.colors.down }
                      : prediction.estimatedMotorinDelta < 0
                      ? { color: FintechTheme.colors.up }
                      : { color: FintechTheme.colors.neutral },
                  ]}
                >
                  {prediction.estimatedMotorinDelta > 0 ? '+' : ''}
                  {formatNumber(prediction.estimatedMotorinDelta, 2)} TL / Lt
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Depo Hesaplayıcı Kartı */}
        <View style={styles.calculatorCard}>
          <View style={styles.calcHeader}>
            <View style={styles.calcTitleRow}>
              <Calculator size={18} color={FintechTheme.colors.accent} />
              <Text style={styles.calcCardTitle}>Depo Dolum & Fark Hesaplayıcı</Text>
            </View>
          </View>

          {/* Yakıt Türü Seçimi */}
          <Text style={styles.inputSectionLabel}>Yakıt Türü Seçin:</Text>
          <View style={styles.fuelTypeRow}>
            {(['motorin', 'benzin', 'lpg'] as FuelType[]).map((type) => {
              const active = selectedFuelType === type;
              const label = type === 'motorin' ? 'Motorin (Dizel)' : type === 'benzin' ? 'Benzin (95)' : 'LPG (Otogaz)';
              return (
                <Pressable
                  key={type}
                  style={[styles.fuelTypeBtn, active && styles.fuelTypeBtnActive]}
                  onPress={() => setSelectedFuelType(type)}
                >
                  <Text style={[styles.fuelTypeBtnText, active && styles.fuelTypeBtnTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Depo Hacmi Seçimi */}
          <Text style={styles.inputSectionLabel}>Depo Hacmi (Litre):</Text>
          <View style={styles.literChipsRow}>
            {[30, 40, 50, 60].map((lit) => {
              const active = tankLiters === lit;
              return (
                <Pressable
                  key={lit}
                  style={[styles.literChip, active && styles.literChipActive]}
                  onPress={() => handleLitersChange(lit)}
                >
                  <Text style={[styles.literChipText, active && styles.literChipTextActive]}>
                    {lit} Lt
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.customLiterInputBox}>
              <TextInput
                style={styles.customLiterInput}
                keyboardType="numeric"
                value={customLitersInput}
                onChangeText={handleCustomLitersText}
                maxLength={4}
              />
              <Text style={styles.customLiterUnit}>Lt</Text>
            </View>
          </View>

          {/* Hesaplama Sonuç Tablosu */}
          <View style={styles.calcResultsBox}>
            <View style={styles.calcResultRow}>
              <Text style={styles.calcResultLabel}>Güncel Depo Dolum Tutarı ({tankLiters} Litre):</Text>
              <Text style={styles.calcResultCurrent}>
                {formatNumber(currentTotal, 2)} TL
              </Text>
            </View>

            <View style={styles.calcResultRow}>
              <Text style={styles.calcResultLabel}>Olası Zam / İndirim Farkı:</Text>
              <Text
                style={[
                  styles.calcResultDelta,
                  deltaTotal > 0
                    ? { color: FintechTheme.colors.down }
                    : deltaTotal < 0
                    ? { color: FintechTheme.colors.up }
                    : { color: FintechTheme.colors.neutral },
                ]}
              >
                {deltaTotal > 0 ? `+${formatNumber(deltaTotal, 2)} TL Fark` : deltaTotal < 0 ? `${formatNumber(deltaTotal, 2)} TL Tasarruf` : '0,00 TL'}
              </Text>
            </View>

            <View style={styles.calcDivider} />

            <View style={styles.calcResultRowHighlight}>
              <Text style={styles.calcHighlightLabel}>Tahmini Yeni Depo Tutarı:</Text>
              <Text style={styles.calcHighlightValue}>
                {formatNumber(newTotal, 2)} TL
              </Text>
            </View>

            {deltaTotal > 0 && (
              <View style={styles.tipBox}>
                <Info size={14} color={FintechTheme.colors.gold} />
                <Text style={styles.tipText}>
                  Zam öncesinde deponuzu doldurarak yaklaşık {formatNumber(deltaTotal, 2)} TL tasarruf sağlayabilirsiniz.
                </Text>
              </View>
            )}
            {deltaTotal < 0 && (
              <View style={styles.tipBox}>
                <Info size={14} color={FintechTheme.colors.up} />
                <Text style={styles.tipText}>
                  İndirim ihtimali bulunduğundan acil değilse deponuzu indirim yansıdıktan sonra doldurmanız önerilir.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.footerInfoText}>
            Akaryakıt verileri Opet dağıtıcı tavan fiyatlarından ve EPDK Akdeniz CIF maliyet endeksinden derlenmektedir. Fiyatlar il ve istasyon bazında ufak serbest piyasa farklılıkları gösterebilir.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FintechTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: FintechTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FintechTheme.colors.surface,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnPressed: {
    backgroundColor: FintechTheme.colors.surfaceHighlight,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  provinceSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  provinceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  provinceSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: FintechTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  provinceList: {
    gap: 8,
  },
  provincePill: {
    backgroundColor: FintechTheme.colors.surface,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  provincePillActive: {
    backgroundColor: FintechTheme.colors.accent,
    borderColor: FintechTheme.colors.accent,
  },
  provinceText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  provinceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  priceLoadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceLoadingText: {
    color: FintechTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  fuelCardsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  fuelCard: {
    flex: 1,
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  fuelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fuelIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fuelBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: FintechTheme.colors.textMuted,
  },
  fuelName: {
    fontSize: 13,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
    marginBottom: 4,
  },
  fuelPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
    marginBottom: 2,
  },
  currencyUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: FintechTheme.colors.textMuted,
  },
  fuelSubText: {
    fontSize: 10,
    color: FintechTheme.colors.textMuted,
  },

  // Tahmin Kartı
  predictionCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginBottom: 14,
  },
  predCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  predTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  predCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  epdkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  epdkBadgeText: {
    fontSize: 10,
    color: FintechTheme.colors.textMuted,
    fontWeight: '600',
  },
  factorRow: {
    flexDirection: 'row',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginBottom: 14,
  },
  factorItem: {
    flex: 1,
    alignItems: 'center',
  },
  factorDivider: {
    width: 1,
    backgroundColor: FintechTheme.colors.border,
    marginVertical: 2,
  },
  factorLabel: {
    fontSize: 10,
    color: FintechTheme.colors.textMuted,
    marginBottom: 4,
  },
  factorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  factorValue: {
    fontSize: 13,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  gaugeContainer: {
    marginBottom: 14,
  },
  gaugeScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gaugeLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  gaugeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: FintechTheme.colors.surfaceHighlight,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  gaugeSegmentGreen: {
    flex: 1,
    backgroundColor: FintechTheme.colors.up,
    opacity: 0.8,
  },
  gaugeSegmentNeutral: {
    flex: 1,
    backgroundColor: FintechTheme.colors.neutral,
    opacity: 0.4,
  },
  gaugeSegmentRed: {
    flex: 1,
    backgroundColor: FintechTheme.colors.down,
    opacity: 0.8,
  },
  gaugePointer: {
    position: 'absolute',
    top: -3,
    width: 6,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    marginLeft: -3,
  },
  decisionBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  decisionBoxHike: {
    backgroundColor: FintechTheme.colors.downSoft,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  decisionBoxDiscount: {
    backgroundColor: FintechTheme.colors.upSoft,
    borderColor: 'rgba(0, 192, 118, 0.4)',
  },
  decisionBoxStable: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: FintechTheme.colors.border,
  },
  decisionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  decisionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  decisionDescription: {
    fontSize: 12,
    color: FintechTheme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  impactGrid: {
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 10,
  },
  impactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  impactValue: {
    fontSize: 13,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },

  // Depo Hesaplayıcı
  calculatorCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginBottom: 14,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calcTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calcCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  inputSectionLabel: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 8,
  },
  fuelTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  fuelTypeBtn: {
    flex: 1,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    alignItems: 'center',
  },
  fuelTypeBtnActive: {
    backgroundColor: FintechTheme.colors.accent,
    borderColor: FintechTheme.colors.accent,
  },
  fuelTypeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  fuelTypeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  literChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  literChip: {
    flex: 1,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    alignItems: 'center',
  },
  literChipActive: {
    backgroundColor: FintechTheme.colors.surfaceHighlight,
    borderColor: FintechTheme.colors.accent,
  },
  literChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  literChipTextActive: {
    color: FintechTheme.colors.accent,
    fontWeight: '700',
  },
  customLiterInputBox: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    paddingHorizontal: 8,
    height: 36,
  },
  customLiterInput: {
    flex: 1,
    color: FintechTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 0,
  },
  customLiterUnit: {
    color: FintechTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  calcResultsBox: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  calcResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calcResultLabel: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  calcResultCurrent: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
  },
  calcResultDelta: {
    fontSize: 13,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  calcDivider: {
    height: 1,
    backgroundColor: FintechTheme.colors.border,
    marginVertical: 8,
  },
  calcResultRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcHighlightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  calcHighlightValue: {
    fontSize: 17,
    fontWeight: '800',
    color: FintechTheme.colors.accent,
    ...FintechTheme.typography.tabularNums,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: FintechTheme.colors.textSecondary,
    lineHeight: 16,
  },
  footerInfo: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  footerInfoText: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

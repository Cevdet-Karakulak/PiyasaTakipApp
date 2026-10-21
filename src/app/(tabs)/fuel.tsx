import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, Droplet, Flame, Fuel, Info, MapPin, RefreshCw, Zap } from 'lucide-react-native';

import { fetchProvinceFuelPrices, FUEL_PROVINCES, type FuelPrices } from '@/api/fuelService';
import { fetchFuelNews } from '@/api/newsService';
import { FintechTheme } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { formatNumber, formatPercent } from '@/utils/format';
import { calculateFuelScenario } from '@/utils/fuelScenario';

type FuelType = 'motorin' | 'benzin' | 'lpg';

export default function FuelScreen() {
  const { quotes, refresh: refreshMarkets } = useMarketData();
  const [selectedProvince, setSelectedProvince] = useState(FUEL_PROVINCES[0]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [news, setNews] = useState<Awaited<ReturnType<typeof fetchFuelNews>> | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('motorin');
  const [litersInput, setLitersInput] = useState('50');
  const [deltaInput, setDeltaInput] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const prices = fuelPrices?.provinceName === selectedProvince.name && (fuelPrices.updatedAt === null || now - fuelPrices.updatedAt < 24 * 60 * 60_000) ? fuelPrices : null;

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchProvinceFuelPrices(selectedProvince, refreshToken > 0),
      fetchFuelNews(),
    ]).then(([data, headlines]) => {
      if (active) { setFuelPrices(data); setNews(headlines); }
    }).finally(() => {
      if (active) { setIsLoadingPrices(false); setIsRefreshing(false); }
    });
    return () => { active = false; };
  }, [selectedProvince, refreshToken]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshToken((value) => value + 1);
    void refreshMarkets();
  };

  const scenario = calculateFuelScenario(prices?.[selectedFuelType], litersInput, deltaInput);
  const brent = quotes['BZ=F'];
  const usd = quotes['USDTRY=X'];
  const marketChange = (q: typeof brent) => q && !q.isStale && now - q.marketTime <= 4 * 86_400_000 && q.marketTime <= now + 300_000 ? q.changePercent : null;
  const openNews = (url: string) => { if (/^https:\/\//.test(url)) void Linking.openURL(url).catch(() => {}); };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <View style={styles.iconCircle}><Fuel size={20} color="#FFFFFF" /></View>
            <Text style={styles.headerTitle}>Akaryakıt Takibi</Text>
          </View>
          <Text style={styles.headerSub}>Kaynak fiyatları ve zam / indirim haberleri</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Akaryakıt verilerini yenile" style={styles.refreshBtn} onPress={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <ActivityIndicator color={FintechTheme.colors.accent} /> : <RefreshCw size={18} color={FintechTheme.colors.text} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={FintechTheme.colors.accent} />}>
        <View style={styles.provinceSection}>
          <View style={styles.provinceHeader}><MapPin size={14} color={FintechTheme.colors.accent} /><Text style={styles.provinceSectionTitle}>Şehir Seçimi · Opet</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.provinceList}>
            {FUEL_PROVINCES.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: selectedProvince.id === p.id }} style={[styles.provincePill, selectedProvince.id === p.id && styles.provincePillActive]} onPress={() => { if (p.id !== selectedProvince.id) { setIsLoadingPrices(true); setSelectedProvince(p); } }}>
                <Text style={[styles.provinceText, selectedProvince.id === p.id && styles.provinceTextActive]}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {isLoadingPrices && !prices ? <View style={styles.priceLoadingBox}><ActivityIndicator color={FintechTheme.colors.accent} /><Text style={styles.priceLoadingText}>Kaynak fiyatları yükleniyor...</Text></View> : (
          <View style={styles.fuelCardsGrid}>
            {([{ key: 'benzin', name: 'Benzin', Icon: Flame }, { key: 'motorin', name: 'Motorin', Icon: Droplet }, { key: 'lpg', name: 'LPG', Icon: Zap }] as const).map(({ key, name, Icon }) => (
              <View key={key} style={styles.fuelCard}>
                <Icon size={22} color={FintechTheme.colors.accent} />
                <Text style={styles.fuelName}>{name}</Text>
                <Text style={styles.fuelPrice}>{formatNumber(prices?.[key], 2)}</Text>
                <Text style={styles.fuelSubText}>{prices?.[key] == null ? 'Kaynak verisi yok' : 'TL / litre'}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.footerInfoText, { marginVertical: 12 }]}>
          {prices?.source === 'unavailable' || !prices ? 'Fiyat kaynağına ulaşılamadı; güncel fiyat doğrulanamadı.' : `${prices.source === 'cache' ? (prices.isStale ? 'Bağlantı kurulamadı · Eski kayıt' : 'Önbellek') : 'Opet kaynak sorgusu'} · ${new Date(prices.updatedAt!).toLocaleString('tr-TR')}${prices.districtName ? ` · ${prices.districtName}` : ''}`}
          {'\n'}LPG için doğrulanmış veri yok. İlçe örnek fiyatları istasyonda farklı olabilir.
        </Text>

        <View style={styles.predictionCard}>
          <Text style={styles.predCardTitle}>Zam / İndirim Haberleri</Text>
          <View style={[styles.decisionBox, { marginTop: 16 }]}>
            <Text style={styles.decisionTitle}>KESİNLEŞMİŞ FİYAT DEĞİŞİMİ DOĞRULANAMADI</Text>
            <Text style={styles.decisionDescription}>Bu ifade zam veya indirim olmayacağı anlamına gelmez. Haberlerde bildirilen beklentiler aşağıdadır; tarih, ürün ve tutarı kaynak haberde kontrol edin. Brent ve doların günlük değişimi, pompa fiyatı veya yürürlük tarihi tahmini değildir.</Text>
          </View>
          {!news ? <ActivityIndicator style={{ marginVertical: 20 }} color={FintechTheme.colors.accent} /> : (
            <>
              <Text style={[styles.footerInfoText, { marginTop: 12 }]}>Son haber sorgusu: {new Date(news.fetchedAt).toLocaleString('tr-TR')}</Text>
              {news.error ? <Text style={styles.decisionDescription}>Haber servisine ulaşılamadı. Zam / indirim durumu bilinmiyor.</Text> : news.articles.length === 0 ? <Text style={styles.decisionDescription}>Son 3 güne ait ilgili haber bulunamadı. Bu, fiyatların sabit kalacağı anlamına gelmez.</Text> : news.articles.map((article) => (
                <Pressable key={article.id} accessibilityRole="link" onPress={() => openNews(article.link)} style={[styles.decisionBox, { marginTop: 12 }]}>
                  <Text style={styles.decisionTitle}>{article.title}</Text>
                  <Text style={styles.footerInfoText}>{new Date(article.publishedAt).toLocaleString('tr-TR')} · {article.source} · Haberi aç ↗</Text>
                  <Text style={styles.footerInfoText}>Yayıncı haberi · Resmî fiyat teyidi değildir</Text>
                </Pressable>
              ))}
            </>
          )}
          <Pressable accessibilityRole="link" style={{ paddingVertical: 16 }} onPress={() => openNews('https://news.google.com/search?q=akaryak%C4%B1t%20zam%20indirim&hl=tr&gl=TR&ceid=TR%3Atr')}><Text style={{ color: FintechTheme.colors.accent }}>Tüm akaryakıt haberlerini aç ↗</Text></Pressable>
          <View style={styles.factorRow}>
            <View style={styles.factorItem}><Text style={styles.factorLabel}>Brent · günlük</Text><Text style={styles.factorValue}>{formatPercent(marketChange(brent))}</Text></View>
            <View style={styles.factorItem}><Text style={styles.factorLabel}>USD/TL · günlük</Text><Text style={styles.factorValue}>{formatPercent(marketChange(usd))}</Text></View>
          </View>
        </View>

        <View style={styles.calculatorCard}>
          <View style={styles.calcTitleRow}><Calculator size={18} color={FintechTheme.colors.accent} /><Text style={styles.calcCardTitle}>Depo & Senaryo Hesaplayıcı</Text></View>
          <Text style={styles.decisionDescription}>Haberdeki litre başına değişimi kendiniz girin. Bu hesap bir tahmin veya teyit değildir.</Text>
          <View style={styles.fuelTypeRow}>
            {(['motorin', 'benzin', 'lpg'] as FuelType[]).map((type) => <Pressable accessibilityRole="button" key={type} onPress={() => { setSelectedFuelType(type); setDeltaInput(''); }} style={[styles.fuelTypeBtn, selectedFuelType === type && styles.fuelTypeBtnActive]}><Text style={[styles.fuelTypeBtnText, selectedFuelType === type && { color: "#FFFFFF" }]}>{type.toLocaleUpperCase('tr-TR')}</Text></Pressable>)}
          </View>
          <Text style={styles.inputSectionLabel}>Depo hacmi (litre)</Text>
          <View style={styles.literChipsRow}>
            {[30, 40, 50, 60].map((n) => <Pressable key={n} accessibilityRole="button" onPress={() => setLitersInput(String(n))} style={styles.literChip}><Text style={styles.literChipText}>{n} Lt</Text></Pressable>)}
            <TextInput accessibilityLabel="Depo hacmi litre" value={litersInput} onChangeText={setLitersInput} keyboardType="decimal-pad" maxLength={6} style={styles.customLiterInput} />
          </View>
          <Text style={styles.inputSectionLabel}>Litre başına değişim (TL) · indirim için eksi</Text>
          <View style={styles.fuelTypeRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Değişimin işaretini değiştir" onPress={() => setDeltaInput((v) => v.startsWith('-') ? v.slice(1) : `-${v}`)} style={styles.literChip}><Text style={styles.literChipText}>+/−</Text></Pressable>
            <TextInput accessibilityLabel="Litre başına değişim TL" placeholder="Örn. -1,50" placeholderTextColor={FintechTheme.colors.textMuted} value={deltaInput} onChangeText={setDeltaInput} keyboardType="numbers-and-punctuation" maxLength={9} style={[styles.customLiterInput, { flex: 1 }]} />
          </View>
          <View style={styles.calcResultsBox}>
            <View style={styles.calcResultRow}><Text style={styles.calcResultLabel}>{prices?.isStale ? 'Son kayıtla depo tutarı:' : 'Kaynak fiyatıyla depo tutarı:'}</Text><Text style={styles.calcResultCurrent}>{scenario.currentTotal === null ? 'Veri yok' : `${formatNumber(scenario.currentTotal, 2)} TL`}</Text></View>
            <View style={styles.calcResultRow}><Text style={styles.calcResultLabel}>Girdiğiniz senaryonun farkı:</Text><Text style={styles.calcResultDelta}>{scenario.deltaTotal === null ? 'Değişim girin' : `${formatNumber(scenario.deltaTotal, 2)} TL`}</Text></View>
            <View style={styles.calcResultRowHighlight}><Text style={styles.calcHighlightLabel}>Senaryoya göre depo tutarı:</Text><Text style={styles.calcHighlightValue}>{scenario.newTotal === null ? 'Hesaplanamadı' : `${formatNumber(scenario.newTotal, 2)} TL`}</Text></View>
          </View>
        </View>
        <View style={styles.footerInfo}><Info size={14} color={FintechTheme.colors.textMuted} /><Text style={styles.footerInfoText}>Fiyatlar Opet kaynağından sorgulanır; erişim başarısızsa en fazla 24 saatlik gerçek kayıt zamanı ile gösterilir. Haberler yayıncıların bildirimleridir. Uygulama EPDK adına tahmin üretmez.</Text></View>
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
  fuelSubText: {
    fontSize: 10,
    color: FintechTheme.colors.textMuted,
  },

  // Kaynak haberleri
  predictionCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginBottom: 14,
  },
  predCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.text,
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
  factorLabel: {
    fontSize: 10,
    color: FintechTheme.colors.textMuted,
    marginBottom: 4,
  },
  factorValue: {
    color: FintechTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  decisionBox: {
    borderColor: FintechTheme.colors.border,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    gap: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  decisionTitle: {
    color: FintechTheme.colors.text,
    lineHeight: 21,
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
  calculatorCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
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
  literChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  customLiterInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    borderRadius: 8,
    flex: 1,
    color: FintechTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 0,
  },
  calcResultsBox: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  calcResultRow: {
    flexWrap: 'wrap',
    gap: 8,
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
    color: FintechTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  calcResultRowHighlight: {
    flexWrap: 'wrap',
    gap: 8,
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


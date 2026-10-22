import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, Clock3, Droplet, Flame, Fuel, MapPin, Newspaper, RefreshCw, Zap } from 'lucide-react-native';

import { fetchProvinceFuelPrices, FUEL_PROVINCES, type FuelPrices } from '@/api/fuelService';
import { PETROL_OFISI_FUEL_URL } from '@/api/fuelSources';
import { fetchFuelNews, formatTimeAgo } from '@/api/newsService';
import { FuelCalculator } from '@/components/FuelCalculator';
import { FintechTheme, useThemeColors } from '@/constants/fintechTheme';
import { formatNumber } from '@/utils/format';

const PRODUCTS = [
  { key: 'benzin', name: 'Benzin', Icon: Flame, color: 'energy', soft: 'energySoft' },
  { key: 'motorin', name: 'Motorin', Icon: Droplet, color: 'accent', soft: 'accentSoft' },
  { key: 'lpg', name: 'LPG', Icon: Zap, color: 'stock', soft: 'stockSoft' },
] as const;

export default function FuelScreen() {
  const colors = useThemeColors();
  const [province, setProvince] = useState(FUEL_PROVINCES[0]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [news, setNews] = useState<Awaited<ReturnType<typeof fetchFuelNews>> | null>(null);
  const [now, setNow] = useState(Date.now);
  const forcePriceRefresh = useRef(false);
  const prices = fuelPrices?.provinceName === province.name && fuelPrices.updatedAt !== null && now - fuelPrices.updatedAt < 86_400_000 ? fuelPrices : null;
  const hasPrices = prices && [prices.benzin, prices.motorin, prices.lpg].some((price) => price !== null);

  useEffect(() => {
    let active = true;
    const force = forcePriceRefresh.current;
    forcePriceRefresh.current = false;
    void fetchProvinceFuelPrices(province, force).then((data) => {
      if (active) setFuelPrices(data);
    }).catch(() => { if (active) setFuelPrices(null); })
      .finally(() => { if (active) { setLoading(false); setRefreshing(false); } });
    return () => { active = false; };
  }, [province, refreshToken]);

  useEffect(() => {
    let active = true;
    void fetchFuelNews().then((data) => { if (active) setNews(data); })
      .catch(() => { if (active) setNews({ articles: [], error: true, fetchedAt: Date.now() }); });
    return () => { active = false; };
  }, [refreshToken]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => { forcePriceRefresh.current = true; setLoading(true); setRefreshing(true); setRefreshToken((value) => value + 1); Keyboard.dismiss(); };
  const open = (url: string) => { if (/^https:\/\//.test(url)) void Linking.openURL(url).catch(() => {}); };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}><Fuel size={23} color="#fff" /></View>
        <View style={styles.headerText}><Text style={[styles.title, { color: colors.text }]}>Akaryakıt</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Litre fiyatı, depo hesabı, gündem</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Akaryakıt verilerini yenile" disabled={refreshing} onPress={refresh}
          style={[styles.refresh, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {refreshing ? <ActivityIndicator color={colors.accent} /> : <RefreshCw size={19} color={colors.text} />}
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}>
        <View style={styles.sectionHeading}><MapPin size={15} color={colors.accent} /><Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ŞEHRİNİ SEÇ</Text></View>
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cities}>
          {FUEL_PROVINCES.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === province.id }}
            onPress={() => { if (item.id !== province.id) { setLoading(true); setProvince(item); } Keyboard.dismiss(); }} style={[styles.city, { backgroundColor: item.id === province.id ? colors.accent : colors.surface, borderColor: item.id === province.id ? colors.accent : colors.border }]}>
            <Text style={[styles.cityText, { color: item.id === province.id ? '#fff' : colors.textSecondary }]}>{item.name}</Text>
          </Pressable>)}
        </ScrollView>
        <View style={styles.priceHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Litre fiyatları</Text><Text style={[styles.tax, { color: colors.textMuted }]}>TL · KDV dahil</Text></View>
        <View style={styles.priceGrid}>
          {PRODUCTS.map(({ key, name, Icon, color, soft }) => <View key={key} style={[styles.priceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.productIcon, { backgroundColor: colors[soft] }]}><Icon size={20} color={colors[color]} /></View>
            <Text style={[styles.productName, { color: colors.textSecondary }]}>{name}</Text>
            {loading && !hasPrices ? <ActivityIndicator style={styles.priceSpinner} color={colors[color]} /> : <Text style={[styles.price, { color: colors.text }]}>{formatNumber(prices?.[key], 2)}</Text>}
            <Text style={[styles.productSource, { color: colors.textMuted }]}>{prices?.[key] == null ? 'Veri bekleniyor' : key === 'lpg' && prices.provider === 'Petrol Ofisi' ? 'PO/gaz' : prices.provider}</Text>
          </View>)}
        </View>
        <View style={styles.sourceRow}>
          <Clock3 size={12} color={colors.textMuted} />
          <Text style={[styles.sourceText, { color: colors.textMuted }]}>{loading ? 'Fiyatlar kontrol ediliyor…' : hasPrices ? `${prices.isStale ? 'Son kayıt' : 'Son kontrol'} ${new Date(prices.updatedAt!).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}${prices.districtName ? ` · ${prices.districtName}` : ''}` : 'Kaynağa şu anda ulaşılamıyor.'}</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="Fiyat kaynağını aç" onPress={() => open(prices?.sourceUrl ?? PETROL_OFISI_FUEL_URL)} style={styles.sourceLink}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Kaynak</Text><ArrowUpRight size={13} color={colors.accent} />
          </Pressable>
        </View>
        {!loading && !hasPrices && <Pressable accessibilityRole="button" onPress={refresh} style={[styles.retry, { backgroundColor: colors.accentSoft }]}><Text style={[styles.linkText, { color: colors.accent }]}>Fiyatları tekrar dene</Text></Pressable>}
        {prices?.isStale && <Text style={[styles.note, { color: colors.textMuted }]}>Bağlantı kurulamadı. {new Date(prices.updatedAt!).toLocaleDateString('tr-TR')} tarihindeki son kayıt gösteriliyor.</Text>}
        <FuelCalculator prices={hasPrices ? prices : null} />
        <View style={styles.newsHeader}><View style={styles.sectionHeading}><Newspaper size={18} color={colors.accent} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Fiyat değişikliği gündemi</Text></View></View>
        <Text style={[styles.newsIntro, { color: colors.textMuted }]}>Zam ve indirim haberlerini kaynağından takip et.</Text>
        {!news ? <ActivityIndicator style={styles.newsSpinner} color={colors.accent} /> : news.error || !news.articles.length ? <View style={[styles.emptyNews, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.newsTitle, { color: colors.text }]}>{news.error ? 'Haberler yüklenemedi' : 'Yeni haber bulunamadı'}</Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>Güncel başlıkları görmek için tekrar yenileyebilirsin.</Text>
        </View> : news.articles.slice(0, 4).map((article) => <Pressable key={article.id} accessibilityRole="link" onPress={() => open(article.link)} style={[styles.article, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.articleMeta}><Text style={[styles.publisher, { color: colors.accent }]}>{article.source}</Text><Text style={[styles.articleTime, { color: colors.textMuted }]}>{formatTimeAgo(article.publishedAt)}</Text></View>
          <Text numberOfLines={3} style={[styles.newsTitle, { color: colors.text }]}>{article.title}</Text>
          <View style={styles.readArticle}><Text style={[styles.linkText, { color: colors.textMuted }]}>Haberi oku</Text><ArrowUpRight size={15} color={colors.textMuted} /></View>
        </Pressable>)}
        <Pressable accessibilityRole="link" style={styles.allNews} onPress={() => open('https://news.google.com/search?q=akaryak%C4%B1t%20zam%20indirim&hl=tr&gl=TR&ceid=TR%3Atr')}><Text style={[styles.linkText, { color: colors.accent }]}>Tüm akaryakıt haberleri</Text><ArrowUpRight size={16} color={colors.accent} /></Pressable>
        <Text style={[styles.footer, { color: colors.textMuted }]}>Liste fiyatları istasyonda farklılık gösterebilir. Haberlerdeki beklentiler kesinleşmiş fiyat değişikliği değildir.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 },
  headerIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 }, title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.8 }, subtitle: { fontSize: 11, marginTop: 3 },
  refresh: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, sectionLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  cities: { gap: 8, paddingTop: 11, paddingBottom: 23 }, city: { minHeight: 44, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, justifyContent: 'center' }, cityText: { fontSize: 12, fontWeight: '600' },
  priceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 }, tax: { fontSize: 11 },
  priceGrid: { flexDirection: 'row', gap: 8 }, priceCard: { flex: 1, padding: 10, borderRadius: 18, borderWidth: 1 }, productIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  productName: { fontSize: 12, fontWeight: '600', marginBottom: 6 }, price: { fontSize: 20, fontWeight: '800', letterSpacing: -0.6, ...FintechTheme.typography.tabularNums }, priceSpinner: { marginVertical: 3, alignSelf: 'flex-start' }, productSource: { fontSize: 10, marginTop: 5 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15, marginTop: 6 }, sourceText: { flex: 1, fontSize: 10, lineHeight: 16 }, sourceLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 }, linkText: { fontSize: 12, fontWeight: '600' },
  retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 16 }, note: { fontSize: 11, lineHeight: 17, marginBottom: 12 },
  newsHeader: { marginTop: 4 }, newsIntro: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 15 }, newsSpinner: { padding: 20 }, emptyNews: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  article: { padding: 16, borderRadius: 17, borderWidth: 1, marginBottom: 10 }, articleMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 }, publisher: { flex: 1, fontSize: 11, fontWeight: '700' }, articleTime: { fontSize: 10 }, newsTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600' }, readArticle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12 },
  allNews: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, footer: { fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },
});

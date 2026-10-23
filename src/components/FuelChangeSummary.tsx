import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { FUEL_CHANGES_SOURCE, type FuelChangeReport } from '@/api/fuelChanges';
import { useThemeColors } from '@/constants/fintechTheme';
import { formatNumber } from '@/utils/format';

const PRODUCTS = [{ key: 'benzin', name: 'Benzin' }, { key: 'motorin', name: 'Motorin' }, { key: 'lpg', name: 'LPG' }] as const;
const formatDate = (date: string) => date.split('-').reverse().join('.');

export function FuelChangeSummary({ report }: { report: FuelChangeReport | null }) {
  const colors = useThemeColors();
  return <View testID="fuel-change-summary" style={styles.section}>
    <Text style={[styles.title, { color: colors.text }]}>Zam / indirim takibi</Text>
    <Text style={[styles.description, { color: colors.textMuted }]}>Pompaya yansıyan son değişiklikler</Text>
    {!report ? <ActivityIndicator accessibilityLabel="Fiyat değişiklikleri yükleniyor" color={colors.accent} /> : <>
      {report.stale && <Text accessibilityRole="alert" style={[styles.note, { color: colors.textSecondary }]}>{report.error ? 'Kaynağa ulaşılamadı. ' : 'Kaynak verisi güncel değil. '}{report.events.length ? 'Aşağıdaki kayıtlar geçmiş değişikliklerdir.' : 'Güncel değişiklik durumu bilinmiyor.'}</Text>}
      {PRODUCTS.map(({ key, name }) => {
        const event = report.events.find(item => item.fuel === key);
        const color = event ? event.delta > 0 ? colors.down : colors.up : colors.textMuted;
        return <View key={key} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}><Text style={[styles.product, { color: colors.text }]}>{name}</Text><Text style={[styles.date, { color: colors.textMuted }]}>{event ? formatDate(event.date) : 'Kayıt yok'}</Text></View>
          <Text style={[styles.amount, { color }]}>{event ? `${event.delta > 0 ? '+' : '−'}${formatNumber(Math.abs(event.delta), 2)} TL / litre · ${event.delta > 0 ? 'Zam' : 'İndirim'}` : 'Doğrulanabilir değişiklik kaydı bulunamadı'}</Text>
          {event && <Text style={[styles.note, { color: colors.textMuted }]}>Petrolistan tespiti · {event.agreePairs}/{event.samplePairs} marka–il serisi aynı yönde</Text>}
        </View>;
      })}
      {report.generatedAt !== null && <Text style={[styles.note, { color: colors.textMuted }]}>Kaynak veri zamanı: {new Date(report.generatedAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</Text>}
    </>}
    <Text style={[styles.note, { color: colors.textMuted }]}>Tutar, izlenen marka ve illerdeki litre farklarının medyanıdır; seçtiğin şehrin fiyatına uygulanmaz. İleri tarihli kesinleşmiş bir duyuru bu kaynakta sunulmuyor.</Text>
    <Pressable accessibilityRole="link" accessibilityLabel="Petrolistan fiyat değişikliklerini aç" onPress={() => { void Linking.openURL(FUEL_CHANGES_SOURCE).catch(() => {}); }} style={styles.link}>
      <Text style={{ color: colors.accent, fontWeight: '600' }}>Kaynak ve değişiklik geçmişi</Text><ArrowUpRight size={16} color={colors.accent} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 10, marginBottom: 16 }, title: { fontSize: 19, fontWeight: '700' }, description: { fontSize: 12, lineHeight: 18 },
  card: { padding: 15, borderWidth: 1, borderRadius: 16, gap: 8 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  product: { fontWeight: '700', fontSize: 15 }, date: { fontSize: 12 }, amount: { fontSize: 17, fontWeight: '700', lineHeight: 24 }, note: { fontSize: 11, lineHeight: 17 },
  link: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
});

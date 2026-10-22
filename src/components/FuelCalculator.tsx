import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Calculator, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native';
import type { FuelPrices } from '@/api/fuelService';
import { FintechTheme, useThemeColors } from '@/constants/fintechTheme';
import { formatNumber } from '@/utils/format';
import { calculateFuelScenario, fuelDeltaText } from '@/utils/fuelScenario';

const FUELS = [{ id: 'benzin', name: 'Benzin' }, { id: 'motorin', name: 'Motorin' }, { id: 'lpg', name: 'LPG' }] as const;

export function FuelCalculator({ prices }: { prices: FuelPrices | null }) {
  const colors = useThemeColors();
  const [fuel, setFuel] = useState<'benzin' | 'motorin' | 'lpg'>('motorin');
  const [liters, setLiters] = useState('50');
  const [showChange, setShowChange] = useState(false);
  const [direction, setDirection] = useState<'discount' | 'increase'>('discount');
  const [amount, setAmount] = useState('');
  const result = calculateFuelScenario(prices?.[fuel], liters, showChange ? fuelDeltaText(amount, direction) : '');
  const validLiters = /^\d+(?:[.,]\d+)?$/.test(liters) && Number(liters.replace(',', '.')) > 0 && Number(liters.replace(',', '.')) <= 500;
  const changeColor = direction === 'discount' ? colors.up : colors.down;
  const selectLiters = (value: number) => { setLiters(String(value)); Keyboard.dismiss(); };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.heading}><Calculator size={19} color={colors.accent} /><Text style={[styles.title, { color: colors.text }]}>Depo hesabı</Text></View>
      <View style={styles.segments}>
        {FUELS.map(({ id, name }) => <Pressable key={id} testID={`fuel-${id}`} accessibilityRole="button" accessibilityLabel={name}
          accessibilityState={{ selected: fuel === id }} onPress={() => { setFuel(id); Keyboard.dismiss(); }}
          style={[styles.segment, { backgroundColor: fuel === id ? colors.accent : colors.backgroundSecondary, borderColor: fuel === id ? colors.accent : colors.border }]}>
          <Text style={[styles.segmentText, { color: fuel === id ? '#fff' : colors.textSecondary }]}>{name}</Text>
        </Pressable>)}
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Kaç litre alacaksın?</Text>
      <View style={styles.segments}>
        {[30, 40, 50, 60].map((value) => {
          const selected = Number(liters.replace(',', '.')) === value;
          return <Pressable key={value} testID={`liters-${value}`} accessibilityRole="button" accessibilityLabel={`${value} litre`}
            accessibilityState={{ selected }} onPress={() => selectLiters(value)}
            style={[styles.liter, { backgroundColor: selected ? colors.accentSoft : colors.backgroundSecondary, borderColor: selected ? colors.accent : colors.border }]}>
            <Text style={[styles.segmentText, { color: selected ? colors.accent : colors.textSecondary }]}>{value} L</Text>
          </Pressable>;
        })}
      </View>
      <View style={[styles.inputRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Text style={[styles.customLabel, { color: colors.textMuted }]}>Farklı miktar</Text>
        <TextInput testID="liters-input" accessibilityLabel="Depo miktarı litre" value={liters} onChangeText={setLiters}
          keyboardType="decimal-pad" selectTextOnFocus maxLength={6} style={[styles.input, { color: colors.text }]} />
        <Text style={[styles.unit, { color: colors.textMuted }]}>litre</Text>
      </View>
      {!validLiters && <Text accessibilityLiveRegion="polite" style={[styles.validation, { color: colors.down }]}>0’dan büyük, en fazla 500 litre gir.</Text>}
      <View style={[styles.totalBox, { backgroundColor: colors.accentSoft }]} accessibilityLiveRegion="polite">
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{prices?.isStale ? 'Son kayıtla depo tutarı' : 'Depo tutarı'}</Text>
        <Text testID="tank-total" style={[styles.total, { color: colors.text }]}>{result.currentTotal === null ? '—' : `${formatNumber(result.currentTotal, 2)} TL`}</Text>
        <Text style={[styles.caption, { color: colors.textMuted }]}>{prices?.[fuel] == null ? 'Hesaplamak için litre fiyatı bekleniyor.' : `${FUELS.find((item) => item.id === fuel)!.name} · ${formatNumber(prices[fuel], 2)} TL / litre`}</Text>
      </View>
      <Pressable testID="toggle-change" accessibilityRole="button" accessibilityState={{ expanded: showChange }} onPress={() => { setShowChange((value) => !value); Keyboard.dismiss(); }} style={styles.changeToggle}>
        <Text style={[styles.toggleLabel, { color: colors.accent }]}>Zam / indirim etkisini hesapla</Text>
        {showChange ? <ChevronUp size={18} color={colors.accent} /> : <ChevronDown size={18} color={colors.accent} />}
      </Pressable>
      {showChange && <View style={[styles.changeSection, { borderColor: colors.border }]}>
        <Text style={[styles.caption, { color: colors.textMuted }]}>Haberdeki veya kendi seçtiğin değişimi gir.</Text>
        <View style={styles.segments}>
          {(['discount', 'increase'] as const).map((item) => {
            const selected = direction === item;
            const color = item === 'discount' ? colors.up : colors.down;
            const Icon = item === 'discount' ? Minus : Plus;
            return <Pressable key={item} testID={`change-${item}`} accessibilityRole="button" accessibilityState={{ selected }}
              onPress={() => { setDirection(item); Keyboard.dismiss(); }}
              style={[styles.direction, { borderColor: selected ? color : colors.border, backgroundColor: selected ? (item === 'discount' ? colors.upSoft : colors.downSoft) : colors.backgroundSecondary }]}>
              <Icon size={16} color={selected ? color : colors.textMuted} /><Text style={[styles.segmentText, { color: selected ? color : colors.textMuted }]}>{item === 'discount' ? 'İndirim' : 'Zam'}</Text>
            </Pressable>;
          })}
        </View>
        <View style={[styles.inputRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.customLabel, { color: colors.textMuted }]}>Litre başına</Text>
          <TextInput testID="change-input" accessibilityLabel="Litre başına değişim tutarı" value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="1,50" placeholderTextColor={colors.textMuted} maxLength={8} style={[styles.input, { color: colors.text }]} />
          <Text style={[styles.unit, { color: colors.textMuted }]}>TL</Text>
        </View>
        <View accessibilityLiveRegion="polite" style={styles.changeResult}>
          <Text testID="tank-difference" style={[styles.changeAmount, { color: changeColor }]}>{result.deltaTotal === null ? 'Değişim tutarını gir' : `${formatNumber(Math.abs(result.deltaTotal), 2)} TL ${result.deltaTotal === 0 ? 'fark' : direction === 'discount' ? 'daha az' : 'daha fazla'}`}</Text>
          {result.newTotal !== null && <Text testID="changed-total" style={[styles.caption, { color: colors.textSecondary }]}>Değişim sonrası depo: {formatNumber(result.newTotal, 2)} TL</Text>}
          {result.currentTotal !== null && result.deltaTotal !== null && result.newTotal === null && <Text style={[styles.validation, { color: colors.down }]}>Değişim litre fiyatından büyük olamaz.</Text>}
        </View>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>Bu hesap, girdiğin tutara göre yapılır; fiyat tahmini değildir.</Text>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, borderWidth: 1, marginBottom: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 }, title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  segments: { flexDirection: 'row', gap: 8, marginBottom: 14 }, segment: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, segmentText: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 13, marginBottom: 10, marginTop: 4 }, liter: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inputRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14 }, customLabel: { flex: 1, fontSize: 13 }, input: { width: 88, flexGrow: 0, flexShrink: 0, minHeight: 50, paddingHorizontal: 8, fontSize: 18, fontWeight: '700', textAlign: 'right', ...FintechTheme.typography.tabularNums }, unit: { fontSize: 13, marginLeft: 4 },
  totalBox: { padding: 18, borderRadius: 15, alignItems: 'center', gap: 6 }, totalLabel: { fontSize: 12, fontWeight: '600' }, total: { fontSize: 31, fontWeight: '800', letterSpacing: -1, ...FintechTheme.typography.tabularNums }, caption: { fontSize: 12, lineHeight: 18 },
  changeToggle: { minHeight: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 8 }, toggleLabel: { flex: 1, fontSize: 13, fontWeight: '600' }, changeSection: { paddingTop: 14, borderTopWidth: 1, gap: 10 }, direction: { flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12, borderWidth: 1 },
  changeResult: { alignItems: 'center', gap: 6, paddingVertical: 6 }, changeAmount: { fontSize: 21, fontWeight: '700', ...FintechTheme.typography.tabularNums }, disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center' }, validation: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
});

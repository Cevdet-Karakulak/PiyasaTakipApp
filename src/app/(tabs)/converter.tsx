import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins } from 'lucide-react-native';

import { FintechTheme } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { formatNumber } from '@/utils/format';

interface ConversionAsset {
  id: string;
  name: string;
  shortName: string;
  symbolRef?: string;
  // TRY bazında 1 biriminin fiyatını hesaplayan fonksiyon
  getTryRate: (quotes: any) => number;
}

const CONVERTER_ITEMS: ConversionAsset[] = [
  {
    id: 'TRY',
    name: 'Türk Lirası',
    shortName: 'TRY',
    getTryRate: () => 1,
  },
  {
    id: 'USD',
    name: 'Amerikan Doları',
    shortName: 'USD',
    symbolRef: 'USDTRY=X',
    getTryRate: (quotes) => quotes['USDTRY=X']?.price ?? 49.4,
  },
  {
    id: 'EUR',
    name: 'Euro',
    shortName: 'EUR',
    symbolRef: 'EURTRY=X',
    getTryRate: (quotes) => quotes['EURTRY=X']?.price ?? 55.5,
  },
  {
    id: 'GRAM_ALTIN',
    name: 'Gram Altın (24 Ayar)',
    shortName: 'GRAM',
    symbolRef: 'GRAM_ALTIN',
    getTryRate: (quotes) => quotes['GRAM_ALTIN']?.price ?? 6604,
  },
  {
    id: 'CEYREK_ALTIN',
    name: 'Çeyrek Altın',
    shortName: 'ÇEYREK',
    symbolRef: 'CEYREK_ALTIN',
    getTryRate: (quotes) => quotes['CEYREK_ALTIN']?.price ?? 10761,
  },
  {
    id: 'CUMHURIYET_ALTINI',
    name: 'Cumhuriyet Altını',
    shortName: 'CUMHURİYET',
    symbolRef: 'CUMHURIYET_ALTINI',
    getTryRate: (quotes) => quotes['CUMHURIYET_ALTINI']?.price ?? 44279,
  },
  {
    id: 'GC=F',
    name: 'Ons Altın',
    shortName: 'ONS',
    symbolRef: 'GC=F',
    getTryRate: (quotes) => {
      const onsUsd = quotes['GC=F']?.price ?? 4180;
      const usdTry = quotes['USDTRY=X']?.price ?? 49.4;
      return onsUsd * usdTry;
    },
  },
];

export default function ConverterScreen() {
  const { quotes } = useMarketData();
  const [sourceId, setSourceId] = useState('USD');
  const [amountStr, setAmountStr] = useState('100');

  const sourceAsset = CONVERTER_ITEMS.find((i) => i.id === sourceId) ?? CONVERTER_ITEMS[1];
  const sourceUnitPriceInTry = sourceAsset.getTryRate(quotes);

  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
  const totalValueInTry = parsedAmount * sourceUnitPriceInTry;

  const quickPresets = ['1', '10', '50', '100', '500', '1000'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Başlık */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Coins size={22} color={FintechTheme.colors.accent} />
            <Text style={styles.headerTitle}>Döviz & Altın Çevirici</Text>
          </View>
          <Text style={styles.headerSub}>Canlı piyasa kurlarıyla anlık hesaplama</Text>
        </View>

        {/* Ana Çeviri Giriş Kartı */}
        <View style={styles.inputCard}>
          <Text style={styles.cardLabel}>ÇEVRİLECEK VARLIK VE MİKTAR</Text>

          {/* Varlık Seçim Hapları */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillList}>
            {CONVERTER_ITEMS.map((item) => {
              const isSelected = item.id === sourceId;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.itemPill, isSelected && styles.itemPillActive]}
                  onPress={() => setSourceId(item.id)}
                >
                  <Text style={[styles.itemPillText, isSelected && styles.itemPillTextActive]}>
                    {item.shortName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Miktar Girişi */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0"
              placeholderTextColor={FintechTheme.colors.textMuted}
            />
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{sourceAsset.shortName}</Text>
            </View>
          </View>

          {/* Hızlı Miktar Butonları */}
          <View style={styles.presetsRow}>
            {quickPresets.map((val) => (
              <Pressable
                key={val}
                style={[styles.presetBtn, amountStr === val && styles.presetBtnActive]}
                onPress={() => setAmountStr(val)}
              >
                <Text style={[styles.presetText, amountStr === val && styles.presetTextActive]}>
                  {val}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.rateNote}>
            <Text style={styles.rateNoteText}>
              1 {sourceAsset.shortName} = {formatNumber(sourceUnitPriceInTry, 2)} TL (Canlı Kur)
            </Text>
          </View>
        </View>

        {/* Karşılık Gelen Değerler Listesi */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Dönüşüm Sonuçları</Text>
        </View>

        <View style={styles.resultsCard}>
          {CONVERTER_ITEMS.filter((item) => item.id !== sourceId).map((target, idx, arr) => {
            const targetUnitPriceInTry = target.getTryRate(quotes);
            const convertedAmount = targetUnitPriceInTry > 0 ? totalValueInTry / targetUnitPriceInTry : 0;
            const isLast = idx === arr.length - 1;

            return (
              <View key={target.id} style={[styles.resultRow, !isLast && styles.resultRowBorder]}>
                <View style={styles.targetInfo}>
                  <Text style={styles.targetShort}>{target.shortName}</Text>
                  <Text style={styles.targetName}>{target.name}</Text>
                </View>

                <View style={styles.targetValueCol}>
                  <Text style={styles.targetValue}>
                    {formatNumber(convertedAmount, convertedAmount < 1 ? 4 : 2)}
                  </Text>
                  <Text style={styles.targetUnitRate}>
                    1 {target.shortName} = {formatNumber(targetUnitPriceInTry, 2)} TL
                  </Text>
                </View>
              </View>
            );
          })}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FintechTheme.colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  inputCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FintechTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  pillList: {
    gap: 8,
    marginBottom: 16,
  },
  itemPill: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  itemPillActive: {
    backgroundColor: FintechTheme.colors.accent,
    borderColor: FintechTheme.colors.accent,
  },
  itemPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  itemPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
  },
  currencyBadge: {
    backgroundColor: FintechTheme.colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: FintechTheme.colors.accent,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  presetBtnActive: {
    borderColor: FintechTheme.colors.accent,
    backgroundColor: FintechTheme.colors.accentSoft,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  presetTextActive: {
    color: FintechTheme.colors.accent,
    fontWeight: '700',
  },
  rateNote: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: FintechTheme.colors.border,
  },
  rateNoteText: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  resultsHeader: {
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FintechTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultsCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: FintechTheme.colors.border,
  },
  targetInfo: {
    flex: 1,
  },
  targetShort: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  targetName: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
    marginTop: 2,
  },
  targetValueCol: {
    alignItems: 'flex-end',
  },
  targetValue: {
    fontSize: 18,
    fontWeight: '800',
    color: FintechTheme.colors.accent,
    ...FintechTheme.typography.tabularNums,
  },
  targetUnitRate: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
    marginTop: 2,
  },
});

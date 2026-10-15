import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react-native';

import { ASSETS } from '@/api/config';
import { AssetIcon } from '@/components/AssetIcon';
import { FintechTheme } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import type { MarketSymbol } from '@/types/market';
import { formatPercent, formatPrice } from '@/utils/format';

interface PortfolioItem {
  id: string;
  symbol: MarketSymbol;
  amount: number;
}

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { id: '1', symbol: 'GRAM_ALTIN', amount: 25 },
  { id: '2', symbol: 'USDTRY=X', amount: 1500 },
  { id: '3', symbol: 'THYAO.IS', amount: 80 },
  { id: '4', symbol: 'GARAN.IS', amount: 120 },
];

export default function PortfolioScreen() {
  const { quotes } = useMarketData();
  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('GRAM_ALTIN');
  const [amountInput, setAmountInput] = useState('10');

  // Portföy toplam değer ve günlük değişim hesaplaması
  const { totalValue, totalChange, totalChangePercent } = useMemo(() => {
    let total = 0;
    let changeSum = 0;

    for (const item of items) {
      const q = quotes[item.symbol];
      if (q) {
        // Eğer varlık USD bazlıysa (örn. Ons Altın, Brent), USD/TRY ile çarp
        const inTry = q.currency === 'USD' && quotes['USDTRY=X']
          ? q.price * quotes['USDTRY=X'].price
          : q.price;

        const val = item.amount * inTry;
        total += val;

        if (q.changePercent) {
          const itemChange = val * (q.changePercent / 100);
          changeSum += itemChange;
        }
      }
    }

    const pct = total > 0 ? (changeSum / (total - changeSum)) * 100 : 0;
    return {
      totalValue: total,
      totalChange: changeSum,
      totalChangePercent: pct,
    };
  }, [items, quotes]);

  const handleAddItem = () => {
    const parsed = parseFloat(amountInput.replace(',', '.'));
    if (!parsed || parsed <= 0) return;

    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        symbol: selectedSymbol,
        amount: parsed,
      },
    ]);
    setModalVisible(false);
    setAmountInput('10');
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const isUp = totalChange >= 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Başlık Barı */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Wallet size={22} color={FintechTheme.colors.accent} />
          <Text style={styles.headerTitle}>Varlık Portföyü</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Varlık Ekle</Text>
        </Pressable>
      </View>

      {/* Toplam Portföy Özeti Kartı */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>TOPLAM PORTFÖY DEĞERİ</Text>
        <Text style={styles.summaryValue}>
          {formatPrice(totalValue, 'TRY', 2)}
        </Text>

        <View style={styles.changeRow}>
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: isUp ? FintechTheme.colors.upSoft : FintechTheme.colors.downSoft },
            ]}
          >
            {isUp ? (
              <ArrowUpRight size={14} color={FintechTheme.colors.up} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={14} color={FintechTheme.colors.down} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.changeBadgeText,
                { color: isUp ? FintechTheme.colors.up : FintechTheme.colors.down },
              ]}
            >
              {formatPercent(totalChangePercent)}
            </Text>
          </View>

          <Text style={styles.changeAmountText}>
            ({isUp ? '+' : ''}
            {formatPrice(totalChange, 'TRY', 2)}) Günlük Kâr/Zarar
          </Text>
        </View>
      </View>

      {/* Varlık Listesi */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>Pozisyonlarım ({items.length})</Text>
        <Text style={styles.listSub}>Canlı fiyatlarla hesaplanıyor</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const q = quotes[item.symbol];
          const def = ASSETS[item.symbol];
          const unitPrice = q ? q.price : 0;
          const totalItemValue = unitPrice * item.amount;

          return (
            <View style={styles.itemCard}>
              <View style={styles.itemLeftGroup}>
                <AssetIcon
                  symbol={item.symbol}
                  category={def?.category ?? 'stock'}
                  size={38}
                />
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemSymbol}>{def?.shortName ?? item.symbol}</Text>
                  <Text style={styles.itemName}>{def?.name ?? item.symbol}</Text>
                  <Text style={styles.itemAmount}>
                    Miktar: <Text style={styles.itemAmountVal}>{item.amount}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.itemRight}>
                <Text style={styles.itemValue}>
                  {formatPrice(totalItemValue, def?.currency ?? 'TRY', 2)}
                </Text>
                <Text style={styles.itemUnitPrice}>
                  Birim: {formatPrice(unitPrice, def?.currency ?? 'TRY', def?.decimals ?? 2)}
                </Text>

                <Pressable
                  onPress={() => handleDeleteItem(item.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={15} color={FintechTheme.colors.down} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* Varlık Ekle Modalı */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Portföye Varlık Ekle</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Varlık Seçin:</Text>
            <View style={styles.symbolSelector}>
              {(Object.keys(ASSETS) as MarketSymbol[]).map((sym) => {
                const isSelected = selectedSymbol === sym;
                return (
                  <Pressable
                    key={sym}
                    style={[styles.symPill, isSelected && styles.symPillActive]}
                    onPress={() => setSelectedSymbol(sym)}
                  >
                    <Text style={[styles.symPillText, isSelected && styles.symPillTextActive]}>
                      {ASSETS[sym].shortName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Miktar / Adet / Lot:</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
              placeholder="Örn: 50"
              placeholderTextColor={FintechTheme.colors.textMuted}
            />

            <Pressable style={styles.saveBtn} onPress={handleAddItem}>
              <Text style={styles.saveBtnText}>Portföye Kaydet</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FintechTheme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnPressed: {
    opacity: 0.8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: FintechTheme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FintechTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  changeAmountText: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  listSub: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: FintechTheme.colors.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  itemLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.5,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  itemName: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
    marginTop: 1,
    marginBottom: 2,
  },
  itemAmount: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
  },
  itemAmountVal: {
    color: FintechTheme.colors.text,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
  },
  itemUnitPrice: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
    marginTop: 2,
    marginBottom: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
    marginBottom: 8,
    marginTop: 8,
  },
  symbolSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  symPill: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  symPillActive: {
    backgroundColor: FintechTheme.colors.accent,
    borderColor: FintechTheme.colors.accent,
  },
  symPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  symPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountInput: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: FintechTheme.colors.text,
    ...FintechTheme.typography.tabularNums,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: FintechTheme.colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

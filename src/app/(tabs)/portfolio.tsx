import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react-native';

import { ASSETS } from '@/api/config';
import { AssetIcon } from '@/components/AssetIcon';
import { FintechTheme } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolioStore } from '@/store/portfolioStore';
import type { MarketSymbol } from '@/types/market';
import { formatPercent, formatPrice } from '@/utils/format';

type ModalCategory = 'all' | 'gold' | 'currency' | 'stock';

const MODAL_CATEGORIES: { id: ModalCategory; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'gold', label: 'Altın & Emtia' },
  { id: 'currency', label: 'Döviz' },
  { id: 'stock', label: 'BIST Hisseleri' },
];

export default function PortfolioScreen() {
  const { quotes } = useMarketData();
  const { positions: items, addPosition, removePosition } = usePortfolioStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCategory, setModalCategory] = useState<ModalCategory>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('GRAM_ALTIN');
  const [amountInput, setAmountInput] = useState('10');

  const filteredSymbols = useMemo(() => {
    const all = Object.keys(ASSETS) as MarketSymbol[];
    if (modalCategory === 'all') return all;
    if (modalCategory === 'gold') {
      return all.filter((s) => {
        const cat = ASSETS[s]?.category;
        return cat === 'gold' || cat === 'energy' || cat === 'commodity';
      });
    }
    if (modalCategory === 'currency') {
      return all.filter((s) => ASSETS[s]?.category === 'currency');
    }
    if (modalCategory === 'stock') {
      return all.filter((s) => {
        const cat = ASSETS[s]?.category;
        return cat === 'stock' || cat === 'index';
      });
    }
    return all;
  }, [modalCategory]);

  const selectedAsset = ASSETS[selectedSymbol];
  const selectedQuote = quotes[selectedSymbol];
  const parsedAmount = parseFloat(amountInput.replace(',', '.'));

  const estimatedTotal = useMemo(() => {
    if (!selectedQuote?.price || !parsedAmount || parsedAmount <= 0) return null;
    const inTry =
      selectedQuote.currency === 'USD' && quotes['USDTRY=X']
        ? selectedQuote.price * quotes['USDTRY=X'].price
        : selectedQuote.price;
    return parsedAmount * inTry;
  }, [selectedQuote, parsedAmount, quotes]);

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

    addPosition(selectedSymbol, parsed);
    setModalVisible(false);
    setAmountInput('10');
  };

  const handleDeleteItem = (id: string) => {
    removePosition(id);
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
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <Wallet size={19} color={FintechTheme.colors.accent} />
                <Text style={styles.modalTitle}>Portföye Varlık Ekle</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            {/* Kategori Filtre Butonları */}
            <View style={styles.categoryRow}>
              {MODAL_CATEGORIES.map((cat) => {
                const isActive = modalCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                    onPress={() => setModalCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        isActive && styles.categoryTabTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Yatay Kayan Varlık Kartları */}
            <Text style={styles.fieldLabel}>Varlık Seçin (Kayan Liste):</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.assetScrollContainer}
            >
              {filteredSymbols.map((sym) => {
                const isSelected = selectedSymbol === sym;
                const def = ASSETS[sym];
                const q = quotes[sym];
                return (
                  <Pressable
                    key={sym}
                    style={[
                      styles.assetCard,
                      isSelected && styles.assetCardActive,
                    ]}
                    onPress={() => setSelectedSymbol(sym)}
                  >
                    <View style={styles.assetCardTop}>
                      <AssetIcon
                        symbol={sym}
                        category={def?.category ?? 'stock'}
                        size={28}
                      />
                      {isSelected ? (
                        <View style={styles.checkBadge}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.assetCardCode,
                        isSelected && styles.assetCardCodeActive,
                      ]}
                    >
                      {def?.shortName || sym}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.assetCardPrice,
                        isSelected && styles.assetCardPriceActive,
                      ]}
                    >
                      {q?.price
                        ? formatPrice(q.price, def?.currency ?? 'TRY', def?.decimals ?? 2)
                        : '—'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Seçili Varlık Bilgi / Önizleme Kartı */}
            {selectedAsset && (
              <View style={styles.selectedAssetCard}>
                <View style={styles.selectedAssetLeft}>
                  <AssetIcon
                    symbol={selectedSymbol}
                    category={selectedAsset.category}
                    size={38}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1} style={styles.selectedAssetName}>
                      {selectedAsset.name}
                    </Text>
                    <Text style={styles.selectedAssetSub}>
                      {selectedAsset.shortName} · {selectedQuote?.price ? formatPrice(selectedQuote.price, selectedAsset.currency, selectedAsset.decimals ?? 2) : '—'}
                    </Text>
                  </View>
                </View>
                {selectedQuote?.changePercent !== null && selectedQuote?.changePercent !== undefined && (
                  <View
                    style={[
                      styles.changePill,
                      {
                        backgroundColor:
                          selectedQuote.changePercent >= 0
                            ? FintechTheme.colors.upSoft
                            : FintechTheme.colors.downSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.changePillText,
                        {
                          color:
                            selectedQuote.changePercent >= 0
                              ? FintechTheme.colors.up
                              : FintechTheme.colors.down,
                        },
                      ]}
                    >
                      {formatPercent(selectedQuote.changePercent)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Miktar Girişi ve Canlı Tutar Hesaplama */}
            <View style={styles.amountHeaderRow}>
              <Text style={styles.fieldLabel}>Miktar / Adet / Lot:</Text>
              {estimatedTotal !== null && (
                <Text style={styles.estimatedTotalText}>
                  Tahmini: <Text style={styles.estimatedTotalHighlight}>{formatPrice(estimatedTotal, 'TRY', 2)}</Text>
                </Text>
              )}
            </View>

            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
              placeholder="Örn: 10"
              placeholderTextColor={FintechTheme.colors.textMuted}
            />

            <Pressable style={styles.saveBtn} onPress={handleAddItem}>
              <Text style={styles.saveBtnText}>Portföye Kaydet</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: FintechTheme.colors.text,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  categoryTabActive: {
    backgroundColor: FintechTheme.colors.accentSoft,
    borderColor: FintechTheme.colors.accent,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  categoryTabTextActive: {
    color: FintechTheme.colors.accent,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
    marginBottom: 6,
  },
  assetScrollContainer: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  assetCard: {
    width: 94,
    padding: 9,
    borderRadius: 12,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: FintechTheme.colors.border,
    alignItems: 'center',
    gap: 3,
  },
  assetCardActive: {
    backgroundColor: FintechTheme.colors.accentSoft,
    borderColor: FintechTheme.colors.accent,
  },
  assetCardTop: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: 4,
    backgroundColor: FintechTheme.colors.accent,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetCardCode: {
    fontSize: 11,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  assetCardCodeActive: {
    color: FintechTheme.colors.accent,
  },
  assetCardPrice: {
    fontSize: 10,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  assetCardPriceActive: {
    color: FintechTheme.colors.text,
    fontWeight: '600',
  },
  selectedAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  selectedAssetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedAssetName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  selectedAssetSub: {
    fontSize: 11.5,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  changePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changePillText: {
    fontSize: 11,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  estimatedTotalText: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
  },
  estimatedTotalHighlight: {
    color: FintechTheme.colors.accent,
    fontWeight: '700',
    ...FintechTheme.typography.tabularNums,
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
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: FintechTheme.colors.accent,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

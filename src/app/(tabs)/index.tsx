import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
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
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  X,
  Zap,
} from 'lucide-react-native';

import { ASSET_DISPLAY_ORDER } from '@/api/config';
import { fetchYahooQuote } from '@/api/marketService';
import { AssetCard } from '@/components/AssetCard';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import { MarketTicker } from '@/components/MarketTicker';
import { FintechTheme, useThemeColors } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTranslation } from '@/store/preferencesStore';
import type { MarketQuote, MarketSymbol } from '@/types/market';
import { formatTime } from '@/utils/format';

type FilterCategory = 'all' | 'gold_commodity' | 'currency' | 'stock' | 'energy' | 'favorites';

const CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'gold_commodity', label: 'Altın & Emtia' },
  { id: 'currency', label: 'Döviz' },
  { id: 'stock', label: 'Borsa (BIST)' },
  { id: 'energy', label: 'Enerji' },
  { id: 'favorites', label: 'Favoriler' },
];

export default function MarketsScreen() {
  const { quotes, isLoading, isRefreshing, lastUpdated, refresh, addCustomQuote } = useMarketData();
  const { favorites } = useFavoritesStore();
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<MarketQuote | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Varlık listesini hazırla: Gram, Çeyrek ve Cumhuriyet altınları en üst sıralarda yer alır,
  // ardından kullanıcının favorilediği veya aradığı diğer dinamik BIST hisseleri eklenir.
  const assetList = useMemo(() => {
    const list: MarketQuote[] = [];
    const seen = new Set<string>();

    for (const sym of ASSET_DISPLAY_ORDER) {
      if (quotes[sym]) {
        list.push(quotes[sym]!);
        seen.add(sym);
      }
    }

    const isSearching = searchQuery.trim().length > 0;
    for (const [sym, quote] of Object.entries(quotes)) {
      if (!seen.has(sym) && quote) {
        const isFav = favorites.includes(sym as MarketSymbol);
        if (isFav || isSearching) {
          list.push(quote);
          seen.add(sym);
        }
      }
    }

    return list;
  }, [quotes, favorites, searchQuery]);

  // Dinamik BIST Hisse Arama: Listede olmayan hisseler (Örn: SASA, HEKTS, MIATK) anlık çekilir
  useEffect(() => {
    const cleanQuery = searchQuery.trim().toUpperCase().replace(/\.IS$/, '');
    const isPotentialBistSymbol = /^[A-Z0-9]{2,6}$/.test(cleanQuery);
    const candidateSymbol = `${cleanQuery}.IS`;

    if (!isPotentialBistSymbol || quotes[candidateSymbol]) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const quote = await fetchYahooQuote(candidateSymbol);
        if (quote) {
          addCustomQuote(quote);
        }
      } catch (e) {
        console.warn('Dinamik hisse arama sonucu bulunamadı:', candidateSymbol, e);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, quotes, addCustomQuote]);

  // Arama ve kategori filtreleme
  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const isSearching = query.length > 0;

    const filtered = assetList.filter((item) => {
      if (!isSearching) {
        if (selectedCategory === 'favorites') {
          if (!favorites.includes(item.symbol)) return false;
        } else if (selectedCategory === 'currency') {
          if (item.category !== 'currency') return false;
        } else if (selectedCategory === 'gold_commodity') {
          if (item.category !== 'gold' && item.category !== 'commodity') return false;
        } else if (selectedCategory === 'stock') {
          if (item.category !== 'stock' && item.category !== 'index') return false;
        } else if (selectedCategory === 'energy') {
          if (item.category !== 'energy') return false;
        }
      }

      if (isSearching) {
        const matchSymbol = item.symbol.toLowerCase().includes(query);
        const matchShort = item.shortName.toLowerCase().includes(query);
        const matchName = item.name.toLowerCase().includes(query);
        return matchSymbol || matchShort || matchName;
      }

      return true;
    });

    // Yıldızlanan (favori) varlıklar daima listenin en üstünde yer alır
    return [...filtered].sort((a, b) => {
      const aFav = favorites.includes(a.symbol);
      const bFav = favorites.includes(b.symbol);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [assetList, selectedCategory, searchQuery, favorites]);

  const handleCardPress = (quote: MarketQuote) => {
    setSelectedQuote(quote);
    setModalVisible(true);
  };

  const handleRefresh = async () => {
    const res = await refresh();
    if (res.fromCache) {
      const remainingSec = Math.round(res.nextAllowedInMs / 1000);
      setCacheNotice(
        t(`Smart Cache aktif: Veriler güncel (${remainingSec} sn sonra yenilenebilir)`)
      );
      setTimeout(() => setCacheNotice(null), 3000);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Üst Bar / Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoRow}>
            <View style={styles.pulseDot} />
            <Text style={[styles.appTitle, { color: colors.text }]}>PiyasaRadarı</Text>
            <View style={[styles.liveTag, { backgroundColor: colors.accentSoft }]}>
              <Zap size={10} color={colors.accent} fill={colors.accent} />
              <Text style={[styles.liveTagText, { color: colors.accent }]}>{t('CANLI')}</Text>
            </View>
          </View>
        </View>

        {/* Yenileme; hesap ve ayarlar tüm sekmelerden alt menüyle açılır. */}
        <View style={styles.headerRight}>
          <Pressable
            onPress={handleRefresh}
            disabled={isRefreshing}
            style={({ pressed }) => [
              styles.headerIconButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { backgroundColor: colors.surfaceHighlight, opacity: 0.8 },
            ]}
            accessibilityLabel="Piyasa verilerini yenile"
            accessibilityRole="button"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <RefreshCw size={17} color={colors.text} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Güncelleme bilgisi, aksiyonlardan ayrı satırda. */}
      <View style={styles.cacheInfoRow}>
        <ShieldCheck size={12} color={colors.up} />
        <Text style={[styles.cacheInfoText, { color: colors.up }]}>60s Smart Cache</Text>
        <Text style={[styles.dotSeparator, { color: colors.textMuted }]}>•</Text>
        <Clock size={11} color={colors.textMuted} />
        <Text style={[styles.updateTimeText, { color: colors.textMuted }]}>
          {lastUpdated
            ? t(`Güncelleme: ${formatTime(lastUpdated)}`)
            : t('Yükleniyor...')}
        </Text>
      </View>

      {/* Smart Cache Bildirim Banner'ı */}
      {cacheNotice && (
        <View style={[styles.noticeBanner, { backgroundColor: colors.accentSoft }]}>
          <ShieldCheck size={14} color={colors.accent} />
          <Text style={[styles.noticeBannerText, { color: colors.text }]}>{cacheNotice}</Text>
        </View>
      )}

      {/* Yatay Özet Kayan Bant (Market Ticker) */}
      <MarketTicker quotes={quotes} onSelectSymbol={handleCardPress} />

      {/* Arama Çubuğu */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('Varlık veya BIST hissesi ara (SASA, HEKTS, Altın...)')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCapitalize="characters"
        />
        {isSearchingOnline ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
        ) : searchQuery.length > 0 && Platform.OS !== 'ios' ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Çevrim İçi BIST Tarama Bildirimi */}
      {isSearchingOnline && (
        <View style={styles.searchNoticeRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.searchNoticeText, { color: colors.accent }]}>
            {t(`Borsa İstanbul taranıyor: ${searchQuery.trim().toUpperCase()}.IS...`)}
          </Text>
        </View>
      )}

      {/* Kategori Filtre Butonları */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                {cat.id === 'favorites' && (
                  <Star
                    size={12}
                    color={isSelected ? '#FFFFFF' : colors.gold}
                    fill={isSelected ? '#FFFFFF' : colors.gold}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textMuted,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {t(cat.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Varlık Listesi */}
      {isLoading && assetList.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingMessage, { color: colors.textMuted }]}>
            {t('Piyasa verileri alınıyor...')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <AssetCard quote={item} onPress={() => handleCardPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isSearchingOnline ? t('BIST Taranıyor...') : t('Sonuç Bulunamadı')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {isSearchingOnline
                  ? `"${searchQuery.trim().toUpperCase()}" için Borsa İstanbul'dan canlı veri çekiliyor...`
                  : searchQuery
                  ? `"${searchQuery}" ile eşleşen varlık veya hisse bulunamadı.`
                  : t('Bu kategoride henüz varlık bulunmuyor.')}
              </Text>
            </View>
          }
        />
      )}

      {/* Varlık Detay Modalı */}
      <AssetDetailModal
        quote={selectedQuote ? quotes[selectedQuote.symbol] ?? selectedQuote : null}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedQuote(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C076',
  },
  appTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cacheInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cacheInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dotSeparator: {
    fontSize: 10,
  },
  updateTimeText: {
    fontSize: 11,
    ...FintechTheme.typography.tabularNums,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 6,
  },
  noticeBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 4,
  },
  searchNoticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScrollContainer: {
    marginBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingMessage: {
    fontSize: 13,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
});


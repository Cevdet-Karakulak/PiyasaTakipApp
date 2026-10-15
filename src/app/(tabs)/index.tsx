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
import { FintechTheme } from '@/constants/fintechTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { useFavoritesStore } from '@/store/favoritesStore';
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

  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<MarketQuote | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Varlık listesini hazırla: Gram, Çeyrek ve Cumhuriyet altınları en üst sıralarda yer alır,
  // ardından kullanıcının favorilediği veya aradığı diğer dinamik BIST hisseleri eklenir.
  // Favoriden çıkarılan ve aktif aranmayan özel hisseler listeden anında kaybolur.
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

  // Dinamik BIST Hisse Arama: Listede olmayan hisseler (Örn: SASA, HEKTS, MIATK) Cloudflare Proxy üzerinden anlık çekilir
  useEffect(() => {
    const cleanQuery = searchQuery.trim().toUpperCase().replace(/\.IS$/, '');
    // 2-6 karakterlik olası bir BIST hisse sembolü
    const isPotentialBistSymbol = /^[A-Z0-9]{2,6}$/.test(cleanQuery);
    const candidateSymbol = `${cleanQuery}.IS`;

    if (!isPotentialBistSymbol || quotes[candidateSymbol]) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const quote = await fetchYahooQuote(candidateSymbol);
        if (quote && quote.price > 0) {
          addCustomQuote(quote);
        }
      } catch {
        // Hata durumunda sessizce yakala
      } finally {
        setIsSearchingOnline(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, quotes, addCustomQuote]);

  // Filtreleme ve arama mantığı
  const filteredAssets = useMemo(() => {
    const isSearching = searchQuery.trim().length > 0;
    const query = searchQuery.toLowerCase().trim();

    const filtered = assetList.filter((item) => {
      // 1. Kategori filtresi: Arama kutusu boşken kategoriyi filtrele;
      // kullanıcı arama yapıyorsa tüm pazardaki hisse/emtia/döviz sonuçlarını getir.
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

      // 2. Arama sorgusu
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
      setCacheNotice(`Smart Cache aktif: Veriler güncel (${remainingSec} sn sonra yenilenebilir)`);
      setTimeout(() => setCacheNotice(null), 3000);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Üst Bar / Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.appTitle}>PiyasaRadarı</Text>
            <View style={styles.liveTag}>
              <Zap size={10} color={FintechTheme.colors.accent} fill={FintechTheme.colors.accent} />
              <Text style={styles.liveTagText}>CANLI</Text>
            </View>
          </View>

          {/* Güncelleme & Smart Cache Bilgisi */}
          <View style={styles.cacheInfoRow}>
            <ShieldCheck size={12} color={FintechTheme.colors.up} />
            <Text style={styles.cacheInfoText}>60s Smart Cache</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Clock size={11} color={FintechTheme.colors.textMuted} />
            <Text style={styles.updateTimeText}>
              {lastUpdated ? `Uygulama Güncelleme: ${formatTime(lastUpdated)}` : 'Yükleniyor...'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshPressed]}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={FintechTheme.colors.accent} />
          ) : (
            <RefreshCw size={18} color={FintechTheme.colors.text} />
          )}
        </Pressable>
      </View>

      {/* Smart Cache Bildirim Banner'ı */}
      {cacheNotice && (
        <View style={styles.noticeBanner}>
          <ShieldCheck size={14} color={FintechTheme.colors.accent} />
          <Text style={styles.noticeBannerText}>{cacheNotice}</Text>
        </View>
      )}

      {/* Yatay Özet Kayan Bant (Market Ticker) */}
      <MarketTicker quotes={quotes} onSelectSymbol={handleCardPress} />

      {/* Arama Çubuğu */}
      <View style={styles.searchContainer}>
        <Search size={16} color={FintechTheme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Varlık veya BIST hissesi ara (SASA, HEKTS, Altın...)"
          placeholderTextColor={FintechTheme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCapitalize="characters"
        />
        {isSearchingOnline ? (
          <ActivityIndicator size="small" color={FintechTheme.colors.accent} style={{ marginRight: 4 }} />
        ) : searchQuery.length > 0 && Platform.OS !== 'ios' ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={FintechTheme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Çevrim İçi BIST Tarama Bildirimi */}
      {isSearchingOnline && (
        <View style={styles.searchNoticeRow}>
          <ActivityIndicator size="small" color={FintechTheme.colors.accent} />
          <Text style={styles.searchNoticeText}>
            Borsa İstanbul taranıyor: {searchQuery.trim().toUpperCase()}.IS...
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
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                {cat.id === 'favorites' && (
                  <Star
                    size={12}
                    color={isSelected ? '#FFFFFF' : FintechTheme.colors.gold}
                    fill={isSelected ? '#FFFFFF' : FintechTheme.colors.gold}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Varlık Listesi */}
      {isLoading && assetList.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={FintechTheme.colors.accent} />
          <Text style={styles.loadingMessage}>Piyasa verileri alınıyor...</Text>
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
              tintColor={FintechTheme.colors.accent}
              colors={[FintechTheme.colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {isSearchingOnline ? 'BIST Taranıyor...' : 'Sonuç Bulunamadı'}
              </Text>
              <Text style={styles.emptySub}>
                {isSearchingOnline
                  ? `"${searchQuery.trim().toUpperCase()}" için Borsa İstanbul'dan canlı veri çekiliyor...`
                  : searchQuery
                  ? `"${searchQuery}" ile eşleşen varlık veya hisse bulunamadı.`
                  : 'Bu kategoride henüz varlık bulunmuyor.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Varlık Detay Modalı */}
      <AssetDetailModal
        quote={selectedQuote}
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FintechTheme.colors.up,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    letterSpacing: -0.5,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  liveTagText: {
    color: FintechTheme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cacheInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cacheInfoText: {
    fontSize: 11,
    color: FintechTheme.colors.up,
    fontWeight: '600',
  },
  dotSeparator: {
    color: FintechTheme.colors.textMuted,
    fontSize: 10,
  },
  updateTimeText: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    ...FintechTheme.typography.tabularNums,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: FintechTheme.colors.surface,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshPressed: {
    backgroundColor: FintechTheme.colors.surfaceHighlight,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 6,
  },
  noticeBannerText: {
    color: FintechTheme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: FintechTheme.colors.text,
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
    color: FintechTheme.colors.accent,
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
    backgroundColor: FintechTheme.colors.surface,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  categoryPillActive: {
    backgroundColor: FintechTheme.colors.accent,
    borderColor: FintechTheme.colors.accent,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    color: FintechTheme.colors.textMuted,
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
    color: FintechTheme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: FintechTheme.colors.textMuted,
    textAlign: 'center',
  },
});

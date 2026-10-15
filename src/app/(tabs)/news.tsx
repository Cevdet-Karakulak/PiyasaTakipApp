import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
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
import * as WebBrowser from 'expo-web-browser';
import {
  Calendar,
  Clock,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  X,
} from 'lucide-react-native';

import { fetchLiveNews, type NewsArticle, type NewsCategory } from '@/api/newsService';
import { FintechTheme } from '@/constants/fintechTheme';

const CATEGORIES: NewsCategory[] = ['Tümü', 'BIST', 'Altın', 'Döviz', 'Makro', 'Küresel', 'Ekonomi'];

export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<NewsCategory>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const loadNews = useCallback(async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await fetchLiveNews(force);
      setArticles(data);
    } catch (err) {
      console.warn('Haberler yüklenirken hata:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadNews();
    });
  }, [loadNews]);

  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      if (selectedCat !== 'Tümü' && item.category !== selectedCat) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchSummary = item.summary.toLowerCase().includes(query);
        return matchTitle || matchSummary;
      }
      return true;
    });
  }, [articles, selectedCat, searchQuery]);

  const handleOpenSource = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: FintechTheme.colors.surface,
        controlsColor: FintechTheme.colors.accent,
      });
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'BIST':
        return FintechTheme.colors.stock;
      case 'Altın':
        return FintechTheme.colors.gold;
      case 'Döviz':
        return FintechTheme.colors.up;
      case 'Küresel':
        return FintechTheme.colors.energy;
      default:
        return FintechTheme.colors.accent;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Newspaper size={22} color={FintechTheme.colors.accent} />
            <Text style={styles.headerTitle}>Piyasa Haberleri</Text>
          </View>
          <Text style={styles.headerSub}>Canlı finans ve ekonomi bülteni (Bloomberg HT & Küresel)</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
          onPress={() => loadNews(true)}
          disabled={isRefreshing}
          hitSlop={8}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={FintechTheme.colors.accent} />
          ) : (
            <RefreshCw size={18} color={FintechTheme.colors.text} />
          )}
        </Pressable>
      </View>

      {/* Arama Çubuğu */}
      <View style={styles.searchBar}>
        <Search size={16} color={FintechTheme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Haber veya şirket ara (BIST, Faiz, Altın...)"
          placeholderTextColor={FintechTheme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={FintechTheme.colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Kategori Filtreleri */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => {
            const active = selectedCat === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.categoryPill, active && styles.categoryPillActive]}
                onPress={() => setSelectedCat(cat)}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Haber Listesi */}
      {isLoading && articles.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={FintechTheme.colors.accent} />
          <Text style={styles.loadingText}>Güncel ekonomi haberleri alınıyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadNews(true)}
              tintColor={FintechTheme.colors.accent}
              colors={[FintechTheme.colors.accent]}
            />
          }
          renderItem={({ item }) => {
            const catColor = getCategoryColor(item.category);
            return (
              <Pressable
                style={({ pressed }) => [styles.newsCard, pressed && styles.newsCardPressed]}
                onPress={() => setSelectedArticle(item)}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.badge, { backgroundColor: `${catColor}1A` }]}>
                    <Text style={[styles.badgeText, { color: catColor }]}>{item.category}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Clock size={11} color={FintechTheme.colors.textMuted} />
                    <Text style={styles.timeText}>{item.timeAgo}</Text>
                  </View>
                </View>

                <Text style={styles.newsTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                <Text style={styles.newsSummary} numberOfLines={2}>
                  {item.summary}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.sourceText}>{item.source}</Text>
                  <View style={styles.readMoreTag}>
                    <Text style={styles.readMoreText}>Haberi Oku</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Haber Bulunamadı</Text>
              <Text style={styles.emptySub}>Arama kriterinize uygun güncel haber bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* Şık Haber Okuma Modalı */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Üst Bar */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {selectedArticle && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: `${getCategoryColor(selectedArticle.category)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getCategoryColor(selectedArticle.category) },
                      ]}
                    >
                      {selectedArticle.category}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalSource}>{selectedArticle?.source}</Text>
              </View>

              <Pressable
                onPress={() => setSelectedArticle(null)}
                hitSlop={10}
                style={styles.closeBtn}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            {/* Modal İçerik Kaydırma */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>{selectedArticle?.title}</Text>

              <View style={styles.modalMetaRow}>
                <Clock size={13} color={FintechTheme.colors.textMuted} />
                <Text style={styles.modalMetaText}>{selectedArticle?.timeAgo}</Text>
                {selectedArticle?.pubDate ? (
                  <>
                    <Text style={styles.dot}>•</Text>
                    <Calendar size={13} color={FintechTheme.colors.textMuted} />
                    <Text style={styles.modalMetaText}>
                      {new Date(selectedArticle.pubDate).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </>
                ) : null}
              </View>

              <View style={styles.divider} />

              <Text style={styles.modalBodyText}>{selectedArticle?.summary}</Text>

              <View style={styles.infoNotice}>
                <Text style={styles.infoNoticeText}>
                  Bu haber {selectedArticle?.source} RSS veri akışı üzerinden sağlanmıştır. Tüm detaylar, analizler ve telif hakları kaynak kuruluşa aittir.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Alt Buton: Doğrudan Gerçek Habere Yönlendirme */}
            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [styles.openSourceBtn, pressed && styles.openSourceBtnPressed]}
                onPress={() => {
                  if (selectedArticle?.link) {
                    handleOpenSource(selectedArticle.link);
                  }
                }}
              >
                <Text style={styles.openSourceText}>Haberi Kaynağında Aç (Tam Metin)</Text>
                <ExternalLink size={16} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FintechTheme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: FintechTheme.colors.text,
    fontSize: 13,
    paddingVertical: 0,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: FintechTheme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  categoryPillActive: {
    backgroundColor: FintechTheme.colors.accent,
    borderColor: FintechTheme.colors.accent,
  },
  categoryText: {
    color: FintechTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  newsCard: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  newsCardPressed: {
    backgroundColor: FintechTheme.colors.surfaceHighlight,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: FintechTheme.colors.textMuted,
    fontSize: 11,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
    lineHeight: 21,
    marginBottom: 6,
  },
  newsSummary: {
    fontSize: 13,
    color: FintechTheme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: FintechTheme.colors.border,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  readMoreTag: {
    backgroundColor: 'rgba(41, 98, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: FintechTheme.colors.accent,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: FintechTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },

  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: FintechTheme.colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalSource: {
    fontSize: 13,
    fontWeight: '600',
    color: FintechTheme.colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: FintechTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    lineHeight: 28,
    marginBottom: 12,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  modalMetaText: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  dot: {
    color: FintechTheme.colors.textMuted,
    marginHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: FintechTheme.colors.border,
    marginBottom: 16,
  },
  modalBodyText: {
    fontSize: 15,
    color: FintechTheme.colors.text,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  infoNotice: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  infoNoticeText: {
    fontSize: 11,
    color: FintechTheme.colors.textMuted,
    lineHeight: 16,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  openSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FintechTheme.colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: FintechTheme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  openSourceBtnPressed: {
    opacity: 0.85,
  },
  openSourceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

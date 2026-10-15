import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Globe,
  Info,
  Mail,
  Moon,
  RefreshCw,
  Share2,
  Shield,
  Star,
  Sun,
  Trash2,
  X,
} from 'lucide-react-native';

import { FintechTheme } from '@/constants/fintechTheme';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useMarketStore } from '@/store/marketStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTranslation } from '@/store/preferencesStore';

type SheetType = 'language' | 'theme' | 'about' | 'disclaimer' | 'privacy' | 'reset' | null;

export default function SettingsScreen() {
  const { t, language, theme, setLanguage, setTheme } = useTranslation();
  const [sheet, setSheet] = useState<SheetType>(null);
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = useMarketStore((s) => s.clearCache);
  const fetchMarketData = useMarketStore((s) => s.fetchMarketData);
  const clearPortfolio = usePortfolioStore((s) => s.clearPortfolio);

  const handleShare = async () => {
    try {
      const shareUrl =
        Platform.OS === 'android'
          ? 'https://play.google.com/store/apps/details?id=com.cevdet.piyasaradari'
          : 'https://apps.apple.com/app/id6819800328';
      const message = `${t('PiyasaRadarı · Canlı Borsa, Döviz ve Finans Takibi')}\n${t('Borsa ve döviz kurlarını anlık takip et: ')}${shareUrl}`;
      await Share.share({
        message,
        url: shareUrl,
        title: 'PiyasaRadarı',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleRateApp = () => {
    const url =
      Platform.OS === 'android'
        ? 'market://details?id=com.cevdet.piyasaradari'
        : 'https://apps.apple.com/app/id6819800328?action=write-review';
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        Platform.OS === 'android'
          ? 'https://play.google.com/store/apps/details?id=com.cevdet.piyasaradari'
          : 'https://apps.apple.com/app/id6819800328'
      );
    });
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('PiyasaRadarı Destek / Geri Bildirim');
    const body = encodeURIComponent(
      `Merhaba,\n\nUygulama Sürümü: 1.0.0\nCihaz: ${Platform.OS}\n\nGörüş veya sorununuz:\n`
    );
    Linking.openURL(`mailto:destek@piyasaradari.com?subject=${subject}&body=${body}`);
  };

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      await clearCache();
      await fetchMarketData({ bypassCache: true });
      Alert.alert(t('Başarılı'), t('Önbellek temizlendi.'));
    } catch {
      Alert.alert('Hata', 'Önbellek temizlenirken bir sorun oluştu.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleResetData = () => {
    clearPortfolio();
    useFavoritesStore.setState({
      favorites: ['USDTRY=X', 'GRAM_ALTIN', 'XU100.IS', 'THYAO.IS'],
      isInitialized: true,
    });
    void clearCache();
    setSheet(null);
    Alert.alert(t('Başarılı'), t('Tüm yerel veriler sıfırlandı.'));
  };

  const settingRow = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    onPress: () => void,
    valueBadge?: string
  ) => {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(title)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowCard,
          {
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.rowTextContainer}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {t(title)}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {t(subtitle)}
          </Text>
        </View>
        {valueBadge ? (
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>{valueBadge}</Text>
            <ChevronRight size={18} color={FintechTheme.colors.textMuted} />
          </View>
        ) : (
          <ChevronRight size={18} color={FintechTheme.colors.textMuted} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Üst Başlık */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('Ayarlar')}</Text>
          <Text style={styles.headerSubtitle}>{t('Tercihler')}</Text>
        </View>
        <View style={styles.versionPill}>
          <Text style={styles.versionPillText}>v1.0.0</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bölüm: Tercihler */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Tercihler')}</Text>
          <View style={styles.cardGroup}>
            {settingRow(
              <Globe size={22} color={FintechTheme.colors.accent} />,
              'Dil',
              language === 'tr' ? 'Türkçe' : 'English',
              () => setSheet('language'),
              language === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'
            )}
            <View style={styles.divider} />
            {settingRow(
              theme === 'dark' ? (
                <Moon size={22} color={FintechTheme.colors.stock} />
              ) : (
                <Sun size={22} color={FintechTheme.colors.gold} />
              ),
              'Görünüm',
              theme === 'dark' ? 'Koyu' : 'Açık',
              () => setSheet('theme'),
              theme === 'dark' ? t('Koyu') : t('Açık')
            )}
          </View>
        </View>

        {/* Bölüm: Destek ve Paylaşım */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Destek ve paylaşım')}</Text>
          <View style={styles.cardGroup}>
            {settingRow(
              <Share2 size={22} color={FintechTheme.colors.up} />,
              'Paylaş',
              "PiyasaRadarı'nı arkadaşlarınla paylaş",
              handleShare
            )}
            <View style={styles.divider} />
            {settingRow(
              <Star size={22} color={FintechTheme.colors.gold} />,
              'Uygulamayı puanla',
              Platform.OS === 'android'
                ? 'Google Play’de görüşünü paylaş'
                : 'App Store’da görüşünü paylaş',
              handleRateApp
            )}
            <View style={styles.divider} />
            {settingRow(
              <Mail size={22} color={FintechTheme.colors.energy} />,
              'Destek',
              'Geliştirici ile iletişime geç',
              handleContactSupport
            )}
          </View>
        </View>

        {/* Bölüm: Uygulama */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Uygulama')}</Text>
          <View style={styles.cardGroup}>
            {settingRow(
              <Info size={22} color={FintechTheme.colors.accent} />,
              'Hakkında',
              'PiyasaRadarı · 1.0.0',
              () => setSheet('about')
            )}
            <View style={styles.divider} />
            {settingRow(
              <AlertTriangle size={22} color={FintechTheme.colors.gold} />,
              'Yasal uyarı ve kaynaklar',
              'BIST 15dk gecikme ve lisans bilgisi',
              () => setSheet('disclaimer')
            )}
            <View style={styles.divider} />
            {settingRow(
              <Shield size={22} color={FintechTheme.colors.up} />,
              'Gizlilik bilgisi',
              'Cihaz kayıtları ve veri kullanımı',
              () => setSheet('privacy')
            )}
          </View>
        </View>

        {/* Bölüm: Veri ve Önbellek */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Veri ve önbellek')}</Text>
          <View style={styles.cardGroup}>
            {settingRow(
              <RefreshCw
                size={22}
                color={FintechTheme.colors.accent}
                style={isClearing ? { opacity: 0.5 } : undefined}
              />,
              'Önbelleği temizle',
              'Piyasa verileri önbelleği yenilensin',
              handleClearCache
            )}
            <View style={styles.divider} />
            {settingRow(
              <Trash2 size={22} color={FintechTheme.colors.down} />,
              'Verilerimi sıfırla',
              'Favorileri ve portföy kayıtlarını kaldır',
              () => setSheet('reset')
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>PiyasaRadarı</Text>
          <Text style={styles.footerText}>
            © 2026 Cevdet Karakulak · {t('Tüm hakları saklıdır.')}
          </Text>
        </View>
      </ScrollView>

      {/* --- MODALLAR --- */}

      {/* 1. DİL SEÇİM MODALI */}
      <Modal
        visible={sheet === 'language'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe size={22} color={FintechTheme.colors.accent} />
                <Text style={styles.modalTitle}>{t('Dil')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={styles.modalCloseButton}
                hitSlop={8}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.optionList}>
              <Pressable
                style={[
                  styles.optionItem,
                  language === 'tr' && styles.optionItemActive,
                ]}
                onPress={() => {
                  setLanguage('tr');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Text style={styles.flagEmoji}>🇹🇷</Text>
                  <View>
                    <Text style={styles.optionTitle}>Türkçe</Text>
                    <Text style={styles.optionSubtitle}>Varsayılan sistem dili</Text>
                  </View>
                </View>
                {language === 'tr' && (
                  <Check size={20} color={FintechTheme.colors.accent} />
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.optionItem,
                  language === 'en' && styles.optionItemActive,
                ]}
                onPress={() => {
                  setLanguage('en');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Text style={styles.flagEmoji}>🇬🇧</Text>
                  <View>
                    <Text style={styles.optionTitle}>English</Text>
                    <Text style={styles.optionSubtitle}>Global language support</Text>
                  </View>
                </View>
                {language === 'en' && (
                  <Check size={20} color={FintechTheme.colors.accent} />
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 2. GÖRÜNÜM MODALI */}
      <Modal
        visible={sheet === 'theme'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Moon size={22} color={FintechTheme.colors.stock} />
                <Text style={styles.modalTitle}>{t('Görünüm')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={styles.modalCloseButton}
                hitSlop={8}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.optionList}>
              <Pressable
                style={[
                  styles.optionItem,
                  theme === 'dark' && styles.optionItemActive,
                ]}
                onPress={() => {
                  setTheme('dark');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Moon size={20} color={FintechTheme.colors.stock} />
                  <View>
                    <Text style={styles.optionTitle}>{t('Koyu')}</Text>
                    <Text style={styles.optionSubtitle}>Fintech Dark Theme</Text>
                  </View>
                </View>
                {theme === 'dark' && (
                  <Check size={20} color={FintechTheme.colors.accent} />
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.optionItem,
                  theme === 'light' && styles.optionItemActive,
                ]}
                onPress={() => {
                  setTheme('light');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Sun size={20} color={FintechTheme.colors.gold} />
                  <View>
                    <Text style={styles.optionTitle}>{t('Açık')}</Text>
                    <Text style={styles.optionSubtitle}>Light Theme</Text>
                  </View>
                </View>
                {theme === 'light' && (
                  <Check size={20} color={FintechTheme.colors.accent} />
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 3. HAKKINDA MODALI */}
      <Modal
        visible={sheet === 'about'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Info size={22} color={FintechTheme.colors.accent} />
                <Text style={styles.modalTitle}>{t('PiyasaRadarı Hakkında')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={styles.modalCloseButton}
                hitSlop={8}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={styles.modalParagraph}>
                {t(
                  'PiyasaRadarı; Borsa İstanbul (BIST), döviz kurları, altın ve kıymetli madenler, kripto para ile güncel akaryakıt fiyatlarını tek ekrandan anlık ve gecikmesiz olarak takip etmenizi sağlayan yeni nesil bir finans takip uygulamasıdır.'
                )}
              </Text>
              <View style={styles.infoBadgeBox}>
                <Text style={styles.infoBadgeTitle}>Mimarisi</Text>
                <Text style={styles.infoBadgeText}>
                  Cloudflare Worker Edge Caching · Yahoo Finance API · Offline First Zustand & AsyncStorage
                </Text>
              </View>
              <Text style={[styles.modalParagraph, { marginTop: 12 }]}>
                {t('Geliştirici')}: Cevdet Karakulak
              </Text>
            </ScrollView>

            <Pressable
              style={styles.modalActionPrimary}
              onPress={() => setSheet(null)}
            >
              <Text style={styles.modalActionPrimaryText}>{t('Kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 4. YASAL UYARI MODALI */}
      <Modal
        visible={sheet === 'disclaimer'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <AlertTriangle size={22} color={FintechTheme.colors.gold} />
                <Text style={styles.modalTitle}>{t('Yasal Uyarı')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={styles.modalCloseButton}
                hitSlop={8}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={styles.modalParagraph}>
                {t(
                  'Uygulamada yer alan tüm borsa, döviz, emtia ve haber verileri bilgilendirme amaçlıdır. Yatırım tavsiyesi niteliğinde değildir. BIST verileri yasal düzenlemeler gereği 15 dakika gecikmeli olarak sunulmaktadır. Finansal kararlar almadan önce lütfen yetkili yatırım danışmanlarına başvurunuz.'
                )}
              </Text>
            </ScrollView>

            <Pressable
              style={styles.modalActionPrimary}
              onPress={() => setSheet(null)}
            >
              <Text style={styles.modalActionPrimaryText}>{t('Kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 5. GİZLİLİK MODALI */}
      <Modal
        visible={sheet === 'privacy'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Shield size={22} color={FintechTheme.colors.up} />
                <Text style={styles.modalTitle}>{t('Gizlilik bilgisi')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={styles.modalCloseButton}
                hitSlop={8}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={styles.modalParagraph}>
                PiyasaRadarı uygulamasında herhangi bir kullanıcı hesabı veya giriş zorunluluğu yoktur. Portföy varlıklarınız ve favori hisseleriniz yalnızca cihazınızın kendi hafızasında (AsyncStorage) şifrelenmiş olarak saklanır. Hiçbir kişisel veri üçüncü şahıslara veya harici sunuculara aktarılmaz.
              </Text>
            </ScrollView>

            <Pressable
              style={styles.modalActionPrimary}
              onPress={() => setSheet(null)}
            >
              <Text style={styles.modalActionPrimaryText}>{t('Kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. VERİLERİ SIFIRLA ONAY MODALI */}
      <Modal
        visible={sheet === 'reset'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Trash2 size={22} color={FintechTheme.colors.down} />
                <Text style={[styles.modalTitle, { color: FintechTheme.colors.down }]}>
                  {t('Verileri Sıfırla')}
                </Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={styles.modalCloseButton}
                hitSlop={8}
              >
                <X size={20} color={FintechTheme.colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalParagraph}>
              {t(
                'Tüm favorileriniz, özel aranan hisseleriniz ve portföy varlıklarınız cihazınızdan silinecektir. Bu işlem geri alınamaz. Emin misiniz?'
              )}
            </Text>

            <View style={styles.modalButtonGroup}>
              <Pressable
                style={styles.modalActionCancel}
                onPress={() => setSheet(null)}
              >
                <Text style={styles.modalActionCancelText}>{t('İptal')}</Text>
              </Pressable>
              <Pressable
                style={styles.modalActionDanger}
                onPress={handleResetData}
              >
                <Text style={styles.modalActionDangerText}>{t('Sıfırla')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FintechTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: FintechTheme.colors.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: FintechTheme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: FintechTheme.colors.textMuted,
    marginTop: 2,
  },
  versionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: FintechTheme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: FintechTheme.colors.borderLight,
  },
  versionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: FintechTheme.colors.accent,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: FintechTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  cardGroup: {
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    overflow: 'hidden',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  divider: {
    height: 1,
    backgroundColor: FintechTheme.colors.border,
    marginLeft: 70,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextContainer: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  rowSubtitle: {
    fontSize: 12.5,
    color: FintechTheme.colors.textMuted,
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: FintechTheme.colors.accent,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 4,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: FintechTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
  },
  // Modallar
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: FintechTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FintechTheme.colors.borderLight,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: FintechTheme.colors.text,
  },
  modalCloseButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
  },
  optionList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
  },
  optionItemActive: {
    borderColor: FintechTheme.colors.accent,
    backgroundColor: FintechTheme.colors.surfaceHighlight,
  },
  optionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagEmoji: {
    fontSize: 24,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
    marginTop: 2,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: FintechTheme.colors.textSecondary,
    marginBottom: 12,
  },
  infoBadgeBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    marginVertical: 8,
    gap: 4,
  },
  infoBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: FintechTheme.colors.accent,
    textTransform: 'uppercase',
  },
  infoBadgeText: {
    fontSize: 12,
    color: FintechTheme.colors.textMuted,
    lineHeight: 18,
  },
  modalActionPrimary: {
    marginTop: 16,
    backgroundColor: FintechTheme.colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalActionCancel: {
    flex: 1,
    backgroundColor: FintechTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: FintechTheme.colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: FintechTheme.colors.text,
  },
  modalActionDanger: {
    flex: 1,
    backgroundColor: FintechTheme.colors.down,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionDangerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

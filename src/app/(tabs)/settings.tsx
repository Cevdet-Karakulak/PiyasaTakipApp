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
import { router } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
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

import { useThemeColors } from '@/constants/fintechTheme';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useMarketStore } from '@/store/marketStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTranslation } from '@/store/preferencesStore';

type SheetType = 'language' | 'theme' | 'about' | 'disclaimer' | 'privacy' | 'reset' | null;

export default function SettingsScreen() {
  const { t, language, theme, setLanguage, setTheme } = useTranslation();
  const colors = useThemeColors();
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
      `Merhaba FloppaTech Ekibi,\n\nUygulama: PiyasaRadarı v1.0.0\nCihaz: ${Platform.OS}\n\nGörüş veya sorununuz:\n`
    );
    Linking.openURL(`mailto:destek@floppatech.com?subject=${subject}&body=${body}`);
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
            backgroundColor: colors.surface,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {icon}
        </View>
        <View style={styles.rowTextContainer}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {t(title)}
          </Text>
          <Text style={[styles.rowSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {t(subtitle)}
          </Text>
        </View>
        {valueBadge ? (
          <View style={styles.valueBadge}>
            <Text style={[styles.valueBadgeText, { color: colors.accent }]}>{valueBadge}</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Üst Başlık & Geri Dönüş */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeftGroup}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            hitSlop={8}
            accessibilityLabel="Geri"
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Ayarlar')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{t('Tercihler')}</Text>
          </View>
        </View>
        <View
          style={[
            styles.versionPill,
            { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.versionPillText, { color: colors.accent }]}>v1.0.0</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bölüm: Tercihler */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{t('Tercihler')}</Text>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {settingRow(
              <Globe size={22} color={colors.accent} />,
              'Dil',
              language === 'tr' ? 'Türkçe' : 'English',
              () => setSheet('language'),
              language === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {settingRow(
              theme === 'dark' ? (
                <Moon size={22} color={colors.stock} />
              ) : (
                <Sun size={22} color={colors.gold} />
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
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{t('Destek ve paylaşım')}</Text>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {settingRow(
              <Share2 size={22} color={colors.up} />,
              'Paylaş',
              "PiyasaRadarı'nı arkadaşlarınla paylaş",
              handleShare
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {settingRow(
              <Star size={22} color={colors.gold} />,
              'Uygulamayı puanla',
              Platform.OS === 'android'
                ? 'Google Play’de görüşünü paylaş'
                : 'App Store’da görüşünü paylaş',
              handleRateApp
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {settingRow(
              <Mail size={22} color={colors.energy} />,
              'Destek',
              'Geliştirici ile iletişime geç',
              handleContactSupport
            )}
          </View>
        </View>

        {/* Bölüm: Uygulama */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{t('Uygulama')}</Text>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {settingRow(
              <Info size={22} color={colors.accent} />,
              'Hakkında',
              'PiyasaRadarı · 1.0.0',
              () => setSheet('about')
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {settingRow(
              <AlertTriangle size={22} color={colors.gold} />,
              'Yasal uyarı ve kaynaklar',
              'BIST 15dk gecikme ve lisans bilgisi',
              () => setSheet('disclaimer')
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {settingRow(
              <Shield size={22} color={colors.up} />,
              'Gizlilik bilgisi',
              'Cihaz kayıtları ve veri kullanımı',
              () => setSheet('privacy')
            )}
          </View>
        </View>

        {/* Bölüm: Veri ve Önbellek */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{t('Veri ve önbellek')}</Text>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {settingRow(
              <RefreshCw
                size={22}
                color={colors.accent}
                style={isClearing ? { opacity: 0.5 } : undefined}
              />,
              'Önbelleği temizle',
              'Piyasa verileri önbelleği yenilensin',
              handleClearCache
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {settingRow(
              <Trash2 size={22} color={colors.down} />,
              'Verilerimi sıfırla',
              'Favorileri ve portföy kayıtlarını kaldır',
              () => setSheet('reset')
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: colors.textSecondary }]}>PiyasaRadarı</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Geliştirici: FloppaTech & Efe Kaan Karakulak
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted, fontSize: 11 }]}>
            © 2026 FloppaTech & Efe Kaan Karakulak · {t('Tüm hakları saklıdır.')}
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
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe size={22} color={colors.accent} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Dil')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.optionList}>
              <Pressable
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: language === 'tr' ? colors.accent : colors.border,
                  },
                  language === 'tr' && { backgroundColor: colors.surfaceHighlight },
                ]}
                onPress={() => {
                  setLanguage('tr');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Text style={styles.flagEmoji}>🇹🇷</Text>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Türkçe</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                      Varsayılan sistem dili
                    </Text>
                  </View>
                </View>
                {language === 'tr' && <Check size={20} color={colors.accent} />}
              </Pressable>

              <Pressable
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: language === 'en' ? colors.accent : colors.border,
                  },
                  language === 'en' && { backgroundColor: colors.surfaceHighlight },
                ]}
                onPress={() => {
                  setLanguage('en');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Text style={styles.flagEmoji}>🇬🇧</Text>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>English</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                      Global language support
                    </Text>
                  </View>
                </View>
                {language === 'en' && <Check size={20} color={colors.accent} />}
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
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Moon size={22} color={colors.stock} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Görünüm')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.optionList}>
              <Pressable
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: theme === 'dark' ? colors.accent : colors.border,
                  },
                  theme === 'dark' && { backgroundColor: colors.surfaceHighlight },
                ]}
                onPress={() => {
                  setTheme('dark');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Moon size={20} color={colors.stock} />
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Koyu')}</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                      Fintech Koyu Tema
                    </Text>
                  </View>
                </View>
                {theme === 'dark' && <Check size={20} color={colors.accent} />}
              </Pressable>

              <Pressable
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: theme === 'light' ? colors.accent : colors.border,
                  },
                  theme === 'light' && { backgroundColor: colors.surfaceHighlight },
                ]}
                onPress={() => {
                  setTheme('light');
                  setSheet(null);
                }}
              >
                <View style={styles.optionTextRow}>
                  <Sun size={20} color={colors.gold} />
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Açık')}</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                      Açık Aydınlık Tema
                    </Text>
                  </View>
                </View>
                {theme === 'light' && <Check size={20} color={colors.accent} />}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 3. HAKKINDA MODALI (Altyapı/Proxy'den bahsedilmez, temiz kurumsal bilgi) */}
      <Modal
        visible={sheet === 'about'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Info size={22} color={colors.accent} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('PiyasaRadarı Hakkında')}
                </Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                {t(
                  'PiyasaRadarı; Borsa İstanbul (BIST), döviz kurları, altın ve kıymetli madenler, kripto para ile güncel akaryakıt fiyatlarını tek ekrandan anlık ve gecikmesiz olarak takip etmenizi sağlayan yeni nesil bir finans takip uygulamasıdır.'
                )}
              </Text>

              <View
                style={[
                  styles.infoBadgeBox,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.infoBadgeTitle, { color: colors.accent }]}>Geliştirici</Text>
                <Text style={[styles.infoBadgeText, { color: colors.text }]}>
                  FloppaTech & Efe Kaan Karakulak
                </Text>
              </View>

              <View
                style={[
                  styles.infoBadgeBox,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.infoBadgeTitle, { color: colors.accent }]}>Sürüm & Lisans</Text>
                <Text style={[styles.infoBadgeText, { color: colors.text }]}>
                  PiyasaRadarı 1.0.0 (Mobil Sürüm)
                </Text>
              </View>

              <View
                style={[
                  styles.infoBadgeBox,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.infoBadgeTitle, { color: colors.accent }]}>İletişim & Destek</Text>
                <Text style={[styles.infoBadgeText, { color: colors.text }]}>
                  destek@floppatech.com
                </Text>
              </View>
            </ScrollView>

            <Pressable
              style={[styles.modalActionPrimary, { backgroundColor: colors.accent }]}
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
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <AlertTriangle size={22} color={colors.gold} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Yasal Uyarı')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                {t(
                  'Uygulamada yer alan tüm borsa, döviz, emtia ve haber verileri bilgilendirme amaçlıdır. Yatırım tavsiyesi niteliğinde değildir. BIST verileri yasal düzenlemeler gereği 15 dakika gecikmeli olarak sunulmaktadır. Finansal kararlar almadan önce lütfen yetkili yatırım danışmanlarına başvurunuz.'
                )}
              </Text>
            </ScrollView>

            <Pressable
              style={[styles.modalActionPrimary, { backgroundColor: colors.accent }]}
              onPress={() => setSheet(null)}
            >
              <Text style={styles.modalActionPrimaryText}>{t('Kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 5. GİZLİLİK POLİTİKASI MODALI (Uzun ve Detaylı Resmi Metin) */}
      <Modal
        visible={sheet === 'privacy'}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight, maxHeight: '82%' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Shield size={22} color={colors.up} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Gizlilik bilgisi')}</Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ flexGrow: 1 }} showsVerticalScrollIndicator={true}>
              <Text style={[styles.policyHeading, { color: colors.text }]}>
                PiyasaRadarı Gizlilik Politikası
              </Text>
              <Text style={[styles.policyMeta, { color: colors.textMuted }]}>
                Son Güncelleme Tarihi: 15 Ekim 2026
              </Text>

              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                {'FloppaTech & Efe Kaan Karakulak ("Geliştirici"), PiyasaRadarı uygulamasını ("Uygulama") ücretsiz bir hizmet olarak sunmaktadır. Bu HİZMET, Geliştirici tarafından ücretsiz olarak sağlanır ve olduğu gibi kullanılması amaçlanmıştır.'}
              </Text>

              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                Bu sayfa, Uygulamayı kullanan ziyaretçileri, kişisel bilgilerin toplanması, kullanılması ve ifşa edilmesiyle ilgili politikalarımız hakkında bilgilendirmek için kullanılmaktadır.
              </Text>

              <Text style={[styles.policySubheading, { color: colors.text }]}>
                Bilgi Toplama ve Kullanım
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                Daha iyi bir deneyim için Uygulamamızı kullanırken, bize belirli kişisel olarak tanımlanabilir bilgileri sağlamanızı isteyebiliriz. Ancak, PiyasaRadarı uygulaması temel işlevlerini yerine getirirken kullanıcıların kişisel verilerini (ad, soyad, telefon, TC kimlik numarası vb.) sunucularında toplamaz, saklamaz veya üçüncü şahıslarla paylaşmaz.
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                {"Uygulama, kullanıcının cihazında yerel olarak çalışan ve dış servislere (API'lere) yalnızca anlık veri çekmek amacıyla bağlanan bir yapıya sahiptir."}
              </Text>

              <Text style={[styles.policySubheading, { color: colors.text }]}>
                Üçüncü Taraf Hizmetleri
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                Uygulama, sizi tanımlamak için kullanılan bilgileri toplayabilen üçüncü taraf hizmetlerini (örneğin; Google Play Hizmetleri, analitik veya hata raporlama araçları) kullanabilir. Bu kurumların kendi gizlilik politikaları bulunmaktadır.
              </Text>

              <Text style={[styles.policySubheading, { color: colors.text }]}>
                Güvenlik
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                Bize sağladığınız (varsa) bilgilerin güvenliğine değer veriyoruz. Ancak, internet üzerinden hiçbir aktarım yönteminin veya elektronik depolama yönteminin %100 güvenli ve güvenilir olmadığını ve mutlak güvenliğini garanti edemeyeceğimizi unutmayın.
              </Text>

              <Text style={[styles.policySubheading, { color: colors.text }]}>
                Çocukların Gizliliği
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                Bu Hizmetler 13 yaşın altındaki kişilere hitap etmez. 13 yaşın altındaki çocuklardan bilerek kişisel olarak tanımlanabilir bilgiler toplamıyoruz.
              </Text>

              <Text style={[styles.policySubheading, { color: colors.text }]}>
                Bu Gizlilik Politikasındaki Değişiklikler
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                Gizlilik Politikamızı zaman zaman güncelleyebiliriz. Bu nedenle, herhangi bir değişiklik için bu sayfayı periyodik olarak gözden geçirmeniz önerilir. Yeni Gizlilik Politikasını bu sayfada yayınlayarak herhangi bir değişiklikten sizi haberdar edeceğiz.
              </Text>

              <Text style={[styles.policySubheading, { color: colors.text }]}>
                Bize Ulaşın
              </Text>
              <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
                {"Gizlilik Politikamız hakkında herhangi bir sorunuz veya öneriniz varsa, bizimle iletişime geçmekten çekinmeyin:\nE-posta: destek@floppatech.com"}
              </Text>
            </ScrollView>

            <Pressable
              style={[styles.modalActionPrimary, { backgroundColor: colors.accent, marginTop: 14 }]}
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
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Trash2 size={22} color={colors.down} />
                <Text style={[styles.modalTitle, { color: colors.down }]}>
                  {t('Verileri Sıfırla')}
                </Text>
              </View>
              <Pressable
                onPress={() => setSheet(null)}
                style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
              {t(
                'Tüm favorileriniz, özel aranan hisseleriniz ve portföy varlıklarınız cihazınızdan silinecektir. Bu işlem geri alınamaz. Emin misiniz?'
              )}
            </Text>

            <View style={styles.modalButtonGroup}>
              <Pressable
                style={[
                  styles.modalActionCancel,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setSheet(null)}
              >
                <Text style={[styles.modalActionCancelText, { color: colors.text }]}>{t('İptal')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionDanger, { backgroundColor: colors.down }]}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 1,
  },
  versionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  versionPillText: {
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
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
    marginLeft: 70,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
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
  },
  rowSubtitle: {
    fontSize: 12.5,
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueBadgeText: {
    fontSize: 13,
    fontWeight: '600',
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
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 12,
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
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
  },
  modalCloseButton: {
    padding: 4,
    borderRadius: 8,
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
    borderWidth: 1,
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
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  policyHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  policyMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  policySubheading: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  policyParagraph: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  infoBadgeBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
    gap: 4,
  },
  infoBadgeTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalActionPrimary: {
    marginTop: 16,
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
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalActionDanger: {
    flex: 1,
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

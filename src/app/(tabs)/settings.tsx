import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Info,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  RefreshCw,
  Share2,
  Shield,
  Star,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react-native';

import { useThemeColors, type ThemeColors } from '@/constants/fintechTheme';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useMarketStore } from '@/store/marketStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTranslation } from '@/store/preferencesStore';
import type { Language, ThemeMode } from '@/types/preferences';

const APP_VERSION = '1.0.1';
const SUPPORT_EMAIL = 'destek@floppatech.com';

type SheetType =
  | null
  | 'emailAuth'
  | 'googleAuth'
  | 'editProfile'
  | 'deleteAccount'
  | 'language'
  | 'share'
  | 'rate'
  | 'rules'
  | 'privacy'
  | 'terms'
  | 'feedback'
  | 'help'
  | 'about'
  | 'clear';

type EmailAuthMode = 'login' | 'register' | 'reset';
type FeedbackCategory = 'Öneri' | 'Hata' | 'Görüş';

const PRIVACY_PARAGRAPHS: Record<Language, string[]> = {
  tr: [
    'PiyasaRadarı Gizlilik Politikası — Son Güncelleme Tarihi: 15 Ekim 2026. İletişim: destek@floppatech.com',
    'FloppaTech & Efe Kaan Karakulak ("Geliştirici"), PiyasaRadarı uygulamasını ("Uygulama") ücretsiz bir hizmet olarak sunmaktadır. Bu HİZMET, Geliştirici tarafından ücretsiz olarak sağlanır ve olduğu gibi kullanılması amaçlanmıştır.',
    'Bu sayfa, Uygulamayı kullanan ziyaretçileri, kişisel bilgilerin toplanması, kullanılması ve ifşa edilmesiyle ilgili politikalarımız hakkında bilgilendirmek için kullanılmaktadır.',
    'Bilgi Toplama ve Kullanım: Daha iyi bir deneyim için Uygulamamızı kullanırken, bize belirli kişisel olarak tanımlanabilir bilgileri sağlamanızı isteyebiliriz. Ancak, PiyasaRadarı uygulaması temel işlevlerini yerine getirirken kullanıcıların hassas kişisel verilerini (telefon, T.C. kimlik numarası vb.) sunucularında toplamaz, saklamaz veya üçüncü şahıslarla paylaşmaz.',
    "Uygulama, kullanıcının cihazında yerel olarak çalışan ve dış servislere (API'lere) yalnızca anlık veri çekmek amacıyla bağlanan bir yapıya sahiptir. Kullanıcı hesap bilgileri, portföy kayıtları ve favoriler cihaz hafızasında güvenli şekilde tutulur.",
    'Üçüncü Taraf Hizmetleri: Uygulama, sizi tanımlamak için kullanılan bilgileri toplayabilen üçüncü taraf hizmetlerini (örneğin; Google Play Hizmetleri, Apple App Store servisleri, analitik veya hata raporlama araçları) kullanabilir. Bu kurumların kendi gizlilik politikaları bulunmaktadır.',
    'Güvenlik: Bize sağladığınız (varsa) bilgilerin güvenliğine değer veriyoruz. Ancak, internet üzerinden hiçbir aktarım yönteminin veya elektronik depolama yönteminin %100 güvenli ve güvenilir olmadığını ve mutlak güvenliğini garanti edemeyeceğimizi unutmayın.',
    'Çocukların Gizliliği: Bu Hizmetler 13 yaşın altındaki kişilere hitap etmez. 13 yaşın altındaki çocuklardan bilerek kişisel olarak tanımlanabilir bilgiler toplamıyoruz.',
    'Bu Gizlilik Politikasındaki Değişiklikler: Gizlilik Politikamızı zaman zaman güncelleyebiliriz. Bu nedenle, herhangi bir değişiklik için bu sayfayı periyodik olarak gözden geçirmeniz önerilir. Yeni Gizlilik Politikasını bu sayfada yayınlayarak herhangi bir değişiklikten sizi haberdar edeceğiz.',
    'Bize Ulaşın: Gizlilik Politikamız hakkında herhangi bir sorunuz veya öneriniz varsa, bizimle iletişime geçmekten çekinmeyin: destek@floppatech.com',
  ],
  en: [
    'PiyasaRadarı Privacy Policy — Last Updated: 15 October 2026. Contact: destek@floppatech.com',
    'FloppaTech & Efe Kaan Karakulak ("Developer") built the PiyasaRadarı app ("Application") as a free service. This SERVICE is provided by the Developer at no cost and is intended for use as is.',
    'This page is used to inform visitors regarding our policies with the collection, use, and disclosure of Personal Information if anyone decided to use our Service.',
    'Information Collection and Use: For a better experience, while using our Service, we may require you to provide us with certain personally identifiable information. However, PiyasaRadarı does not collect, store on external servers, or share sensitive personal data (such as phone numbers or national ID numbers) with third parties.',
    'The Application operates locally on the user’s device and connects to external services (APIs) solely to fetch live market data. Account details, portfolio records, and favorites are stored locally on your device.',
    'Third-Party Services: The app may use third-party services (such as Google Play Services, Apple App Store services, analytics or crash reporting tools) that may collect information used to identify you. These providers operate under their own privacy policies.',
    'Security: We value your trust in providing us your information. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.',
    'Children’s Privacy: These Services do not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.',
    'Changes to This Privacy Policy: We may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes.',
    'Contact Us: If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at: destek@floppatech.com',
  ],
};

const TERMS_PARAGRAPHS: Record<Language, string[]> = {
  tr: [
    'PiyasaRadarı — Kullanım Koşulları. Güncelleme: 15 Ekim 2026. Destek: destek@floppatech.com',
    'PiyasaRadarı; Borsa İstanbul (BIST), döviz kurları, altın, emtia ve akaryakıt fiyatlarını takip etmek için hazırlanmış bağımsız bir finansal bilgi uygulamasıdır.',
    'Uygulamada yer alan tüm fiyat, grafik, akaryakıt tahmini, çevirici sonucu ve haber verileri yalnızca genel bilgilendirme amaçlıdır; hiçbir şekilde yatırım danışmanlığı veya al-sat tavsiyesi niteliği taşımaz.',
    'Borsa İstanbul (BIST) verileri yasal düzenlemeler gereği 15 dakika gecikmeli olarak sunulmaktadır. Finansal işlem yapmadan önce verileri yetkili kurum ve aracı kuruluşlardan doğrulamanız gerekir.',
    'Portföy kayıtları, favori varlıklar ve kullanıcı tercihleri cihazınızda yerel olarak saklanır. Uygulamayı silmeden veya yerel verileri temizlemeden önce portföy bilgilerinizi kontrol etmeniz önerilir.',
  ],
  en: [
    'PiyasaRadarı — Terms of Use. Updated: 15 October 2026. Support: destek@floppatech.com',
    'PiyasaRadarı is an independent financial tracking application designed to monitor Borsa Istanbul (BIST), foreign exchange rates, gold, commodities, and fuel prices.',
    'All prices, charts, fuel predictions, converter calculations, and news provided in the app are for general informational purposes only and do not constitute financial or investment advice.',
    'Borsa Istanbul (BIST) market data is delayed by 15 minutes in accordance with legal regulations. Always verify market prices with authorized financial institutions before making transactions.',
    'Portfolio records, favorite assets, and user preferences are stored locally on your device. Please review your records before clearing local data or uninstalling the application.',
  ],
};

/* ------------------------------------------------------------------ */
/*  UKD HESAPLA STİLİ BİLEŞENLER (Card, Segment, Menu, Button, Field) */
/* ------------------------------------------------------------------ */

function Card({
  children,
  colors,
  style,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
  style?: any;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Segment({
  options,
  value,
  onChange,
  colors,
  t,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: any) => void;
  colors: ThemeColors;
  t: (k: string) => string;
}) {
  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceHighlight }]}>
      {options.map(([v, label]) => {
        const selected = v === value;
        return (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={t(label)}
            accessibilityState={{ selected }}
            onPress={() => onChange(v)}
            style={[
              styles.segmentOption,
              selected && {
                backgroundColor: colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '700',
                color: selected ? colors.text : colors.textMuted,
              }}
            >
              {t(label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Menu({
  title,
  description,
  icon,
  onPress,
  colors,
  t,
  badgeColor,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: ThemeColors;
  t: (k: string) => string;
  badgeColor?: string;
}) {
  const tone = badgeColor || colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menu,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: tone + '18' }]}>{icon}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
          {t(title)}
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>
          {t(description)}
        </Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
}

function Button({
  label,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  icon,
  colors,
  t,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  colors: ThemeColors;
  t: (k: string) => string;
}) {
  const bg = danger
    ? colors.down
    : secondary
    ? colors.surfaceHighlight
    : colors.accent;
  const fg = secondary ? colors.text : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: secondary ? colors.border : 'transparent',
          borderWidth: secondary ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.buttonInner}>
        {icon}
        <Text style={{ color: fg, fontWeight: '700', fontSize: 14 }}>
          {t(label)}
        </Text>
      </View>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  autoCapitalize = 'sentences',
  colors,
  t,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  colors: ThemeColors;
  t: (k: string) => string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 11.5, color: colors.textMuted, fontWeight: '600' }}>
        {t(label)}
      </Text>
      <TextInput
        accessibilityLabel={t(label)}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ? t(placeholder) : undefined}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
          multiline && { minHeight: 110, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  ANA AYARLAR EKRANI                                                */
/* ------------------------------------------------------------------ */

export default function SettingsScreen() {
  const { t, language, theme, setLanguage, setTheme } = useTranslation();
  const colors = useThemeColors();
  const { height: windowHeight } = useWindowDimensions();

  // Auth Store
  const user = useAuthStore((s) => s.user);
  const accounts = useAuthStore((s) => s.accounts);
  const registerWithEmail = useAuthStore((s) => s.registerWithEmail);
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  // Market & Portfolio Stores
  const clearCache = useMarketStore((s) => s.clearCache);
  const fetchMarketData = useMarketStore((s) => s.fetchMarketData);
  const clearPortfolio = usePortfolioStore((s) => s.clearPortfolio);

  // Sheet State
  const [sheet, setSheet] = useState<SheetType>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Email Auth Form State
  const [emailMode, setEmailMode] = useState<EmailAuthMode>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Google Auth Form State
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState('');

  // Profile Edit State
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileError, setProfileError] = useState('');

  // Feedback State (UKD Hesapla yapısı)
  const [feedbackType, setFeedbackType] = useState<FeedbackCategory>('Öneri');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackDiagnostics, setFeedbackDiagnostics] = useState(true);

  const showNotice = (msg: string) => {
    setNotice(t(msg));
    setTimeout(() => setNotice(null), 3200);
  };

  const closeSheet = () => {
    setSheet(null);
    setAuthError('');
    setGoogleError('');
    setProfileError('');
  };

  /* ---- AUTH İŞLEMLERİ ---- */

  const openEmailAuth = (initialMode: EmailAuthMode = 'login') => {
    setEmailMode(initialMode);
    setAuthError('');
    setSheet('emailAuth');
  };

  const openGoogleAuth = () => {
    setGoogleError('');
    setSheet('googleAuth');
  };

  const handleEmailSubmit = () => {
    setAuthError('');
    if (emailMode === 'register') {
      const res = registerWithEmail(authName, authEmail, authPassword);
      if (!res.ok) {
        setAuthError(t(res.error || 'Kayıt işlemi başarısız.'));
        return;
      }
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      closeSheet();
      showNotice('Hesabınız başarıyla oluşturuldu.');
    } else if (emailMode === 'login') {
      const res = loginWithEmail(authEmail, authPassword);
      if (!res.ok) {
        setAuthError(t(res.error || 'Giriş yapılamadı.'));
        return;
      }
      setAuthEmail('');
      setAuthPassword('');
      closeSheet();
      showNotice('Hoş geldiniz! Giriş başarılı.');
    } else if (emailMode === 'reset') {
      const res = resetPassword(authEmail, authPassword);
      if (!res.ok) {
        setAuthError(t(res.error || 'Şifre sıfırlanamadı.'));
        return;
      }
      setAuthPassword('');
      closeSheet();
      showNotice('Şifreniz başarıyla güncellendi.');
    }
  };

  const handleGoogleSubmit = (preset?: { name: string; email: string }) => {
    setGoogleError('');
    const targetEmail = preset ? preset.email : googleEmail.trim() || 'kullanici@gmail.com';
    const targetName = preset ? preset.name : googleName.trim();

    if (!preset && !googleEmail.trim()) {
      setGoogleError(t('Lütfen geçerli bir e-posta adresi girin.'));
      return;
    }

    const res = loginWithGoogle({
      name: targetName,
      email: targetEmail,
    });
    if (!res.ok) {
      setGoogleError(t(res.error || 'Google girişi başarısız.'));
      return;
    }
    setGoogleName('');
    setGoogleEmail('');
    closeSheet();
    showNotice('Hoş geldiniz! Giriş başarılı.');
  };

  const handleSaveProfile = () => {
    setProfileError('');
    const res = updateProfile(profileNameDraft);
    if (!res.ok) {
      setProfileError(t(res.error || 'Profil güncellenemedi.'));
      return;
    }
    closeSheet();
    showNotice('Profil bilgileriniz güncellendi.');
  };

  /* ---- PAYLAŞIM, PUANLAMA & GERİ BİLDİRİM ---- */

  const storeUrl =
    Platform.OS === 'android'
      ? 'https://play.google.com/store/apps/details?id=com.cevdet.piyasaradari'
      : 'https://apps.apple.com/app/id6823244806';

  const shareText = `${t('PiyasaRadarı · Canlı Borsa, Döviz ve Finans Takibi')}\n${t(
    'Borsa, altın, döviz ve akaryakıt fiyatlarını tek ekrandan takip et: '
  )}${storeUrl}`;

  const handleShareOption = async (target: 'instagram' | 'x' | 'email' | 'more') => {
    try {
      if (target === 'x') {
        await Linking.openURL(
          `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`
        );
      } else if (target === 'email') {
        const subject = encodeURIComponent('PiyasaRadarı');
        const body = encodeURIComponent(shareText);
        await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
      } else {
        await Share.share({
          message: shareText,
          url: storeUrl,
          title: 'PiyasaRadarı',
        });
      }
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleRateApp = () => {
    const url =
      Platform.OS === 'android'
        ? 'market://details?id=com.cevdet.piyasaradari'
        : 'itms-apps://itunes.apple.com/app/id6823244806?action=write-review';
    Linking.openURL(url).catch(() => {
      Linking.openURL(storeUrl).catch(() => {
        setSheet('rate');
      });
    });
  };

  const buildFeedbackBody = () => {
    const diag = feedbackDiagnostics
      ? `\n\n---\nUygulama: PiyasaRadarı v${APP_VERSION}\nPlatform: ${Platform.OS}\nDil: ${language.toUpperCase()}\nTema: ${theme}`
      : '';
    return `[${feedbackType}] ${feedbackText.trim()}${diag}`;
  };

  const handleSendFeedbackEmail = () => {
    if (!feedbackText.trim()) return;
    const subject = encodeURIComponent(`PiyasaRadarı ${feedbackType} Bildirimi`);
    const body = encodeURIComponent(buildFeedbackBody());
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const handleShareCopyText = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert(t('Başarılı'), text);
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      await fetchMarketData({ bypassCache: true });
      showNotice('Önbellek temizlendi.');
    } catch {
      Alert.alert('Hata', 'Önbellek temizlenirken bir sorun oluştu.');
    }
  };

  const handleClearAllLocalData = () => {
    clearPortfolio();
    useFavoritesStore.setState({
      favorites: ['USDTRY=X', 'GRAM_ALTIN', 'XU100.IS', 'THYAO.IS'],
      isInitialized: true,
    });
    void clearCache();
    closeSheet();
    showNotice('Yerel kayıtlar silindi.');
  };

  const sheetTitle = (): string => {
    switch (sheet) {
      case 'emailAuth':
        return emailMode === 'register'
          ? 'E-posta ile Kaydol'
          : emailMode === 'reset'
          ? 'Şifre Sıfırlama'
          : 'E-posta ile Giriş Yap';
      case 'googleAuth':
        return 'Google Hesabı ile Bağlan';
      case 'editProfile':
        return 'Profili Düzenle';
      case 'deleteAccount':
        return 'Hesabımı Sil';
      case 'language':
        return 'Dil ve biçim';
      case 'share':
        return 'PiyasaRadarı’nı paylaş';
      case 'rate':
        return 'Uygulamayı Puanla';
      case 'rules':
        return 'Piyasa ve Veri Kuralları';
      case 'privacy':
        return 'Gizlilik';
      case 'terms':
        return 'Kullanım Koşulları';
      case 'feedback':
        return 'Geri Bildirim Gönder';
      case 'help':
        return 'Yardım ve Sık Sorulanlar';
      case 'about':
        return 'PiyasaRadarı';
      case 'clear':
        return 'Silme onayı';
      default:
        return 'Ayarlar';
    }
  };

  const userInitials = user
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PR'
    : 'PR';

  const googleAccounts = accounts.filter((a) => a.provider === 'google');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Üst Başlık (UKD Hesapla Stili) */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Ayarlar')}
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.surfaceHighlight }]}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Ayarlar')}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Hesap')}
          onPress={() => {
            if (user) {
              setProfileNameDraft(user.name);
              setSheet('editProfile');
            } else {
              openEmailAuth('login');
            }
          }}
          style={[
            styles.iconButton,
            { backgroundColor: user ? colors.upSoft : colors.surfaceHighlight },
          ]}
        >
          {user ? (
            <UserCheck size={20} color={colors.up} />
          ) : (
            <User size={20} color={colors.text} />
          )}
        </Pressable>
      </View>

      {/* Bildirim Çubuğu */}
      {notice && (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.upSoft, borderColor: colors.up, borderWidth: 1 },
          ]}
        >
          <Text style={{ color: colors.up, fontWeight: '700', fontSize: 13, flex: 1 }}>
            {notice}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- 1. BÖLÜM: HESAP VE KULLANICI GİRİŞİ ---- */}
        <Text style={[styles.h2, { color: colors.text }]}>{t('Hesap ve Giriş')}</Text>

        {user ? (
          <Card colors={colors}>
            <View style={styles.profileRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.rowBetween}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                    {user.name}
                  </Text>
                  <View
                    style={[
                      styles.providerBadge,
                      {
                        backgroundColor:
                          user.provider === 'google' ? colors.goldSoft : colors.accentSoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: user.provider === 'google' ? colors.gold : colors.accent,
                      }}
                    >
                      {user.provider === 'google' ? t('Google Hesabı') : t('E-posta Hesabı')}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{user.email}</Text>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  label="Profili Düzenle"
                  colors={colors}
                  t={t}
                  onPress={() => {
                    setProfileNameDraft(user.name);
                    setSheet('editProfile');
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  label="Çıkış Yap"
                  icon={<LogOut size={16} color={colors.text} />}
                  colors={colors}
                  t={t}
                  onPress={() => {
                    logout();
                    showNotice('Oturum kapatıldı.');
                  }}
                />
              </View>
            </View>

            <Pressable
              onPress={() => setSheet('deleteAccount')}
              style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.down }}>
                {t('Hesabımı Sil')}
              </Text>
            </Pressable>
          </Card>
        ) : (
          <Card colors={colors}>
            <View style={{ gap: 6, marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                {t('Giriş Yap veya Kaydol')}
              </Text>
              <Text style={{ fontSize: 12.5, lineHeight: 19, color: colors.textMuted }}>
                {t('Google veya e-posta ile hesabını oluştur, portföy ve favorilerini koru')}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {/* Google ile Kaydol / Giriş Yap */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Google ile Kaydol / Giriş Yap')}
                onPress={openGoogleAuth}
                style={({ pressed }) => [
                  styles.googleButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderLight,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.googleIconBadge}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>
                  {t('Google ile Kaydol / Giriş Yap')}
                </Text>
              </Pressable>

              {/* E-posta ile Kaydol & Giriş Yap */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="E-posta ile Kaydol"
                    icon={<UserPlus size={16} color="#fff" />}
                    colors={colors}
                    t={t}
                    onPress={() => openEmailAuth('register')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    label="Giriş Yap"
                    icon={<LogIn size={16} color={colors.text} />}
                    colors={colors}
                    t={t}
                    onPress={() => openEmailAuth('login')}
                  />
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* ---- 2. BÖLÜM: TERCİHLER (UKD Hesapla Birebir Yapı) ---- */}
        <Text style={[styles.h2, { color: colors.text, marginTop: 6 }]}>{t('Tercihler')}</Text>

        <Card colors={colors}>
          <Text style={[styles.smallLabel, { color: colors.textMuted, marginBottom: 12 }]}>
            {t('GÖRÜNÜM')}
          </Text>
          <Segment
            options={[
              ['light', 'Açık'],
              ['dark', 'Koyu'],
              ['system', 'Sistem'],
            ]}
            value={theme}
            onChange={(v: ThemeMode) => setTheme(v)}
            colors={colors}
            t={t}
          />

          <Text
            style={[
              styles.smallLabel,
              { color: colors.textMuted, marginTop: 18, marginBottom: 12 },
            ]}
          >
            {t('DİL')}
          </Text>
          <Segment
            options={[
              ['tr', 'Türkçe'],
              ['en', 'English'],
            ]}
            value={language}
            onChange={(v: Language) => setLanguage(v)}
            colors={colors}
            t={t}
          />
        </Card>

        <Menu
          title="Dil"
          description={
            (language === 'en' ? 'English' : 'Türkçe') + ' · Tarih ve sayı biçimi'
          }
          icon={<Globe size={20} color={colors.accent} />}
          onPress={() => setSheet('language')}
          colors={colors}
          t={t}
        />

        {/* ---- 3. BÖLÜM: DESTEK VE PAYLAŞIM ---- */}
        <Text style={[styles.h2, { color: colors.text, marginTop: 6 }]}>
          {t('Destek ve Paylaşım')}
        </Text>

        {/* Özel Mağaza Puanlama Kartı */}
        <Card colors={colors} style={styles.rateCardContainer}>
          <View style={styles.rateCardHeader}>
            <View style={[styles.rateCardBadge, { backgroundColor: colors.gold + '22' }]}>
              <Star size={22} color={colors.gold} fill={colors.gold} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                {t('PiyasaRadarı’nı Beğendiniz mi?')}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                {Platform.OS === 'android'
                  ? t('Google Play Store’da 5 yıldız vererek bağımsız projemize destek olabilirsiniz.')
                  : t('App Store’da 5 yıldız vererek bağımsız projemize destek olabilirsiniz.')}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Uygulamayı Değerlendir')}
            onPress={handleRateApp}
            style={({ pressed }) => [
              styles.rateActionBtn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.rateActionBtnText}>
              {t('Uygulamayı Değerlendir')}
            </Text>
          </Pressable>
        </Card>

        <Menu
          title="Paylaş"
          description="PiyasaRadarı’nı arkadaşlarınla paylaş"
          icon={<Share2 size={20} color={colors.up} />}
          badgeColor={colors.up}
          onPress={() => setSheet('share')}
          colors={colors}
          t={t}
        />

        <Menu
          title="Uygulamayı Puanla"
          description="Mağazanın puanlama ekranını aç"
          icon={<Star size={20} color={colors.gold} />}
          badgeColor={colors.gold}
          onPress={handleRateApp}
          colors={colors}
          t={t}
        />

        {/* ---- 4. BÖLÜM: UYGULAMA ---- */}
        <Text style={[styles.h2, { color: colors.text, marginTop: 6 }]}>{t('Uygulama')}</Text>

        <Menu
          title="Piyasa ve Veri Kuralları"
          description="Borsa, döviz, altın ve hesaplama kapsamı"
          icon={<BookOpen size={20} color={colors.accent} />}
          onPress={() => setSheet('rules')}
          colors={colors}
          t={t}
        />

        <Menu
          title="Gizlilik Politikası"
          description="Cihazda kayıt ve veri kullanımı"
          icon={<Shield size={20} color={colors.up} />}
          badgeColor={colors.up}
          onPress={() => setSheet('privacy')}
          colors={colors}
          t={t}
        />

        <Menu
          title="Kullanım Koşulları"
          description="Piyasa verileri, kaynak kullanımı ve sorumluluk reddi"
          icon={<FileText size={20} color={colors.stock} />}
          badgeColor={colors.stock}
          onPress={() => setSheet('terms')}
          colors={colors}
          t={t}
        />

        <Menu
          title="Geri Bildirim Gönder"
          description="Hata bildir, görüş veya öneri hazırla"
          icon={<MessageSquare size={20} color={colors.energy} />}
          badgeColor={colors.energy}
          onPress={() => setSheet('feedback')}
          colors={colors}
          t={t}
        />

        <Menu
          title="Yardım ve Sık Sorulanlar"
          description="Piyasa takibi, portföy ve akaryakıt hesaplama"
          icon={<HelpCircle size={20} color={colors.accent} />}
          onPress={() => setSheet('help')}
          colors={colors}
          t={t}
        />

        {/* ---- 5. BÖLÜM: VERİLERİM ---- */}
        <Text style={[styles.h2, { color: colors.text, marginTop: 6 }]}>{t('Verilerim')}</Text>

        <Menu
          title="Hakkında"
          description={`PiyasaRadarı · ${APP_VERSION}`}
          icon={<Info size={20} color={colors.accent} />}
          onPress={() => setSheet('about')}
          colors={colors}
          t={t}
        />

        <Menu
          title="Önbelleği temizle"
          description="Anlık piyasa verileri önbelleğini yenile"
          icon={<RefreshCw size={20} color={colors.accent} />}
          onPress={handleClearCache}
          colors={colors}
          t={t}
        />

        <Menu
          title="Yerel verileri sil"
          description="Portföy, favoriler ve tüm yerel kayıtlar"
          icon={<Trash2 size={20} color={colors.down} />}
          badgeColor={colors.down}
          onPress={() => setSheet('clear')}
          colors={colors}
          t={t}
        />

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          {t(
            'Veriler bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. BIST verileri yasal olarak 15 dk gecikmelidir.'
          )}
        </Text>
        <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>
          © 2026 FloppaTech & Efe Kaan Karakulak · {t('Tüm hakları saklıdır.')}
        </Text>
      </ScrollView>

      {/* ================================================================== */}
      {/*  UKD HESAPLA STİLİ MODAL PENCERELERİ                               */}
      {/* ================================================================== */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.overlay} onPress={closeSheet}>
            <Pressable
              style={[
                styles.modal,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Başlığı */}
              <View style={styles.rowBetween}>
                <Text style={[styles.h2, { color: colors.text, flex: 1 }]}>
                  {t(sheetTitle())}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Kapat')}
                  onPress={closeSheet}
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
                >
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Modal İçeriği */}
              <ScrollView
                style={{ maxHeight: Math.min(480, windowHeight * 0.65), marginVertical: 18 }}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. E-POSTA İLE KAYDOL / GİRİŞ YAP */}
                {sheet === 'emailAuth' && (
                  <View style={{ gap: 14 }}>
                    {emailMode !== 'reset' && (
                      <Segment
                        options={[
                          ['login', 'Giriş Yap'],
                          ['register', 'Kaydol'],
                        ]}
                        value={emailMode}
                        onChange={(v: EmailAuthMode) => {
                          setEmailMode(v);
                          setAuthError('');
                        }}
                        colors={colors}
                        t={t}
                      />
                    )}

                    {emailMode === 'register' && (
                      <Field
                        label="Ad Soyad"
                        value={authName}
                        onChange={setAuthName}
                        placeholder="Adınız ve Soyadınız"
                        autoCapitalize="words"
                        colors={colors}
                        t={t}
                      />
                    )}

                    <Field
                      label="E-posta Adresi"
                      value={authEmail}
                      onChange={setAuthEmail}
                      placeholder="ornek@eposta.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      colors={colors}
                      t={t}
                    />

                    <Field
                      label={
                        emailMode === 'reset'
                          ? 'Yeni Şifre (en az 6 karakter)'
                          : 'Şifre (en az 6 karakter)'
                      }
                      value={authPassword}
                      onChange={setAuthPassword}
                      placeholder="••••••"
                      secureTextEntry
                      autoCapitalize="none"
                      colors={colors}
                      t={t}
                    />

                    {!!authError && (
                      <Text style={{ color: colors.down, fontSize: 12.5, fontWeight: '600' }}>
                        {authError}
                      </Text>
                    )}

                    <Button
                      label={
                        emailMode === 'register'
                          ? 'Kaydol'
                          : emailMode === 'reset'
                          ? 'Şifreyi Güncelle'
                          : 'Giriş Yap'
                      }
                      onPress={handleEmailSubmit}
                      colors={colors}
                      t={t}
                    />

                    {emailMode === 'login' ? (
                      <Pressable
                        onPress={() => {
                          setEmailMode('reset');
                          setAuthError('');
                        }}
                        style={{ alignSelf: 'center', paddingVertical: 4 }}
                      >
                        <Text style={{ color: colors.accent, fontSize: 12.5, fontWeight: '700' }}>
                          {t('Şifremi Unuttum')}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setEmailMode('login');
                          setAuthError('');
                        }}
                        style={{ alignSelf: 'center', paddingVertical: 4 }}
                      >
                        <Text style={{ color: colors.accent, fontSize: 12.5, fontWeight: '700' }}>
                          {t('Giriş Yap')}
                        </Text>
                      </Pressable>
                    )}

                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

                    <Pressable
                      onPress={openGoogleAuth}
                      style={[
                        styles.googleButton,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    >
                      <View style={styles.googleIconBadge}>
                        <Text style={styles.googleG}>G</Text>
                      </View>
                      <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.text }}>
                        {t('Google ile Devam Et')}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* 2. GOOGLE İLE KAYDOL / GİRİŞ YAP */}
                {sheet === 'googleAuth' && (
                  <View style={{ gap: 14 }}>
                    <Text style={[styles.paragraph, { color: colors.textSecondary, marginBottom: 4 }]}>
                      {t('Google hesabınızı seçin veya Gmail adresinizle devam edin.')}
                    </Text>

                    {googleAccounts.length > 0 && (
                      <View style={{ gap: 8 }}>
                        {googleAccounts.map((acc) => (
                          <Pressable
                            key={acc.id}
                            onPress={() =>
                              handleGoogleSubmit({ name: acc.name, email: acc.email })
                            }
                            style={[
                              styles.savedAccountRow,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={styles.googleIconBadge}>
                              <Text style={styles.googleG}>G</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>
                                {acc.name}
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                {acc.email}
                              </Text>
                            </View>
                            <ChevronRight size={18} color={colors.textMuted} />
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <Field
                      label="Ad Soyad"
                      value={googleName}
                      onChange={setGoogleName}
                      placeholder="Adınız ve Soyadınız"
                      autoCapitalize="words"
                      colors={colors}
                      t={t}
                    />

                    <Field
                      label="E-posta Adresi"
                      value={googleEmail}
                      onChange={setGoogleEmail}
                      placeholder="kullanici@gmail.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      colors={colors}
                      t={t}
                    />

                    {!!googleError && (
                      <Text style={{ color: colors.down, fontSize: 12.5, fontWeight: '600' }}>
                        {googleError}
                      </Text>
                    )}

                    <Button
                      label="Google ile Bağlan"
                      onPress={() => handleGoogleSubmit()}
                      colors={colors}
                      t={t}
                    />

                    <Button
                      secondary
                      label="E-posta ile Kaydol / Giriş Yap"
                      icon={<Mail size={16} color={colors.text} />}
                      onPress={() => openEmailAuth('register')}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 3. PROFİLİ DÜZENLE */}
                {sheet === 'editProfile' && (
                  <View style={{ gap: 14 }}>
                    <Field
                      label="Ad Soyad"
                      value={profileNameDraft}
                      onChange={setProfileNameDraft}
                      placeholder="Adınız ve Soyadınız"
                      autoCapitalize="words"
                      colors={colors}
                      t={t}
                    />
                    {!!profileError && (
                      <Text style={{ color: colors.down, fontSize: 12.5, fontWeight: '600' }}>
                        {profileError}
                      </Text>
                    )}
                    <Button
                      label="Profilimi Kaydet"
                      onPress={handleSaveProfile}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 4. DİL VE BİÇİM (UKD Hesapla Birebir) */}
                {sheet === 'language' && (
                  <View style={{ gap: 14 }}>
                    <Segment
                      options={[
                        ['tr', 'Türkçe'],
                        ['en', 'English'],
                      ]}
                      value={language}
                      onChange={(v: Language) => setLanguage(v)}
                      colors={colors}
                      t={t}
                    />
                    <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: 4 }]}>
                      {t(
                        'Türkçe veya English seç. Seçimin tüm ekranlara ve piyasa görünümüne uygulanır ve bu cihazda saklanır.'
                      )}
                    </Text>
                  </View>
                )}

                {/* 5. PAYLAŞ (UKD Hesapla Birebir) */}
                {sheet === 'share' && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.paragraph, { color: colors.textSecondary, fontSize: 12.5 }]}>
                      {shareText}
                    </Text>
                    <Button
                      secondary
                      label="Instagram"
                      onPress={() => handleShareOption('instagram')}
                      colors={colors}
                      t={t}
                    />
                    <Button
                      secondary
                      label="X"
                      onPress={() => handleShareOption('x')}
                      colors={colors}
                      t={t}
                    />
                    <Button
                      secondary
                      label="E-posta"
                      onPress={() => handleShareOption('email')}
                      colors={colors}
                      t={t}
                    />
                    <Button
                      label="Diğer paylaşım seçenekleri"
                      onPress={() => handleShareOption('more')}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 6. UYGULAMAYI PUANLA */}
                {sheet === 'rate' && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {t('Mağazanın puanlama ekranını aç')}
                    </Text>
                    <Button
                      label="Uygulamayı Puanla"
                      onPress={() => Linking.openURL(storeUrl)}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 7. PİYASA VE VERİ KURALLARI */}
                {sheet === 'rules' && (
                  <View style={{ gap: 14 }}>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {language === 'en'
                        ? 'Borsa Istanbul (BIST) equities and indices are legally displayed with a 15-minute delay. Spot currencies (USD/TRY, EUR/TRY) and international commodities update in 60-second smart cache intervals.'
                        : 'Borsa İstanbul (BIST) hisse senedi ve endeks verileri yasal düzenlemeler çerçevesinde 15 dakika gecikmeli olarak sunulur. Döviz kurları ve uluslararası emtia fiyatları 60 saniyelik akıllı önbellek döngüsüyle güncellenir.'}
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {language === 'en'
                        ? 'Gram Gold, Quarter Gold, and Republic Gold prices are calculated in real time using the live Ounce Gold (XAU/USD) and USD/TRY parity formula. Fuel pump signals are simulated using Brent Oil and USD/TRY variations.'
                        : 'Gram Altın, Çeyrek Altın ve Cumhuriyet Altını fiyatları, canlı Ons Altın ve Dolar/TL kuru üzerinden anlık formülle hesaplanır. Akaryakıt zam/indirim sinyalleri Brent Petrol ve döviz değişimine dayalı bir simülasyondur.'}
                    </Text>
                  </View>
                )}

                {/* 8. GİZLİLİK POLİTİKASI */}
                {sheet === 'privacy' && (
                  <View style={{ gap: 12 }}>
                    {PRIVACY_PARAGRAPHS[language].map((p, idx) => (
                      <Text
                        key={idx}
                        style={[
                          styles.paragraph,
                          {
                            color: idx === 0 ? colors.text : colors.textSecondary,
                            fontWeight: idx === 0 ? '700' : '400',
                            marginBottom: 4,
                          },
                        ]}
                      >
                        {p}
                      </Text>
                    ))}
                    <Button
                      secondary
                      label="Destek adresini kopyala"
                      onPress={() => handleShareCopyText(SUPPORT_EMAIL)}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 9. KULLANIM KOŞULLARI */}
                {sheet === 'terms' && (
                  <View style={{ gap: 12 }}>
                    {TERMS_PARAGRAPHS[language].map((p, idx) => (
                      <Text
                        key={idx}
                        style={[
                          styles.paragraph,
                          {
                            color: idx === 0 ? colors.text : colors.textSecondary,
                            fontWeight: idx === 0 ? '700' : '400',
                            marginBottom: 4,
                          },
                        ]}
                      >
                        {p}
                      </Text>
                    ))}
                  </View>
                )}

                {/* 10. GERİ BİLDİRİM GÖNDER (UKD Hesapla Birebir) */}
                {sheet === 'feedback' && (
                  <View style={{ gap: 14 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.accent }}>
                      {SUPPORT_EMAIL}
                    </Text>
                    <Segment
                      options={[
                        ['Öneri', 'Öneri'],
                        ['Hata', 'Hata bildir'],
                        ['Görüş', 'Görüş'],
                      ]}
                      value={feedbackType}
                      onChange={(v: FeedbackCategory) => setFeedbackType(v)}
                      colors={colors}
                      t={t}
                    />
                    <Field
                      label="Görüşün / karşılaştığın sorun"
                      value={feedbackText}
                      onChange={setFeedbackText}
                      multiline
                      colors={colors}
                      t={t}
                    />
                    <View style={styles.rowBetween}>
                      <Text style={{ flex: 1, fontSize: 12.5, color: colors.text }}>
                        {t('Sürüm ve cihaz platformu bilgilerini ekle')}
                      </Text>
                      <Switch
                        value={feedbackDiagnostics}
                        onValueChange={setFeedbackDiagnostics}
                        trackColor={{ true: colors.accent, false: colors.border }}
                      />
                    </View>
                    <Text style={{ fontSize: 11.5, lineHeight: 18, color: colors.textMuted }}>
                      {t(
                        'Mesajın e-posta uygulamasında açılır; gönderimi sen tamamlarsın. Portföyün ve kişisel kayıtların otomatik eklenmez.'
                      )}
                    </Text>
                    <Button
                      label="E-posta ile gönder"
                      disabled={!feedbackText.trim()}
                      onPress={handleSendFeedbackEmail}
                      colors={colors}
                      t={t}
                    />
                    <Button
                      secondary
                      label="Geri bildirimi kopyala"
                      disabled={!feedbackText.trim()}
                      onPress={() => handleShareCopyText(buildFeedbackBody())}
                      colors={colors}
                      t={t}
                    />
                    <Button
                      secondary
                      label="Destek adresini kopyala"
                      onPress={() => handleShareCopyText(SUPPORT_EMAIL)}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 11. YARDIM VE SIK SORULANLAR (UKD Hesapla Birebir) */}
                {sheet === 'help' && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.faqTitle, { color: colors.text }]}>
                      {language === 'en'
                        ? 'How do I search for all BIST stocks?'
                        : 'Tüm BIST hisselerini nasıl ararım?'}
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {language === 'en'
                        ? 'Type the stock code (e.g., SASA, HEKTS, MIATK) into the search bar on the Markets screen. If you star it, it stays permanently in your main list.'
                        : 'Piyasalar ekranındaki arama çubuğuna hisse kodunu (Örn: SASA, HEKTS, MIATK) yazman yeterlidir. Yıldızladığın hisseler ana listene kalıcı olarak eklenir.'}
                    </Text>

                    <Text style={[styles.faqTitle, { color: colors.text }]}>
                      {language === 'en'
                        ? 'Why is BIST market time 15 minutes behind?'
                        : 'Borsa saati neden 15 dakika geriden geliyor?'}
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {language === 'en'
                        ? 'Due to Borsa Istanbul regulations, free market data feeds are legally delayed by 15 minutes.'
                        : 'Borsa İstanbul yasal düzenlemeleri gereği ücretsiz veri yayınları 15 dakika gecikmeli olarak sunulmaktadır.'}
                    </Text>

                    <Text style={[styles.faqTitle, { color: colors.text }]}>
                      {language === 'en'
                        ? 'Where is my portfolio and account stored?'
                        : 'Portföyüm ve hesabım nerede saklanıyor?'}
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {language === 'en'
                        ? 'Your account session, favorite assets, and portfolio holdings are stored securely on your device.'
                        : 'Hesap oturumun, favori varlıkların ve portföy kayıtların cihazında güvenli olarak saklanır.'}
                    </Text>
                  </View>
                )}

                {/* 12. HAKKINDA (UKD Hesapla Birebir) */}
                {sheet === 'about' && (
                  <View style={{ gap: 14 }}>
                    <Image
                      source={require('../../../assets/images/icon.png')}
                      style={{
                        width: 112,
                        height: 112,
                        borderRadius: 22,
                        alignSelf: 'center',
                        marginBottom: 8,
                      }}
                    />
                    <Text style={[styles.paragraph, { color: colors.text, fontWeight: '700', textAlign: 'center' }]}>
                      PiyasaRadarı {APP_VERSION} · FloppaTech & Efe Kaan Karakulak
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {language === 'en'
                        ? 'PiyasaRadarı is a next-generation financial tracking app that allows you to monitor Borsa Istanbul (BIST), foreign exchange rates, gold, commodities, and fuel prices from a single screen.'
                        : 'PiyasaRadarı; Borsa İstanbul (BIST), döviz kurları, altın ve kıymetli madenler ile güncel akaryakıt fiyatlarını tek ekrandan takip etmenizi sağlayan yeni nesil bir finans takip uygulamasıdır.'}
                    </Text>
                    <Button
                      secondary
                      label="Piyasa kurallarını incele"
                      onPress={() => setSheet('rules')}
                      colors={colors}
                      t={t}
                    />
                  </View>
                )}

                {/* 13. YEREL VERİLERİ SİL ONAYI */}
                {sheet === 'clear' && (
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    {t(
                      'Portföyün, favorilerin ve tüm yerel tercihlerin bu cihazdan silinecek. Devam etmek istiyor musun?'
                    )}
                  </Text>
                )}

                {/* 14. HESABI SİL ONAYI */}
                {sheet === 'deleteAccount' && (
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    {t(
                      'Hesabın ve bu cihazdaki oturum bilgilerin kalıcı olarak silinecek. Devam etmek istiyor musun?'
                    )}
                  </Text>
                )}
              </ScrollView>

              {/* Silme Onay Butonları (UKD Hesapla Birebir) */}
              {sheet === 'clear' && (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Button
                      secondary
                      label="Vazgeç"
                      onPress={closeSheet}
                      colors={colors}
                      t={t}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      danger
                      label="Sil"
                      onPress={handleClearAllLocalData}
                      colors={colors}
                      t={t}
                    />
                  </View>
                </View>
              )}

              {sheet === 'deleteAccount' && (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Button
                      secondary
                      label="Vazgeç"
                      onPress={closeSheet}
                      colors={colors}
                      t={t}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      danger
                      label="Sil"
                      onPress={() => {
                        deleteAccount();
                        closeSheet();
                        showNotice('Hesabınız silindi.');
                      }}
                      colors={colors}
                      t={t}
                    />
                  </View>
                </View>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 38,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  h2: {
    fontSize: 18,
    fontWeight: '800',
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 4,
  },
  segmentOption: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderRadius: 13,
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 12,
    fontSize: 14.5,
    minHeight: 46,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  googleButton: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  googleIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleG: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4285F4',
  },
  savedAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dividerLine: {
    height: 1,
    marginVertical: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 34, 0.68)',
    padding: 20,
    justifyContent: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 510,
    alignSelf: 'center',
    padding: 22,
    borderRadius: 23,
    borderWidth: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 21,
  },
  faqTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  footerNote: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  footerCopyright: {
    fontSize: 11.5,
    textAlign: 'center',
    fontWeight: '600',
  },
  rateCardContainer: {
    padding: 16,
    gap: 14,
    borderRadius: 16,
  },
  rateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateCardBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 11,
  },
  rateActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

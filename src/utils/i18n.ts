import type { Language } from '@/types/preferences';

const entries = `
Ayarlar|||Settings
Piyasalar|||Markets
Akaryakıt|||Fuel
Haberler|||News
Portföy|||Portfolio
Çevirici|||Converter
Görünüm|||Appearance
GÖRÜNÜM|||APPEARANCE
DİL|||LANGUAGE
Koyu|||Dark
Açık|||Light
Sistem|||System
Dil|||Language
Dil ve biçim|||Language and format
Türkçe|||Turkish
İngilizce|||English
Türkçe · Tarih ve sayı biçimi|||Turkish · Date and number format
English · Tarih ve sayı biçimi|||English · Date and number format
Türkçe veya English seç. Seçimin tüm ekranlara ve piyasa görünümüne uygulanır ve bu cihazda saklanır.|||Choose Turkish or English. Your selection applies to all screens and market views and is stored on this device.
Tercihler|||Preferences
Hesap|||Account
Hesap ve Giriş|||Account & Sign In
Oturum Açık|||Signed In
Misafir Kullanıcı|||Guest User
Giriş Yap veya Kaydol|||Sign In or Sign Up
Google veya e-posta ile hesabını oluştur, portföy ve favorilerini koru|||Sign in with Google or email to manage your portfolio and favorites
Google ile Kaydol / Giriş Yap|||Continue with Google
Google ile Devam Et|||Continue with Google
E-posta ile Kaydol / Giriş Yap|||Sign Up / Sign In with Email
E-posta ile Kaydol|||Sign Up with Email
E-posta ile Giriş Yap|||Sign In with Email
Giriş Yap|||Sign In
Kaydol|||Sign Up
Şifremi Unuttum|||Forgot Password
Şifre Sıfırlama|||Reset Password
Ad Soyad|||Full Name
Adınız ve Soyadınız|||Your Full Name
E-posta Adresi|||Email Address
ornek@eposta.com|||name@example.com
Şifre (en az 6 karakter)|||Password (min. 6 characters)
Yeni Şifre (en az 6 karakter)|||New Password (min. 6 characters)
Şifreyi Güncelle|||Update Password
Profili Düzenle|||Edit Profile
Profilimi Kaydet|||Save Profile
Çıkış Yap|||Sign Out
Hesabımı Sil|||Delete My Account
Google Hesabı ile Bağlan|||Connect with Google Account
Google hesabınızı seçin veya Gmail adresinizle devam edin.|||Select your Google account or continue with your Gmail address.
Google ile Bağlan|||Connect with Google
Google Hesabı|||Google Account
E-posta Hesabı|||Email Account
Hoş geldiniz! Giriş başarılı.|||Welcome! Signed in successfully.
Hesabınız başarıyla oluşturuldu.|||Your account has been created successfully.
Oturum kapatıldı.|||Signed out successfully.
Hesabınız silindi.|||Your account has been deleted.
Profil bilgileriniz güncellendi.|||Your profile has been updated.
Şifreniz başarıyla güncellendi.|||Your password has been updated.
Lütfen geçerli bir ad soyad girin (en az 2 karakter).|||Please enter a valid full name (at least 2 characters).
Lütfen geçerli bir e-posta adresi girin.|||Please enter a valid email address.
Şifreniz en az 6 karakter olmalıdır.|||Your password must be at least 6 characters.
Bu e-posta adresi ile kayıtlı bir hesap zaten bulunuyor. Giriş yapabilirsiniz.|||An account with this email already exists. Please sign in.
Bu e-posta adresine ait hesap bulunamadı. Önce kaydolabilirsiniz.|||No account found for this email address. Please sign up first.
Bu hesap Google ile oluşturulmuş. Lütfen Google ile devam edin.|||This account was created with Google. Please continue with Google.
E-posta veya şifre hatalı.|||Invalid email or password.
Destek ve Paylaşım|||Support and Sharing
Destek ve paylaşım|||Support and sharing
Paylaş|||Share
PiyasaRadarı’nı arkadaşlarınla paylaş|||Share PiyasaRadarı with your friends
PiyasaRadarı'nı arkadaşlarınla paylaş|||Share PiyasaRadarı with your friends
PiyasaRadarı’nı paylaş|||Share PiyasaRadarı
Uygulamayı Puanla|||Rate the App
Uygulamayı puanla|||Rate the app
Mağazanın puanlama ekranını aç|||Open the store rating page
App Store’da görüşünü paylaş|||Share your review on App Store
Google Play’de görüşünü paylaş|||Share your review on Google Play
Destek|||Support
Geliştirici ile iletişime geç|||Contact developer
Uygulama|||App
Piyasa ve Veri Kuralları|||Market and Data Rules
Borsa, döviz, altın ve hesaplama kapsamı|||Stocks, FX, gold and calculation scope
Gizlilik Politikası|||Privacy Policy
Gizlilik|||Privacy
Gizlilik bilgisi|||Privacy policy
Cihazda kayıt ve veri kullanımı|||On-device storage and data usage
Cihaz kayıtları ve veri kullanımı|||Device storage and data usage
Kullanım Koşulları|||Terms of Use
Piyasa verileri, kaynak kullanımı ve sorumluluk reddi|||Market data, source usage and disclaimer
Geri Bildirim Gönder|||Send Feedback
Hata bildir, görüş veya öneri hazırla|||Report a bug or share suggestions
Yardım ve Sık Sorulanlar|||Help and FAQ
Piyasa takibi, portföy ve akaryakıt hesaplama|||Market tracking, portfolio and fuel calculator
Verilerim|||My Data
Veri ve önbellek|||Data and cache
Hakkında|||About
PiyasaRadarı · 1.0.0|||PiyasaRadarı · 1.0.0
Yasal uyarı ve kaynaklar|||Legal disclaimer & sources
Önbelleği temizle|||Clear cache
Anlık piyasa verileri önbelleğini yenile|||Refresh live market data cache
Piyasa verileri önbelleği yenilensin|||Refresh market data cache
Yerel verileri sil|||Delete local data
Verilerimi sıfırla|||Reset my data
Portföy, favoriler ve tüm yerel kayıtlar|||Portfolio, favorites and all local records
Favorileri ve portföy kayıtlarını kaldır|||Remove favorites and portfolio records
Silme onayı|||Confirm deletion
Kapat|||Close
İptal|||Cancel
Vazgeç|||Cancel
Onayla|||Confirm
Temizle|||Clear
Sıfırla|||Reset
Sil|||Delete
Seç|||Select
Başarılı|||Success
Önbellek temizlendi.|||Cache cleared.
Tüm yerel veriler sıfırlandı.|||All local data has been reset.
Yerel kayıtlar silindi.|||Local records deleted.
Metin panoya kopyalandı.|||Copied to clipboard.
Instagram|||Instagram
X|||X
E-posta|||Email
Diğer paylaşım seçenekleri|||More sharing options
Öneri|||Suggestion
Hata bildir|||Bug report
Görüş|||Feedback
Görüşün / karşılaştığın sorun|||Your feedback / issue encountered
Sürüm ve cihaz platformu bilgilerini ekle|||Include version and device platform details
Mesajın e-posta uygulamasında açılır; gönderimi sen tamamlarsın. Portföyün ve kişisel kayıtların otomatik eklenmez.|||Your message opens in your email app for you to send. Your portfolio and personal records are not attached automatically.
E-posta ile gönder|||Send via email
Geri bildirimi kopyala|||Copy feedback
Destek adresini kopyala|||Copy support address
Piyasa kurallarını incele|||Review market rules
Portföyün, favorilerin ve tüm yerel tercihlerin bu cihazdan silinecek. Devam etmek istiyor musun?|||Your portfolio, favorites and all local preferences will be deleted from this device. Do you want to continue?
Hesabın ve bu cihazdaki oturum bilgilerin kalıcı olarak silinecek. Devam etmek istiyor musun?|||Your account and session data on this device will be permanently deleted. Do you want to continue?
Veriler bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. BIST verileri yasal olarak 15 dk gecikmelidir.|||Data is for informational purposes only and not investment advice. BIST data is legally delayed by 15 minutes.
Geliştirici|||Developer
Telif Hakkı|||Copyright
Tüm hakları saklıdır.|||All rights reserved.
PiyasaRadarı · Canlı Borsa, Döviz ve Finans Takibi|||PiyasaRadarı · Live Stocks, Currency & Finance Tracker
Borsa, altın, döviz ve akaryakıt fiyatlarını tek ekrandan takip et: |||Track stocks, gold, currency and fuel prices from a single screen: 
CANLI|||LIVE
Tümü|||All
Altın & Emtia|||Gold & Commodity
Döviz|||Currency
Borsa (BIST)|||Stocks (BIST)
Enerji|||Energy
Favoriler|||Favorites
Yükleniyor...|||Loading...
Varlık veya BIST hissesi ara (SASA, HEKTS, Altın...)|||Search asset or BIST stock (SASA, HEKTS, Gold...)
Piyasa verileri alınıyor...|||Fetching market data...
BIST Taranıyor...|||Scanning BIST...
Sonuç Bulunamadı|||No Results Found
Bu kategoride henüz varlık bulunmuyor.|||No assets in this category yet.
Eski|||Stale
`;

const dict: Record<string, string> = Object.fromEntries(
  entries
    .trim()
    .split('\n')
    .map((line) => {
      const parts = line.split('|||');
      return [parts[0].trim(), parts[1]?.trim() || parts[0].trim()];
    })
);

export const localeFor = (language: Language): string =>
  language === 'en' ? 'en-US' : 'tr-TR';

export function translateText(value: string, language: Language): string {
  if (language === 'tr') return value;
  const key = value.replace(/\s+/g, ' ').trim();
  if (dict[key]) {
    const prefix = value.match(/^\s*/)?.[0] || '';
    const suffix = value.match(/\s*$/)?.[0] || '';
    return prefix + dict[key] + suffix;
  }

  // Dinamik kalıplar
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [
      /^Uygulama Güncelleme: (.*)$/,
      (m) => `App Update: ${m[1]}`,
    ],
    [
      /^Son İşlem \(Borsa\): (.*)$/,
      (m) => `Last Trade (Market): ${m[1]}`,
    ],
    [
      /^Smart Cache aktif: Veriler güncel \((\d+) sn sonra yenilenebilir\)$/,
      (m) => `Smart Cache active: Data is up to date (refresh in ${m[1]}s)`,
    ],
    [
      /^Borsa İstanbul taranıyor: (.*)$/,
      (m) => `Scanning Borsa Istanbul: ${m[1]}`,
    ],
  ];

  for (const [pattern, render] of patterns) {
    const match = key.match(pattern);
    if (match) return render(match);
  }

  return value;
}

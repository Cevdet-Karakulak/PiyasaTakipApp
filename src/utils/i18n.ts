import type { Language } from '@/types/preferences';

const entries = `
Ayarlar|||Settings
Piyasalar|||Markets
Akaryakıt|||Fuel
Haberler|||News
Portföy|||Portfolio
Çevirici|||Converter
Görünüm|||Appearance
Koyu|||Dark
Açık|||Light
Dil|||Language
Türkçe|||Turkish
İngilizce|||English
Tercihler|||Preferences
Destek ve paylaşım|||Support and sharing
Paylaş|||Share
PiyasaRadarı'nı arkadaşlarınla paylaş|||Share PiyasaRadarı with your friends
Uygulamayı puanla|||Rate the app
App Store’da görüşünü paylaş|||Share your review on App Store
Google Play’de görüşünü paylaş|||Share your review on Google Play
Destek|||Support
Geliştirici ile iletişime geç|||Contact developer
Uygulama|||App
Hakkında|||About
PiyasaRadarı · 1.0.0|||PiyasaRadarı · 1.0.0
Yasal uyarı ve kaynaklar|||Legal disclaimer & sources
Veri ve önbellek|||Data and cache
Önbelleği temizle|||Clear cache
Piyasa verileri önbelleği yenilensin|||Refresh market data cache
Verilerimi sıfırla|||Reset my data
Favorileri ve portföy kayıtlarını kaldır|||Remove favorites and portfolio records
Gizlilik bilgisi|||Privacy policy
Cihaz kayıtları ve veri kullanımı|||Device storage and data usage
Kapat|||Close
İptal|||Cancel
Onayla|||Confirm
Temizle|||Clear
Sıfırla|||Reset
Seç|||Select
Başarılı|||Success
Önbellek temizlendi.|||Cache cleared.
Tüm yerel veriler sıfırlandı.|||All local data has been reset.
Verileri Sıfırla|||Reset Data
Tüm favorileriniz, özel aranan hisseleriniz ve portföy varlıklarınız cihazınızdan silinecektir. Bu işlem geri alınamaz. Emin misiniz?|||All your favorites, custom searched stocks and portfolio holdings will be permanently deleted from this device. Are you sure?
PiyasaRadarı Hakkında|||About PiyasaRadarı
PiyasaRadarı; Borsa İstanbul (BIST), döviz kurları, altın ve kıymetli madenler, kripto para ile güncel akaryakıt fiyatlarını tek ekrandan anlık ve gecikmesiz olarak takip etmenizi sağlayan yeni nesil bir finans takip uygulamasıdır.|||PiyasaRadarı is a next-generation financial tracking app that allows you to monitor Borsa Istanbul (BIST), foreign exchange rates, gold and precious metals, cryptocurrencies, and current fuel prices from a single screen in real-time.
Yasal Uyarı|||Legal Disclaimer
Uygulamada yer alan tüm borsa, döviz, emtia ve haber verileri bilgilendirme amaçlıdır. Yatırım tavsiyesi niteliğinde değildir. BIST verileri yasal düzenlemeler gereği 15 dakika gecikmeli olarak sunulmaktadır. Finansal kararlar almadan önce lütfen yetkili yatırım danışmanlarına başvurunuz.|||All stock, currency, commodity, and news data provided in this app are for informational purposes only and do not constitute financial or investment advice. BIST market data is legally delayed by 15 minutes. Please consult a certified financial advisor before making investment decisions.
Geliştirici|||Developer
Telif Hakkı|||Copyright
Tüm hakları saklıdır.|||All rights reserved.
Sosyal Medyada Paylaş|||Share on Social Media
X’te paylaş|||Share on X
E-posta ile paylaş|||Share by email
Diğer uygulamalar|||Other apps
PiyasaRadarı · Canlı Borsa, Döviz ve Finans Takibi|||PiyasaRadarı · Live Stocks, Currency & Finance Tracker
Borsa ve döviz kurlarını anlık takip et: |||Track stock and currency markets instantly: 
Son Güncelleme|||Last Update
Uygulama Güncelleme|||App Update
Son İşlem (Borsa)|||Last Trade (Market)
Arama yapın...|||Search...
Tüm Varlıklar|||All Assets
Favoriler|||Favorites
Borsa (BIST)|||Stocks (BIST)
Döviz & Altın|||FX & Gold
Kripto|||Crypto
Emtia|||Commodity
Toplam Değer|||Total Value
Toplam Kar/Zarar|||Total P/L
Yeni Varlık Ekle|||Add New Asset
Miktar|||Amount
Alış Fiyatı|||Buy Price
Kaydet|||Save
Sil|||Delete
Düzenle|||Edit
Detay|||Detail
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

export function translateText(value: string, language: Language): string {
  if (language === 'tr') return value;
  const key = value.replace(/\s+/g, ' ').trim();
  if (dict[key]) {
    const prefix = value.match(/^\s*/)?.[0] || '';
    const suffix = value.match(/\s*$/)?.[0] || '';
    return prefix + dict[key] + suffix;
  }
  return value;
}

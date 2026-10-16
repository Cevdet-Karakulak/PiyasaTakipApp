---
name: playstore-console-guide
description: >-
  Complete Google Play Console, App Store Connect, and Google AdMob store submission
  checklist and questionnaire answers for FloppaTech mobile apps. Use whenever the user
  is publishing an app, preparing store listings, or filling out Google Play Console
  policy declarations so all answers are provided upfront without needing screenshots.
---

# Google Play Console & App Store Connect Hızlı Yayın Rehberi (FloppaTech Corp)

Yeni bir uygulama yayınlanırken veya mağaza formları doldurulurken kullanıcıdan tek tek ekran görüntüsü istemeden aşağıdaki tüm adımların yanıtlarını ve metinlerini tek seferde sun:

## 1. Uygulama Oluşturma (İlk Ekran)
- **Uygulama adı:** `<Uygulama Adı>` (max 30 karakter)
- **Paket adı:** `app.json` içindeki `android.package` / `ios.bundleIdentifier`
- **Varsayılan dil:** `Türkçe – tr-TR`
- **Uygulama veya oyun:** `Uygulama` (veya ilgili tür)
- **Ücretsiz veya ücretli:** `Ücretsiz`
- **Beyanlar:** Geliştirici Programı Politikaları ve ABD ihracat yasaları kutucuklarını işaretle.

## 2. Uygulama İçeriği (Politika ve Beyanlar – Tam Liste)

| Bölüm | Seçilecek Yanıt | Açıklama / Detay |
| :--- | :--- | :--- |
| **Gizlilik Politikası** | `https://floppatechcorp.vercel.app/privacy/<slug>` | Kurumsal sitedeki canlı URL |
| **Oturum Açma Bilgileri (Uygulama Erişimi)** | **Hayır** | Hiçbir bölüm kısıtlanmamış, giriş zorunluluğu yok |
| **Reklam** | **Evet** (AdMob varsa) / **Hayır** (yoksa) | AdMob entegre ise Evet seçilir |
| **İçerik Derecelendirmeleri (IARC)** | E-posta: `floppatechcorp@gmail.com`<br>Kategori: **Diğer Tüm Uygulama Türleri** | Tüm anket sorularına (şiddet, kumar, konum, dijital ürün, kripto/NFT, tarayıcı, haber ürünü mü) **Hayır** |
| **Hedef Kitle ve İçerik** | **18 yaş ve üstü** | 13 yaş altı seçilmez; "Çocukların ilgisini çekebilir mi?" → **Hayır** |
| **Haber Uygulamaları** | **Hayır** | Uygulama bir haber ajansı değildir |
| **Devlet Uygulamaları** | **Hayır** | Resmi kurum uygulaması değildir |
| **Finansal Özellikler** | **Uygulamamda finans ile ilgili özellik sağlanmıyor** | Gerçek para transferi/aracılık yapılmaz; belge adımını atlar |
| **Veri Güvenliği (AdMob Varsa)** | Veri topluyor mu: **Evet**<br>Şifreleniyor mu: **Evet**<br>Hesap: **İzin vermiyor**<br>Silme URL (İsteğe bağlı): **Hayır** | Veri Türü: Sadece **Cihaz veya diğer kimlikler** (`1/1`)<br>Kullanım: **Toplanıyor + Paylaşılıyor**, **Zorunlu**, Amaç: **Analiz + Reklam veya pazarlama** |
| **Reklam Kimliği (AD_ID)** | **Evet** | Amaç: **Analiz** + **Reklam veya pazarlama** |

## 3. Mağaza Ayarları
- **Kategori:** Uygulamaya uygun kategori (Örn: `Finans`, `Araçlar`, `Spor`)
- **E-posta adresi:** `floppatechcorp@gmail.com`
- **Telefon numarası:** Boş bırakılabilir
- **Web sitesi:** `https://floppatechcorp.vercel.app` *(AdMob `app-ads.txt` doğrulaması için zorunlu)*

## 4. Varsayılan Mağaza Girişi & Görseller
- **Kısa açıklama:** En fazla 80 karakter.
- **Tam açıklama:** En fazla 4000 karakter.
- **Görseller (`store-assets/` içinde otomatik üretilir):**
  - `icon-512x512.png` (512 x 512 px)
  - `feature-graphic-1024x500.png` (1024 x 500 px)
  - `telefon-1..4.png` (4 adet 1080 x 1920 px — Telefon, 7" Tablet ve 10" Tablet bölümlerine yüklenir)

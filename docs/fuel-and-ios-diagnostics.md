# Akaryakıt verileri ve iOS açılış tanısı

## Akaryakıt

Ana kaynak Petrol Ofisi'nin herkese açık KDV dahil fiyat tablosudur:
https://www.petrolofisi.com.tr/akaryakit-fiyatlari

Ürünler sütun başlıklarıyla eşleştirilir. Yalnızca `with-tax` alanları okunur;
LPG benzin fiyatından türetilmez. İstanbul Avrupa ve Anadolu ayrı satırlardır.
Tek indirme seçilebilir 12 bölgenin önbelleğini doldurur. Önbellek 30 dakika
geçerlidir; bağlantı kesildiğinde en fazla 24 saatlik gerçek kayıt, ilk sorgu
zamanı korunarak gösterilir. Eski sağlayıcı bilgisi olmayan kayıtlar kullanılmaz.

Ana kaynak erişilemezse Opet benzin/motorin için yedektir. Bu durumda LPG
bilinmiyor olarak kalır; farklı markaların fiyatları tek marka gibi birleştirilmez.
Ekranda sağlayıcı ve kaynak bağlantısı gösterilir. Herkese açık erişim,
ticari yeniden dağıtım iznini veya kesintisiz servis garantisini tek başına sağlamaz.

Depo hesabında 30/40/50/60 litre seçimi ve elle miktar girişi vardır.
Klavye açıkken düğmeler ilk dokunuşu alır. Zam/indirim, kullanıcının girdiği
tutara göre hesaplanır; otomatik fiyat tahmini değildir.

## iOS açılış çökmesi: tanı bekliyor

Yerel IPA'nın açılırken kapanması henüz cihazda yeniden üretilmedi ve kesin
nedeni belirlenmedi. iOS yapılandırmasında AdMob uygulama kimliği zaten mevcut.
Bu değişiklik eksik uygulama kimliğini düzeltme iddiası taşımaz.

- Kök ekran açılırken reklam SDK'sı başlatılmaz.
- `app.json` içindeki `expo.extra.iosAdsEnabled` geçici olarak `false`.
  Bu ayar uygulamanın JavaScript reklam çağrılarını engeller; native modül
  hâlâ derlemeye dahildir. Native yükleme hatalarını engelleyeceği garanti edilmez.
- Android'de ilk uygun etkileşimde izin kontrolü tamamlanınca SDK başlatılır.
- Router hata ekranı JavaScript render hatalarında yeniden deneme ve rapor
  paylaşımı sağlar. Native süreç çökmesini yakalayamaz.

Sonraki tanı için çöküş saatiyle eşleşen `PiyasaRadar*.ips` raporu ve kullanılan
uygulama build numarası gerekir. Xcode Devices and Simulators cihaz günlükleri
veya iPhone'un Analiz Verileri ekranı kullanılabilir. Sembol çözümlemesi için
ilgili derlemenin `.xcarchive`/dSYM dosyalarını saklayın. Kimlik bilgilerini veya
imzalama anahtarlarını hata raporuna eklemeyin.

Reklamlar ancak neden belirlendikten ve cihazda açılış doğrulandıktan sonra
`iosAdsEnabled: true` yapılarak yeniden açılmalıdır. Bu değişiklikten sonra
lint, tip kontrolü, testler ve yeni native derleme çalıştırılmalıdır.

## Doğrulama kapsamı

Gerçek resmi tablo örneğiyle ürün eşleştirme, İstanbul yakaları, 12 bölge LPG,
çevrimdışı kayıt, yedek sağlayıcı ve paralel istek testleri vardır. React bileşen
testleri litre seçimi, klavye dokunma ayarı, LPG, indirim/zam hesabı ve geç dönen
şehir yanıtını kapsar. Reklam testleri izin ve başlatma sırasını kontrol eder.
Bu testler fiziksel iOS/Android açılış doğrulamasının yerine geçmez.

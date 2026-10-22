# Altın mini grafikleri ve günlük aralık

Gram, çeyrek, yarım, tam ziynet ve Cumhuriyet altını için ana listedeki mini
grafik, Yahoo ons altın vadeli fiyatıyla aynı zamandaki USD/TRY verisinden
hesaplanır. Kaynaklar zaman damgasıyla eşleştirilir; dizilerin aynı indeksini
eşleştirmek veya bağımsız günlük altın/kur maksimumlarını çarpmak kullanılmaz.
Her türün kendi ağırlığı ve saflığı uygulanır.

Normal snapshot isteğindeki iki temel seri tüm altınlara ortak kullanılır.
Zaman damgaları eksikse iki ortak geçmiş isteğiyle kurtarma denenir; her kart
için ayrı istek gönderilmez. Alış/satış fiyatı, değişim oranı ve kaynak zamanı
Truncgil'den geldiğinde korunur. Teorik seri bu gerçek fiyatın yerine geçmez.

Detayda sağlayıcının bildirdiği yüksek/düşük varsa önceliklidir. Bu veri yoksa
günlük teorik örnek serisinin minimum ve maksimumu **Günlük Grafik En Yüksek /
En Düşük** olarak, gerçek tarihi ve teorik değer açıklamasıyla gösterilir.
Bunlar kuyumcu alış/satışının gerçek günlük uçları veya OHLC mum uçları değildir.
1H/1A/1Y grafik seçimi günlük örneklerin aralığını değiştirmez.

Gün ayrımı Europe/Istanbul zaman dilimindedir. Önceki tarihlerin örnekleri,
gelecek zaman damgaları ve geçersiz fiyatlar hesaba katılmaz. Günlük dönüşümde
kur en fazla 30 dakika taşınır; hafta sonu son seans gösteriliyorsa o seansın
gerçek tarihi korunur. Dört günden eski seri veya ikiden az eşleşen nokta
grafiğe dönüştürülmez. Kaynak erişilemiyorsa grafik/aralık uydurulmaz.

Piyasa snapshot önbellek sürümü 3'e yükseltilmiştir; yalnızca eski piyasa
snapshot'ı yenilenir. Favoriler ve portföy kayıtları değiştirilmez.

Doğrulama: beş altın türü, periyot değişiminde günlük aralığın korunması,
eşleşmeyen altın/kur uçları, İstanbul gece yarısı, geçersiz/gelecek/eski veriler,
iki ortak kurtarma isteği ve Truncgil fiyatlarının korunması test edilir.
React bileşen testleri ve dar ekran tarayıcı önizlemesi fiziksel Android/iOS
cihaz doğrulamasının yerine geçmez.

# Windows'ta imzali APK ve AAB

Node 22.13+ (veya Node 24), Java 17 ve Android SDK gereklidir. SDK'da
Android 36, Build Tools 36.0.0 ve NDK 27.1.12297006 kurulu olmalidir.
Kisa bir proje yolu kullanin: `C:\dev\PiyasaTakipApp`.

1. `npm.cmd ci` calistirin.
2. `npx.cmd --yes eas-cli@25.3.0 login` ile giris yapin.
3. `npx.cmd --yes eas-cli@25.3.0 credentials --platform android` menusuyle
   production icin mevcut anahtari credentials.json'a indirin.
   credentials.json ve keystore dosyalarini paylasmayin veya Git'e eklemeyin.
4. `npx.cmd --yes eas-cli@25.3.0 build:version:get --platform android --profile production`
   ile EAS'taki son Android surum kodunu kontrol edin. Play Console'a daha
   once yuklenen en buyuk koddan da buyuk bir kod secin.
5. `npx.cmd --yes eas-cli@25.3.0 build:version:set --platform android --profile production`
   ile sectiginiz yeni kodu EAS'a kaydedin. Boylece sonraki EAS derlemeleri
   de bu kodun uzerinden devam eder. Bu, surum sayacini degistirir; derleme baslatmaz.
6. Ornegin yeni kod 6 ise proje kokunde calistirin:

   ```powershell
   node .\scripts\build-android-windows.cjs --version-code 6
   ```

Arac `expo prebuild --platform android --no-install` ile native projeyi uretir;
elle native dosya duzenlemez. Mevcut android klasorunu silmez. Gradle init
scripti release varyantina credentials.json'daki upload anahtarini ve secilen
surum kodunu atar. APK ile AAB ayni versionCode ve ayni anahtari kullanir.
Bu yolda EAS bulut derlemesi veya GitHub Actions calistirilmaz.

## Bellek sinirli Windows derlemesi

Yerel komut varsayilan olarak Gradle'i tek isciyla, paralel proje derlemesi
kapali ve kalici daemon birakmadan calistirir. Gradle heap ust siniri 2 GB'dir;
JVM'nin gordugu islemci sayisi 2 ile sinirlanir. Kotlin derlemesi ayni surecte
yapilir; ayri Kotlin daemon'u acilmaz. Metro en fazla 2 donusturme iscisi kullanir.
Ninja'nin Gradle'dan bagimsiz C++ derleme/link havuzu da uygulama ve native
kutuphanelerde tek is ile sinirlanir. Bu ayarlar yalnizca bu komutun baslattigi
derlemeye uygulanir; kullanicinin global Gradle/Windows ayarlari degistirilmez.

Bu sinirlar surec sayisini azaltir; bilgisayardaki diger programlarin tukettigi
RAM'i veya Windows commit limitini yonetmez. `hs_err_pid*.log` basinda
`Native memory allocation (malloc) failed` gorulurse sadece Java heap boyutunu
artirmayin. Diger agir programlari kapatin; Windows sanal bellek/pagefile
durumunu ve disk boslugunu kontrol edin. Pagefile kapali/kisitliysa Windows
ayarlarinda sistem yonetimli secenek degerlendirilebilir. Bu komut pagefile'i
otomatik degistirmez veya bilgisayari yeniden baslatmaz.

Yarim kalan derlemede `clean` calistirilmaz; tamamlanan native ciktilar ve
indirilmis bagimliliklar korunur. CMake havuzu ayarlari ilk kez uygulanirken
native yapilandirma yenilenebilir. Azalan eszamanlilik bazi asamalari yavaslatabilir.
Windows cihazinda yeni derleme denenmeden bellek sorununun tamamen giderildigi
iddia edilmez.

Ciktilar `artifacts/android/PiyasaRadari-v6.apk` ve
`artifacts/android/PiyasaRadari-v6.aab` olur. ARM32 ve ARM64 cihazlar hedeflenir.
Android emulatorde kullanmak icin ayrica x86 derlemesi gerekir.

Ilk derlemede Gradle, Maven ve Expo bilesenlerini indirir. Internet erisimi
ve yeterli disk alani gereklidir. Surum kodunu ileride artirirken 4-6. adimlari
tekrarlayin. Otomatik EAS production autoIncrement bu yerel komutta calismaz.

Kaynaklar: https://docs.expo.dev/guides/local-app-production/
ve https://docs.expo.dev/build-reference/app-versions/
https://docs.gradle.org/current/userguide/build_environment.html
https://kotlinlang.org/docs/gradle-compilation-and-caches.html
https://cmake.org/cmake/help/latest/prop_gbl/JOB_POOLS.html
https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/introduction-to-the-page-file

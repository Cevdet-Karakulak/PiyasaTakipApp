This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Google Play Console & App Store Connect Yayın Beyan Rehberi (FloppaTech Standartları)

Kullanıcı mağaza yayınına geçtiğinde ekran görüntüsü beklemeden aşağıdaki tüm beyan yanıtlarını ve metin/görsel varlıklarını tek seferde hazır tablo olarak sun:

1. **Gizlilik Politikası URL'si:** `https://floppatechcorp.vercel.app/privacy/<uygulama-slug>` (Örn: `https://floppatechcorp.vercel.app/privacy/piyasa-radari`)
2. **Oturum Açma Bilgileri (Uygulama Erişimi):** **`Hayır`** (Hiçbir ekran kilitli değil, tüm özellikler oturum açmadan erişilebilir).
3. **Reklam Beyanı:**
   - AdMob varsa: **`Evet, uygulamam reklam içeriyor`**
   - AdMob yoksa: **`Hayır, uygulamam reklam içermiyor`**
4. **İçerik Derecelendirmeleri (IARC):**
   - E-posta: `floppatechcorp@gmail.com`
   - Kategori: **`Diğer Tüm Uygulama Türleri`** (Oyun değilse)
   - Tüm alt sorular (Şiddet, Cinsellik, Kumar, Konum Paylaşımı, Dijital Ürün Satışı, Kripto/NFT Ödülü, Web Tarayıcısı, Esas Olarak Haber/Eğitim Ürünü mü): Tamamına **`Hayır`** (PEGI 3 / Tüm Yaşlar).
5. **Hedef Kitle ve İçerik:**
   - Hedef yaş grubu: Yalnızca **`18 yaş ve üstü`** (veya `16-17` ve `18+`; **13 yaş altı kesinlikle seçilmez**).
   - "Mağaza girişiniz istemeden çocukların ilgisini çekebilir mi?": **`Hayır`**.
6. **Haber Uygulamaları / Devlet Uygulamaları Beyanı:** **`Hayır`**.
7. **Finansal Özellikler Beyanı:** En alttaki **`Uygulamamda finans ile ilgili özellik sağlanmıyor`** (Gerçek para transferi / SPK aracı kurum işlemi yapılmadığı için lisans belgesi adımını atlar).
8. **Veri Güvenliği (Data Safety):**
   - AdMob yoksa: "Veri topluyor veya paylaşıyor mu?" → **`Hayır`**.
   - AdMob varsa:
     - "Veri topluyor veya paylaşıyor mu?" → **`Evet`**
     - "Aktarım sırasında şifreleniyor mu (HTTPS)?" → **`Evet`**
     - "Hesap oluşturma yöntemleri" → **`Uygulamam kullanıcıların hesap oluşturmasına izin vermiyor`**
     - "Veri silme yöntemi (İsteğe bağlı)" → **`Hayır`**
     - "Veri türleri" → Yalnızca **`Cihaz veya diğer kimlikler`** (`1/1`)
     - "Veri kullanımı ve işleme" → **`Toplanıyor`** + **`Paylaşılıyor`**, Kısa süreli mi: **`Hayır`**, **`Veri toplama zorunlu`**, Amaç: **`Analiz`** + **`Reklam veya pazarlama`**.
9. **Reklam Kimliği (AD_ID):**
   - AdMob varsa: **`Evet`** → Amaç: **`Analiz`** + **`Reklam veya pazarlama`**.
10. **Mağaza Ayarları & İletişim Bilgileri:**
    - E-posta: `floppatechcorp@gmail.com`
    - Web sitesi: `https://floppatechcorp.vercel.app` (`app-ads.txt` doğrulaması için zorunlu)
11. **Varsayılan Mağaza Girişi Görselleri (`store-assets/`):**
    - Uygulama simgesi: `512x512` PNG
    - Özellik grafiği: `1024x500` PNG (Türkçe karakterler Unicode güvenli üretilmeli)
    - Telefon/Tablet ekran görüntüleri: 4 adet `1080x1920` (9:16) PNG


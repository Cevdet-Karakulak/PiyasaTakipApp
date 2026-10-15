# FinansPulse - Cloudflare Worker Yahoo Finance Proxy & Edge Cache

Bu Cloudflare Worker, Yahoo Finance API'si üzerinden veri çekerken Rate Limit (429 Too Many Requests) ve CORS engeline takılmamak için **Cloudflare Edge Cache** katmanı sağlar.

## Özellikler

1. **60 Saniye Edge Cache (`caches.default`)**:
   - Yahoo Finance'e yapılan istekler Cloudflare'in dünya geneline yayılmış CDN Edge sunucularında 60 saniye boyunca saklanır (`Cache-Control: public, max-age=60, s-maxage=60`).
   - 60 saniye dolmadan gelen binlerce kullanıcı isteği doğrudan Edge sunucusundan milisaniyeler içinde yanıtlanır (`X-Cache-Status: HIT`).
   - Yahoo Finance'e dakikada yalnızca 1 istek gider, kota asla dolmaz.

2. **Toplu BIST Sorgulama (Batch Requests)**:
   - Tek seferde 100 BIST hissesi virgülle ayrılarak istenebilir:
     `GET /batch?symbols=THYAO.IS,GARAN.IS,ASELS.IS,EREGL.IS...&range=1d&interval=15m`
   - Worker arkada 10'arlı eşzamanlı istek havuzlarıyla (concurrency pool) paralel çeker ve tek bir JSON olarak döner.

3. **Tekil Hisse Sorgulama (Single Request)**:
   - Doğrudan Yahoo endpoint'i gibi çalışır:
     `GET /chart/THYAO.IS?range=1d&interval=15m`

4. **Cache Key Normalizasyonu**:
   - `?symbols=GARAN.IS,THYAO.IS` ile `?symbols=THYAO.IS,GARAN.IS` aynı önbellek anahtarına normalize edilir; gereksiz cache miss önlenir.

5. **Tam CORS Desteği**:
   - `Access-Control-Allow-Origin: *` ve `OPTIONS` preflight desteği ile mobil uygulamalarda ve Web önizlemesinde sorunsuz çalışır.

---

## Kurulum ve Dağıtım (Deployment)

1. `cloudflare-worker` dizinine gidin:
   ```bash
   cd cloudflare-worker
   ```

2. Cloudflare hesabınıza giriş yapın (ilk kez yapıyorsanız):
   ```bash
   npx wrangler login
   ```

3. Yerel ortamda test etmek için:
   ```bash
   npx wrangler dev
   ```

4. Canlıya dağıtmak (Deploy):
   ```bash
   npx wrangler deploy
   ```

Deploy bittiğinde size şu şekilde bir URL verecektir:
`https://finanspulse-yahoo-proxy.<subdomain>.workers.dev`

---

## Mobil Uygulamaya Entegrasyon

Mobil uygulamanızdaki [`src/api/config.ts`](file:///c:/cevdet/Mobil/PiyasaTakipApp/src/api/config.ts) dosyasında `YAHOO_CHART_URL` değerini kendi Worker adresinizle değiştirmeniz yeterlidir:

```typescript
// src/api/config.ts
export const YAHOO_CHART_URL = 'https://finanspulse-yahoo-proxy.<subdomain>.workers.dev/chart';
```

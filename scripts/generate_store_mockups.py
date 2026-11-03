import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Paths
ROOT_DIR = r"c:\cevdet\Mobil\PiyasaTakipApp"
STORE_ASSETS_DIR = os.path.join(ROOT_DIR, "store-assets")
MOCKUP_BASE_PATH = r"C:\Users\efe_k\Downloads\Satranç Saati\Mockup\Tempo-Turkce-App-Store-Gorselleri-İphone\apple-iphone-15-pro-max-natural-titanium-mockup\saat-portrait.png"

OUT_1206 = os.path.join(STORE_ASSETS_DIR, "mockups-1206x2622")
OUT_1080 = os.path.join(STORE_ASSETS_DIR, "mockups-1080x2400")
os.makedirs(OUT_1206, exist_ok=True)
os.makedirs(OUT_1080, exist_ok=True)

# Screen configurations
CONFIGS = [
    {
        "id": "01-Piyasalar",
        "file": "WhatsApp Image 2026-11-03 at 13.01.05 (2).jpeg",
        "title1": "Piyasaları izle.",
        "title2": "Fırsatı yakala.",
        "subtitle": "BIST 100, döviz, altın ve kripto anlık takipte.",
        "legacy_name": "telefon-1-piyasalar.png"
    },
    {
        "id": "02-Portfoy",
        "file": "WhatsApp Image 2026-11-03 at 13.01.04 (2).jpeg",
        "title1": "Portföyünü yönet.",
        "title2": "Kârını anlık gör.",
        "subtitle": "Net varlık değeri ve günlük kâr/zarar hesabı.",
        "legacy_name": "telefon-2-portfoy.png"
    },
    {
        "id": "03-Akaryakit",
        "file": "WhatsApp Image 2026-11-03 at 13.01.05 (1).jpeg",
        "title1": "81 il akaryakıt.",
        "title2": "Zam ve indirim.",
        "subtitle": "Benzin, motorin ve LPG pompa fiyatları cebinde.",
        "legacy_name": "telefon-3-akaryakit.png"
    },
    {
        "id": "04-Cevirici",
        "file": "WhatsApp Image 2026-11-03 at 13.01.04 (1).jpeg",
        "title1": "Kurları dönüştür.",
        "title2": "Hesabını anında yap.",
        "subtitle": "Dolar, Euro, Gram ve Çeyrek Altın canlı çevirici.",
        "legacy_name": "telefon-4-cevirici-grafik.png"
    },
    {
        "id": "05-Haberler",
        "file": "WhatsApp Image 2026-11-03 at 13.01.05.jpeg",
        "title1": "Ekonomi gündemi.",
        "title2": "Anlık haber akışı.",
        "subtitle": "BIST, altın, döviz ve küresel finans bülteni.",
        "legacy_name": "telefon-5-haberler.png"
    },
    {
        "id": "06-Ayarlar",
        "file": "WhatsApp Image 2026-11-03 at 13.01.04.jpeg",
        "title1": "Sana özel deneyim.",
        "title2": "Güvenli ve esnek.",
        "subtitle": "Açık/koyu tema, TR/EN dil ve yerel gizlilik koruması.",
        "legacy_name": "telefon-6-ayarlar.png"
    }
]

def prepare_phone_frame():
    phone_base = Image.open(MOCKUP_BASE_PATH).convert('RGBA')
    sx1, sy1, sx2, sy2 = 117, 176, 1412, 2912
    sw, sh = sx2 - sx1, sy2 - sy1

    inv_mask = Image.new('L', (sw, sh), 255)
    d_inv = ImageDraw.Draw(inv_mask)
    d_inv.rounded_rectangle([(0, 0), (sw, sh)], radius=138, fill=0)

    overlay_arr = np.array(phone_base)
    inv_arr = np.array(inv_mask)
    overlay_arr[sy1:sy2, sx1:sx2, 3] = np.minimum(overlay_arr[sy1:sy2, sx1:sx2, 3], inv_arr)
    clean_frame = Image.fromarray(overlay_arr)

    screen_mask = Image.new('L', (sw, sh), 0)
    d_screen = ImageDraw.Draw(screen_mask)
    d_screen.rounded_rectangle([(0, 0), (sw, sh)], radius=138, fill=255)

    return phone_base, clean_frame, screen_mask, (sx1, sy1, sw, sh)

def create_mockup(cfg, phone_base, clean_frame, screen_mask, screen_coords, canvas_w=1206, canvas_h=2622):
    sx1, sy1, sw, sh = screen_coords
    shot_path = os.path.join(STORE_ASSETS_DIR, cfg["file"])
    shot = Image.open(shot_path).convert('RGBA').resize((sw, sh), Image.Resampling.LANCZOS)

    # 1. Composite Phone
    comp_phone = Image.new('RGBA', phone_base.size, (0, 0, 0, 0))
    comp_phone.paste(shot, (sx1, sy1), screen_mask)
    comp_phone = Image.alpha_composite(comp_phone, clean_frame)

    # Clean Pill Notch (matching clean retail display)
    d_pill = ImageDraw.Draw(comp_phone)
    d_pill.rounded_rectangle([(600, 224), (930, 300)], radius=38, fill=(0, 0, 0, 255))
    d_pill.ellipse([(635, 252), (655, 272)], fill=(15, 23, 42, 255))
    d_pill.ellipse([(642, 259), (648, 265)], fill=(30, 41, 59, 255))

    # Scale phone for canvas
    phone_target_w = 960
    phone_scale = phone_target_w / phone_base.width
    phone_target_h = int(phone_base.height * phone_scale)
    scaled_phone = comp_phone.resize((phone_target_w, phone_target_h), Image.Resampling.LANCZOS)

    # 2. Canvas Background (Obsidian gradient)
    bg = Image.new('RGBA', (canvas_w, canvas_h), (8, 12, 16, 255))
    bg_draw = ImageDraw.Draw(bg)

    for y in range(canvas_h):
        t = y / canvas_h
        r = int(7 * (1 - t) + 13 * t)
        g = int(10 * (1 - t) + 19 * t)
        b = int(15 * (1 - t) + 27 * t)
        bg_draw.line([(0, y), (canvas_w, y)], fill=(r, g, b, 255))

    # 3. Ambient Backlight Glow
    phone_x = (canvas_w - phone_target_w) // 2
    phone_y = 635

    glow_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow_layer)

    # Left Emerald Glow
    d_glow.ellipse([
        (phone_x - 140, phone_y + 350),
        (phone_x + 360, phone_y + 1150)
    ], fill=(16, 185, 129, 68))

    # Right Cyan Glow
    d_glow.ellipse([
        (phone_x + phone_target_w - 360, phone_y + 400),
        (phone_x + phone_target_w + 140, phone_y + 1200)
    ], fill=(6, 182, 212, 62))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(165))
    bg = Image.alpha_composite(bg, glow_layer)

    # 4. Realistic Drop Shadow
    shadow_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_mask = scaled_phone.split()[3].point(lambda a: 165 if a > 0 else 0)
    shadow_layer.paste((0, 0, 0, 165), (phone_x, phone_y + 26), mask=shadow_mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(38))
    bg = Image.alpha_composite(bg, shadow_layer)

    # 5. Composite Phone onto Background
    bg.paste(scaled_phone, (phone_x, phone_y), scaled_phone)

    # 6. Typography
    d_text = ImageDraw.Draw(bg)
    font_wordmark = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 44)
    font_headline = ImageFont.truetype(r'C:\Windows\Fonts\georgiab.ttf', 82)
    font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 38)

    # Wordmark
    wm_text = 'piyasaradarı'
    dot = ' •'
    wm_box = font_wordmark.getbbox(wm_text)
    dot_box = font_wordmark.getbbox(dot)
    wm_w = wm_box[2] - wm_box[0]
    dot_w = dot_box[2] - dot_box[0]
    total_wm_w = wm_w + dot_w
    wm_x = (canvas_w - total_wm_w) // 2
    wm_y = 135

    d_text.text((wm_x, wm_y), wm_text, font=font_wordmark, fill=(241, 245, 249, 255))
    d_text.text((wm_x + wm_w, wm_y), dot, font=font_wordmark, fill=(16, 185, 129, 255))

    # Headline Line 1
    l1_box = font_headline.getbbox(cfg["title1"])
    l1_w = l1_box[2] - l1_box[0]
    l1_x = (canvas_w - l1_w) // 2
    l1_y = 228
    d_text.text((l1_x, l1_y), cfg["title1"], font=font_headline, fill=(250, 245, 238, 255))

    # Headline Line 2
    l2_box = font_headline.getbbox(cfg["title2"])
    l2_w = l2_box[2] - l2_box[0]
    l2_x = (canvas_w - l2_w) // 2
    l2_y = l1_y + 105
    d_text.text((l2_x, l2_y), cfg["title2"], font=font_headline, fill=(250, 245, 238, 255))

    # Subtitle
    sub_box = font_sub.getbbox(cfg["subtitle"])
    sub_w = sub_box[2] - sub_box[0]
    sub_x = (canvas_w - sub_w) // 2
    sub_y = l2_y + 128
    d_text.text((sub_x, sub_y), cfg["subtitle"], font=font_sub, fill=(148, 163, 184, 255))

    return bg.convert('RGB')

def main():
    print("Preparing phone frame...")
    phone_base, clean_frame, screen_mask, screen_coords = prepare_phone_frame()

    for idx, cfg in enumerate(CONFIGS, start=1):
        print(f"[{idx}/6] Rendering {cfg['id']} ({cfg['title1']} {cfg['title2']})...")
        img_1206 = create_mockup(cfg, phone_base, clean_frame, screen_mask, screen_coords, 1206, 2622)
        
        # Save 1206x2622
        out_1206_path = os.path.join(OUT_1206, f"{cfg['id']}.png")
        img_1206.save(out_1206_path, quality=96)

        # Save 1080x2400 (scaled Lanczos)
        img_1080 = img_1206.resize((1080, 2400), Image.Resampling.LANCZOS)
        out_1080_path = os.path.join(OUT_1080, f"{cfg['id']}.png")
        img_1080.save(out_1080_path, quality=96)

        # Update root legacy file for Google Play Console compatibility
        legacy_path = os.path.join(STORE_ASSETS_DIR, cfg["legacy_name"])
        img_1206.save(legacy_path, quality=96)
        print(f"  -> Saved {out_1206_path}")

    print("\nAll 6 mockups generated successfully in both 1206x2622 and 1080x2400!")

if __name__ == "__main__":
    main()

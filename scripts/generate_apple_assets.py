import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = r"c:\cevdet\Mobil\PiyasaTakipApp"
STORE_ASSETS_DIR = os.path.join(ROOT_DIR, "store-assets")
APPLE_DIR = os.path.join(STORE_ASSETS_DIR, "apple")
IPHONE_1290_DIR = os.path.join(APPLE_DIR, "mockups-iphone-1290x2796")
IPHONE_1206_DIR = os.path.join(APPLE_DIR, "mockups-iphone-1206x2622")

os.makedirs(APPLE_DIR, exist_ok=True)
os.makedirs(IPHONE_1290_DIR, exist_ok=True)
os.makedirs(IPHONE_1206_DIR, exist_ok=True)

MOCKUP_BASE_PATH = r"C:\Users\efe_k\Downloads\Satranç Saati\Mockup\Tempo-Turkce-App-Store-Gorselleri-İphone\apple-iphone-15-pro-max-natural-titanium-mockup\saat-portrait.png"

CONFIGS = [
    {
        "id": "01-Piyasalar",
        "file": "WhatsApp Image 2026-11-03 at 13.01.05 (2).jpeg",
        "title1": "Piyasaları izle.",
        "title2": "Fırsatı yakala.",
        "subtitle": "BIST 100, döviz, altın ve kripto anlık takipte."
    },
    {
        "id": "02-Portfoy",
        "file": "WhatsApp Image 2026-11-03 at 13.01.04 (2).jpeg",
        "title1": "Portföyünü yönet.",
        "title2": "Kârını anlık gör.",
        "subtitle": "Net varlık değeri ve günlük kâr/zarar hesabı."
    },
    {
        "id": "03-Akaryakit",
        "file": "WhatsApp Image 2026-11-03 at 13.01.05 (1).jpeg",
        "title1": "81 il akaryakıt.",
        "title2": "Zam ve indirim.",
        "subtitle": "Benzin, motorin ve LPG pompa fiyatları cebinde."
    },
    {
        "id": "04-Cevirici",
        "file": "WhatsApp Image 2026-11-03 at 13.01.04 (1).jpeg",
        "title1": "Kurları dönüştür.",
        "title2": "Hesabını anında yap.",
        "subtitle": "Dolar, Euro, Gram ve Çeyrek Altın canlı çevirici."
    },
    {
        "id": "05-Haberler",
        "file": "WhatsApp Image 2026-11-03 at 13.01.05.jpeg",
        "title1": "Ekonomi gündemi.",
        "title2": "Anlık haber akışı.",
        "subtitle": "BIST, altın, döviz ve küresel finans bülteni."
    },
    {
        "id": "06-Ayarlar",
        "file": "WhatsApp Image 2026-11-03 at 13.01.04.jpeg",
        "title1": "Sana özel deneyim.",
        "title2": "Güvenli ve esnek.",
        "subtitle": "Açık/koyu tema, TR/EN dil ve yerel gizlilik koruması."
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

def render_iphone_mockup(cfg, phone_base, clean_frame, screen_mask, screen_coords, canvas_w=1290, canvas_h=2796):
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

    # Scale phone for 1290x2796 canvas
    phone_target_w = int(canvas_w * 0.81)  # ~1045px
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
    phone_y = int(canvas_h * 0.25)

    glow_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow_layer)

    # Left Emerald Glow
    d_glow.ellipse([
        (phone_x - 150, phone_y + 350),
        (phone_x + 400, phone_y + 1200)
    ], fill=(16, 185, 129, 68))

    # Right Cyan Glow
    d_glow.ellipse([
        (phone_x + phone_target_w - 400, phone_y + 400),
        (phone_x + phone_target_w + 150, phone_y + 1250)
    ], fill=(6, 182, 212, 62))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(180))
    bg = Image.alpha_composite(bg, glow_layer)

    # 4. Realistic Drop Shadow
    shadow_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_mask = scaled_phone.split()[3].point(lambda a: 170 if a > 0 else 0)
    shadow_layer.paste((0, 0, 0, 170), (phone_x, phone_y + 28), mask=shadow_mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(40))
    bg = Image.alpha_composite(bg, shadow_layer)

    # 5. Composite Phone
    bg.paste(scaled_phone, (phone_x, phone_y), scaled_phone)

    # 6. Typography
    d_text = ImageDraw.Draw(bg)
    font_wordmark = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 46)
    font_headline = ImageFont.truetype(r'C:\Windows\Fonts\georgiab.ttf', 86)
    font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 40)

    # Wordmark
    wm_text = 'piyasaradarı'
    dot = ' •'
    wm_box = font_wordmark.getbbox(wm_text)
    dot_box = font_wordmark.getbbox(dot)
    wm_w = wm_box[2] - wm_box[0]
    dot_w = dot_box[2] - dot_box[0]
    total_wm_w = wm_w + dot_w
    wm_x = (canvas_w - total_wm_w) // 2
    wm_y = int(canvas_h * 0.052)

    d_text.text((wm_x, wm_y), wm_text, font=font_wordmark, fill=(241, 245, 249, 255))
    d_text.text((wm_x + wm_w, wm_y), dot, font=font_wordmark, fill=(16, 185, 129, 255))

    # Headline Line 1
    l1_box = font_headline.getbbox(cfg["title1"])
    l1_w = l1_box[2] - l1_box[0]
    l1_x = (canvas_w - l1_w) // 2
    l1_y = wm_y + 98
    d_text.text((l1_x, l1_y), cfg["title1"], font=font_headline, fill=(250, 245, 238, 255))

    # Headline Line 2
    l2_box = font_headline.getbbox(cfg["title2"])
    l2_w = l2_box[2] - l2_box[0]
    l2_x = (canvas_w - l2_w) // 2
    l2_y = l1_y + 110
    d_text.text((l2_x, l2_y), cfg["title2"], font=font_headline, fill=(250, 245, 238, 255))

    # Subtitle
    sub_box = font_sub.getbbox(cfg["subtitle"])
    sub_w = sub_box[2] - sub_box[0]
    sub_x = (canvas_w - sub_w) // 2
    sub_y = l2_y + 134
    d_text.text((sub_x, sub_y), cfg["subtitle"], font=font_sub, fill=(148, 163, 184, 255))

    return bg.convert('RGB')

def generate_apple_featuring_art(width, height, is_header=True):
    """
    Renders high-end, uncluttered art adhering strictly to Apple's App Store Asset Best Practices:
    - No transparency (RGB flattened)
    - Dynamic, immersive branding art
    - Safe area: Keep vital focus away from lower left (where App Store icon/metadata overlay in header)
    - Candlestick charts, radar sonar sweeps, glowing emerald & cyan financial trend geometry
    """
    canvas = Image.new('RGB', (width, height), (7, 12, 18))
    draw = ImageDraw.Draw(canvas)

    # 1. Subtle Deep Obsidian Background Gradient
    for y in range(height):
        t = y / height
        r = int(5 * (1 - t) + 10 * t)
        g = int(9 * (1 - t) + 18 * t)
        b = int(14 * (1 - t) + 26 * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # 2. Glowing Nebula / Ambient Lighting
    glow_canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow_canvas)

    # Right-hand side focus center (keeps left safe for App Store metadata overlay)
    cx = int(width * 0.72)
    cy = int(height * 0.52)

    # Core emerald glow
    d_glow.ellipse([(cx - int(width * 0.28), cy - int(height * 0.45)),
                    (cx + int(width * 0.28), cy + int(height * 0.45))],
                   fill=(16, 185, 129, 65))
    # Cyan secondary glow
    d_glow.ellipse([(cx - int(width * 0.15), cy - int(height * 0.3)),
                    (cx + int(width * 0.35), cy + int(height * 0.35))],
                   fill=(6, 182, 212, 50))

    # Soft ambient left glow
    d_glow.ellipse([(int(width * 0.2), int(height * 0.3)),
                    (int(width * 0.45), int(height * 0.75))],
                   fill=(16, 185, 129, 25))

    glow_canvas = glow_canvas.filter(ImageFilter.GaussianBlur(int(height * 0.15)))
    canvas.paste(glow_canvas, (0, 0), glow_canvas)

    # 3. Vector Financial Geometric Grid & Radar Rings
    geom_canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_geom = ImageDraw.Draw(geom_canvas)

    # Concentric Radar Arcs
    radii_factors = [0.12, 0.24, 0.38, 0.54, 0.72]
    for rf in radii_factors:
        r = int(height * rf)
        d_geom.ellipse([(cx - r, cy - r), (cx + r, cy + r)],
                       outline=(16, 185, 129, 45), width=max(2, int(width * 0.001)))

    # Angular Radar Sweep Lines
    for angle_deg in [30, 60, 120, 150, 210, 240, 300, 330]:
        rad = math.radians(angle_deg)
        length = int(height * 0.65)
        x2 = int(cx + length * math.cos(rad))
        y2 = int(cy + length * math.sin(rad))
        d_geom.line([(cx, cy), (x2, y2)], fill=(16, 185, 129, 30), width=max(1, int(width * 0.0007)))

    # 4. Stylized Financial Candlestick Bars
    candlesticks = [
        # (x_rel, y_low_rel, y_high_rel, y_open_rel, y_close_rel, is_green)
        (0.48, 0.68, 0.48, 0.62, 0.54, True),
        (0.52, 0.62, 0.44, 0.58, 0.49, True),
        (0.56, 0.56, 0.40, 0.50, 0.53, False),
        (0.60, 0.52, 0.34, 0.48, 0.40, True),
        (0.64, 0.44, 0.28, 0.41, 0.33, True),
        (0.68, 0.38, 0.24, 0.34, 0.27, True),
        (0.72, 0.34, 0.20, 0.30, 0.22, True),
        (0.76, 0.28, 0.16, 0.25, 0.19, True),
        (0.80, 0.24, 0.12, 0.20, 0.15, True),
        (0.84, 0.18, 0.09, 0.16, 0.11, True),
    ]

    bar_w = int(width * 0.018)
    wick_w = max(2, int(width * 0.0012))

    for (xr, y_low, y_high, y_o, y_c, is_up) in candlesticks:
        px = int(width * xr)
        py_low = int(height * y_low)
        py_high = int(height * y_high)
        py_open = int(height * y_o)
        py_close = int(height * y_c)

        color_body = (16, 185, 129, 210) if is_up else (239, 68, 68, 190)
        color_wick = (52, 211, 153, 230) if is_up else (248, 113, 113, 200)

        # Draw Wick
        d_geom.line([(px, py_high), (px, py_low)], fill=color_wick, width=wick_w)
        # Draw Candle Body
        top_y = min(py_open, py_close)
        bot_y = max(py_open, py_close)
        d_geom.rounded_rectangle([
            (px - bar_w // 2, top_y),
            (px + bar_w // 2, bot_y)
        ], radius=max(2, int(bar_w * 0.2)), fill=color_body)

    # 5. Glowing Upward Trend Spline
    trend_pts = [
        (int(width * 0.35), int(height * 0.72)),
        (int(width * 0.46), int(height * 0.63)),
        (int(width * 0.54), int(height * 0.58)),
        (int(width * 0.66), int(height * 0.42)),
        (int(width * 0.75), int(height * 0.31)),
        (int(width * 0.86), int(height * 0.16)),
        (int(width * 0.94), int(height * 0.10))
    ]

    # Trend glow
    t_glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_tglow = ImageDraw.Draw(t_glow)
    for i in range(len(trend_pts) - 1):
        d_tglow.line([trend_pts[i], trend_pts[i+1]], fill=(16, 185, 129, 140), width=int(width * 0.009))
    t_glow = t_glow.filter(ImageFilter.GaussianBlur(int(width * 0.006)))
    geom_canvas = Image.alpha_composite(geom_canvas, t_glow)

    # Crisp trend line
    d_tline = ImageDraw.Draw(geom_canvas)
    for i in range(len(trend_pts) - 1):
        d_tline.line([trend_pts[i], trend_pts[i+1]], fill=(52, 211, 153, 255), width=max(3, int(width * 0.003)))

    for pt in trend_pts:
        d_tline.ellipse([
            (pt[0] - int(width * 0.004), pt[1] - int(width * 0.004)),
            (pt[0] + int(width * 0.004), pt[1] + int(width * 0.004))
        ], fill=(255, 255, 255, 245))

    canvas.paste(geom_canvas, (0, 0), geom_canvas)

    # 6. Subtle Branding Logo Radar on Left/Center
    icon_path = r"c:\cevdet\Mobil\PiyasaTakipApp\store-assets\icon-512x512.png"
    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert('RGBA')
        icon_dim = int(height * 0.42)
        icon = icon.resize((icon_dim, icon_dim), Image.Resampling.LANCZOS)

        # Place logo in an elegant position (offset from extreme left for App Store UI safety)
        ix = int(width * 0.12) if is_header else int(width * 0.15)
        iy = int(height * 0.29)

        # Soft drop shadow
        sh_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        icon_alpha = icon.split()[3].point(lambda a: 160 if a > 0 else 0)
        sh_layer.paste((0, 0, 0, 160), (ix, iy + int(height * 0.02)), mask=icon_alpha)
        sh_layer = sh_layer.filter(ImageFilter.GaussianBlur(int(height * 0.035)))
        canvas.paste(sh_layer, (0, 0), sh_layer)

        canvas.paste(icon, (ix, iy), icon)

        # Subtle text watermark next to icon
        font_main = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', int(height * 0.085))
        font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', int(height * 0.042))
        d_watermark = ImageDraw.Draw(canvas)

        tx = ix + icon_dim + int(width * 0.022)
        ty = iy + int(height * 0.06)

        d_watermark.text((tx, ty), "PiyasaRadarı", font=font_main, fill=(255, 255, 255))
        d_watermark.text((tx, ty + int(height * 0.11)), "Canlı Borsa, Döviz & Altın", font=font_sub, fill=(16, 185, 129))

    return canvas

def main():
    print("=" * 60)
    print("Apple App Store Assets Generator (Best Practices Compliant)")
    print("=" * 60)

    # 1. Product Page Header (21:9 - 3840 x 1646)
    print("\n1. Rendering Product Page Header (3840 x 1646)...")
    header_img = generate_apple_featuring_art(3840, 1646, is_header=True)
    header_path = os.path.join(APPLE_DIR, "header-3840x1646.png")
    header_img.save(header_path, format="PNG", quality=98)
    print(f"   -> Saved: {header_path}")

    # 2. Search Results Artwork (3:2 - 3840 x 2560)
    print("\n2. Rendering Search Results Artwork (3840 x 2560)...")
    search_img = generate_apple_featuring_art(3840, 2560, is_header=False)
    search_path = os.path.join(APPLE_DIR, "search-3840x2560.png")
    search_img.save(search_path, format="PNG", quality=98)
    print(f"   -> Saved: {search_path}")

    # 3. Universal Asset (16:9 - 5244 x 2950)
    print("\n3. Rendering Universal Header & Search Asset (5244 x 2950)...")
    univ_img = generate_apple_featuring_art(5244, 2950, is_header=True)
    univ_path = os.path.join(APPLE_DIR, "universal-5244x2950.png")
    univ_img.save(univ_path, format="PNG", quality=98)
    print(f"   -> Saved: {univ_path}")

    # 4. iPhone App Store Mockups (1290 x 2796 & 1206 x 2622)
    print("\n4. Rendering iPhone App Store Mockups (6.7\" & 6.3\")...")
    phone_base, clean_frame, screen_mask, screen_coords = prepare_phone_frame()

    for idx, cfg in enumerate(CONFIGS, start=1):
        print(f"   [{idx}/6] Rendering {cfg['id']} for iPhone...")
        # 1290x2796 (6.7" Super Retina)
        mockup_1290 = render_iphone_mockup(cfg, phone_base, clean_frame, screen_mask, screen_coords, 1290, 2796)
        p1290 = os.path.join(IPHONE_1290_DIR, f"{cfg['id']}.png")
        mockup_1290.save(p1290, format="PNG", quality=96)

        # 1206x2622 (6.3" Pro Display)
        mockup_1206 = mockup_1290.resize((1206, 2622), Image.Resampling.LANCZOS)
        p1206 = os.path.join(IPHONE_1206_DIR, f"{cfg['id']}.png")
        mockup_1206.save(p1206, format="PNG", quality=96)
        print(f"      -> 1290x2796 & 1206x2622 saved.")

    print("\nAll Apple App Store assets generated successfully!")

if __name__ == "__main__":
    main()

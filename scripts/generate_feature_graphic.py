import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

def create_feature_graphic():
    # 2x supersampling for razor sharp render
    scale = 2
    w, h = 1024 * scale, 500 * scale

    # 1. Base Gradient Canvas
    img = Image.new('RGBA', (w, h), (6, 11, 18, 255))
    draw = ImageDraw.Draw(img)

    for x in range(w):
        t = x / w
        r = int(6 * (1 - t) + 11 * t)
        g = int(11 * (1 - t) + 22 * t)
        b = int(18 * (1 - t) + 36 * t)
        draw.line([(x, 0), (x, h)], fill=(r, g, b, 255))

    # 2. Ambient Glows
    glow_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow_layer)

    # Emerald glow around radar center
    center_x, center_y = int(850 * scale), int(260 * scale)
    d_glow.ellipse([
        (center_x - int(250 * scale), center_y - int(250 * scale)),
        (center_x + int(250 * scale), center_y + int(250 * scale))
    ], fill=(16, 185, 129, 45))

    # Cyan secondary glow
    d_glow.ellipse([
        (center_x - int(120 * scale), center_y - int(120 * scale)),
        (center_x + int(300 * scale), center_y + int(300 * scale))
    ], fill=(6, 182, 212, 35))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(80 * scale))
    img = Image.alpha_composite(img, glow_layer)

    # 3. Vector Radar Rings & Lines
    radar_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d_radar = ImageDraw.Draw(radar_layer)

    # Concentric rings
    radii = [100 * scale, 200 * scale, 310 * scale, 430 * scale]
    for r in radii:
        d_radar.ellipse([
            (center_x - r, center_y - r),
            (center_x + r, center_y + r)
        ], outline=(16, 185, 129, 48), width=int(1.5 * scale))

    # Diagonal crosshair line
    d_radar.line([
        (center_x - int(380 * scale), center_y + int(180 * scale)),
        (center_x + int(380 * scale), center_y - int(180 * scale))
    ], fill=(16, 185, 129, 35), width=int(1.5 * scale))

    # Trend line with soft green glow
    trend_pts = [
        (int(560 * scale), int(380 * scale)),
        (int(650 * scale), int(345 * scale)),
        (int(710 * scale), int(358 * scale)),
        (int(800 * scale), int(295 * scale)),
        (int(870 * scale), int(245 * scale)),
        (int(960 * scale), int(170 * scale))
    ]

    # Trend line glow
    trend_glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d_tglow = ImageDraw.Draw(trend_glow)
    for i in range(len(trend_pts) - 1):
        d_tglow.line([trend_pts[i], trend_pts[i+1]], fill=(16, 185, 129, 130), width=int(8 * scale))
    trend_glow = trend_glow.filter(ImageFilter.GaussianBlur(6 * scale))
    radar_layer = Image.alpha_composite(radar_layer, trend_glow)

    # Solid crisp trend line
    d_trend = ImageDraw.Draw(radar_layer)
    for i in range(len(trend_pts) - 1):
        d_trend.line([trend_pts[i], trend_pts[i+1]], fill=(52, 211, 153, 255), width=int(3.5 * scale))

    # Trend line marker dots
    for pt in trend_pts:
        d_trend.ellipse([
            (pt[0] - int(4 * scale), pt[1] - int(4 * scale)),
            (pt[0] + int(4 * scale), pt[1] + int(4 * scale))
        ], fill=(255, 255, 255, 240))

    img = Image.alpha_composite(img, radar_layer)

    # 4. App Icon on the Left
    icon_path = r"c:\cevdet\Mobil\PiyasaTakipApp\store-assets\icon-512x512.png"
    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert('RGBA')
        icon_size = int(220 * scale)
        icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

        icon_x = int(72 * scale)
        icon_y = (h - icon_size) // 2

        # Icon drop shadow
        shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        icon_alpha = icon.split()[3].point(lambda a: 160 if a > 0 else 0)
        shadow.paste((0, 0, 0, 160), (icon_x, icon_y + int(12 * scale)), mask=icon_alpha)
        shadow = shadow.filter(ImageFilter.GaussianBlur(16 * scale))
        img = Image.alpha_composite(img, shadow)

        # Paste icon
        img.paste(icon, (icon_x, icon_y), icon)

    # 5. Clean Turkish Typography (Segoe UI)
    font_tag = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', int(18 * scale))
    font_title = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', int(50 * scale))
    font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', int(20 * scale))

    text_draw = ImageDraw.Draw(img)
    text_x = int(330 * scale)

    # Tag: PIYASA RADARI
    tag_y = int(136 * scale)
    text_draw.text((text_x, tag_y), "PİYASA RADARI", font=font_tag, fill=(16, 185, 129, 255))

    # Main Title
    line1 = "Canlı Borsa, Döviz,"
    line2 = "Altın & Portföy"
    l1_y = tag_y + int(34 * scale)
    l2_y = l1_y + int(64 * scale)

    text_draw.text((text_x, l1_y), line1, font=font_title, fill=(255, 255, 255, 255))
    text_draw.text((text_x, l2_y), line2, font=font_title, fill=(255, 255, 255, 255))

    # Subtitle
    sub_text = "BIST 100  •  Serbest Piyasa Döviz  •  Altın  •  Kripto  •  81 İl Akaryakıt"
    sub_y = l2_y + int(82 * scale)
    text_draw.text((text_x, sub_y), sub_text, font=font_sub, fill=(148, 163, 184, 255))

    # 6. Downsample to target size (1024x500)
    final_img = img.resize((1024, 500), Image.Resampling.LANCZOS).convert('RGB')
    out_path = r"c:\cevdet\Mobil\PiyasaTakipApp\store-assets\feature-graphic-1024x500.png"
    final_img.save(out_path, quality=98)
    print(f"Generated clean feature graphic at: {out_path}")

if __name__ == "__main__":
    create_feature_graphic()

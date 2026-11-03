import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = r"c:\cevdet\Mobil\PiyasaTakipApp"
STORE_ASSETS_DIR = os.path.join(ROOT_DIR, "store-assets")
APPLE_DIR = os.path.join(STORE_ASSETS_DIR, "apple")
os.makedirs(APPLE_DIR, exist_ok=True)

def generate_apple_art(width, height, include_branding=False, placement_type="header"):
    """
    Generates App Store artwork following Apple Developer Best Practices:
    - No transparency (RGB mode)
    - Dynamic, immersive financial and radar illustration
    - Centered focal point, safe areas respected
    - Candlesticks, glowing emerald/cyan neon vectors, smooth trendline
    """
    canvas = Image.new('RGB', (width, height), (7, 12, 18))
    draw = ImageDraw.Draw(canvas)

    # 1. Obsidian Deep Space Gradient (Vertical & Radial)
    for y in range(height):
        t = y / height
        r = int(5 * (1 - t) + 10 * t)
        g = int(9 * (1 - t) + 18 * t)
        b = int(14 * (1 - t) + 26 * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # 2. Dynamic Ambient Glows
    glow_canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow_canvas)

    # Primary focal center (balanced slightly to center-right or center)
    cx = int(width * 0.58) if not include_branding else int(width * 0.65)
    cy = int(height * 0.50)

    # Core Emerald Nebula
    d_glow.ellipse([
        (cx - int(width * 0.32), cy - int(height * 0.42)),
        (cx + int(width * 0.32), cy + int(height * 0.42))
    ], fill=(16, 185, 129, 65))

    # Secondary Cyan Nebula
    d_glow.ellipse([
        (cx - int(width * 0.18), cy - int(height * 0.28)),
        (cx + int(width * 0.38), cy + int(height * 0.35))
    ], fill=(6, 182, 212, 55))

    # Left-hand ambient soft green light
    d_glow.ellipse([
        (int(width * 0.12), int(height * 0.35)),
        (int(width * 0.38), int(height * 0.75))
    ], fill=(16, 185, 129, 30))

    glow_canvas = glow_canvas.filter(ImageFilter.GaussianBlur(int(height * 0.16)))
    canvas.paste(glow_canvas, (0, 0), glow_canvas)

    # 3. Vector Radar Grid (Concentric Arcs & Radial Angles)
    geom_canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_geom = ImageDraw.Draw(geom_canvas)

    radar_radii = [0.15, 0.28, 0.44, 0.62, 0.82]
    for rf in radar_radii:
        r = int(height * rf)
        d_geom.ellipse([
            (cx - r, cy - r),
            (cx + r, cy + r)
        ], outline=(16, 185, 129, 45), width=max(2, int(width * 0.001)))

    for deg in [20, 45, 75, 110, 140, 165, 200, 230, 260, 290, 325]:
        rad = math.radians(deg)
        length = int(height * 0.75)
        x2 = int(cx + length * math.cos(rad))
        y2 = int(cy + length * math.sin(rad))
        d_geom.line([(cx, cy), (x2, y2)], fill=(16, 185, 129, 28), width=max(1, int(width * 0.0006)))

    # 4. Stylized Financial Candlestick Chart (Rising market momentum)
    # Relative positions centered gracefully across the artwork
    candlesticks = [
        # (rel_x, rel_low, rel_high, rel_open, rel_close, is_green)
        (0.28, 0.76, 0.58, 0.70, 0.63, True),
        (0.33, 0.70, 0.52, 0.67, 0.58, True),
        (0.38, 0.64, 0.48, 0.59, 0.61, False),
        (0.43, 0.60, 0.42, 0.56, 0.47, True),
        (0.48, 0.54, 0.36, 0.50, 0.41, True),
        (0.53, 0.49, 0.32, 0.45, 0.38, True),
        (0.58, 0.45, 0.28, 0.41, 0.33, True),
        (0.63, 0.40, 0.24, 0.36, 0.28, True),
        (0.68, 0.36, 0.21, 0.31, 0.33, False),
        (0.73, 0.32, 0.17, 0.29, 0.22, True),
        (0.78, 0.27, 0.13, 0.24, 0.17, True),
        (0.83, 0.22, 0.09, 0.19, 0.13, True),
        (0.88, 0.17, 0.06, 0.15, 0.09, True),
    ]

    bar_w = int(width * 0.016)
    wick_w = max(2, int(width * 0.0012))

    for (xr, y_low, y_high, y_o, y_c, is_up) in candlesticks:
        px = int(width * xr)
        py_low = int(height * y_low)
        py_high = int(height * y_high)
        py_open = int(height * y_o)
        py_close = int(height * y_c)

        col_body = (16, 185, 129, 215) if is_up else (239, 68, 68, 195)
        col_wick = (52, 211, 153, 235) if is_up else (248, 113, 113, 210)

        d_geom.line([(px, py_high), (px, py_low)], fill=col_wick, width=wick_w)
        top_y = min(py_open, py_close)
        bot_y = max(py_open, py_close)
        d_geom.rounded_rectangle([
            (px - bar_w // 2, top_y),
            (px + bar_w // 2, bot_y)
        ], radius=max(2, int(bar_w * 0.2)), fill=col_body)

    # 5. Glowing Upward Trend Spline passing through the market
    trend_pts = [
        (int(width * 0.16), int(height * 0.85)),
        (int(width * 0.28), int(height * 0.66)),
        (int(width * 0.40), int(height * 0.58)),
        (int(width * 0.52), int(height * 0.42)),
        (int(width * 0.64), int(height * 0.31)),
        (int(width * 0.76), int(height * 0.20)),
        (int(width * 0.88), int(height * 0.11)),
        (int(width * 0.96), int(height * 0.06))
    ]

    # Trend glow
    t_glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_tglow = ImageDraw.Draw(t_glow)
    for i in range(len(trend_pts) - 1):
        d_tglow.line([trend_pts[i], trend_pts[i+1]], fill=(16, 185, 129, 140), width=int(width * 0.008))
    t_glow = t_glow.filter(ImageFilter.GaussianBlur(int(width * 0.005)))
    geom_canvas = Image.alpha_composite(geom_canvas, t_glow)

    # Crisp trend line
    d_tline = ImageDraw.Draw(geom_canvas)
    for i in range(len(trend_pts) - 1):
        d_tline.line([trend_pts[i], trend_pts[i+1]], fill=(52, 211, 153, 255), width=max(3, int(width * 0.0028)))

    for pt in trend_pts:
        d_tline.ellipse([
            (pt[0] - int(width * 0.004), pt[1] - int(width * 0.004)),
            (pt[0] + int(width * 0.004), pt[1] + int(width * 0.004))
        ], fill=(255, 255, 255, 245))

    canvas.paste(geom_canvas, (0, 0), geom_canvas)

    # 6. Optional Clean Branding (for branded edition)
    if include_branding:
        icon_path = r"c:\cevdet\Mobil\PiyasaTakipApp\store-assets\icon-512x512.png"
        if os.path.exists(icon_path):
            icon = Image.open(icon_path).convert('RGBA')
            icon_dim = int(height * 0.38)
            icon = icon.resize((icon_dim, icon_dim), Image.Resampling.LANCZOS)

            ix = int(width * 0.08)
            iy = int(height * 0.31)

            # Shadow
            sh_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            icon_alpha = icon.split()[3].point(lambda a: 160 if a > 0 else 0)
            sh_layer.paste((0, 0, 0, 160), (ix, iy + int(height * 0.02)), mask=icon_alpha)
            sh_layer = sh_layer.filter(ImageFilter.GaussianBlur(int(height * 0.035)))
            canvas.paste(sh_layer, (0, 0), sh_layer)
            canvas.paste(icon, (ix, iy), icon)

            font_main = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', int(height * 0.075))
            font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', int(height * 0.038))
            d_bm = ImageDraw.Draw(canvas)

            tx = ix + icon_dim + int(width * 0.02)
            ty = iy + int(height * 0.06)

            d_bm.text((tx, ty), "PiyasaRadarı", font=font_main, fill=(255, 255, 255))
            d_bm.text((tx, ty + int(height * 0.10)), "Canlı Borsa, Döviz & Altın", font=font_sub, fill=(16, 185, 129))

    return canvas

def main():
    print("Generating Apple App Store Featuring Assets...")
    
    # Standard Apple Guideline Assets (Pure Artwork - Best for Featuring)
    header = generate_apple_art(3840, 1646, include_branding=False, placement_type="header")
    header.save(os.path.join(APPLE_DIR, "header-3840x1646.png"), format="PNG", quality=98)
    print(" -> Saved: header-3840x1646.png (21:9 Pure Artwork)")

    search = generate_apple_art(3840, 2560, include_branding=False, placement_type="search")
    search.save(os.path.join(APPLE_DIR, "search-3840x2560.png"), format="PNG", quality=98)
    print(" -> Saved: search-3840x2560.png (3:2 Pure Artwork)")

    universal = generate_apple_art(5244, 2950, include_branding=False, placement_type="universal")
    universal.save(os.path.join(APPLE_DIR, "universal-5244x2950.png"), format="PNG", quality=98)
    print(" -> Saved: universal-5244x2950.png (16:9 Universal Artwork)")

    # Branded Editions (for Promotional / Web / Press Kit)
    header_branded = generate_apple_art(3840, 1646, include_branding=True, placement_type="header")
    header_branded.save(os.path.join(APPLE_DIR, "header-branded-3840x1646.png"), format="PNG", quality=98)
    print(" -> Saved: header-branded-3840x1646.png")

    search_branded = generate_apple_art(3840, 2560, include_branding=True, placement_type="search")
    search_branded.save(os.path.join(APPLE_DIR, "search-branded-3840x2560.png"), format="PNG", quality=98)
    print(" -> Saved: search-branded-3840x2560.png")

    print("\nAll Apple App Store featuring assets rendered successfully!")

if __name__ == "__main__":
    main()

import os

readme_path = r"c:\cevdet\Mobil\PiyasaTakipApp\README.md"
with open(readme_path, "r", encoding="utf-8") as f:
    content = f.read()

banner_block = '<p align="center">\n  <img src="docs/assets/banner.png" alt="PiyasaRadarı Banner" width="100%" />\n</p>\n\n---\n\n'

if "docs/assets/banner.png" not in content:
    target = "### **BIST 100 Hisseleri"
    pos = content.find(target)
    end_of_header = content.find("\n\n---\n\n", pos)
    if end_of_header != -1:
        content = content[:end_of_header + 2] + banner_block + content[end_of_header + 7:]

old_table = """| **01. Canlı Piyasa & Ticker** | **02. Detaylı Grafik & Hisse Analizi** | **03. Portföy & Kâr/Zarar Takibi** |
| :---: | :---: | :---: |
| <img src="docs/screenshots/01-Piyasa.png" width="300" alt="Piyasa"/> | <img src="docs/screenshots/02-Grafik-Detay.png" width="300" alt="Grafik"/> | <img src="docs/screenshots/03-Portfoy.png" width="300" alt="Portföy"/> |

<br>

| **04. Döviz & Altın Çevirici** | **05. İl Bazlı Akaryakıt Fiyatları** | **06. Finans & Borsa Haberleri** |
| :---: | :---: | :---: |
| <img src="docs/screenshots/04-Cevirici.png" width="300" alt="Çevirici"/> | <img src="docs/screenshots/05-Akaryakit.png" width="300" alt="Akaryakıt"/> | <img src="docs/screenshots/06-Haberler.png" width="300" alt="Haberler"/> |"""

new_table = """| **01. Canlı Piyasalar & Ticker** | **02. Varlık Portföyü & Kâr/Zarar** | **03. 81 İl Akaryakıt Fiyatları** |
| :---: | :---: | :---: |
| <img src="docs/screenshots/01-Piyasalar.png" width="300" alt="Canlı Piyasalar"/> | <img src="docs/screenshots/02-Portfoy.png" width="300" alt="Varlık Portföyü"/> | <img src="docs/screenshots/03-Akaryakit.png" width="300" alt="81 İl Akaryakıt"/> |

<br>

| **04. Döviz & Altın Çevirici** | **05. Ekonomi Gündemi & Haberler** | **06. Ayarlar & Tercihler** |
| :---: | :---: | :---: |
| <img src="docs/screenshots/04-Cevirici.png" width="300" alt="Döviz ve Altın Çevirici"/> | <img src="docs/screenshots/05-Haberler.png" width="300" alt="Piyasa Haberleri"/> | <img src="docs/screenshots/06-Ayarlar.png" width="300" alt="Ayarlar ve Hesap"/> |"""

content = content.replace(old_table, new_table)

with open(readme_path, "w", encoding="utf-8") as f:
    f.write(content)

print("README.md successfully updated!")

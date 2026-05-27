"""
Run this once to generate the PWA icons needed by the manifest.
Requires Pillow: pip install Pillow

Usage: python generate_icons.py
Creates: public/icons/icon-192.png and public/icons/icon-512.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("public/icons", exist_ok=True)

for size in [192, 512]:
    img = Image.new("RGB", (size, size), "#0e0e0f")
    draw = ImageDraw.Draw(img)

    # Draw a simple diamond + letter mark
    cx, cy = size // 2, size // 2
    r = int(size * 0.32)

    # Diamond shape
    diamond = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    draw.polygon(diamond, fill="#e85d3a")

    # "S" letter centred — use default font scaled to size
    font_size = int(size * 0.3)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), "S", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - int(size * 0.02)), "S", fill="#0e0e0f", font=font)

    img.save(f"public/icons/icon-{size}.png")
    print(f"Created public/icons/icon-{size}.png")

print("Done.")

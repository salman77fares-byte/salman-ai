"""Generate launcher and web icons exclusively from the official public logo."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageColor

ROOT = Path(__file__).resolve().parents[1]
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def padded_logo(source, size, fraction, background=None):
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    logo = source.copy().convert("RGBA")
    edge = round(size * fraction)
    logo.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def filled_logo(source, size):
    """Scale the logo to cover the whole square edge-to-edge, center-cropping overflow."""
    logo = source.copy().convert("RGBA")
    scale = size / min(logo.width, logo.height)
    w, h = max(size, round(logo.width * scale)), max(size, round(logo.height * scale))
    logo = logo.resize((w, h), Image.Resampling.LANCZOS)
    left, top = (w - size) // 2, (h - size) // 2
    return logo.crop((left, top, left + size, top + size))


def generate_android(source, res, background):
    for density, scale in DENSITIES.items():
        folder = res / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        # Prominent logo on a black tile: large, but never touching the edges.
        legacy = padded_logo(source, round(48 * scale), 0.84, BLACK)
        for name in ("ic_launcher", "ic_launcher_round"):
            legacy.save(folder / f"{name}.png")
        # Adaptive layers are 108dp; the visible squircle is ~72dp, so ~70dp
        # of logo reads bold without being clipped by the system mask.
        padded_logo(source, round(108 * scale), 0.65, BLACK).save(
            folder / "ic_launcher_foreground.png"
        )
    values = res / "values"
    values.mkdir(parents=True, exist_ok=True)
    color = "#%02x%02x%02x" % background[:3]
    (values / "launcher_background.xml").write_text(
        f'<resources><color name="salman_launcher_background">{color}</color></resources>\n'
    )
    adaptive = res / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/salman_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
    for name in ("ic_launcher", "ic_launcher_round"):
        (adaptive / f"{name}.xml").write_text(xml)


def generate_web(source, public, background):
    for name, size, fraction, fill in (
        ("favicon.png", 64, 0.8, None),
        ("apple-touch-icon.png", 180, 0.68, background),
        ("icon-192.png", 192, 0.68, None),
        ("icon-512.png", 512, 0.68, None),
        ("icon-maskable-512.png", 512, 0.56, background),
    ):
        padded_logo(source, size, fraction, fill).save(public / name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--android-res", type=Path)
    parser.add_argument("--web", action="store_true")
    args = parser.parse_args()
    config = json.loads((ROOT / "capacitor.config.json").read_text())
    background = ImageColor.getcolor(config["android"]["backgroundColor"], "RGBA")
    with Image.open(ROOT / "public/logo.png") as source:
        if args.android_res:
            generate_android(source, args.android_res, background)
        if args.web:
            generate_web(source, ROOT / "public", background)


if __name__ == "__main__":
    main()
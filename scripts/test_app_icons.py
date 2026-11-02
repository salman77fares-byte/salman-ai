import tempfile
import unittest
from pathlib import Path

from PIL import Image
from generate_app_icons import DENSITIES, generate_android, padded_logo


class AppIconTests(unittest.TestCase):
    def test_adaptive_full_logo_fits_safe_circle_with_transparent_padding(self):
        source = Image.new("RGBA", (3564, 3944), (20, 200, 180, 255))
        icon = padded_logo(source, 432, 46 / 108)
        box = icon.getbbox()
        self.assertIsNotNone(box)
        left, top, right, bottom = box
        self.assertEqual(icon.getpixel((0, 0))[3], 0)
        self.assertAlmostEqual((right - left) / (bottom - top), 3564 / 3944, delta=0.01)
        for x, y in ((left, top), (right, top), (left, bottom), (right, bottom)):
            self.assertLessEqual((x - 216) ** 2 + (y - 216) ** 2, (33 * 4) ** 2)

    def test_android_density_dimensions_and_adaptive_resources(self):
        with tempfile.TemporaryDirectory() as directory:
            res = Path(directory)
            generate_android(Image.new("RGBA", (356, 394)), res, (11, 16, 27, 255))
            for density, scale in DENSITIES.items():
                for name, dp in (("ic_launcher", 48), ("ic_launcher_round", 48), ("ic_launcher_foreground", 108)):
                    with Image.open(res / f"mipmap-{density}" / f"{name}.png") as icon:
                        self.assertEqual(icon.size, (round(dp * scale), round(dp * scale)))
            self.assertTrue((res / "mipmap-anydpi-v26/ic_launcher.xml").is_file())
            self.assertTrue((res / "mipmap-anydpi-v26/ic_launcher_round.xml").is_file())


if __name__ == "__main__":
    unittest.main()
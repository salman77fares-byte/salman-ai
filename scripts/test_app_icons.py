import tempfile
import unittest
from pathlib import Path

from PIL import Image
from generate_app_icons import DENSITIES, filled_logo, generate_android


class AppIconTests(unittest.TestCase):
    def test_icon_fills_full_square_without_transparent_padding(self):
        source = Image.new("RGBA", (3564, 3944), (20, 200, 180, 255))
        icon = filled_logo(source, 432)
        self.assertEqual(icon.size, (432, 432))
        for xy in ((0, 0), (431, 0), (0, 431), (431, 431), (216, 216)):
            self.assertEqual(icon.getpixel(xy)[3], 255)

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
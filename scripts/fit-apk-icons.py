from PIL import Image
from pathlib import Path

icon_src = Path(
    r"C:\Users\Jan Leianelle\.cursor\projects\c-Users-Jan-Leianelle-OneDrive-Desktop-IniTify\assets\initify-app-icon.png"
)
splash_src = Path(
    r"C:\Users\Jan Leianelle\.cursor\projects\c-Users-Jan-Leianelle-OneDrive-Desktop-IniTify\assets\initify-splash-mark.png"
)
out_dir = Path(r"c:\Users\Jan Leianelle\OneDrive\Desktop\IniTify\assets\images")
navy = (30, 58, 138, 255)  # #1E3A8A


def to_1024(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    return img.resize((1024, 1024), Image.Resampling.LANCZOS)


def fit_on_navy(src: Image.Image, scale: float = 0.72) -> Image.Image:
    """Center mark on navy with safe padding for Android adaptive icons."""
    canvas = Image.new("RGBA", (1024, 1024), navy)
    # Prefer content on transparent; if image already has navy, still scale slightly in
    size = int(1024 * scale)
    resized = src.resize((size, size), Image.Resampling.LANCZOS)
    offset = ((1024 - size) // 2, (1024 - size) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas


icon = to_1024(icon_src)
# Adaptive foreground: mark with padding so launcher crop keeps the bell
adaptive = fit_on_navy(icon, scale=0.78)
adaptive.save(out_dir / "icon.png", "PNG")
adaptive.save(out_dir / "favicon.png", "PNG")
adaptive.save(out_dir / "android-icon-foreground.png", "PNG")
adaptive.save(out_dir / "initify-logo.png", "PNG")

# Monochrome: simplify to white mark on transparent for Android themed icons
mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
# Take luminance from icon and make white silhouette in safe zone
gray = icon.convert("L")
white = Image.new("RGBA", icon.size, (255, 255, 255, 255))
# Use darker pixels as mask (bell is mid-blue on navy - use alpha from difference)
# Simpler: reuse fitted adaptive and convert non-navy pixels to white
pixels = adaptive.load()
mono_px = mono.load()
for y in range(1024):
    for x in range(1024):
        r, g, b, a = pixels[x, y]
        # Keep pixels that are not navy background
        if abs(r - 30) + abs(g - 58) + abs(b - 138) > 40:
            mono_px[x, y] = (255, 255, 255, 255)
mono.save(out_dir / "android-icon-monochrome.png", "PNG")

splash = to_1024(splash_src)
# Splash image on transparent-ish: Expo places on backgroundColor navy.
# Use mark centered with padding, navy already in image OR transparent.
splash_fitted = fit_on_navy(splash, scale=0.55)
splash_fitted.save(out_dir / "splash-icon.png", "PNG")

print("Wrote fitted icons to", out_dir)
for name in [
    "icon.png",
    "initify-logo.png",
    "splash-icon.png",
    "android-icon-foreground.png",
    "android-icon-monochrome.png",
    "favicon.png",
]:
    im = Image.open(out_dir / name)
    print(f"  {name}: {im.size}")

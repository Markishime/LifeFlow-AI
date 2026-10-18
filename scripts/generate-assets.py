"""Generate the simple LifeFlow monogram assets; no downloaded artwork or fonts."""

from pathlib import Path

from PIL import Image, ImageDraw

assets = Path(__file__).resolve().parents[1] / "apps" / "mobile" / "assets"
assets.mkdir(parents=True, exist_ok=True)
for name, size, background in [("icon", 1024, "#6366F1"), ("splash", 512, "#6366F1")]:
    image = Image.new("RGB", (size, size), background)
    pen = ImageDraw.Draw(image)
    unit = size / 16
    pen.line(
        [(5 * unit, 4 * unit), (5 * unit, 11 * unit), (8 * unit, 11 * unit)],
        fill="#F8FAFC",
        width=int(unit),
    )
    pen.line(
        [(9 * unit, 11 * unit), (9 * unit, 5 * unit), (12 * unit, 5 * unit)],
        fill="#F8FAFC",
        width=int(unit),
    )
    pen.line(
        [(9 * unit, 8 * unit), (11.5 * unit, 8 * unit)], fill="#F8FAFC", width=int(unit)
    )
    pen.ellipse([10.6 * unit, 10 * unit, 12.5 * unit, 11.9 * unit], fill="#22C55E")
    image.save(assets / f"{name}.png")

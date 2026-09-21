#!/usr/bin/env python3
"""Generate Google Play Feature Graphic (1024×500)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1024, 500
ROOT = Path(__file__).resolve().parent
ICON = ROOT.parent / "images" / "caremate-icon.png"
OUT = ROOT / "play-feature-graphic-1024x500.png"

TEAL = (13, 148, 136)
TEAL_DARK = (15, 118, 110)
SOFT = (204, 251, 241)
BLUE_SOFT = (219, 234, 254)
TEXT = (15, 23, 42)
MUTED = (51, 65, 85)
BLUE = (37, 99, 235)


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        if bold
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    # Soft teal → blue horizontal gradient
    canvas = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(canvas)
    for x in range(W):
        t = x / max(W - 1, 1)
        color = tuple(int(SOFT[i] + (BLUE_SOFT[i] - SOFT[i]) * t) for i in range(3))
        draw.line([(x, 0), (x, H)], fill=(*color, 255))

    def blob(cx: int, cy: int, radius: int, color: tuple[int, int, int], alpha: int) -> None:
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(overlay).ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            fill=(*color, alpha),
        )
        canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(radius // 2)))

    blob(120, 80, 180, TEAL, 55)
    blob(900, 420, 220, BLUE, 40)
    blob(700, 60, 140, TEAL, 30)

    icon = Image.open(ICON).convert("RGBA")
    icon_size = 280
    resample = getattr(Image, "Resampling", Image).LANCZOS
    icon = icon.resize((icon_size, icon_size), resample)

    card = 300
    card_x, card_y = 72, (H - card) // 2

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (card_x + 8, card_y + 12, card_x + card + 8, card_y + card + 12),
        radius=48,
        fill=(15, 23, 42, 55),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    card_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(card_layer).rounded_rectangle(
        (card_x, card_y, card_x + card, card_y + card),
        radius=48,
        fill=(255, 255, 255, 245),
    )
    canvas.alpha_composite(card_layer)

    ix = card_x + (card - icon_size) // 2
    iy = card_y + (card - icon_size) // 2
    canvas.paste(icon, (ix, iy), icon)

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(72, bold=True)
    tag_font = load_font(34, bold=False)
    chip_font = load_font(20, bold=True)

    text_left = card_x + card + 48
    draw.text((text_left, 155), "CareMate", font=title_font, fill=TEXT)
    draw.rounded_rectangle((text_left, 240, text_left + 120, 246), radius=3, fill=TEAL)
    draw.text((text_left, 268), "Your Health Companion", font=tag_font, fill=MUTED)

    chip_y = 340
    chips = ["Emergency", "Learn", "Nearby", "Family"]
    x = text_left
    for label in chips:
        tw = int(draw.textlength(label, font=chip_font))
        pad_x, pad_y = 16, 10
        w_chip = tw + pad_x * 2
        h_chip = 20 + pad_y * 2
        chip = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(chip).rounded_rectangle(
            (x, chip_y, x + w_chip, chip_y + h_chip),
            radius=20,
            fill=(255, 255, 255, 210),
        )
        canvas.alpha_composite(chip)
        draw = ImageDraw.Draw(canvas)
        draw.text((x + pad_x, chip_y + pad_y - 1), label, font=chip_font, fill=TEAL_DARK)
        x += w_chip + 12

    out = canvas.convert("RGB")
    assert out.size == (1024, 500)
    out.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB, {out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()

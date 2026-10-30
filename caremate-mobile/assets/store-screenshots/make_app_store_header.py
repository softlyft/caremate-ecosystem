#!/usr/bin/env python3
"""Generate App Store Connect header assets (5244×2950 and 3840×1646)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
ICON = ROOT.parent / "images" / "caremate-icon.png"

# ASC header sizes (pick either when uploading).
SIZES = (
    (5244, 2950, "app-store-header-5244x2950.png"),
    (3840, 1646, "app-store-header-3840x1646.png"),
)

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


def render(w: int, h: int) -> Image.Image:
    # Scale layout from the Play 1024×500 feature graphic proportions.
    sx = w / 1024
    sy = h / 500
    s = min(sx, sy)

    canvas = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(canvas)
    for x in range(w):
        t = x / max(w - 1, 1)
        color = tuple(int(SOFT[i] + (BLUE_SOFT[i] - SOFT[i]) * t) for i in range(3))
        draw.line([(x, 0), (x, h)], fill=(*color, 255))

    def blob(cx: int, cy: int, radius: int, color: tuple[int, int, int], alpha: int) -> None:
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(overlay).ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            fill=(*color, alpha),
        )
        canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(max(radius // 2, 1))))

    blob(int(120 * sx), int(80 * sy), int(180 * s), TEAL, 55)
    blob(int(900 * sx), int(420 * sy), int(220 * s), BLUE, 40)
    blob(int(700 * sx), int(60 * sy), int(140 * s), TEAL, 30)
    # Extra atmosphere for the taller 16:9 canvas
    if h / w > 0.55:
        blob(int(0.82 * w), int(0.22 * h), int(0.28 * h), TEAL, 28)
        blob(int(0.18 * w), int(0.78 * h), int(0.32 * h), BLUE, 32)

    icon = Image.open(ICON).convert("RGBA")
    icon_size = max(int(280 * s), 1)
    resample = getattr(Image, "Resampling", Image).LANCZOS
    icon = icon.resize((icon_size, icon_size), resample)

    card = max(int(300 * s), 1)
    # Center the icon+copy block vertically; keep horizontal rhythm like Play graphic.
    block_h = card
    card_x = int(72 * sx)
    card_y = (h - block_h) // 2

    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (
            card_x + int(8 * s),
            card_y + int(12 * s),
            card_x + card + int(8 * s),
            card_y + card + int(12 * s),
        ),
        radius=max(int(48 * s), 8),
        fill=(15, 23, 42, 55),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(max(int(18 * s), 4))))

    card_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(card_layer).rounded_rectangle(
        (card_x, card_y, card_x + card, card_y + card),
        radius=max(int(48 * s), 8),
        fill=(255, 255, 255, 245),
    )
    canvas.alpha_composite(card_layer)

    ix = card_x + (card - icon_size) // 2
    iy = card_y + (card - icon_size) // 2
    canvas.paste(icon, (ix, iy), icon)

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(max(int(72 * s), 24), bold=True)
    tag_font = load_font(max(int(34 * s), 16), bold=False)
    chip_font = load_font(max(int(20 * s), 14), bold=True)

    text_left = card_x + card + int(48 * sx)
    # Vertically center copy relative to the icon card.
    title = "CareMate"
    tagline = "Your Health Companion"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    tag_bbox = draw.textbbox((0, 0), tagline, font=tag_font)
    title_h = title_bbox[3] - title_bbox[1]
    tag_h = tag_bbox[3] - tag_bbox[1]
    bar_h = max(int(6 * s), 4)
    gap_title_bar = max(int(18 * s), 8)
    gap_bar_tag = max(int(22 * s), 10)
    gap_tag_chips = max(int(36 * s), 16)
    chip_h = max(int(20 * s), 14) + max(int(10 * s), 6) * 2
    copy_h = title_h + gap_title_bar + bar_h + gap_bar_tag + tag_h + gap_tag_chips + chip_h
    text_top = card_y + (card - copy_h) // 2

    draw.text((text_left, text_top), title, font=title_font, fill=TEXT)
    bar_y = text_top + title_h + gap_title_bar
    draw.rounded_rectangle(
        (text_left, bar_y, text_left + int(120 * s), bar_y + bar_h),
        radius=max(int(3 * s), 2),
        fill=TEAL,
    )
    tag_y = bar_y + bar_h + gap_bar_tag
    draw.text((text_left, tag_y), tagline, font=tag_font, fill=MUTED)

    chip_y = tag_y + tag_h + gap_tag_chips
    chips = ["Emergency", "Learn", "Nearby", "Family"]
    x = text_left
    pad_x = max(int(16 * s), 10)
    pad_y = max(int(10 * s), 6)
    for label in chips:
        tw = int(draw.textlength(label, font=chip_font))
        w_chip = tw + pad_x * 2
        h_chip = max(int(20 * s), 14) + pad_y * 2
        chip = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(chip).rounded_rectangle(
            (x, chip_y, x + w_chip, chip_y + h_chip),
            radius=max(int(20 * s), 10),
            fill=(255, 255, 255, 210),
        )
        canvas.alpha_composite(chip)
        draw = ImageDraw.Draw(canvas)
        draw.text((x + pad_x, chip_y + pad_y - max(int(s), 1)), label, font=chip_font, fill=TEAL_DARK)
        x += w_chip + max(int(12 * s), 8)

    return canvas.convert("RGB")


def main() -> None:
    for w, h, name in SIZES:
        out_path = ROOT / name
        img = render(w, h)
        assert img.size == (w, h), img.size
        img.save(out_path, format="PNG", optimize=True)
        print(f"Wrote {out_path} ({out_path.stat().st_size // 1024} KB, {w}x{h})")


if __name__ == "__main__":
    main()

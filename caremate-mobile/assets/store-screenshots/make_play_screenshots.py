#!/usr/bin/env python3
"""Compose Play Store phone screenshots (1080×1920) from raw emulator captures."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
CAPTIONS_PATH = ROOT / "captions.json"
OUTPUT_DIR = ROOT / "play-phone"

CANVAS_W, CANVAS_H = 1080, 1920
BRAND_COLOR = (13, 148, 136)  # #0D9488
TEXT_DARK = (17, 24, 39)  # #111827
TEXT_MUTED = (75, 85, 99)  # #4B5563
BEZEL = (17, 24, 39)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(
            [
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/System/Library/Fonts/Supplemental/Helvetica.ttc",
                "/Library/Fonts/Arial Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ]
        )
    else:
        candidates.extend(
            [
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/System/Library/Fonts/Supplemental/Helvetica.ttc",
                "/Library/Fonts/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]
        )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except OSError:
            continue
    return ImageFont.load_default()


def vertical_gradient(
    size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]
) -> Image.Image:
    width, height = size
    base = Image.new("RGB", size, top)
    draw = ImageDraw.Draw(base)
    for y in range(height):
        t = y / max(height - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return base


def soft_blob(
    canvas: Image.Image,
    center: tuple[int, int],
    radius: int,
    color: tuple[int, int, int],
    alpha: int = 48,
) -> None:
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x, y = center
    draw.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        fill=(*color, alpha),
    )
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=radius // 3))
    canvas.alpha_composite(blurred)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def fit_screenshot(src: Image.Image, box_w: int, box_h: int) -> Image.Image:
    """Scale to cover the screen box; bias crop toward the top so app chrome stays visible."""
    src = src.convert("RGB")
    scale = max(box_w / src.width, box_h / src.height)
    new_w = max(1, int(round(src.width * scale)))
    new_h = max(1, int(round(src.height * scale)))
    resample = getattr(Image, "Resampling", Image).LANCZOS
    resized = src.resize((new_w, new_h), resample)
    left = max(0, (new_w - box_w) // 2)
    # Prefer top content for tall phone UIs (status/nav stay readable).
    top = 0 if new_h <= box_h else min(int((new_h - box_h) * 0.08), new_h - box_h)
    return resized.crop((left, top, left + box_w, top + box_h))


def compose_one(screen: dict, brand_line: str) -> Image.Image:
    top_rgb = hex_to_rgb(screen["gradient"][0])
    bottom_rgb = hex_to_rgb(screen["gradient"][1])
    canvas_rgb = vertical_gradient((CANVAS_W, CANVAS_H), top_rgb, bottom_rgb)
    canvas = canvas_rgb.convert("RGBA")

    soft_blob(canvas, (180, 420), 280, BRAND_COLOR, alpha=36)
    soft_blob(canvas, (920, 1600), 340, (37, 99, 235), alpha=28)

    draw = ImageDraw.Draw(canvas)
    brand_font = load_font(28, bold=True)
    headline_font = load_font(54, bold=True)
    subline_font = load_font(30, bold=False)

    margin_x = 72
    text_width = CANVAS_W - margin_x * 2

    brand_y = 72
    draw.text((margin_x, brand_y), brand_line, font=brand_font, fill=BRAND_COLOR)

    headline_lines = wrap_text(draw, screen["headline"], headline_font, text_width)
    headline_y = brand_y + 52
    line_gap = 8
    for i, line in enumerate(headline_lines[:3]):
        draw.text(
            (margin_x, headline_y + i * (54 + line_gap)),
            line,
            font=headline_font,
            fill=TEXT_DARK,
        )
    headline_block_h = len(headline_lines[:3]) * (54 + line_gap)

    sub_y = headline_y + headline_block_h + 8
    sub_lines = wrap_text(draw, screen["subline"], subline_font, text_width)
    for i, line in enumerate(sub_lines[:2]):
        draw.text(
            (margin_x, sub_y + i * (30 + 6)),
            line,
            font=subline_font,
            fill=TEXT_MUTED,
        )
    sub_block_h = max(1, len(sub_lines[:2])) * (30 + 6)
    text_bottom = sub_y + sub_block_h + 28

    # Phone geometry — fills remaining vertical space with side margins.
    side_pad = 110
    bezel = 18
    corner = 56
    screen_corner = 42
    phone_w = CANVAS_W - side_pad * 2
    phone_top = text_bottom
    phone_bottom_pad = 56
    phone_h = CANVAS_H - phone_top - phone_bottom_pad
    phone_x = side_pad
    phone_y = phone_top

    # Soft shadow under the device.
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (phone_x + 10, phone_y + 18, phone_x + phone_w + 10, phone_y + phone_h + 18),
        radius=corner,
        fill=(15, 23, 42, 70),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas.alpha_composite(shadow)

    # Bezel.
    bezel_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bezel_draw = ImageDraw.Draw(bezel_layer)
    bezel_draw.rounded_rectangle(
        (phone_x, phone_y, phone_x + phone_w, phone_y + phone_h),
        radius=corner,
        fill=(*BEZEL, 255),
    )
    canvas.alpha_composite(bezel_layer)

    screen_x = phone_x + bezel
    screen_y = phone_y + bezel
    screen_w = phone_w - bezel * 2
    screen_h = phone_h - bezel * 2

    source_path = ROOT / screen["source"]
    if not source_path.exists():
        raise FileNotFoundError(f"Missing source screenshot: {source_path}")

    shot = fit_screenshot(Image.open(source_path), screen_w, screen_h)
    mask = Image.new("L", canvas.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        (screen_x, screen_y, screen_x + screen_w, screen_y + screen_h),
        radius=screen_corner,
        fill=255,
    )
    # Paste via alpha to apply rounded corners.
    rounded = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    rounded.paste(shot.convert("RGBA"), (screen_x, screen_y))
    rounded.putalpha(mask)
    canvas.alpha_composite(rounded)

    # Thin highlight rim on bezel.
    rim = ImageDraw.Draw(canvas)
    rim.rounded_rectangle(
        (phone_x + 2, phone_y + 2, phone_x + phone_w - 2, phone_y + phone_h - 2),
        radius=corner - 2,
        outline=(255, 255, 255, 28),
        width=2,
    )

    return canvas.convert("RGB")


def main() -> int:
    data = json.loads(CAPTIONS_PATH.read_text(encoding="utf-8"))
    brand_line = data["brandLine"]
    screens = data["screens"]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for screen in screens:
        out = compose_one(screen, brand_line)
        if out.size != (CANVAS_W, CANVAS_H):
            raise RuntimeError(f"Unexpected size for {screen['id']}: {out.size}")
        dest = OUTPUT_DIR / f"{screen['id']}.png"
        out.save(dest, format="PNG", optimize=True)
        print(f"Wrote {dest.name} ({out.size[0]}x{out.size[1]}, {dest.stat().st_size // 1024} KB)")

    print(f"Done — {len(screens)} Play phone screenshots in {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

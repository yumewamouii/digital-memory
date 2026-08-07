"""QR code generation with the brand logo embedded in the center."""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw
from qrcode.constants import ERROR_CORRECT_H

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
LOGO_PATH = ASSETS_DIR / "logo.png"

ACCENT_COLOR = (184, 134, 11)  # brand warm gold, matches --color-accent-warm
LOGO_RATIO = 0.24  # fraction of QR width covered by the logo plate; safe for ERROR_CORRECT_H


@lru_cache(maxsize=1)
def _logo_image() -> Image.Image | None:
    if not LOGO_PATH.exists():
        return None
    return Image.open(LOGO_PATH).convert("RGBA")


def _build_qr(data: str, box_size: int = 10, border: int = 3) -> Image.Image:
    qr = qrcode.QRCode(
        error_correction=ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color=ACCENT_COLOR, back_color="white").convert("RGBA")


def _with_logo(qr_img: Image.Image, logo: Image.Image) -> Image.Image:
    qr_w, qr_h = qr_img.size
    target_size = int(min(qr_w, qr_h) * LOGO_RATIO)

    logo = logo.copy()
    logo.thumbnail((target_size, target_size), Image.LANCZOS)
    logo_w, logo_h = logo.size

    pad = int(target_size * 0.16)
    plate_size = max(logo_w, logo_h) + pad * 2
    plate = Image.new("RGBA", (plate_size, plate_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(plate)
    draw.rounded_rectangle(
        (0, 0, plate_size - 1, plate_size - 1),
        radius=int(plate_size * 0.22),
        fill=(255, 255, 255, 255),
        outline=ACCENT_COLOR,
        width=max(2, plate_size // 40),
    )
    plate.alpha_composite(logo, ((plate_size - logo_w) // 2, (plate_size - logo_h) // 2))

    pos = ((qr_w - plate_size) // 2, (qr_h - plate_size) // 2)
    combined = qr_img.copy()
    combined.alpha_composite(plate, pos)
    return combined


def make_qr_png(data: str) -> bytes:
    """Render a QR code for `data` as PNG bytes, with the brand logo centered when available."""
    qr_img = _build_qr(data)
    logo = _logo_image()
    result = _with_logo(qr_img, logo) if logo is not None else qr_img

    buf = io.BytesIO()
    result.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()

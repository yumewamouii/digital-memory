"""Upload helpers: magic-byte sniffing and safe writes under media/."""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"

IMAGE_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

VIDEO_TYPES: dict[str, str] = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

AUDIO_TYPES: dict[str, str] = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
}


def sniff_image_mime(data: bytes) -> str | None:
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def sniff_pdf(data: bytes) -> bool:
    return data[:5] == b"%PDF-"


def sniff_video_mime(data: bytes) -> str | None:
    if len(data) < 12:
        return None
    # ISO BMFF / MP4: ....ftyp
    if data[4:8] == b"ftyp":
        return "video/mp4"
    # WebM / Matroska EBML header
    if data[:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    return None


def sniff_audio_mime(data: bytes, filename: str | None = None) -> str | None:
    if len(data) >= 3 and data[:3] == b"ID3":
        return "audio/mpeg"
    if len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0:
        return "audio/mpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio/wav"
    if len(data) >= 4 and data[:4] == b"OggS":
        return "audio/ogg"
    if len(data) >= 4 and data[:4] == b"\x1a\x45\xdf\xa3":
        return "audio/webm"
    if len(data) >= 8 and data[4:8] == b"ftyp":
        return "audio/mp4"
    # Last resort: extension only for browser MediaRecorder blobs with odd headers
    name = (filename or "").lower()
    if name.endswith(".webm"):
        return "audio/webm"
    if name.endswith(".m4a"):
        return "audio/mp4"
    if name.endswith(".mp3"):
        return "audio/mpeg"
    if name.endswith(".wav"):
        return "audio/wav"
    if name.endswith(".ogg"):
        return "audio/ogg"
    return None


def require_image(data: bytes) -> str:
    mime = sniff_image_mime(data)
    if not mime or mime not in IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Файл не является допустимым изображением")
    return mime


def require_pdf_or_image(data: bytes) -> tuple[str, str]:
    if sniff_pdf(data):
        return "application/pdf", ".pdf"
    mime = sniff_image_mime(data)
    if mime and mime in IMAGE_TYPES:
        return mime, IMAGE_TYPES[mime]
    raise HTTPException(status_code=400, detail="Допустимы PDF и изображения")


def require_video(data: bytes) -> str:
    mime = sniff_video_mime(data)
    if not mime or mime not in VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Файл не является допустимым видео (MP4/WebM)")
    return mime


def require_audio(data: bytes, filename: str | None = None) -> str:
    mime = sniff_audio_mime(data, filename)
    if not mime or mime not in AUDIO_TYPES:
        raise HTTPException(status_code=400, detail="Допустимы MP3, WAV, OGG, WebM, M4A")
    return mime


def write_media_bytes(rel_path: str, data: bytes) -> Path:
    """Write bytes under MEDIA_DIR; rel_path must be relative (no ..)."""
    rel = rel_path.replace("\\", "/").lstrip("/")
    if not rel or ".." in rel.split("/"):
        raise HTTPException(status_code=400, detail="Некорректный путь файла")
    dest = MEDIA_DIR / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest

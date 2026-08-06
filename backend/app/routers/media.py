"""Signed media download endpoint (replaces world-readable StaticFiles)."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..services.media_signing import verify_media_signature
from ..services.uploads import MEDIA_DIR

router = APIRouter(prefix="/api/media", tags=["media"])


@router.get("/{file_path:path}")
def get_signed_media(
    file_path: str,
    exp: int | None = Query(default=None),
    sig: str | None = Query(default=None),
):
    rel = file_path.replace("\\", "/").lstrip("/")
    if not rel or ".." in rel.split("/"):
        raise HTTPException(status_code=404, detail="Файл не найден")
    if not verify_media_signature(rel, exp, sig):
        raise HTTPException(status_code=403, detail="Ссылка на файл недействительна или истекла")

    full = (MEDIA_DIR / rel).resolve()
    media_root = MEDIA_DIR.resolve()
    if not str(full).startswith(str(media_root)) or not full.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")

    # Documents: force download so browsers don't execute HTML/SVG polyglots.
    as_attachment = rel.startswith("memorial-documents/")
    return FileResponse(
        path=full,
        filename=full.name if as_attachment else None,
        content_disposition_type="attachment" if as_attachment else "inline",
    )

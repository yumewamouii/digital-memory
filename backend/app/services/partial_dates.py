"""Normalize and validate partial genealogy dates: YYYY | YYYY-MM | YYYY-MM-DD."""

from __future__ import annotations

import re
from datetime import date, datetime

PARTIAL_DATE_RE = re.compile(r"^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$")
ISO_DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def normalize_partial_date(value: str | date | None) -> str | None:
    """Return normalized partial date string, or None for empty/unrecognized values.

    Soft by design: invalid input becomes None (does not raise), so unknown /
    legacy / partial client values never block saving a person card.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.isoformat()

    raw = str(value).strip()
    if not raw:
        return None

    # Legacy ISO datetime / timestamp → date part
    iso_prefix = ISO_DATE_PREFIX_RE.match(raw)
    if iso_prefix and (len(raw) == 10 or raw[10] in "T "):
        raw = iso_prefix.group(1)

    match = PARTIAL_DATE_RE.match(raw)
    if not match:
        return None

    year = int(match.group(1))
    month_s = match.group(2)
    day_s = match.group(3)
    if year < 1 or year > 9999:
        return None
    if month_s is None:
        return f"{year:04d}"
    month = int(month_s)
    if month < 1 or month > 12:
        return None
    if day_s is None:
        return f"{year:04d}-{month:02d}"
    day = int(day_s)
    try:
        date(year, month, day)
    except ValueError:
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


def partial_date_to_full(value: str | date | None) -> date | None:
    """Expand partial date to a concrete date (missing parts → 1) for systems that need Date."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    normalized = normalize_partial_date(value)
    if not normalized:
        return None
    parts = normalized.split("-")
    year = int(parts[0])
    month = int(parts[1]) if len(parts) > 1 else 1
    day = int(parts[2]) if len(parts) > 2 else 1
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_gedcom_partial_date(value: str) -> str | None:
    """Parse GEDCOM DATE value preserving precision (no fake day/month)."""
    if not value:
        return None
    raw = value.strip().upper()
    raw = re.sub(r"^(ABT|ABOUT|CIRCA|EST|CAL|BEF|AFT|BET)\s+", "", raw)
    raw = raw.split(" AND ")[0].strip()
    months = {
        "JAN": 1,
        "FEB": 2,
        "MAR": 3,
        "APR": 4,
        "MAY": 5,
        "JUN": 6,
        "JUL": 7,
        "AUG": 8,
        "SEP": 9,
        "OCT": 10,
        "NOV": 11,
        "DEC": 12,
    }
    m = re.match(r"^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$", raw)
    if m:
        day = int(m.group(1))
        month = months.get(m.group(2))
        year = int(m.group(3))
        if not month:
            return None
        return normalize_partial_date(f"{year:04d}-{month:02d}-{day:02d}")
    m = re.match(r"^([A-Z]{3})\s+(\d{3,4})$", raw)
    if m:
        month = months.get(m.group(1))
        year = int(m.group(2))
        if not month:
            return None
        return normalize_partial_date(f"{year:04d}-{month:02d}")
    m = re.match(r"^(\d{3,4})$", raw)
    if m:
        return normalize_partial_date(m.group(1))
    try:
        return normalize_partial_date(datetime.strptime(raw, "%Y-%m-%d").date().isoformat())
    except ValueError:
        return None

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from ..models import FamilyTree, TreeFamily, TreeFamilyChild, TreePerson
from .tree_layout import auto_layout_tree, ensure_layout


@dataclass
class GedcomRecord:
    xref: str
    tag: str
    value: str = ""
    children: list["GedcomRecord"] = field(default_factory=list)


def _parse_gedcom_text(text: str) -> list[GedcomRecord]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    stack: list[tuple[int, GedcomRecord]] = []
    roots: list[GedcomRecord] = []

    for raw in lines:
        if not raw.strip():
            continue
        match = re.match(r"^(\d+)\s+(@[^@]+@\s+)?(\S+)(?:\s+(.*))?$", raw.rstrip())
        if not match:
            continue
        level = int(match.group(1))
        xref = (match.group(2) or "").strip()
        tag = match.group(3)
        value = (match.group(4) or "").strip()
        if xref and tag:
            # 0 @I1@ INDI
            record = GedcomRecord(xref=xref.strip(), tag=tag, value=value)
        elif tag.startswith("@") and value:
            # pointer form rarely
            record = GedcomRecord(xref="", tag=tag, value=value)
        else:
            record = GedcomRecord(xref="", tag=tag, value=value if not xref else f"{xref} {value}".strip())
            if xref:
                record.xref = xref

        # Standard: level 0 with xref: `0 @I1@ INDI` — our regex puts xref in group2 and tag INDI
        while stack and stack[-1][0] >= level:
            stack.pop()
        if stack:
            stack[-1][1].children.append(record)
        else:
            roots.append(record)
        stack.append((level, record))

    return roots


def _find_child(record: GedcomRecord, tag: str) -> GedcomRecord | None:
    for child in record.children:
        if child.tag == tag:
            return child
    return None


def _find_children(record: GedcomRecord, tag: str) -> list[GedcomRecord]:
    return [child for child in record.children if child.tag == tag]


def _parse_gedcom_date(value: str) -> date | None:
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
    m = re.match(r"^(?:(\d{1,2})\s+)?([A-Z]{3})\s+(\d{3,4})$", raw)
    if m:
        day = int(m.group(1) or 1)
        month = months.get(m.group(2), 1)
        year = int(m.group(3))
        try:
            return date(year, month, day)
        except ValueError:
            return date(year, 1, 1)
    m = re.match(r"^(\d{3,4})$", raw)
    if m:
        return date(int(m.group(1)), 1, 1)
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def _name_parts(name_value: str) -> tuple[str, str, str]:
    # GEDCOM: First /Last/ Middle
    match = re.match(r"^(.*?)\s*/([^/]*)/\s*(.*)$", name_value.strip())
    if match:
        first = match.group(1).strip()
        last = match.group(2).strip()
        middle = match.group(3).strip()
        return first, last, middle
    parts = name_value.strip().split()
    if not parts:
        return "", "", ""
    if len(parts) == 1:
        return parts[0], "", ""
    return parts[0], parts[-1], " ".join(parts[1:-1])


def import_gedcom_into_tree(
    db: Session,
    tree: FamilyTree,
    content: str | bytes,
) -> dict:
    text = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content
    roots = _parse_gedcom_text(text)
    individuals = [r for r in roots if r.tag == "INDI"]
    families = [r for r in roots if r.tag == "FAM"]

    xref_to_person: dict[str, TreePerson] = {}
    warnings: list[str] = []

    for indi in individuals:
        name_rec = _find_child(indi, "NAME")
        first, last, middle = _name_parts(name_rec.value if name_rec else "")
        sex = (_find_child(indi, "SEX").value if _find_child(indi, "SEX") else "").upper()
        gender = "male" if sex.startswith("M") else "female" if sex.startswith("F") else ""

        birth_date = None
        birth_place = None
        death_date = None
        death_place = None
        birt = _find_child(indi, "BIRT")
        if birt:
            date_rec = _find_child(birt, "DATE")
            plac_rec = _find_child(birt, "PLAC")
            birth_date = _parse_gedcom_date(date_rec.value if date_rec else "")
            birth_place = plac_rec.value if plac_rec else None
        deat = _find_child(indi, "DEAT")
        if deat:
            date_rec = _find_child(deat, "DATE")
            plac_rec = _find_child(deat, "PLAC")
            death_date = _parse_gedcom_date(date_rec.value if date_rec else "")
            death_place = plac_rec.value if plac_rec else None

        note_rec = _find_child(indi, "NOTE")
        person = TreePerson(
            tree_id=tree.id,
            first_name=first[:120],
            last_name=last[:120],
            middle_name=middle[:120],
            gender=gender,
            birth_date=birth_date,
            death_date=death_date,
            birth_place=(birth_place or None),
            death_place=(death_place or None),
            note=note_rec.value if note_rec else None,
            is_deceased=bool(death_date or deat),
        )
        db.add(person)
        db.flush()
        ensure_layout(db, person)
        if indi.xref:
            xref_to_person[indi.xref] = person

    for fam in families:
        husb = _find_child(fam, "HUSB")
        wife = _find_child(fam, "WIFE")
        partner_a = xref_to_person.get(husb.value) if husb else None
        partner_b = xref_to_person.get(wife.value) if wife else None
        family = TreeFamily(
            tree_id=tree.id,
            partner_a_id=partner_a.id if partner_a else None,
            partner_b_id=partner_b.id if partner_b else None,
        )
        db.add(family)
        db.flush()
        for idx, chil in enumerate(_find_children(fam, "CHIL")):
            child = xref_to_person.get(chil.value)
            if not child:
                warnings.append(f"Пропущен ребёнок {chil.value}")
                continue
            db.add(TreeFamilyChild(family_id=family.id, person_id=child.id, sort_order=idx))

    db.flush()
    auto_layout_tree(db, tree.id)
    return {
        "persons_imported": len(xref_to_person),
        "families_imported": len(families),
        "warnings": warnings,
    }


def import_gedcom_file(db: Session, tree: FamilyTree, path: Path) -> dict:
    return import_gedcom_into_tree(db, tree, path.read_bytes())

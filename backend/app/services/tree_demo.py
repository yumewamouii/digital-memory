from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session, joinedload

from ..models import FamilyTree, TreeFamily, TreeFamilyChild, TreePerson
from .tree_access import new_share_slug
from .tree_layout import auto_layout_tree, ensure_layout
from .tree_ops import touch_tree

DEMO_TITLE = "Семья Романовых"
# Internal seed marker only (not shown in UI).
DEMO_SEED_TAG = "romanov-v2"


def ensure_demo_tree(db: Session) -> FamilyTree:
    existing = (
        db.query(FamilyTree).filter(FamilyTree.is_demo_template.is_(True)).first()
    )
    if existing:
        if (existing.description or "").startswith(DEMO_SEED_TAG):
            existing.title = DEMO_TITLE
            existing.description = DEMO_SEED_TAG
            auto_layout_tree(db, existing.id)
            db.commit()
            db.refresh(existing)
            return existing
        _clear_tree_content(db, existing)
        existing.title = DEMO_TITLE
        existing.description = DEMO_SEED_TAG
        existing.visibility = "public"
        _populate_romanov_tree(db, existing)
        touch_tree(existing)
        auto_layout_tree(db, existing.id)
        db.commit()
        db.refresh(existing)
        return existing

    tree = FamilyTree(
        owner_id=None,
        title=DEMO_TITLE,
        description=DEMO_SEED_TAG,
        tree_json="{}",
        share_slug=new_share_slug(),
        visibility="public",
        is_demo_template=True,
    )
    db.add(tree)
    db.flush()
    _populate_romanov_tree(db, tree)
    touch_tree(tree)
    auto_layout_tree(db, tree.id)
    db.commit()
    db.refresh(tree)
    return tree


def _clear_tree_content(db: Session, tree: FamilyTree) -> None:
    family_ids = [
        row.id for row in db.query(TreeFamily.id).filter(TreeFamily.tree_id == tree.id).all()
    ]
    if family_ids:
        db.query(TreeFamilyChild).filter(TreeFamilyChild.family_id.in_(family_ids)).delete(
            synchronize_session=False
        )
    db.query(TreeFamily).filter(TreeFamily.tree_id == tree.id).delete(synchronize_session=False)
    db.query(TreePerson).filter(TreePerson.tree_id == tree.id).delete(synchronize_session=False)
    db.flush()


def _populate_romanov_tree(db: Session, tree: FamilyTree) -> None:
    def person(
        last: str,
        first: str,
        gender: str,
        birth: date | None,
        death: date | None,
        *,
        middle: str | None = None,
        note: str | None = None,
        birth_place: str | None = None,
        death_place: str | None = None,
    ) -> TreePerson:
        p = TreePerson(
            tree_id=tree.id,
            last_name=last,
            first_name=first,
            middle_name=middle or "",
            gender=gender,
            birth_date=birth,
            death_date=death,
            birth_place=birth_place,
            death_place=death_place,
            note=note,
            is_deceased=bool(death),
        )
        db.add(p)
        db.flush()
        ensure_layout(db, p)
        return p

    def family(a: TreePerson | None, b: TreePerson | None, children: list[TreePerson]) -> None:
        fam = TreeFamily(
            tree_id=tree.id,
            partner_a_id=a.id if a else None,
            partner_b_id=b.id if b else None,
        )
        db.add(fam)
        db.flush()
        for idx, child in enumerate(children):
            db.add(TreeFamilyChild(family_id=fam.id, person_id=child.id, sort_order=idx))

    # —— Поколение Александра II ——
    alexander_ii = person(
        "Романов",
        "Александр",
        "male",
        date(1818, 4, 29),
        date(1881, 3, 13),
        middle="Николаевич",
        note="Император Александр II",
        birth_place="Москва",
        death_place="Санкт-Петербург",
    )
    maria_alexandrovna = person(
        "Романова",
        "Мария",
        "female",
        date(1824, 8, 8),
        date(1880, 6, 3),
        middle="Александровна",
        note="Урожд. принцесса Гессенская, супруга Александра II",
        birth_place="Дармштадт",
        death_place="Санкт-Петербург",
    )

    # —— Гессенская линия (родители Александры Фёдоровны) ——
    louis_iv = person(
        "Гессенский",
        "Людвиг",
        "male",
        date(1837, 9, 12),
        date(1892, 3, 13),
        note="Великий герцог Гессенский Людвиг IV",
        birth_place="Дармштадт",
        death_place="Дармштадт",
    )
    alice = person(
        "Гессенская",
        "Алиса",
        "female",
        date(1843, 4, 25),
        date(1878, 12, 14),
        note="Принцесса Великобритании, супруга Людвига IV",
        birth_place="Лондон",
        death_place="Дармштадт",
    )

    # —— Поколение Александра III ——
    alexander_iii = person(
        "Романов",
        "Александр",
        "male",
        date(1845, 3, 10),
        date(1894, 11, 1),
        middle="Александрович",
        note="Император Александр III",
        birth_place="Санкт-Петербург",
        death_place="Ливадия",
    )
    maria_feodorovna = person(
        "Романова",
        "Мария",
        "female",
        date(1847, 11, 26),
        date(1928, 10, 13),
        middle="Фёдоровна",
        note="Урожд. принцесса Дагмар Датская",
        birth_place="Копенгаген",
        death_place="Копенгаген",
    )

    elisabeth = person(
        "Романова",
        "Елизавета",
        "female",
        date(1864, 11, 1),
        date(1918, 7, 18),
        middle="Фёдоровна",
        note="Урожд. принцесса Гессенская; сестра Александры Фёдоровны",
        birth_place="Дармштадт",
        death_place="Алапаевск",
    )
    alexandra = person(
        "Романова",
        "Александра",
        "female",
        date(1872, 6, 6),
        date(1918, 7, 17),
        middle="Фёдоровна",
        note="Урожд. принцесса Аликс Гессенская; императрица",
        birth_place="Дармштадт",
        death_place="Екатеринбург",
    )

    # —— Дети Александра III ——
    nicholas = person(
        "Романов",
        "Николай",
        "male",
        date(1868, 5, 18),
        date(1918, 7, 17),
        middle="Александрович",
        note="Император Николай II",
        birth_place="Царское Село",
        death_place="Екатеринбург",
    )
    george = person(
        "Романов",
        "Георгий",
        "male",
        date(1871, 5, 9),
        date(1899, 7, 10),
        middle="Александрович",
        note="Великий князь, брат Николая II",
        birth_place="Царское Село",
        death_place="Абастумани",
    )
    xenia = person(
        "Романова",
        "Ксения",
        "female",
        date(1875, 4, 6),
        date(1960, 4, 20),
        middle="Александровна",
        note="Великая княгиня, сестра Николая II",
        birth_place="Санкт-Петербург",
        death_place="Лондон",
    )
    michael = person(
        "Романов",
        "Михаил",
        "male",
        date(1878, 12, 4),
        date(1918, 6, 13),
        middle="Александрович",
        note="Великий князь, брат Николая II",
        birth_place="Санкт-Петербург",
        death_place="Пермь",
    )
    olga_alexandrovna = person(
        "Романова",
        "Ольга",
        "female",
        date(1882, 6, 13),
        date(1960, 11, 24),
        middle="Александровна",
        note="Великая княгиня, младшая сестра Николая II",
        birth_place="Петергоф",
        death_place="Торонто",
    )

    # —— Дети Николая II и Александры ——
    olga = person(
        "Романова",
        "Ольга",
        "female",
        date(1895, 11, 15),
        date(1918, 7, 17),
        middle="Николаевна",
        birth_place="Царское Село",
        death_place="Екатеринбург",
    )
    tatiana = person(
        "Романова",
        "Татьяна",
        "female",
        date(1897, 6, 10),
        date(1918, 7, 17),
        middle="Николаевна",
        birth_place="Петергоф",
        death_place="Екатеринбург",
    )
    maria = person(
        "Романова",
        "Мария",
        "female",
        date(1899, 6, 26),
        date(1918, 7, 17),
        middle="Николаевна",
        birth_place="Петергоф",
        death_place="Екатеринбург",
    )
    anastasia = person(
        "Романова",
        "Анастасия",
        "female",
        date(1901, 6, 18),
        date(1918, 7, 17),
        middle="Николаевна",
        birth_place="Петергоф",
        death_place="Екатеринбург",
    )
    alexei = person(
        "Романов",
        "Алексей",
        "male",
        date(1904, 8, 12),
        date(1918, 7, 17),
        middle="Николаевич",
        note="Цесаревич",
        birth_place="Петергоф",
        death_place="Екатеринбург",
    )

    family(alexander_ii, maria_alexandrovna, [alexander_iii])
    family(louis_iv, alice, [elisabeth, alexandra])
    family(
        alexander_iii,
        maria_feodorovna,
        [nicholas, george, xenia, michael, olga_alexandrovna],
    )
    family(nicholas, alexandra, [olga, tatiana, maria, anastasia, alexei])
    db.flush()


def clone_demo_tree(db: Session, *, owner_id: int | None, guest_token: str | None) -> FamilyTree:
    demo = ensure_demo_tree(db)
    demo = (
        db.query(FamilyTree)
        .options(
            joinedload(FamilyTree.persons).joinedload(TreePerson.layout),
            joinedload(FamilyTree.families).joinedload(TreeFamily.children),
        )
        .filter(FamilyTree.id == demo.id)
        .first()
    )
    clone = FamilyTree(
        owner_id=owner_id,
        title="Копия демо-древа",
        description=demo.description,
        tree_json="{}",
        share_slug=new_share_slug(),
        visibility="private",
        guest_token=guest_token,
        is_demo_template=False,
    )
    db.add(clone)
    db.flush()

    id_map: dict[int, TreePerson] = {}
    for src in demo.persons:
        p = TreePerson(
            tree_id=clone.id,
            first_name=src.first_name,
            last_name=src.last_name,
            middle_name=src.middle_name,
            gender=src.gender,
            birth_date=src.birth_date,
            death_date=src.death_date,
            birth_place=src.birth_place,
            death_place=src.death_place,
            note=src.note,
            is_deceased=src.is_deceased,
        )
        db.add(p)
        db.flush()
        ensure_layout(db, p, 0, 0)
        id_map[src.id] = p

    for fam in demo.families:
        new_fam = TreeFamily(
            tree_id=clone.id,
            partner_a_id=id_map[fam.partner_a_id].id if fam.partner_a_id else None,
            partner_b_id=id_map[fam.partner_b_id].id if fam.partner_b_id else None,
        )
        db.add(new_fam)
        db.flush()
        for child in fam.children:
            db.add(
                TreeFamilyChild(
                    family_id=new_fam.id,
                    person_id=id_map[child.person_id].id,
                    sort_order=child.sort_order,
                )
            )

    db.flush()
    touch_tree(clone)
    auto_layout_tree(db, clone.id)
    db.flush()
    return clone

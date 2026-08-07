import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import userIcon from "../assets/Icon_Avatar.svg";
import logoMark from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { Permission } from "../auth/permissions";

function DropdownLink({ to, children, className = "", onNavigate }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(to);
    onNavigate?.();
  };

  return (
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

function NavDropdown({ to, label, children, open, onToggle, onNavigate }) {
  return (
    <div className={`nav-item${open ? " open" : ""}`}>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `nav-label nav-label-link${isActive ? " active" : ""}`
        }
        onClick={(event) => {
          if (window.innerWidth <= 960) {
            event.preventDefault();
            onToggle();
          } else {
            onNavigate?.();
          }
        }}
      >
        {label}
      </NavLink>
      <div className="dropdown" role="menu">
        {children}
      </div>
    </div>
  );
}

function MenuIcon({ open }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M4 4L14 14M14 4L4 14"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M3.5 5H14.5M3.5 9H14.5M3.5 13H14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header() {
  const { token, user, openAuthModal, logout } = useAuth();
  const { hasAny } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const showPartner = hasAny(
    Permission.ORG_READ,
    Permission.ORG_CREATE,
    Permission.MEMORIAL_CREATE_ORG,
    Permission.ORG_MANAGE_ANY,
  );
  const showAdmin = hasAny(
    Permission.ADMIN_ACCESS,
    Permission.USER_MANAGE,
    Permission.AUDIT_READ,
    Permission.ORG_MANAGE_ANY,
    Permission.MEMORIAL_CLAIM_REVIEW,
    Permission.CONTENT_MODERATE,
    Permission.MEMORIAL_RESTORE,
  );

  useEffect(() => {
    setMenuOpen(false);
    setOpenDropdown("");
    setAccountOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const onPointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const closeAll = () => {
    setMenuOpen(false);
    setOpenDropdown("");
    setAccountOpen(false);
  };

  const toggleDropdown = (key) => {
    setOpenDropdown((current) => (current === key ? "" : key));
  };

  const goAccountLink = (path) => {
    closeAll();
    navigate(path);
  };

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <span>
            Семейные фотографии, документы и воспоминания — в одном месте
          </span>
        </div>
      </div>

      <div className="header-inner">
        <Link to="/" className="logo" onClick={closeAll}>
          <img src={logoMark} alt="" className="logo-mark" />
          <span className="logo-text">
            Гис<span>Мемориал</span>
          </span>
        </Link>

        <div className={`nav-pill${menuOpen ? " open" : ""}`}>
          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MenuIcon open={menuOpen} />
          </button>

          <nav className={`nav${menuOpen ? " open" : ""}`}>
            <NavDropdown
              to="/memory"
              label="Страницы памяти"
              open={openDropdown === "memory"}
              onToggle={() => toggleDropdown("memory")}
              onNavigate={closeAll}
            >
              <DropdownLink to="/memory#memory-view" onNavigate={closeAll}>
                Пример
              </DropdownLink>
              <DropdownLink to="/memory#memory-why" onNavigate={closeAll}>
                Зачем создавать
              </DropdownLink>
              <DropdownLink to="/memory#memory-services" onNavigate={closeAll}>
                Что хранится
              </DropdownLink>
              <DropdownLink to="/memory#memory-how" onNavigate={closeAll}>
                Как создать
              </DropdownLink>
              <DropdownLink to="/memory/museum" onNavigate={closeAll}>
                Музей памяти
              </DropdownLink>
            </NavDropdown>

            <NavDropdown
              to="/family-tree"
              label="Семейное древо"
              open={openDropdown === "tree"}
              onToggle={() => toggleDropdown("tree")}
              onNavigate={closeAll}
            >
              <DropdownLink to="/family-tree#tree-example" onNavigate={closeAll}>
                Пример древа
              </DropdownLink>
              <DropdownLink to="/family-tree#tree-advantages" onNavigate={closeAll}>
                Возможности
              </DropdownLink>
              <DropdownLink to="/family-tree#tree-create" onNavigate={closeAll}>
                Как создать древо
              </DropdownLink>
              <DropdownLink to="/family-tree#tree-subscription" onNavigate={closeAll}>
                Тарифы
              </DropdownLink>
              <DropdownLink
                to="/family-tree/create"
                className="dropdown-btn"
                onNavigate={closeAll}
              >
                Создать древо
              </DropdownLink>
            </NavDropdown>

            <NavDropdown
              to="/places"
              label="Памятные места"
              open={openDropdown === "places"}
              onToggle={() => toggleDropdown("places")}
              onNavigate={closeAll}
            >
              <DropdownLink to="/places#places-benefits" onNavigate={closeAll}>
                Польза
              </DropdownLink>
              <DropdownLink to="/places#places-examples" onNavigate={closeAll}>
                Примеры
              </DropdownLink>
              <DropdownLink to="/places#places-advantages" onNavigate={closeAll}>
                Преимущества
              </DropdownLink>
            </NavDropdown>

            <NavLink
              to="/pricing"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              onClick={closeAll}
            >
              Цены
            </NavLink>

            <div className={`nav-item${openDropdown === "more" ? " open" : ""}`}>
              <button
                type="button"
                className="nav-label nav-label-more"
                aria-label="Ещё разделы"
                aria-expanded={openDropdown === "more"}
                onClick={() => toggleDropdown("more")}
              >
                Ещё
              </button>
              <div className="dropdown" role="menu">
                <DropdownLink to="/about" onNavigate={closeAll}>
                  О сервисе
                </DropdownLink>
                <DropdownLink to="/contacts" onNavigate={closeAll}>
                  Контакты
                </DropdownLink>
                <DropdownLink to="/faq" onNavigate={closeAll}>
                  Вопросы и ответы
                </DropdownLink>
                <DropdownLink to="/services" onNavigate={closeAll}>
                  Услуги
                </DropdownLink>
                <DropdownLink to="/memory/museum" onNavigate={closeAll}>
                  Музей памяти
                </DropdownLink>
                <DropdownLink to="/sitemap" onNavigate={closeAll}>
                  Карта сайта
                </DropdownLink>
              </div>
            </div>
          </nav>
        </div>

        <div className="header-actions">
          {token ? (
            <div
              className={`account-menu${accountOpen ? " open" : ""}`}
              ref={accountRef}
            >
              <button
                type="button"
                className="header-icon-btn account-menu-trigger"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Аккаунт"
                title="Аккаунт"
                onClick={() => setAccountOpen((v) => !v)}
              >
                <img src={userIcon} alt="" className="account-menu-avatar" />
              </button>
              {accountOpen && (
                <div className="account-dropdown" role="menu">
                  {(user?.email || user?.phone) && (
                    <div className="account-dropdown-meta">
                      {user?.email && <strong>{user.email}</strong>}
                      {!user?.email && user?.phone && <strong>{user.phone}</strong>}
                    </div>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="account-dropdown-item"
                    onClick={() => goAccountLink("/cabinet")}
                  >
                    Личный кабинет
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-dropdown-item"
                    onClick={() => goAccountLink("/settings")}
                  >
                    Настройки
                  </button>
                  {showPartner && (
                    <button
                      type="button"
                      role="menuitem"
                      className="account-dropdown-item"
                      onClick={() => goAccountLink("/partner")}
                    >
                      Кабинет партнёра
                    </button>
                  )}
                  {showAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      className="account-dropdown-item"
                      onClick={() => goAccountLink("/admin")}
                    >
                      Админ-панель
                    </button>
                  )}
                  <div className="account-dropdown-divider" />
                  <button
                    type="button"
                    role="menuitem"
                    className="account-dropdown-item account-dropdown-danger"
                    onClick={() => {
                      closeAll();
                      logout();
                    }}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="header-icon-btn auth-icon"
              onClick={() => openAuthModal(false)}
              aria-label="Вход или регистрация"
              title="Вход или регистрация"
            >
              <img src={userIcon} alt="" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

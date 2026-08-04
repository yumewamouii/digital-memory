import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import userIcon from "../assets/Icon_Avatar.svg";
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
          Гис<span>Мемориал</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? "×" : "≡"}
        </button>

        <nav className={`nav${menuOpen ? " open" : ""}`}>
          <div className={`nav-item${openDropdown === "more" ? " open" : ""}`}>
            <button
              type="button"
              className="nav-label burger-label"
              aria-label="Ещё разделы"
              aria-expanded={openDropdown === "more"}
              onClick={() => toggleDropdown("more")}
            >
              ≡
            </button>
            <div className="dropdown" role="menu">
              <DropdownLink to="/#home-top" onNavigate={closeAll}>
                Главная
              </DropdownLink>
              <DropdownLink to="/memory/museum" onNavigate={closeAll}>
                Музей памяти
              </DropdownLink>
              <DropdownLink to="/pricing" onNavigate={closeAll}>
                Цены
              </DropdownLink>
              <DropdownLink to="/faq" onNavigate={closeAll}>
                Вопросы и ответы
              </DropdownLink>
              <DropdownLink to="/services" onNavigate={closeAll}>
                Услуги
              </DropdownLink>
              <DropdownLink to="/sitemap" onNavigate={closeAll}>
                Карта сайта
              </DropdownLink>
            </div>
          </div>

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

          <NavLink
            to="/about"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            onClick={closeAll}
          >
            О сервисе
          </NavLink>

          <NavLink
            to="/contacts"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            onClick={closeAll}
          >
            Контакты
          </NavLink>
        </nav>

        <div className="header-actions">
          {token ? (
            <div
              className={`account-menu${accountOpen ? " open" : ""}`}
              ref={accountRef}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm account-menu-trigger"
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
                  {(user?.full_name || user?.email) && (
                    <div className="account-dropdown-meta">
                      {user?.full_name && <strong>{user.full_name}</strong>}
                      {user?.email && <span>{user.email}</span>}
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
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm header-auth-text"
                onClick={() => openAuthModal(false)}
              >
                Войти
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm header-auth-text"
                onClick={() => openAuthModal(true)}
              >
                Регистрация
              </button>
              <button
                type="button"
                className="auth-icon"
                onClick={() => openAuthModal(false)}
                aria-label="Вход или регистрация"
              >
                <img src={userIcon} alt="" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

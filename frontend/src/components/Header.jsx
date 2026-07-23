import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import userIcon from "../assets/Icon_Avatar.svg";
import { useAuth } from "../context/AuthContext";

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
  const { token, openAuthModal, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState("");

  useEffect(() => {
    setMenuOpen(false);
    setOpenDropdown("");
  }, [location.pathname, location.hash]);

  const closeAll = () => {
    setMenuOpen(false);
    setOpenDropdown("");
  };

  const toggleDropdown = (key) => {
    setOpenDropdown((current) => (current === key ? "" : key));
  };

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <span>
            Платформа цифровых мемориалов и семейной истории · МемориалГис
          </span>
        </div>
      </div>

      <div className="header-inner">
        <Link to="/" className="logo" onClick={closeAll}>
          Мемориал<span>Гис</span>
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
          <div className={`nav-item${openDropdown === "home" ? " open" : ""}`}>
            <button
              type="button"
              className="nav-label burger-label"
              aria-label="Главная"
              onClick={() => toggleDropdown("home")}
            >
              ≡
            </button>
            <div className="dropdown" role="menu">
              <DropdownLink to="/#home-top" onNavigate={closeAll}>
                Главная
              </DropdownLink>
              <DropdownLink to="/pricing" onNavigate={closeAll}>
                Цены
              </DropdownLink>
              <DropdownLink to="/faq" onNavigate={closeAll}>
                Вопросы и ответы
              </DropdownLink>
              <DropdownLink to="/about" onNavigate={closeAll}>
                О сервисе
              </DropdownLink>
              <DropdownLink to="/#home-contacts" onNavigate={closeAll}>
                Контакты
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
            <DropdownLink to="/memory#memory-how" onNavigate={closeAll}>
              Как работает?
            </DropdownLink>
            <DropdownLink to="/memory#memory-view" onNavigate={closeAll}>
              Вид
            </DropdownLink>
            <DropdownLink to="/memory#memory-services" onNavigate={closeAll}>
              Услуги
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
            label="Генеалогическое древо"
            open={openDropdown === "tree"}
            onToggle={() => toggleDropdown("tree")}
            onNavigate={closeAll}
          >
            <DropdownLink to="/family-tree#tree-example" onNavigate={closeAll}>
              Пример древа
            </DropdownLink>
            <DropdownLink to="/family-tree#tree-advantages" onNavigate={closeAll}>
              Преимущества
            </DropdownLink>
            <DropdownLink to="/family-tree#tree-create" onNavigate={closeAll}>
              Как создать древо
            </DropdownLink>
            <DropdownLink to="/family-tree#tree-subscription" onNavigate={closeAll}>
              Подписка
            </DropdownLink>
            <DropdownLink to="/family-tree#tree-faq" onNavigate={closeAll}>
              Вопросы и ответы
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
        </nav>

        <div className="header-actions">
          {token ? (
            <>
              <NavLink
                to="/cabinet"
                className={({ isActive }) => `btn btn-ghost btn-sm${isActive ? " active" : ""}`}
                onClick={closeAll}
              >
                Личный кабинет
              </NavLink>
              <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <NavLink
              to="/cabinet"
              className={({ isActive }) => `btn btn-ghost btn-sm${isActive ? " active" : ""}`}
              onClick={closeAll}
            >
              Личный кабинет
            </NavLink>
          )}
          <button
            type="button"
            className="auth-icon"
            onClick={() => openAuthModal(false)}
            aria-label="Вход или регистрация"
          >
            <img src={userIcon} alt="" />
          </button>
        </div>
      </div>
    </header>
  );
}

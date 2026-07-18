import { Link, NavLink, useNavigate } from "react-router-dom";
import userIcon from "../assets/Icon_Avatar.svg";
import { useAuth } from "../context/AuthContext";

function DropdownLink({ to, children, className = "" }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(to);
  };

  return (
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

function NavDropdown({ to, label, children }) {
  return (
    <div className="nav-item">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `nav-label nav-label-link${isActive ? " active" : ""}`
        }
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

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <span>Платформа цифровых мемориалов и семейной истории</span>
        </div>
      </div>

      <div className="header-inner">
        <Link to="/" className="logo">
          МемориалГис
        </Link>

        <nav className="nav">
          <div className="nav-item">
            <Link to="/" className="nav-label burger-label" aria-label="Главная">
              ≡
            </Link>
            <div className="dropdown" role="menu">
              <DropdownLink to="/#home-top">Главная</DropdownLink>
              <DropdownLink to="/#home-pricing">Цена</DropdownLink>
              <DropdownLink to="/#home-faq">Вопросы и ответы</DropdownLink>
              <DropdownLink to="/#home-contacts">Контакты</DropdownLink>
            </div>
          </div>

          <NavDropdown to="/memory" label="Страницы памяти">
            <DropdownLink to="/memory#memory-how">Как работает?</DropdownLink>
            <DropdownLink to="/memory#memory-view">Вид</DropdownLink>
            <DropdownLink to="/memory#memory-services">Услуги</DropdownLink>
            <DropdownLink to="/memory#memory-museum">Музей памяти</DropdownLink>
          </NavDropdown>

          <NavDropdown to="/places" label="Памятные места">
            <DropdownLink to="/places#places-benefits">Польза</DropdownLink>
            <DropdownLink to="/places#places-examples">Примеры</DropdownLink>
            <DropdownLink to="/places#places-advantages">Преимущества</DropdownLink>
          </NavDropdown>

          <NavDropdown to="/family-tree" label="Генеалогическое древо">
            <DropdownLink to="/family-tree#tree-example">Пример древа</DropdownLink>
            <DropdownLink to="/family-tree#tree-advantages">Преимущества</DropdownLink>
            <DropdownLink to="/family-tree#tree-create">Как создать древо</DropdownLink>
            <DropdownLink to="/family-tree#tree-subscription">Подписка</DropdownLink>
            <DropdownLink to="/family-tree#tree-faq">Вопросы и ответы</DropdownLink>
            <DropdownLink to="/family-tree#tree-create" className="dropdown-btn">
              Создать древо
            </DropdownLink>
          </NavDropdown>

          <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            О сервисе
          </NavLink>
        </nav>

        <div className="header-actions">
          {token ? (
            <>
              <NavLink
                to="/cabinet"
                className={({ isActive }) => `btn btn-ghost btn-sm${isActive ? " active" : ""}`}
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

import { Link } from "react-router-dom";

const footerColumns = [
  {
    title: "Главная",
    titleLink: "/",
    links: [
      { label: "Цены", to: "/pricing" },
      { label: "Вопросы и ответы", to: "/faq" },
      { label: "О сервисе", to: "/about" },
      { label: "Личный кабинет", to: "/cabinet" },
      { label: "Контакты", to: "/contacts" },
    ],
  },
  {
    title: "Страницы памяти",
    titleLink: "/memory",
    links: [
      { label: "Как работает?", to: "/memory" },
      { label: "Вид", to: "/memory/example" },
      { label: "Услуги", to: "/services" },
      { label: "Музей памяти", to: "/memory/museum" },
    ],
  },
  {
    title: "Памятные места",
    titleLink: "/places",
    links: [
      { label: "Польза", to: "/places" },
      { label: "Примеры", to: "/places" },
      { label: "Преимущества", to: "/places" },
    ],
  },
  {
    title: "Генеалогическое древо",
    titleLink: "/family-tree",
    links: [
      { label: "Пример древа", to: "/family-tree" },
      { label: "Как создать древо", to: "/family-tree/create" },
      { label: "Подписка", to: "/pricing" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand-block">
          <p className="footer-brand">МемориалГис</p>
          <p className="footer-tagline">
            Сервис по сохранению памяти о людях, семейной истории и памятных местах.
          </p>
        </div>

        <div className="footer-columns">
          {footerColumns.map((column) => (
            <div key={column.title} className="footer-column">
              <Link to={column.titleLink} className="footer-column-title">
                {column.title}
              </Link>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} МемориалГис. Все права защищены.</p>
        <Link to="/sitemap">Карта сайта</Link>
      </div>
    </footer>
  );
}

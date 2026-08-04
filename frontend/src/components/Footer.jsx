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
      { label: "Настройки", to: "/settings" },
      { label: "Контакты", to: "/contacts" },
    ],
  },
  {
    title: "Страницы памяти",
    titleLink: "/memory",
    links: [
      { label: "Пример", to: "/memory#memory-view" },
      { label: "Зачем создавать", to: "/memory#memory-why" },
      { label: "Что хранится", to: "/memory#memory-services" },
      { label: "Как создать", to: "/memory#memory-how" },
      { label: "Музей памяти", to: "/memory/museum" },
    ],
  },
  {
    title: "Памятные места",
    titleLink: "/places",
    links: [
      { label: "Польза", to: "/places#places-benefits" },
      { label: "Примеры", to: "/places#places-examples" },
      { label: "Преимущества", to: "/places#places-advantages" },
    ],
  },
  {
    title: "Семейное древо",
    titleLink: "/family-tree",
    links: [
      { label: "Пример древа", to: "/family-tree#tree-example" },
      { label: "Как создать древо", to: "/family-tree/create" },
      { label: "Тарифы", to: "/pricing" },
    ],
  },
  {
    title: "Партнёрство",
    titleLink: "/about#about-partners",
    links: [
      { label: "Партнёрская программа", to: "/about#about-partners" },
      { label: "Корпоративные страницы", to: "/about#about-partners" },
    ],
  },
  {
    title: "Тех. информация",
    titleLink: "/about#about-legal",
    links: [
      { label: "Реквизиты", to: "/about#about-legal" },
      { label: "Обработка персональных данных", to: "/about#about-privacy" },
      { label: "Условия оплаты и возврата", to: "/about#about-payment" },
      { label: "Договор-оферта", to: "/about#about-offer" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand-block">
          <p className="footer-brand">ГисМемориал</p>
          <p className="footer-tagline">
            Сохраняйте фотографии, документы, биографии и места захоронения в одном
            цифровом пространстве, чтобы они не потерялись со временем.
          </p>
        </div>
        <div className="footer-support">
          <h3>Поддержка</h3>
          <p>
            Нужна помощь — напишите нам. Отвечаем по будням 10:00–18:00.
          </p>
          <Link to="/contacts" className="btn btn-light btn-sm">
            Написать нам
          </Link>
        </div>
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

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} ГисМемориал. Все права защищены.</p>
        <Link to="/sitemap">Карта сайта</Link>
      </div>
    </footer>
  );
}

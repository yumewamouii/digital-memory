import { useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:8000/api";

const siteMap = [
  { title: "Страница памяти", items: ["Как работает", "Создать", "Личный кабинет", "Вид (пример)", "Вопросы"] },
  { title: "Памятные места", items: ["Кладбища Иркутской области", "Польза", "Примеры", "Преимущества"] },
  { title: "Почетные граждане", items: ["Кто относится", "Примеры", "Вопросы"] },
  { title: "Генеалогическое древо", items: ["Пример", "Преимущества", "Как создать"] },
  { title: "Услуги", items: ["Генерация QR", "Изготовление QR", "Поиск места", "Уборка и уход", "Каталог памятников", "Гравировка", "Оградки", "Плитка", "Доп. принадлежности", "Благоустройство"] },
  { title: "Техническая информация", items: ["Реквизиты", "Соглашение обработки персональных данных", "Условия оплаты-возврата", "Договор-оферта"] },
  { title: "Техническая поддержка", items: ["Написать нам", "Заказать звонок", "Позвонить"] },
  { title: "Социальные сети", items: ["VK", "Telegram", "YouTube"] },
];

export default function App() {
  const [auth, setAuth] = useState({ email: "", password: "", full_name: "" });
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [message, setMessage] = useState("");
  const [cards, setCards] = useState([]);
  const [cardForm, setCardForm] = useState({ first_name: "", last_name: "", biography: "" });
  const [treeForm, setTreeForm] = useState({ title: "Семейное древо", tree_json: '{"nodes":[],"edges":[]}' });

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const register = async () => {
    try {
      await axios.post(`${API}/auth/register`, auth);
      setMessage("Регистрация успешна. Теперь выполните вход.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Ошибка регистрации");
    }
  };

  const login = async () => {
    try {
      const form = new URLSearchParams();
      form.append("username", auth.email);
      form.append("password", auth.password);
      const { data } = await axios.post(`${API}/auth/login`, form);
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setMessage("Вход выполнен");
    } catch {
      setMessage("Ошибка входа");
    }
  };

  const loadCards = async () => {
    const { data } = await axios.get(`${API}/memorial-cards`, { headers: authHeaders });
    setCards(data);
  };

  const createCard = async () => {
    await axios.post(`${API}/memorial-cards`, cardForm, { headers: authHeaders });
    setCardForm({ first_name: "", last_name: "", biography: "" });
    loadCards();
  };

  const createTree = async () => {
    await axios.post(`${API}/family-trees`, treeForm, { headers: authHeaders });
    setMessage("Древо создано");
  };

  return (
    <div>
      <header className="hero">
        <h1>Платформа цифровых мемориалов</h1>
        <p>Создание памятных страниц, генеалогических древ и QR-кодов для доступа.</p>
      </header>

      <section className="block">
        <h2>MVP: Регистрация и вход</h2>
        <div className="grid3">
          <input placeholder="Email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
          <input placeholder="ФИО" value={auth.full_name} onChange={(e) => setAuth({ ...auth, full_name: e.target.value })} />
          <input placeholder="Пароль" type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
        </div>
        <button onClick={register}>Регистрация</button>
        <button onClick={login}>Войти</button>
        <p>{message}</p>
      </section>

      <section className="block">
        <h2>Создание карточки памяти</h2>
        <div className="grid3">
          <input placeholder="Имя" value={cardForm.first_name} onChange={(e) => setCardForm({ ...cardForm, first_name: e.target.value })} />
          <input placeholder="Фамилия" value={cardForm.last_name} onChange={(e) => setCardForm({ ...cardForm, last_name: e.target.value })} />
          <input placeholder="Краткая биография" value={cardForm.biography} onChange={(e) => setCardForm({ ...cardForm, biography: e.target.value })} />
        </div>
        <button disabled={!token} onClick={createCard}>Создать карточку</button>
        <button disabled={!token} onClick={loadCards}>Загрузить мои карточки</button>
        <div className="cards">
          {cards.map((card) => (
            <article key={card.id} className="card">
              <h3>{card.last_name} {card.first_name}</h3>
              <p>{card.biography || "Биография пока не заполнена"}</p>
              <a href={`${API}/memorial-cards/${card.id}/qr`} target="_blank" rel="noreferrer">Открыть QR-код</a>
            </article>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>Генеалогическое древо</h2>
        <input placeholder="Название" value={treeForm.title} onChange={(e) => setTreeForm({ ...treeForm, title: e.target.value })} />
        <textarea value={treeForm.tree_json} onChange={(e) => setTreeForm({ ...treeForm, tree_json: e.target.value })} />
        <button disabled={!token} onClick={createTree}>Создать древо</button>
      </section>

      <section className="block">
        <h2>Карта сайта</h2>
        {siteMap.map((section) => (
          <div key={section.title} className="sitemap-item">
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

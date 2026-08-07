import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

const RELATIVE_BASE_PRICE = 5000;
const RELATIVE_EXTRA_PRICE = 2000;
const RELATIVE_MAX_PEOPLE = 5;

const MAIN_PLANS = [
  {
    id: "brief",
    title: "Краткая страница",
    badge: "Бесплатно",
    price: "Бесплатно",
    subtitle: "Всё необходимое, чтобы сохранить память о человеке.",
    exampleTo: "/memory/example/brief",
    features: [
      "Портрет",
      "Основные сведения",
      "Эпитафия",
      "Родственники",
      "QR-код для печати",
      "Настройки приватности",
    ],
  },
  {
    id: "extended",
    title: "Расширенная страница",
    badge: "Оптимальный выбор",
    price: "5000 ₽ разово",
    featured: true,
    subtitle: "Для тех, кто хочет сохранить полную историю жизни человека.",
    exampleTo: "/memory/example/extended",
    features: [
      "Всё из краткой страницы, плюс:",
      "Подробная биография",
      "Неограниченная фотогалерея",
      "Видео и аудиозаписи",
      "Документы и награды",
      "Генеалогическое древо и места захоронения",
    ],
  },
  {
    id: "relative",
    title: "Родственная страница",
    subtitle:
      "Несколько расширенных страниц в одном комплекте с единым QR-кодом — подходит, если родственники похоронены в одном месте.",
    features: [
      "Расширенная страница для каждого человека",
      "Единый QR-код и табличка на всех",
      `До ${RELATIVE_MAX_PEOPLE} человек в одном комплекте`,
    ],
    calculator: true,
  },
];

const TREE_FEATURES = [
  "Несколько страниц памяти",
  "Расширенное семейное древо",
  "Приоритетная поддержка",
  "Больше возможностей для семьи",
];

const TREE_PLANS = [
  {
    id: "month",
    title: "Моё древо",
    price: "190 ₽ / мес.",
    subtitle: "Оплата помесячно, можно отменить в любой момент.",
    features: TREE_FEATURES,
  },
  {
    id: "year",
    title: "Моё древо на год",
    price: "1990 ₽ / год",
    badge: "Выгоднее",
    featured: true,
    subtitle: "290 ₽ экономии по сравнению с оплатой по месяцам.",
    features: TREE_FEATURES,
  },
];

export default function PricingPage() {
  const { token, openAuthModal } = useAuth();
  const [tab, setTab] = useState("main");
  const [relativeCount, setRelativeCount] = useState(1);

  const relativeTotal =
    RELATIVE_BASE_PRICE + RELATIVE_EXTRA_PRICE * (relativeCount - 1);

  return (
    <>
      <PageHero
        title="Тарифы и цены"
        subtitle="Выберите подходящий формат — начать можно бесплатно."
      />

      <section className="section">
        <div className="section-inner">
          <div className="pricing-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "main"}
              className={`pricing-tab${tab === "main" ? " is-active" : ""}`}
              onClick={() => setTab("main")}
            >
              Основной тариф
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "tree"}
              className={`pricing-tab${tab === "tree" ? " is-active" : ""}`}
              onClick={() => setTab("tree")}
            >
              Подписка на древо
            </button>
          </div>

          {tab === "main" ? (
            <div className="plan-choice plan-choice--wide">
              <div className="plan-grid plan-grid--examples">
                {MAIN_PLANS.map((plan) => (
                  <article
                    key={plan.id}
                    className={`plan-card${plan.featured ? " plan-card--featured" : ""}`}
                  >
                    {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                    <h3>{plan.title}</h3>

                    {plan.calculator ? (
                      <>
                        <p className="pricing-price">
                          {relativeTotal.toLocaleString("ru-RU")} ₽
                        </p>
                        <p className="plan-card-price-note">
                          {RELATIVE_BASE_PRICE.toLocaleString("ru-RU")} ₽ за первого + {RELATIVE_EXTRA_PRICE.toLocaleString("ru-RU")} ₽ за каждого следующего человека
                        </p>
                        <div className="pricing-calculator-control">
                          <span>Количество человек</span>
                          <div className="pricing-stepper">
                            <button
                              type="button"
                              onClick={() => setRelativeCount((count) => Math.max(1, count - 1))}
                              disabled={relativeCount <= 1}
                              aria-label="Уменьшить количество человек"
                            >
                              −
                            </button>
                            <span>{relativeCount}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setRelativeCount((count) => Math.min(RELATIVE_MAX_PEOPLE, count + 1))
                              }
                              disabled={relativeCount >= RELATIVE_MAX_PEOPLE}
                              aria-label="Увеличить количество человек"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="pricing-price">{plan.price}</p>
                    )}

                    <p>{plan.subtitle}</p>
                    <ul className="plan-features">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    {plan.exampleTo && (
                      <Link to={plan.exampleTo} className="text-link">
                        Посмотреть пример
                      </Link>
                    )}
                    <Link
                      to={plan.calculator ? "/contacts" : "/memory/create"}
                      className={`btn ${plan.featured ? "btn-primary" : "btn-outline"}`}
                    >
                      {plan.calculator ? "Оставить заявку" : "Создать"}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="plan-choice">
              <div className="plan-grid">
                {TREE_PLANS.map((plan) => (
                  <article
                    key={plan.id}
                    className={`plan-card${plan.featured ? " plan-card--featured" : ""}`}
                  >
                    {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                    <h3>{plan.title}</h3>
                    <p className="pricing-price">{plan.price}</p>
                    <p>{plan.subtitle}</p>
                    <ul className="plan-features">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <Link to="/family-tree/create" className="btn btn-primary">
                      Начать
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "2rem" }}>
            {!token && (
              <button type="button" className="btn btn-outline" onClick={() => openAuthModal(true)}>
                Регистрация
              </button>
            )}
            <Link to="/contacts" className="btn btn-ghost">
              Задать вопрос
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

const plans = [
  {
    name: "Базовый",
    price: "Бесплатно",
    features: [
      "1 страница памяти",
      "QR-код страницы",
      "Личный кабинет",
      "Базовое генеалогическое древо",
    ],
  },
  {
    name: "Семейный",
    price: "По подписке",
    features: [
      "Несколько страниц памяти",
      "Расширенное семейное древо",
      "Приоритетная поддержка",
      "Больше возможностей для семьи",
    ],
  },
];

export default function PricingPage() {
  const { openAuthModal } = useAuth();

  return (
    <>
      <PageHero
        title="Цены"
        subtitle="Выберите подходящий формат — начать можно бесплатно."
      />

      <section className="section">
        <div className="section-inner">
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article key={plan.name} className="pricing-card">
                <h3>{plan.name}</h3>
                <p className="pricing-price">{plan.price}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/memory/create" className="btn btn-primary">
              Начать бесплатно
            </Link>
            <button type="button" className="btn btn-outline" onClick={() => openAuthModal(true)}>
              Регистрация
            </button>
            <Link to="/contacts" className="btn btn-ghost">
              Задать вопрос
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

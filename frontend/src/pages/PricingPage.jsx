import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const plans = [
  {
    name: "Базовый",
    price: "Бесплатно",
    features: ["1 страница памяти", "QR-код", "Личный кабинет"],
  },
  {
    name: "Семейный",
    price: "По подписке",
    features: ["Несколько страниц", "Семейное древо", "Приоритетная поддержка"],
  },
];

export default function PricingPage() {
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
          <Link to="/memory/create" className="btn btn-primary">
            Начать бесплатно
          </Link>
        </div>
      </section>
    </>
  );
}

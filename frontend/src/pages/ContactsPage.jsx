import PageHero from "../components/PageHero";

export default function ContactsPage() {
  return (
    <>
      <PageHero
        title="Контакты"
        subtitle="Напишите нам, закажите звонок или свяжитесь через социальные сети."
      />

      <section className="section">
        <div className="section-inner narrow">
          <div className="info-grid">
            <article className="info-card">
              <h3>Написать нам</h3>
              <p>support@digital-memory.example</p>
            </article>
            <article className="info-card">
              <h3>Заказать звонок</h3>
              <p>Оставьте email — мы свяжемся в рабочее время.</p>
            </article>
            <article className="info-card">
              <h3>Социальные сети</h3>
              <p>VK · Telegram · YouTube</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

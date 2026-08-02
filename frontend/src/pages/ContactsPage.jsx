import ContactForm from "../components/ContactForm";
import PageHero from "../components/PageHero";

export default function ContactsPage() {
  return (
    <>
      <PageHero
        title="Контакты"
        subtitle="Поможем со страницей памяти, древом или памятными местами."
      />

      <section className="section">
        <div className="section-inner">
          <div className="contact-layout">
            <div>
              <span className="section-tag">Поддержка</span>
              <h2 className="section-title">Мы на связи</h2>
              <p className="lead">
                Отвечаем по будням 10:00–18:00. Если напишете позже — ответим на следующий день.
              </p>
              <div className="info-grid" style={{ marginTop: "1.5rem" }}>
                <article className="info-card">
                  <h3>Почта</h3>
                  <p>support@gismemorial.example</p>
                </article>
                <article className="info-card">
                  <h3>Социальные сети</h3>
                  <p>VK · Telegram · YouTube</p>
                </article>
                <article className="info-card">
                  <h3>Личный кабинет</h3>
                  <p>Войдите, чтобы управлять страницами и древами.</p>
                </article>
              </div>
            </div>
            <ContactForm title="Написать нам" />
          </div>
        </div>
      </section>
    </>
  );
}

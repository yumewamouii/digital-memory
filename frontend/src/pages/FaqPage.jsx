import PageHero from "../components/PageHero";

const faqItems = [
  {
    q: "Как создать страницу памяти?",
    a: "Зарегистрируйтесь, войдите в аккаунт и перейдите в раздел «Создать страницу памяти».",
  },
  {
    q: "Можно ли поделиться страницей с родственниками?",
    a: "Да — через ссылку или QR-код, который можно разместить на памятнике или в альбоме.",
  },
  {
    q: "Где хранятся данные?",
    a: "На этапе MVP данные хранятся в вашем личном кабинете на сервере платформы.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero title="Вопросы и ответы" subtitle="Ответы на частые вопросы о сервисе." />

      <section className="section">
        <div className="section-inner narrow">
          <div className="faq-list">
            {faqItems.map((item) => (
              <article key={item.q} className="faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

import PageHero from "../components/PageHero";

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="О сервисе"
        subtitle="МемориалГис — платформа для бережного хранения памяти о близких и семейной истории."
      />

      <section className="section">
        <div className="section-inner narrow">
          <p className="lead">
            Мы создаём спокойное цифровое пространство, где можно собрать биографию, фотографии,
            место захоронения и связи между родственниками. Сервис ориентирован на семьи,
            музеи памяти и сообщества, которые хотят сохранить историю для следующих поколений.
          </p>

          <div className="info-grid">
            <article className="info-card">
              <h3>Почётные граждане</h3>
              <p>Раздел для памятных страниц людей, внесших вклад в жизнь города и региона.</p>
            </article>
            <article className="info-card">
              <h3>Юридическая информация</h3>
              <p>Реквизиты, соглашение об обработке данных, условия оплаты и договор-оферта.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

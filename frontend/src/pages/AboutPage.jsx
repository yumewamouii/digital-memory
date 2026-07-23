import { Link } from "react-router-dom";
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

          <div className="info-grid" style={{ marginTop: "1.5rem" }}>
            <article className="info-card">
              <h3>Страницы памяти</h3>
              <p>Интерактивные карточки с биографией, медиа и QR-кодом.</p>
            </article>
            <article className="info-card">
              <h3>Генеалогическое древо</h3>
              <p>Онлайн-конструктор родословной со связью со страницами памяти.</p>
            </article>
            <article className="info-card">
              <h3>Памятные места</h3>
              <p>Описание мест, карты и маршруты для семей и городов.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="about-partners">
        <div className="section-inner narrow">
          <span className="section-tag">Партнёрство</span>
          <h2 className="section-title">Партнёрская программа</h2>
          <p className="lead">
            Приглашаем музеи, фонды, муниципальные проекты и бизнес к сотрудничеству:
            корпоративные страницы памяти, городские маршруты и совместные инициативы.
          </p>
          <div className="info-grid" style={{ marginTop: "1.25rem" }}>
            <article className="info-card">
              <h3>Партнёрская программа</h3>
              <p>Совместные проекты по сохранению памяти и продвижению цифровых мемориалов.</p>
            </article>
            <article className="info-card">
              <h3>Корпоративные страницы</h3>
              <p>Страницы памяти сотрудников и ветеранов компании в едином фирменном формате.</p>
            </article>
          </div>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/contacts" className="btn btn-primary">
              Связаться с нами
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="about-legal">
        <div className="section-inner narrow">
          <span className="section-tag">Тех. информация</span>
          <h2 className="section-title">Юридическая информация</h2>

          <div className="legal-block" id="about-requisites">
            <h2>Реквизиты</h2>
            <p className="lead">
              ООО «МемориалГис» (демо-реквизиты для MVP). Актуальные данные будут опубликованы
              при запуске коммерческой версии сервиса.
            </p>
          </div>

          <div className="legal-block" id="about-privacy">
            <h2>Соглашение об обработке персональных данных</h2>
            <p className="lead">
              Обработка персональных данных осуществляется в соответствии с Федеральным законом
              «О персональных данных» от 27.07.2006 N 152-ФЗ. Пользователь даёт согласие на
              обработку данных при регистрации и отправке форм обратной связи.
            </p>
          </div>

          <div className="legal-block" id="about-payment">
            <h2>Условия оплаты и возврата</h2>
            <p className="lead">
              Базовый функционал доступен бесплатно. Условия оплаты расширенных тарифов и порядок
              возврата публикуются на странице «Цены» и в договоре-оферте.
            </p>
          </div>

          <div className="legal-block" id="about-offer">
            <h2>Договор-оферта</h2>
            <p className="lead">
              Использование сервиса означает согласие с условиями публичной оферты. Полный текст
              договора будет доступен здесь при запуске платных услуг.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

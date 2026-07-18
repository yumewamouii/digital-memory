import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

export default function MemoryExamplePage() {
  return (
    <>
      <PageHero
        title="Пример страницы памяти"
        subtitle="Так может выглядеть готовая страница — спокойная, светлая и удобная для чтения."
      />

      <section className="section">
        <div className="section-inner narrow">
          <article className="memorial-preview memorial-preview-full">
            <p className="memorial-dates">1960 — 2021 (61 год жизни)</p>
            <h2>Поликарпов Владимир Владимирович</h2>
            <p className="memorial-place">Москва</p>
            <p>
              Поликарпов Владимир Владимирович ушёл в самом расцвете лет, в 61 год. Тяжёлая
              болезнь не оставила шансов и времени на долгую жизнь. Запомните же этого
              прекрасного, светлого, работящего и неутомимого человека таким, каким знали его.
              Земля ему пухом и светлая память.
            </p>
            <p>
              На странице памяти можно разместить фотографии, видео, аудиозаписи, биографию,
              ссылки на родственников и точку на карте — всё, что помогает семье сохранить
              живую память о человеке.
            </p>
          </article>

          <div className="hero-actions">
            <Link to="/memory/create" className="btn btn-primary">
              Создать свою страницу
            </Link>
            <Link to="/memory" className="btn btn-outline">
              Вернуться к разделу
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

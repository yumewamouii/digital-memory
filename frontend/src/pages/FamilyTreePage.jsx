import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

export default function FamilyTreePage() {
  return (
    <>
      <PageHero
        title="Генеалогическое древо"
        subtitle="Отдельная страница семейной истории: связи между поколениями, примеры, пошаговое создание и ответы на вопросы."
      />

      <section className="section section-pillars" id="tree-example">
        <div className="section-inner">
          <h2>Пример древа</h2>
          <div className="feature-grid">
            <article className="feature-card">
              <h3>Семья в 3-4 поколениях</h3>
              <p>Узлы с родственниками, датами и краткими биографиями на одной схеме.</p>
            </article>
            <article className="feature-card">
              <h3>Связь со страницами памяти</h3>
              <p>Каждый узел можно связать с карточкой памяти и семейным архивом.</p>
            </article>
            <article className="feature-card">
              <h3>История рода</h3>
              <p>Древо помогает видеть общую картину семьи и ее ключевые события.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="tree-advantages">
        <div className="section-inner">
          <h2>Преимущества</h2>
          <div className="info-grid">
            <article className="info-card">
              <h3>Единая структура</h3>
              <p>Вся семейная информация хранится в одном понятном формате.</p>
            </article>
            <article className="info-card">
              <h3>Доступ для родных</h3>
              <p>Родственники могут смотреть древо из любой точки мира.</p>
            </article>
            <article className="info-card">
              <h3>Передача памяти</h3>
              <p>Удобный способ сохранить историю рода для детей и внуков.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-pillars" id="tree-create">
        <div className="section-inner narrow">
          <h2>Как создать древо</h2>
          <ol className="steps-list">
            <li>Создайте новое древо в личном кабинете.</li>
            <li>Добавьте ключевых родственников и связи между ними.</li>
            <li>Заполните карточки с датами и заметками.</li>
            <li>Прикрепите страницы памяти к нужным веткам.</li>
          </ol>
          <Link to="/family-tree/create" className="btn btn-primary">
            Создать древо
          </Link>
        </div>
      </section>

      <section className="section" id="tree-subscription">
        <div className="section-inner narrow">
          <h2>Подписка</h2>
          <p className="lead">
            Для активной семейной работы можно подключить расширенный тариф: больше древьев,
            карточек и инструментов для долгосрочного хранения данных.
          </p>
          <Link to="/pricing" className="btn btn-outline">
            Смотреть тарифы
          </Link>
        </div>
      </section>

      <section className="section section-pillars" id="tree-faq">
        <div className="section-inner narrow">
          <h2>Вопросы и ответы</h2>
          <p className="lead">
            Если вы только начинаете собирать семейную историю, посмотрите ответы на частые
            вопросы по созданию древа и заполнению данных.
          </p>
          <Link to="/faq" className="btn btn-outline">
            Перейти в FAQ
          </Link>
        </div>
      </section>
    </>
  );
}

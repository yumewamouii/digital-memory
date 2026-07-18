import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { siteMap } from "../data/siteMap";

export default function SiteMapPage() {
  return (
    <>
      <PageHero title="Карта сайта" subtitle="Все разделы платформы в одном месте." />

      <section className="section">
        <div className="section-inner">
          <div className="sitemap-grid">
            {siteMap.map((section) => (
              <div key={section.slug} className="sitemap-item">
                <h3>
                  <Link to={section.path}>{section.title}</Link>
                </h3>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

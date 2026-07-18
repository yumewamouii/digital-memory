export default function PageHero({ title, subtitle, children }) {
  return (
    <section className="page-hero">
      <div className="page-hero-inner">
        <h1>{title}</h1>
        {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

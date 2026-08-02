export default function PageHero({ title, subtitle, children, className = "" }) {
  return (
    <section className={["page-hero", className].filter(Boolean).join(" ")}>
      <div className="page-hero-inner">
        <h1>{title}</h1>
        {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

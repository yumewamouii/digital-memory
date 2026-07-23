import { Link } from "react-router-dom";

export default function StatPillarCard({
  id,
  value,
  unit,
  label,
  title,
  text,
  image,
  imageAlt = "",
  primary,
  secondary,
}) {
  return (
    <article className="stat-pillar" id={id}>
      {image ? (
        <div className="stat-pillar-media">
          <img src={image} alt={imageAlt} loading="lazy" />
        </div>
      ) : null}
      <div className="stat-pillar-value">{value}</div>
      <div className="stat-pillar-unit">{unit}</div>
      <span className="stat-pillar-label">{label}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="stat-pillar-actions">
        {primary?.to ? (
          <Link to={primary.to} className="btn btn-primary">
            {primary.label}
          </Link>
        ) : primary?.onClick ? (
          <button type="button" className="btn btn-primary" onClick={primary.onClick}>
            {primary.label}
          </button>
        ) : null}
        {secondary?.to ? (
          <Link to={secondary.to} className="btn btn-outline">
            {secondary.label}
          </Link>
        ) : secondary?.onClick ? (
          <button type="button" className="btn btn-outline" onClick={secondary.onClick}>
            {secondary.label}
          </button>
        ) : null}
      </div>
    </article>
  );
}

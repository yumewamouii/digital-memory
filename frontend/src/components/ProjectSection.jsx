import { Link } from "react-router-dom";

export default function ProjectSection({
  id,
  tag,
  title,
  text,
  actions = [],
  asideTitle,
  asideText,
  asideActions = [],
  reverse = false,
  alt = false,
}) {
  return (
    <section className={`section${alt ? " section-alt" : ""}`} id={id}>
      <div className="section-inner">
        <div className={`project-section${reverse ? " reverse" : ""}`}>
          <div className="project-copy">
            {tag && <span className="section-tag">{tag}</span>}
            <h2 className="section-title">{title}</h2>
            <p className="lead">{text}</p>
            {actions.length > 0 && (
              <div className="project-actions">
                {actions.map((action) =>
                  action.to ? (
                    <Link
                      key={action.label}
                      to={action.to}
                      className={`btn ${action.variant || "btn-primary"}`}
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      className={`btn ${action.variant || "btn-primary"}`}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
          {(asideTitle || asideText || asideActions.length > 0) && (
            <aside className="project-aside">
              {asideTitle && <h3>{asideTitle}</h3>}
              {asideText && <p>{asideText}</p>}
              {asideActions.length > 0 && (
                <div className="project-actions">
                  {asideActions.map((action) =>
                    action.to ? (
                      <Link
                        key={action.label}
                        to={action.to}
                        className={`btn btn-sm ${action.variant || "btn-outline"}`}
                      >
                        {action.label}
                      </Link>
                    ) : (
                      <button
                        key={action.label}
                        type="button"
                        className={`btn btn-sm ${action.variant || "btn-outline"}`}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

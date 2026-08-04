import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../auth/usePermissions";
import RequireAuth from "./RequireAuth";

function Forbidden() {
  return (
    <div className="page-shell" style={{ padding: "3rem 1.5rem", maxWidth: 640 }}>
      <h1>Доступ ограничен</h1>
      <p>У вашей учётной записи недостаточно прав для этого раздела.</p>
      <p>
        <Link to="/cabinet">Вернуться в кабинет</Link>
      </p>
    </div>
  );
}

/**
 * @param {{ anyOf?: string[], children: import("react").ReactNode }} props
 */
export default function RequirePermission({ anyOf = [], children }) {
  return (
    <RequireAuth>
      <PermissionGate anyOf={anyOf}>{children}</PermissionGate>
    </RequireAuth>
  );
}

function PermissionGate({ anyOf, children }) {
  const { user } = useAuth();
  const { hasAny } = usePermissions();

  if (!user) {
    return (
      <div className="page-shell" style={{ padding: "3rem 1.5rem" }}>
        <p>Загрузка профиля…</p>
      </div>
    );
  }
  if (!anyOf.length) return children;
  if (!hasAny(...anyOf)) return <Forbidden />;
  return children;
}

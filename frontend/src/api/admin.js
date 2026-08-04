import axios from "axios";
import { API } from "../api";

export async function listAdminUsers(headers, q) {
  const { data } = await axios.get(`${API}/admin/users`, {
    headers,
    params: q ? { q } : undefined,
  });
  return data;
}

export async function updateAdminUser(userId, payload, headers) {
  const { data } = await axios.patch(`${API}/admin/users/${userId}`, payload, { headers });
  return data;
}

export async function listAdminRoles(headers) {
  const { data } = await axios.get(`${API}/admin/roles`, { headers });
  return data;
}

export async function listAdminOrganizations(headers, includeDeleted = false) {
  const { data } = await axios.get(`${API}/admin/organizations`, {
    headers,
    params: { include_deleted: includeDeleted },
  });
  return data;
}

export async function listAuditLogs(headers, params = {}) {
  const { data } = await axios.get(`${API}/admin/audit-logs`, {
    headers,
    params: {
      ...(params.limit != null ? { limit: params.limit } : {}),
      ...(params.entity_type ? { entity_type: params.entity_type } : {}),
      ...(params.action ? { action: params.action } : {}),
    },
  });
  return data;
}

import axios from "axios";
import { API } from "../api";

export async function getAdminStats(headers) {
  const { data } = await axios.get(`${API}/admin/stats`, { headers });
  return data;
}

export async function listAdminUsers(headers, { q, page = 1, page_size = 50 } = {}) {
  const { data } = await axios.get(`${API}/admin/users`, {
    headers,
    params: {
      page,
      page_size,
      ...(q ? { q } : {}),
    },
  });
  return data;
}

export async function updateAdminUser(userId, payload, headers) {
  const { data } = await axios.patch(`${API}/admin/users/${userId}`, payload, { headers });
  return data;
}

export async function listAdminOrganizations(headers, includeDeleted = false) {
  const { data } = await axios.get(`${API}/admin/organizations`, {
    headers,
    params: { include_deleted: includeDeleted },
  });
  return data;
}

export async function listAuditLogs(
  headers,
  { page = 1, page_size = 50, entity_type, action, user_id } = {},
) {
  const { data } = await axios.get(`${API}/admin/audit-logs`, {
    headers,
    params: {
      page,
      page_size,
      ...(entity_type ? { entity_type } : {}),
      ...(action ? { action } : {}),
      ...(user_id != null ? { user_id } : {}),
    },
  });
  return data;
}

export async function listAdminClaims(
  headers,
  { status = "pending", page = 1, page_size = 50 } = {},
) {
  const { data } = await axios.get(`${API}/admin/claims`, {
    headers,
    params: {
      page,
      page_size,
      ...(status ? { status } : {}),
    },
  });
  return data;
}

export async function reviewAdminClaim(claimId, approve, headers) {
  const { data } = await axios.post(
    `${API}/admin/claims/${claimId}/review`,
    { approve },
    { headers },
  );
  return data;
}

export async function listAdminReviewQueue(headers, { page = 1, page_size = 50 } = {}) {
  const { data } = await axios.get(`${API}/admin/review-queue`, {
    headers,
    params: { page, page_size },
  });
  return data;
}

export async function resolveAdminReview(cardId, approve, headers) {
  const { data } = await axios.post(
    `${API}/admin/review-queue/${cardId}/resolve`,
    { approve },
    { headers },
  );
  return data;
}

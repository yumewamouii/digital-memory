import axios from "axios";
import { API } from "../api";

export async function listOrganizations(headers) {
  const { data } = await axios.get(`${API}/organizations`, { headers });
  return data;
}

export async function createOrganization(payload, headers) {
  const { data } = await axios.post(`${API}/organizations`, payload, { headers });
  return data;
}

export async function getOrganization(id, headers) {
  const { data } = await axios.get(`${API}/organizations/${id}`, { headers });
  return data;
}

export async function updateOrganization(id, payload, headers) {
  const { data } = await axios.patch(`${API}/organizations/${id}`, payload, { headers });
  return data;
}

export async function updateSubscription(id, payload, headers) {
  const { data } = await axios.patch(`${API}/organizations/${id}/subscription`, payload, {
    headers,
  });
  return data;
}

export async function deleteOrganization(id, headers) {
  const { data } = await axios.delete(`${API}/organizations/${id}`, { headers });
  return data;
}

export async function listMembers(orgId, headers) {
  const { data } = await axios.get(`${API}/organizations/${orgId}/members`, { headers });
  return data;
}

export async function inviteMember(orgId, email, headers) {
  const { data } = await axios.post(
    `${API}/organizations/${orgId}/members`,
    { email, member_role: "employee" },
    { headers },
  );
  return data;
}

export async function getOrgStats(orgId, headers) {
  const { data } = await axios.get(`${API}/organizations/${orgId}/stats`, { headers });
  return data;
}

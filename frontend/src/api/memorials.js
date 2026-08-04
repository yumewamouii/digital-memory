import axios from "axios";
import { API } from "../api";

export async function listMemorials(headers, { includeDeleted = false } = {}) {
  const { data } = await axios.get(`${API}/memorial-cards`, {
    headers,
    params: includeDeleted ? { include_deleted: true } : undefined,
  });
  return data;
}

export async function searchMemorials(query, headers = {}) {
  const { data } = await axios.get(`${API}/memorial-cards/search`, {
    headers,
    params: query ? { q: query } : undefined,
  });
  return data;
}

export async function getMemorial(id, headers = {}) {
  const { data } = await axios.get(`${API}/memorial-cards/${id}`, { headers });
  return data;
}

export async function createMemorial(payload, headers) {
  const { data } = await axios.post(`${API}/memorial-cards`, payload, { headers });
  return data;
}

export async function updateMemorial(id, payload, headers) {
  const { data } = await axios.patch(`${API}/memorial-cards/${id}`, payload, { headers });
  return data;
}

export async function deleteMemorial(id, headers) {
  const { data } = await axios.delete(`${API}/memorial-cards/${id}`, { headers });
  return data;
}

export async function restoreMemorial(id, headers) {
  const { data } = await axios.post(`${API}/memorial-cards/${id}/restore`, {}, { headers });
  return data;
}

export async function transferMemorial(id, newOwnerId, headers) {
  const { data } = await axios.post(
    `${API}/memorial-cards/${id}/transfer`,
    { new_owner_id: newOwnerId },
    { headers },
  );
  return data;
}

export async function assignMemorialOwner(id, ownerId, headers) {
  const { data } = await axios.post(
    `${API}/memorial-cards/${id}/assign-owner`,
    { owner_id: ownerId },
    { headers },
  );
  return data;
}

export async function createOwnershipClaim(id, message, headers) {
  const { data } = await axios.post(
    `${API}/memorial-cards/${id}/claims`,
    { message },
    { headers },
  );
  return data;
}

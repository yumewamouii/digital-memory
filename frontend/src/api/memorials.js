import axios from "axios";
import { API } from "../api";

export async function listMemorials(headers, { includeDeleted = false } = {}) {
  const { data } = await axios.get(`${API}/memorial-cards`, {
    headers,
    params: includeDeleted ? { include_deleted: true } : undefined,
  });
  return data;
}

export async function searchMemorials(query, { page = 1, pageSize = 12 } = {}, headers = {}) {
  const { data } = await axios.get(`${API}/memorial-cards/search`, {
    headers,
    params: {
      ...(query ? { q: query } : {}),
      page,
      page_size: pageSize,
    },
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

export async function uploadMemorialPhoto(id, file, headers) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axios.post(`${API}/memorial-cards/${id}/photo`, form, {
    headers: { ...headers },
  });
  return data;
}

export async function uploadMemorialGalleryImage(id, file, headers, { caption } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);
  const { data } = await axios.post(`${API}/memorial-cards/${id}/gallery`, form, {
    headers: { ...headers },
  });
  return data;
}

export async function deleteMemorialGalleryImage(id, imageId, headers) {
  const { data } = await axios.delete(`${API}/memorial-cards/${id}/gallery/${imageId}`, {
    headers,
  });
  return data;
}

export async function addMemorialVideoLink(id, { url, title }, headers) {
  const { data } = await axios.post(
    `${API}/memorial-cards/${id}/videos`,
    { url, title: title || null },
    { headers },
  );
  return data;
}

export async function uploadMemorialVideo(id, file, headers, { title } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const { data } = await axios.post(`${API}/memorial-cards/${id}/videos/upload`, form, {
    headers: { ...headers },
  });
  return data;
}

export async function deleteMemorialVideo(id, videoId, headers) {
  const { data } = await axios.delete(`${API}/memorial-cards/${id}/videos/${videoId}`, {
    headers,
  });
  return data;
}

export async function uploadMemorialAudio(id, file, headers, { title } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const { data } = await axios.post(`${API}/memorial-cards/${id}/audio`, form, {
    headers: { ...headers },
  });
  return data;
}

export async function deleteMemorialAudio(id, audioId, headers) {
  const { data } = await axios.delete(`${API}/memorial-cards/${id}/audio/${audioId}`, {
    headers,
  });
  return data;
}

export async function uploadMemorialDocument(id, file, headers, { title, category } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  if (category) form.append("category", category);
  const { data } = await axios.post(`${API}/memorial-cards/${id}/documents`, form, {
    headers: { ...headers },
  });
  return data;
}

export async function deleteMemorialDocument(id, documentId, headers) {
  const { data } = await axios.delete(`${API}/memorial-cards/${id}/documents/${documentId}`, {
    headers,
  });
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

export async function reportMemorial(id, { reason, message }, headers) {
  const { data } = await axios.post(
    `${API}/memorial-cards/${id}/reports`,
    { reason, message: message || null },
    { headers },
  );
  return data;
}

export async function getMemorialQrBlob(id, headers = {}) {
  const { data } = await axios.get(`${API}/memorial-cards/${id}/qr`, {
    headers,
    responseType: "blob",
  });
  return data;
}

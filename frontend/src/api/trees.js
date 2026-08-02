import axios from "axios";
import { API } from "../api";

const GUEST_KEY = "dm_tree_guest_token";

export function getGuestToken() {
  return localStorage.getItem(GUEST_KEY) || "";
}

export function setGuestToken(token) {
  if (token) localStorage.setItem(GUEST_KEY, token);
}

export function clearGuestToken() {
  localStorage.removeItem(GUEST_KEY);
}

function treeHeaders(authHeaders = {}) {
  const headers = { ...authHeaders };
  const guest = getGuestToken();
  if (guest) headers["X-Guest-Token"] = guest;
  return headers;
}

function rememberGuest(data) {
  if (data?.guest_token) setGuestToken(data.guest_token);
  return data;
}

export async function listTrees(authHeaders) {
  const { data } = await axios.get(`${API}/family-trees`, { headers: treeHeaders(authHeaders) });
  return data;
}

export async function createTree(payload, authHeaders = {}) {
  const { data } = await axios.post(`${API}/family-trees`, payload, {
    headers: treeHeaders(authHeaders),
  });
  return rememberGuest(data);
}

export async function createGuestTree(payload) {
  const { data } = await axios.post(`${API}/family-trees/guest`, payload);
  return rememberGuest(data);
}

export async function claimGuestTrees(authHeaders) {
  const guest = getGuestToken();
  if (!guest) return { claimed: 0 };
  const { data } = await axios.post(
    `${API}/family-trees/claim`,
    {},
    { headers: treeHeaders(authHeaders) },
  );
  clearGuestToken();
  return data;
}

export async function getTree(treeId, authHeaders = {}) {
  const { data } = await axios.get(`${API}/family-trees/${treeId}`, {
    headers: treeHeaders(authHeaders),
  });
  return rememberGuest(data);
}

export async function getTreeBySlug(slug, authHeaders = {}) {
  const { data } = await axios.get(`${API}/family-trees/s/${slug}`, {
    headers: treeHeaders(authHeaders),
  });
  return data;
}

export async function updateTree(treeId, payload, authHeaders = {}) {
  const { data } = await axios.put(`${API}/family-trees/${treeId}`, payload, {
    headers: treeHeaders(authHeaders),
  });
  return data;
}

export async function deleteTree(treeId, authHeaders = {}) {
  await axios.delete(`${API}/family-trees/${treeId}`, {
    headers: treeHeaders(authHeaders),
  });
}

export async function createPerson(treeId, payload, authHeaders = {}) {
  const { data } = await axios.post(`${API}/family-trees/${treeId}/persons`, payload, {
    headers: treeHeaders(authHeaders),
  });
  return data;
}

export async function updatePerson(treeId, personId, payload, authHeaders = {}) {
  const { data } = await axios.put(
    `${API}/family-trees/${treeId}/persons/${personId}`,
    payload,
    { headers: treeHeaders(authHeaders) },
  );
  return data;
}

export async function deletePerson(treeId, personId, authHeaders = {}) {
  const { data } = await axios.delete(`${API}/family-trees/${treeId}/persons/${personId}`, {
    headers: treeHeaders(authHeaders),
  });
  return data;
}

export async function addRelative(treeId, personId, payload, authHeaders = {}) {
  const { data } = await axios.post(
    `${API}/family-trees/${treeId}/persons/${personId}/relatives`,
    payload,
    { headers: treeHeaders(authHeaders) },
  );
  return data;
}

export async function autoLayout(treeId, authHeaders = {}) {
  const { data } = await axios.post(
    `${API}/family-trees/${treeId}/layout/auto`,
    {},
    { headers: treeHeaders(authHeaders) },
  );
  return data;
}

export async function saveLayout(treeId, items, authHeaders = {}) {
  const { data } = await axios.post(
    `${API}/family-trees/${treeId}/layout`,
    { items },
    { headers: treeHeaders(authHeaders) },
  );
  return data;
}

export async function uploadPersonPhoto(treeId, personId, file, authHeaders = {}) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axios.post(
    `${API}/family-trees/${treeId}/persons/${personId}/photo`,
    form,
    { headers: treeHeaders(authHeaders) },
  );
  return data;
}

export async function importGedcom(file, authHeaders = {}) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axios.post(`${API}/family-trees/import/gedcom`, form, {
    headers: treeHeaders(authHeaders),
  });
  return rememberGuest(data);
}

export async function getDemoTree() {
  const { data } = await axios.get(`${API}/family-trees/demo`);
  return data;
}

export async function cloneDemoTree(authHeaders = {}) {
  const { data } = await axios.post(
    `${API}/family-trees/demo/clone`,
    {},
    { headers: treeHeaders(authHeaders) },
  );
  return rememberGuest(data);
}

export async function inviteCollaborator(treeId, payload, authHeaders) {
  const { data } = await axios.post(`${API}/family-trees/${treeId}/collaborators`, payload, {
    headers: treeHeaders(authHeaders),
  });
  return data;
}

export async function listCollaborators(treeId, authHeaders) {
  const { data } = await axios.get(`${API}/family-trees/${treeId}/collaborators`, {
    headers: treeHeaders(authHeaders),
  });
  return data;
}

export async function acceptInvite(token, authHeaders) {
  const { data } = await axios.post(
    `${API}/family-trees/invites/${token}/accept`,
    {},
    { headers: treeHeaders(authHeaders) },
  );
  return data;
}

export function mediaUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const origin = API.replace(/\/api\/?$/, "");
  if (pathOrUrl.startsWith("/media")) return `${origin}${pathOrUrl}`;
  return `${origin}/media/${pathOrUrl.replace(/^\/+/, "")}`;
}

/** Allow only http(s) absolute URLs — blocks javascript:/data: XSS via href/src. */
export function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Allowed hosts for memorial video embeds (defense in depth vs API). */
const EMBED_HOST_SUFFIXES = [
  "rutube.ru",
  "vk.com",
  "vkvideo.ru",
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
];

export function safeEmbedUrl(value) {
  const href = safeHttpUrl(value);
  if (!href) return null;
  try {
    const host = new URL(href).hostname.toLowerCase();
    const ok = EMBED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
    return ok ? href : null;
  } catch {
    return null;
  }
}

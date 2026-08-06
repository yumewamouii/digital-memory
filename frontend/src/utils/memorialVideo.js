import { mediaUrl } from "../api/trees";
import { safeEmbedUrl, safeHttpUrl } from "./safeUrl";

export function memorialVideoPlayerSrc(video) {
  if (!video) return null;
  if (video.source === "file") {
    const src = mediaUrl(video.url);
    return src ? { kind: "file", src } : null;
  }
  const embed = safeEmbedUrl(video.embed_url);
  if (embed) {
    return { kind: "embed", src: embed };
  }
  return null;
}

export function memorialVideoWatchHref(video) {
  if (!video || video.source === "file") return null;
  return safeHttpUrl(video.url);
}

export function memorialVideoWatchLabel(video) {
  if (!video) return "Открыть видео";
  if (video.source === "youtube") return "Смотреть на YouTube";
  if (video.source === "rutube") return "Смотреть на Rutube";
  if (video.source === "vk") return "Смотреть во ВКонтакте";
  return "Открыть видео";
}

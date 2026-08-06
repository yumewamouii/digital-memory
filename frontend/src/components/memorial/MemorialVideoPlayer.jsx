import {
  memorialVideoPlayerSrc,
  memorialVideoWatchHref,
  memorialVideoWatchLabel,
} from "../../utils/memorialVideo";

export default function MemorialVideoPlayer({ video }) {
  const player = memorialVideoPlayerSrc(video);
  const watchHref = memorialVideoWatchHref(video);
  const title = video.title || "Видеозапись";

  return (
    <article className="memorial-video-card">
      {player?.kind === "embed" ? (
        <div className="memorial-video-player memorial-video-frame">
          <iframe
            src={player.src}
            title={title}
            allow="clipboard-write; autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>
      ) : player?.kind === "file" ? (
        <div className="memorial-video-player memorial-video-frame">
          <video src={player.src} controls playsInline preload="metadata">
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        </div>
      ) : (
        <div className="memorial-video-ph" aria-hidden="true">
          ▶
        </div>
      )}
      <h3>{title}</h3>
      {watchHref ? (
        <a className="text-link" href={watchHref} target="_blank" rel="noopener noreferrer">
          {memorialVideoWatchLabel(video)}
        </a>
      ) : null}
    </article>
  );
}

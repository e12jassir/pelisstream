import { useEffect, useRef } from "react";
import { loadYouTube, YT_STATE, type YTPlayer } from "../lib/youtube";

/**
 * Muted, chrome-less trailer layer used by the hero billboard, previews and details.
 * It reports `onPlaying` only once frames are actually rendering so callers can
 * crossfade from the still image without a black flash.
 */
export function YouTubeBackdrop({
  videoId,
  muted,
  onPlaying,
  onEnded,
  onError,
  start = 0,
}: {
  videoId: string;
  muted: boolean;
  onPlaying?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  start?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const callbacks = useRef({ onPlaying, onEnded, onError });
  callbacks.current = { onPlaying, onEnded, onError };
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    let alive = true;
    const mount = document.createElement("div");
    host.current?.appendChild(mount);
    loadYouTube()
      .then((YT) => {
        if (!alive) return;
        player.current = new YT.Player(mount, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: Math.floor(start),
          },
          events: {
            onReady: (e) => {
              if (!mutedRef.current) e.target.unMute();
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === YT_STATE.PLAYING) callbacks.current.onPlaying?.();
              if (e.data === YT_STATE.ENDED) callbacks.current.onEnded?.();
            },
            onError: () => callbacks.current.onError?.(),
          },
        });
      })
      .catch(() => callbacks.current.onError?.());
    return () => {
      alive = false;
      try {
        player.current?.destroy();
      } catch {
        /* iframe already gone */
      }
      player.current = null;
      mount.remove();
    };
  }, [videoId, start]);

  useEffect(() => {
    const p = player.current;
    if (!p?.mute) return;
    try {
      if (muted) p.mute();
      else {
        p.unMute();
        p.setVolume(70);
      }
    } catch {
      /* player not ready */
    }
  }, [muted]);

  return (
    <div className="yt-frame">
      <div ref={host} className="yt-cover" />
    </div>
  );
}

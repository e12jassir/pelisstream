import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  Captions,
  Check,
  Clapperboard,
  ExternalLink,
  Film,
  Gauge,
  Languages,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Server,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultProviderManager } from "../core/providers/provider.manager";
import { cx, formatClock } from "../lib/format";
import { useBodyLock, useMeta } from "../lib/hooks";
import { actions, getProfileData, useProfileData } from "../lib/store";
import { ui, useUi } from "../lib/ui";
import { loadYouTube, YT_STATE, type YTPlayer } from "../lib/youtube";
import {
  episodeKey,
  type Episode,
  type EpisodePointer,
  type MediaItem,
  type PlayerMode,
  type ProfileSettings,
} from "../lib/types";
import { SmartImage } from "./SmartImage";

export function Player() {
  const player = useUi((s) => s.player);
  useBodyLock(Boolean(player));
  return (
    <AnimatePresence>
      {player && (
        <PlayerView
          key={player.item.id}
          item={player.item}
          initialEpisode={player.episode}
          initialMode={player.mode}
        />
      )}
    </AnimatePresence>
  );
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SUBS: Array<{ id: ProfileSettings["subtitles"]; label: string }> = [
  { id: "off", label: "Desactivados" },
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
];

type Panel = "episodes" | "servers" | "subs" | "speed" | null;

function PlayerView({
  item,
  initialEpisode,
  initialMode,
}: {
  item: MediaItem;
  initialEpisode?: EpisodePointer;
  initialMode: PlayerMode;
}) {
  const settings = useProfileData().settings;
  const watchedEpisodes = useProfileData().watchedEpisodes;
  const { details } = useMeta(item.type === "series" ? item : null);
  const episodes = useMemo(() => (details?.episodes ?? []).filter((e) => e.season > 0), [details]);

  const [mode, setMode] = useState<PlayerMode>(initialMode);
  const [episode, setEpisode] = useState<EpisodePointer | undefined>(() => {
    if (initialEpisode) return initialEpisode;
    if (item.type === "series") {
      const prev = getProfileData().progress[item.id];
      if (prev?.season && prev.episode) return { season: prev.season, episode: prev.episode };
      return { season: 1, episode: 1 };
    }
    return undefined;
  });

  const currentEp = episodes.find(
    (e) => e.season === episode?.season && e.episode === episode?.episode,
  );
  const nextEp = useMemo(() => {
    if (!episode) return undefined;
    const i = episodes.findIndex(
      (e) => e.season === episode.season && e.episode === episode.episode,
    );
    return i >= 0 ? episodes[i + 1] : undefined;
  }, [episodes, episode]);

  const root = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [chrome, setChrome] = useState(true);
  const idle = useRef<number | undefined>(undefined);

  const providers = useMemo(() => defaultProviderManager.getAll(), []);
  const [providerId, setProviderId] = useState<string>(() => {
    const preferred = settings.preferredProvider;
    const resolved = defaultProviderManager.resolvePlayback(preferred, {
      imdbId: item.id,
      type: item.type,
      season: episode?.season,
      episode: episode?.episode,
    });
    return resolved.providerId;
  });

  const showChrome = useCallback(() => {
    setChrome(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setChrome(false), 3400);
  }, []);

  useEffect(() => {
    showChrome();
    return () => window.clearTimeout(idle.current);
  }, [showChrome]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    ui.closePlayer();
  }, []);

  const switchProvider = useCallback((nextId: string) => {
    setProviderId(nextId);
    actions.updateSettings({ preferredProvider: nextId });
    setPanel(null);
    const p = defaultProviderManager.get(nextId);
    if (p) {
      ui.toast(`${p.shortName}: ${p.audioHint}`, "accent");
    }
  }, []);

  const rotateNextProvider = useCallback(() => {
    const nextId = defaultProviderManager.getNextProviderId(providerId);
    switchProvider(nextId);
  }, [providerId, switchProvider]);

  // Smart TV remote & Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      showChrome();

      const kc = (e as unknown as { keyCode: number }).keyCode;
      // Back key on Smart TVs: Tizen 10009, webOS 461, Android/PC Escape, BrowserBack, GoBack
      if (
        e.key === "Escape" ||
        e.key === "BrowserBack" ||
        e.key === "GoBack" ||
        kc === 10009 ||
        kc === 461
      ) {
        if (panel) setPanel(null);
        else if (!document.fullscreenElement) close();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "s" || e.key === "S") {
        rotateNextProvider();
      } else if (e.key === "e" || e.key === "E") {
        if (episodes.length > 0) setPanel((p) => (p === "episodes" ? null : "episodes"));
      } else if (e.key === "a" || e.key === "A" || e.key === "o" || e.key === "O") {
        setPanel((p) => (p === "servers" ? null : "servers"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, setPanel, close, toggleFullscreen, showChrome, episodes.length, rotateNextProvider]);

  const goToEpisode = useCallback(
    (ep: Episode | EpisodePointer) => {
      if (episode) {
        actions.setEpisodeWatched(item.id, episode.season, episode.episode, true);
      }
      const next = { season: ep.season, episode: ep.episode };
      setEpisode(next);
      setPanel(null);
      const estDuration = (item.runtimeMinutes ?? (item.type === "series" ? 45 : 120)) * 60;
      actions.saveProgress(item, 60, estDuration, next);
    },
    [episode, item],
  );

  return (
    <motion.div
      ref={root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onMouseMove={showChrome}
      className="fixed inset-0 z-[90] bg-black select-none"
    >
      {mode === "stream" ? (
        <StreamEngine
          item={item}
          episode={episode}
          currentEp={currentEp}
          nextEp={nextEp}
          episodesCount={episodes.length}
          chrome={chrome}
          panel={panel}
          setPanel={setPanel}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          providerId={providerId}
          onSwitchProvider={switchProvider}
          onRotateProvider={rotateNextProvider}
          onSwitchMode={() => {
            setPanel(null);
            setMode("trailer");
          }}
          onNextEpisode={nextEp ? () => goToEpisode(nextEp) : undefined}
          onClose={close}
          showChrome={showChrome}
        />
      ) : (
        <TrailerEngine
          item={item}
          episode={episode}
          currentEp={currentEp}
          nextEp={nextEp}
          episodesCount={episodes.length}
          chrome={chrome}
          panel={panel}
          setPanel={setPanel}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          onSwitchMode={() => {
            setPanel(null);
            setMode("stream");
          }}
          onGoToEpisode={goToEpisode}
          onClose={close}
          showChrome={showChrome}
        />
      )}

      {/* Shared Episodes Drawer */}
      <AnimatePresence>
        {panel === "episodes" && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="glass absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h3 className="text-lg font-bold">Episodios</h3>
              <button
                onClick={() => setPanel(null)}
                aria-label="Cerrar episodios"
                className="rounded-full p-1.5 hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {episodes.map((ep) => {
                const active = ep.season === episode?.season && ep.episode === episode?.episode;
                const watched = watchedEpisodes[episodeKey(item.id, ep.season, ep.episode)];
                return (
                  <button
                    key={ep.id}
                    ref={(el) => {
                      if (active && el) el.scrollIntoView({ block: "center" });
                    }}
                    onClick={() => goToEpisode(ep)}
                    className={cx(
                      "flex w-full gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/[0.07]",
                      active && "bg-white/10 refract",
                    )}
                  >
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-surface">
                      {ep.thumbnail && (
                        <SmartImage src={ep.thumbnail} alt="" className="size-full object-cover" />
                      )}
                      {watched && (
                        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-dim">
                        T{ep.season}:E{ep.episode}
                        {active && <span className="ml-2 text-accent">Reproduciendo</span>}
                      </div>
                      <div className="line-clamp-2 text-sm font-semibold">{ep.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Shared Audio & Options Drawer (TV & Sofa Friendly) */}
      <AnimatePresence>
        {panel === "servers" && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="glass absolute inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-line shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                  <Languages className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-fg">Audio y Opciones</h3>
                  <p className="text-xs text-muted">Elige tu idioma preferido o cambia de fuente</p>
                </div>
              </div>
              <button
                onClick={() => setPanel(null)}
                aria-label="Cerrar panel"
                className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-fg focus:ring-2 focus:ring-accent"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {/* Presets de 1 Clic para TV */}
              <div>
                <span className="mb-3 block text-xs font-bold tracking-wider text-dim uppercase">
                  Acceso Rápido por Idioma
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    onClick={() => switchProvider("playlatin")}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl p-4 text-left transition hover:scale-[1.02] focus:ring-2 focus:ring-accent",
                      providerId === "playlatin"
                        ? "bg-accent/20 text-accent ring-1 ring-accent"
                        : "bg-white/[0.05] text-fg hover:bg-white/10",
                    )}
                  >
                    <span className="text-3xl">🇲🇽</span>
                    <div>
                      <div className="text-sm font-bold">Español Latino</div>
                      <div className="text-xs text-muted">Doblaje latino y selector</div>
                    </div>
                  </button>

                  <button
                    onClick={() => switchProvider("vidsrc_pm")}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl p-4 text-left transition hover:scale-[1.02] focus:ring-2 focus:ring-accent",
                      providerId === "vidsrc_pm"
                        ? "bg-accent/20 text-accent ring-1 ring-accent"
                        : "bg-white/[0.05] text-fg hover:bg-white/10",
                    )}
                  >
                    <span className="text-3xl">🌐</span>
                    <div>
                      <div className="text-sm font-bold">Ultra HD Multi-Audio</div>
                      <div className="text-xs text-muted">Carga rápida y subtítulos</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Lista completa de opciones numeradas */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-dim uppercase">
                    Opciones de Reproducción (Por si una falla)
                  </span>
                  <button
                    onClick={rotateNextProvider}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline focus:ring-2 focus:ring-accent"
                  >
                    <RefreshCw className="size-3.5" /> Rotar opción (Tecla S)
                  </button>
                </div>

                <div className="space-y-2">
                  {providers.map((p, idx) => {
                    const active = p.id === providerId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => switchProvider(p.id)}
                        className={cx(
                          "group/opt flex w-full items-center justify-between rounded-2xl p-4 text-left transition hover:bg-white/10 focus:ring-2 focus:ring-accent",
                          active
                            ? "bg-white/12 text-fg refract ring-1 ring-white/20"
                            : "bg-white/[0.03] text-muted",
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={cx(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                              active
                                ? "bg-accent text-accent-ink"
                                : "bg-white/10 text-dim group-hover/opt:text-fg",
                            )}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-bold text-fg">
                              <span>{p.name}</span>
                              {active && (
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                                  Activa
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted">{p.audioHint}</div>
                          </div>
                        </div>
                        {active && <Check className="size-5 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Smart TV Remote Help */}
              <div className="rounded-2xl border border-line bg-white/[0.02] p-4 text-xs text-muted">
                <div className="mb-1 font-bold text-fg">Atajos de control remoto y teclado:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-dim">
                  <div>• <strong className="text-fg">S</strong>: Rotar opción al instante</div>
                  <div>• <strong className="text-fg">E</strong>: Ver episodios de la serie</div>
                  <div>• <strong className="text-fg">A</strong>: Abrir este panel</div>
                  <div>• <strong className="text-fg">F</strong>: Pantalla completa</div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ========================================================================== */
/* 1. FULL MOVIE / SERIES STREAMING ENGINE (PelisStream Resilient Providers)   */
/* ========================================================================== */

function StreamEngine({
  item,
  episode,
  currentEp,
  nextEp,
  episodesCount,
  chrome,
  panel,
  setPanel,
  fullscreen,
  toggleFullscreen,
  providerId,
  onSwitchProvider,
  onRotateProvider,
  onSwitchMode,
  onNextEpisode,
  onClose,
  showChrome,
}: {
  item: MediaItem;
  episode?: EpisodePointer;
  currentEp?: Episode;
  nextEp?: Episode;
  episodesCount: number;
  chrome: boolean;
  panel: Panel;
  setPanel: React.Dispatch<React.SetStateAction<Panel>>;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  providerId: string;
  onSwitchProvider: (id: string) => void;
  onRotateProvider: () => void;
  onSwitchMode: () => void;
  onNextEpisode?: () => void;
  onClose: () => void;
  showChrome: () => void;
}) {
  const resolution = useMemo(
    () =>
      defaultProviderManager.resolvePlayback(providerId, {
        imdbId: item.id,
        type: item.type,
        season: episode?.season,
        episode: episode?.episode,
      }),
    [providerId, item.id, item.type, episode?.season, episode?.episode],
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);

  const handleRotate = () => {
    const elapsed = Date.now() - mountTimeRef.current;
    if ((!iframeLoaded || slowWarning) && elapsed < 12_000) {
      defaultProviderManager.reportFailure(providerId);
    }
    onRotateProvider();
  };

  // Track loading & Fast reveal timer (dismisses cover after 1800ms max so third-party tracking scripts do not stall the user)
  useEffect(() => {
    setIframeLoaded(false);
    setSlowWarning(false);
    mountTimeRef.current = Date.now();

    const fastRevealTimer = window.setTimeout(() => {
      setIframeLoaded(true);
    }, 1800);

    const watchdog = window.setTimeout(() => {
      setSlowWarning(true);
    }, 5000);

    return () => {
      window.clearTimeout(fastRevealTimer);
      window.clearTimeout(watchdog);
    };
  }, [resolution.embedUrl]);

  // Persist watch progress into Continue Watching (`ContinueRail`)
  useEffect(() => {
    const estDuration = (item.runtimeMinutes ?? (item.type === "series" ? 45 : 120)) * 60;
    const prev = getProfileData().progress[item.id];
    const sameEp =
      !episode || (prev?.season === episode.season && prev?.episode === episode.episode);
    let pos = prev && !prev.completed && sameEp && prev.position > 30 ? prev.position : 90;

    actions.saveProgress(item, pos, estDuration, episode);

    const ticker = window.setInterval(() => {
      pos = Math.min(estDuration * 0.92, pos + 15);
      actions.saveProgress(item, pos, estDuration, episode);
    }, 15_000);

    return () => window.clearInterval(ticker);
  }, [item, episode]);

  // Active Shield: Intercept rogue popups & block window.open ad traps
  useEffect(() => {
    const originalOpen = window.open;
    try {
      window.open = () => null;
    } catch {
      /* window.open might be read-only in strict environments */
    }
    return () => {
      try {
        window.open = originalOpen;
      } catch {
        /* ignore */
      }
    };
  }, []);

  const visibleChrome = chrome || panel !== null || !iframeLoaded || slowWarning;
  const activeStrategy = defaultProviderManager.get(resolution.providerId);

  return (
    <div className="relative size-full overflow-hidden bg-black">
      {/* Top hover sensor so moving cursor to top edge over cross-origin iframe always reveals chrome */}
      <div
        onMouseEnter={showChrome}
        onMouseMove={showChrome}
        className="fixed inset-x-0 top-0 z-30 h-14 bg-transparent"
      />

      {/* Streaming Iframe (un-sandboxed so provider anti-sandbox scripts sbx.js do not trigger /sandbox.php captcha block) */}
      <iframe
        ref={iframeRef}
        key={resolution.embedUrl}
        src={resolution.embedUrl}
        title={`Reproductor PelisStream — ${item.title}`}
        allow={resolution.allowAttributes}
        referrerPolicy="origin-when-cross-origin"
        allowFullScreen
        onLoad={() => {
          setIframeLoaded(true);
          setSlowWarning(false);
          defaultProviderManager.reportSuccess(resolution.providerId);
        }}
        className="absolute inset-0 size-full border-0 bg-black"
      />

      {/* Backdrop while connecting to server */}
      <AnimatePresence>
        {!iframeLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="pointer-events-none absolute inset-0 z-10"
          >
            <SmartImage
              src={item.background}
              alt=""
              loading="eager"
              className="size-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="size-14 animate-spin rounded-full border-[3px] border-white/15 border-t-accent" />
              <div className="text-center">
                <p className="text-sm font-bold tracking-wide text-fg">
                  Conectando con {activeStrategy?.shortName ?? resolution.providerName}…
                </p>
                <p className="mt-1 text-xs text-muted">
                  Audio {resolution.audioHint} · Sandbox blindado activo
                </p>
              </div>
              <button
                type="button"
                onClick={handleRotate}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-fg backdrop-blur-md transition hover:scale-105 hover:bg-white/20 active:scale-95"
              >
                <RefreshCw className="size-3.5" />
                <span>¿Tarda en cargar? Probar otra opción (S)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8-Second Watchdog Failover Banner */}
      <AnimatePresence>
        {slowWarning && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3.5 rounded-full px-5 py-3 shadow-2xl refract"
          >
            <AlertTriangle className="size-4 shrink-0 text-accent" />
            <span className="text-xs font-semibold text-fg sm:text-sm">
              ¿Esta opción tarda en responder?
            </span>
            <button
              onClick={handleRotate}
              className="inline-flex items-center gap-1.5 rounded-full bg-fg px-3.5 py-1.5 text-xs font-bold text-ink transition hover:scale-105"
            >
              <RefreshCw className="size-3.5" />
              Probar otra opción (S)
            </button>
            <button
              onClick={() => setSlowWarning(false)}
              aria-label="Ocultar aviso"
              className="rounded-full p-1 text-muted hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Chrome Bar (Title + Server Switcher + Episodes + Mode Switcher) */}
      <motion.div
        animate={{ opacity: visibleChrome ? 1 : 0, y: visibleChrome ? 0 : -20 }}
        transition={{ duration: 0.35 }}
        className={cx(
          "absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-b from-black/90 via-black/65 to-transparent px-4 pt-4 pb-12 sm:px-7 sm:pt-5",
          !visibleChrome && "pointer-events-none",
        )}
      >
        {/* Left: Back + Title + Server Badge */}
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            onClick={onClose}
            aria-label="Volver"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl transition hover:scale-105 hover:bg-white/20 refract"
          >
            <ArrowLeft className="size-6" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold sm:text-xl">{item.title}</h2>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-bold text-accent ring-1 ring-accent/40">
                <ShieldCheck className="size-3" />
                {activeStrategy?.shortName ?? "Servidor"} · {resolution.audioHint}
              </span>
            </div>
            {episode && (
              <p className="truncate text-xs text-muted sm:text-sm">
                T{episode.season}:E{episode.episode}
                {currentEp ? ` · ${currentEp.title}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Right: Mode Toggle + Server Selector + Next Episode + Episodes Drawer + Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stream vs Trailer Mode Pill */}
          {item.trailers.length > 0 && (
            <div className="flex items-center rounded-full bg-white/[0.08] p-1 backdrop-blur-xl refract">
              <button
                aria-pressed={true}
                className="flex items-center gap-1.5 rounded-full bg-fg px-3 py-1.5 text-xs font-bold text-ink"
              >
                <Clapperboard className="size-3.5" />
                <span>{item.type === "series" ? "Episodio" : "Película"}</span>
              </button>
              <button
                onClick={onSwitchMode}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition hover:text-fg"
              >
                <Film className="size-3.5" />
                <span>Tráiler</span>
              </button>
            </div>
          )}

          {/* Audio & Server Options Trigger (Opens unified TV drawer) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPanel((p) => (p === "servers" ? null : "servers"))}
              aria-expanded={panel === "servers"}
              className={cx(
                "flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold backdrop-blur-xl transition sm:text-sm refract focus:ring-2 focus:ring-accent",
                panel === "servers"
                  ? "bg-fg text-ink"
                  : "bg-white/10 text-fg hover:bg-white/20",
              )}
            >
              <Languages className="size-4 text-accent" />
              <span>{activeStrategy?.shortName ?? "Audio y Opciones"}</span>
            </button>

            {/* Quick Rotate Option Button */}
            <button
              onClick={handleRotate}
              title="Rotar opción si no reproduce (Tecla S)"
              aria-label="Rotar opción si no reproduce (Tecla S)"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-fg backdrop-blur-xl transition hover:scale-105 hover:bg-white/20 focus:ring-2 focus:ring-accent refract"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>

          {/* Next Episode Button */}
          {onNextEpisode && nextEp && (
            <button
              onClick={onNextEpisode}
              title={`Siguiente: T${nextEp.season}:E${nextEp.episode}`}
              className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-3.5 text-xs font-bold text-fg backdrop-blur-xl transition hover:bg-white/20 sm:text-sm refract"
            >
              <SkipForward className="size-4 fill-fg" />
              <span className="hidden md:inline">Sig. episodio</span>
            </button>
          )}

          {/* Episodes Drawer Toggle */}
          {episodesCount > 0 && (
            <button
              onClick={() => setPanel((p) => (p === "episodes" ? null : "episodes"))}
              aria-label="Lista de episodios"
              title="Episodios"
              className={cx(
                "flex h-10 items-center gap-2 rounded-full px-3.5 text-xs font-bold backdrop-blur-xl transition sm:text-sm refract",
                panel === "episodes"
                  ? "bg-fg text-ink"
                  : "bg-white/10 text-fg hover:bg-white/20",
              )}
            >
              <ListVideo className="size-4" />
              <span className="hidden sm:inline">Episodios</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label="Pantalla completa (f)"
            title="Pantalla completa (f)"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-fg backdrop-blur-xl transition hover:scale-105 hover:bg-white/20 refract"
          >
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ========================================================================== */
/* 2. OFFICIAL YOUTUBE TRAILER CINEMA ENGINE                                  */
/* ========================================================================== */

function TrailerEngine({
  item,
  episode,
  currentEp,
  nextEp,
  episodesCount,
  chrome,
  panel,
  setPanel,
  fullscreen,
  toggleFullscreen,
  onSwitchMode,
  onGoToEpisode,
  onClose,
  showChrome,
}: {
  item: MediaItem;
  episode?: EpisodePointer;
  currentEp?: Episode;
  nextEp?: Episode;
  episodesCount: number;
  chrome: boolean;
  panel: Panel;
  setPanel: React.Dispatch<React.SetStateAction<Panel>>;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  onSwitchMode: () => void;
  onGoToEpisode: (ep: Episode | EpisodePointer) => void;
  onClose: () => void;
  showChrome: () => void;
}) {
  const settings = useProfileData().settings;
  const videoId = item.trailers[0];
  const host = useRef<HTMLDivElement>(null);
  const yt = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(!videoId);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [rate, setRate] = useState(settings.playbackRate);
  const [subs, setSubs] = useState(settings.subtitles);
  const [flash, setFlash] = useState<{
    id: number;
    kind: "play" | "pause" | "back" | "fwd";
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const episodeRef = useRef(episode);
  episodeRef.current = episode;

  const save = useCallback(() => {
    const p = yt.current;
    if (!p?.getCurrentTime) return;
    try {
      const t = p.getCurrentTime();
      const d = p.getDuration();
      if (d > 0 && t > 1) actions.saveProgress(item, t, d, episodeRef.current);
    } catch {
      /* player torn down */
    }
  }, [item]);

  useEffect(() => {
    if (!videoId) return;
    let alive = true;
    const mount = document.createElement("div");
    host.current?.appendChild(mount);
    loadYouTube()
      .then((YT) => {
        if (!alive) return;
        yt.current = new YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            cc_load_policy: settings.subtitles === "off" ? 0 : 1,
            cc_lang_pref: settings.subtitles === "off" ? "es" : settings.subtitles,
            hl: "es",
          },
          events: {
            onReady: (e) => {
              setReady(true);
              setDuration(e.target.getDuration());
              e.target.setVolume(80);
              e.target.setPlaybackRate(settings.playbackRate);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              setPlaying(e.data === YT_STATE.PLAYING);
              setBuffering(e.data === YT_STATE.BUFFERING);
              if (e.data === YT_STATE.PLAYING) {
                setEnded(false);
                setDuration(e.target.getDuration());
              }
              if (e.data === YT_STATE.ENDED) {
                setEnded(true);
                save();
              }
            },
            onError: () => setError(true),
          },
        });
      })
      .catch(() => setError(true));
    return () => {
      alive = false;
      save();
      try {
        yt.current?.destroy();
      } catch {
        /* noop */
      }
      yt.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (ready || error || !videoId) return;
    const t = window.setTimeout(() => setError(true), 15000);
    return () => window.clearTimeout(t);
  }, [ready, error, videoId]);

  useEffect(() => {
    if (!ready) return;
    let ticks = 0;
    const t = window.setInterval(() => {
      const p = yt.current;
      if (!p) return;
      try {
        setTime(p.getCurrentTime());
        if (++ticks % 20 === 0) save();
      } catch {
        /* noop */
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [ready, save]);

  const visibleChrome = chrome || !playing || panel !== null || ended || error;
  const pulse = (kind: "play" | "pause" | "back" | "fwd") => setFlash({ id: Date.now(), kind });

  const toggle = useCallback(() => {
    const p = yt.current;
    if (!p || !ready) return;
    if (playing) {
      p.pauseVideo();
      pulse("pause");
      save();
    } else {
      p.playVideo();
      pulse("play");
    }
  }, [playing, ready, save]);

  const seek = useCallback(
    (to: number) => {
      const p = yt.current;
      if (!p || !ready) return;
      const clamped = Math.max(0, Math.min(duration || to, to));
      p.seekTo(clamped, true);
      setTime(clamped);
      setEnded(false);
    },
    [ready, duration],
  );

  const skip = useCallback(
    (delta: number) => {
      seek(time + delta);
      pulse(delta < 0 ? "back" : "fwd");
    },
    [seek, time],
  );

  const applyVolume = useCallback((v: number, m: boolean) => {
    const p = yt.current;
    setVolume(v);
    setMuted(m);
    if (!p) return;
    p.setVolume(v);
    if (m || v === 0) p.mute();
    else p.unMute();
  }, []);

  const applyRate = (r: number) => {
    setRate(r);
    yt.current?.setPlaybackRate(r);
    actions.updateSettings({ playbackRate: r });
  };

  const applySubs = (s: ProfileSettings["subtitles"]) => {
    setSubs(s);
    actions.updateSettings({ subtitles: s });
    const p = yt.current;
    if (!p) return;
    try {
      if (s === "off") p.unloadModule?.("captions");
      else {
        p.loadModule?.("captions");
        p.setOption?.("captions", "track", { languageCode: s });
      }
    } catch {
      /* captions unavailable */
    }
  };

  useEffect(() => {
    if (!ended) return;
    if (nextEp && settings.autoplayNext) setCountdown(6);
  }, [ended, nextEp, settings.autoplayNext]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (nextEp) onGoToEpisode(nextEp);
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown, nextEp, onGoToEpisode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" &&
        (e.target as HTMLInputElement).type !== "range"
      )
        return;
      showChrome();
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          toggle();
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          applyVolume(Math.min(100, volume + 10), false);
          break;
        case "ArrowDown":
          e.preventDefault();
          applyVolume(Math.max(0, volume - 10), volume - 10 <= 0);
          break;
        case "m":
          applyVolume(volume || 60, !muted);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "c":
          applySubs(subs === "off" ? "es" : "off");
          break;
        case "Escape":
          if (panel) setPanel(null);
          else if (!document.fullscreenElement) onClose();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggle, skip, applyVolume, volume, muted, toggleFullscreen, onClose, panel, subs, showChrome]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className={cx("relative size-full", !visibleChrome && "cursor-none")}>
      <div ref={host} className="pointer-events-none absolute inset-0 [&>iframe]:size-full" />

      {/* Poster while loading */}
      <AnimatePresence>
        {(!ready || (buffering && time < 0.5)) && !error && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="absolute inset-0"
          >
            <SmartImage
              src={item.background}
              alt=""
              loading="eager"
              className="size-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="size-14 animate-spin rounded-full border-[3px] border-white/15 border-t-accent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click surface */}
      <button
        aria-label={playing ? "Pausar" : "Reproducir"}
        className="absolute inset-0 cursor-[inherit]"
        onClick={toggle}
        onDoubleClick={toggleFullscreen}
      />

      {/* Center pulse feedback */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0.9, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.6 }}
            onAnimationComplete={() => setFlash(null)}
            className={cx(
              "pointer-events-none absolute top-1/2 flex size-24 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur-md",
              flash.kind === "back"
                ? "left-[20%]"
                : flash.kind === "fwd"
                  ? "right-[20%]"
                  : "left-1/2 -translate-x-1/2",
            )}
          >
            {flash.kind === "play" && <Play className="ml-1 size-10 fill-fg" />}
            {flash.kind === "pause" && <Pause className="size-10 fill-fg" />}
            {flash.kind === "back" && <span className="text-lg font-bold">-10s</span>}
            {flash.kind === "fwd" && <span className="text-lg font-bold">+10s</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <motion.div
        animate={{ opacity: visibleChrome ? 1 : 0, y: visibleChrome ? 0 : -16 }}
        transition={{ duration: 0.35 }}
        className={cx(
          "absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-5 pt-5 pb-16 sm:px-8",
          !visibleChrome && "pointer-events-none",
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={onClose}
            aria-label="Volver"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition hover:scale-110 hover:bg-white/10"
          >
            <ArrowLeft className="size-7" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-lg font-bold sm:text-xl">{item.title}</h2>
              <span className="shrink-0 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-accent-ink uppercase">
                Tráiler Oficial
              </span>
            </div>
            {episode && (
              <p className="truncate text-sm text-muted">
                T{episode.season}:E{episode.episode}
                {currentEp ? ` · ${currentEp.title}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Switch back to Full Movie / Episode Stream */}
        <div className="flex items-center rounded-full bg-white/[0.08] p-1 backdrop-blur-xl refract">
          <button
            onClick={onSwitchMode}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition hover:text-fg"
          >
            <Clapperboard className="size-3.5" />
            <span>Ver {item.type === "series" ? "episodio completo" : "película completa"}</span>
          </button>
          <button
            aria-pressed={true}
            className="flex items-center gap-1.5 rounded-full bg-fg px-3 py-1.5 text-xs font-bold text-ink"
          >
            <Film className="size-3.5" />
            <span>Tráiler</span>
          </button>
        </div>
      </motion.div>

      {/* Bottom controls */}
      <motion.div
        animate={{ opacity: visibleChrome ? 1 : 0, y: visibleChrome ? 0 : 20 }}
        transition={{ duration: 0.35 }}
        className={cx(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pt-24 pb-5 sm:px-8 sm:pb-7",
          !visibleChrome && "pointer-events-none",
        )}
      >
        <Scrubber pct={pct} duration={duration} onSeek={(f) => seek(f * duration)} />
        <div className="mt-3 flex items-center gap-1 sm:gap-2">
          <CtrlButton
            label={playing ? "Pausar (espacio)" : "Reproducir (espacio)"}
            onClick={toggle}
          >
            {playing ? <Pause className="size-7 fill-fg" /> : <Play className="size-7 fill-fg" />}
          </CtrlButton>
          <CtrlButton label="Retroceder 10 s" onClick={() => skip(-10)}>
            <RotateCcw className="size-6" />
          </CtrlButton>
          <CtrlButton label="Adelantar 10 s" onClick={() => skip(10)}>
            <RotateCw className="size-6" />
          </CtrlButton>
          <div className="group/vol flex items-center">
            <CtrlButton label="Silenciar (m)" onClick={() => applyVolume(volume || 60, !muted)}>
              <VolIcon className="size-6" />
            </CtrlButton>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => applyVolume(Number(e.target.value), Number(e.target.value) === 0)}
              aria-label="Volumen"
              className="w-24 origin-left -translate-x-1 accent-[var(--color-accent)] opacity-0 transition-[opacity,transform] duration-500 ease-[var(--ease-spring)] group-hover/vol:translate-x-0 group-hover/vol:opacity-100 focus:translate-x-0 focus:opacity-100"
            />
          </div>
          <span className="ml-2 text-sm font-semibold text-fg/85 tabular-nums">
            {formatClock(time)} <span className="text-dim">/ {formatClock(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <CtrlButton
              label={`Ver ${item.type === "series" ? "episodio" : "película"}`}
              onClick={onSwitchMode}
              wide
            >
              <Clapperboard className="size-5 text-accent" />
              <span className="hidden text-sm font-bold lg:inline">
                Ver {item.type === "series" ? "episodio" : "película"}
              </span>
            </CtrlButton>
            {nextEp && (
              <CtrlButton label="Siguiente episodio" onClick={() => onGoToEpisode(nextEp)} wide>
                <SkipForward className="size-6 fill-fg" />
                <span className="hidden text-sm font-bold lg:inline">Siguiente episodio</span>
              </CtrlButton>
            )}
            {episodesCount > 0 && (
              <CtrlButton
                label="Episodios"
                active={panel === "episodes"}
                onClick={() => setPanel((p) => (p === "episodes" ? null : "episodes"))}
              >
                <ListVideo className="size-6" />
              </CtrlButton>
            )}
            <div className="relative">
              <CtrlButton
                label="Subtítulos (c)"
                active={panel === "subs" || subs !== "off"}
                onClick={() => setPanel((p) => (p === "subs" ? null : "subs"))}
              >
                <Captions className="size-6" />
              </CtrlButton>
              <Popover open={panel === "subs"} title="Subtítulos">
                {SUBS.map((s) => (
                  <PopItem key={s.id} active={subs === s.id} onClick={() => applySubs(s.id)}>
                    {s.label}
                  </PopItem>
                ))}
              </Popover>
            </div>
            <div className="relative">
              <CtrlButton
                label="Velocidad"
                active={panel === "speed" || rate !== 1}
                onClick={() => setPanel((p) => (p === "speed" ? null : "speed"))}
              >
                <Gauge className="size-6" />
              </CtrlButton>
              <Popover open={panel === "speed"} title="Velocidad de reproducción">
                {SPEEDS.map((s) => (
                  <PopItem key={s} active={rate === s} onClick={() => applyRate(s)}>
                    {s === 1 ? "Normal (1x)" : `${s}x`}
                  </PopItem>
                ))}
              </Popover>
            </div>
            <CtrlButton label="Pantalla completa (f)" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="size-6" /> : <Maximize className="size-6" />}
            </CtrlButton>
          </div>
        </div>
      </motion.div>

      {/* End screen */}
      <AnimatePresence>
        {ended && countdown === null && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 grid place-items-center bg-black/70 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="mb-6 text-2xl font-bold">¿Listo para ver el título completo?</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={onSwitchMode}
                  className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 font-bold text-ink"
                >
                  <Play className="size-4 fill-ink" />
                  Ver {item.type === "series" ? "episodio" : "película"} ahora
                </button>
                <button
                  onClick={() => seek(0)}
                  className="rounded-full bg-white/15 px-6 py-3 font-bold"
                >
                  Repetir tráiler
                </button>
                <button onClick={onClose} className="rounded-full bg-white/15 px-6 py-3 font-bold">
                  Salir
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 px-6">
          <div className="max-w-md text-center">
            <p className="mb-2 text-2xl font-bold">Tráiler no disponible</p>
            <p className="mb-6 text-muted">
              Puedes reproducir directamente el contenido completo en nuestros servidores.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={onSwitchMode}
                className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 font-bold text-ink"
              >
                <Play className="size-4 fill-ink" />
                Ver {item.type === "series" ? "episodio" : "película"}
              </button>
              {videoId && (
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 font-bold"
                >
                  Abrir en YouTube <ExternalLink className="size-4" />
                </a>
              )}
              <button onClick={onClose} className="rounded-full bg-white/15 px-5 py-3 font-bold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Scrubber({
  pct,
  duration,
  onSeek,
}: {
  pct: number;
  duration: number;
  onSeek: (fraction: number) => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const fraction = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };
  const shown = drag !== null ? drag * 100 : pct;
  return (
    <div
      ref={bar}
      className="group/scrub relative flex h-5 cursor-pointer items-center"
      onMouseMove={(e) => setHoverX(fraction(e.clientX))}
      onMouseLeave={() => setHoverX(null)}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDrag(fraction(e.clientX));
      }}
      onPointerMove={(e) => drag !== null && setDrag(fraction(e.clientX))}
      onPointerUp={(e) => {
        if (drag !== null) onSeek(fraction(e.clientX));
        setDrag(null);
      }}
      role="slider"
      aria-label="Progreso"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="relative h-1.5 w-full">
        <div className="absolute inset-0 origin-center scale-y-[0.67] overflow-hidden rounded-full bg-white/25 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/scrub:scale-y-100">
          {hoverX !== null && (
            <div
              className="absolute inset-0 origin-left bg-white/25"
              style={{ transform: `scaleX(${hoverX})` }}
            />
          )}
          <div
            className="absolute inset-0 origin-left bg-accent"
            style={{ transform: `scaleX(${shown / 100})` }}
          />
        </div>
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-accent ring-4 ring-accent/25 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/scrub:scale-100"
          style={{ left: `${shown}%` }}
        />
      </div>
      {hoverX !== null && duration > 0 && (
        <div
          className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 text-xs font-bold tabular-nums"
          style={{ left: `${hoverX * 100}%` }}
        >
          {formatClock(hoverX * duration)}
        </div>
      )}
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  children,
  active,
  wide,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  wide?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "flex h-11 items-center justify-center gap-2 rounded-full transition-colors",
        wide ? "px-3" : "w-11",
        active ? "text-accent" : "text-fg hover:bg-white/10",
      )}
    >
      {children}
    </motion.button>
  );
}

function Popover({
  open,
  title,
  children,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="glass absolute right-0 bottom-14 z-20 w-60 rounded-2xl refract p-2 shadow-2xl"
        >
          <div className="px-3 pt-2 pb-2 text-xs font-bold tracking-wider text-dim uppercase">
            {title}
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PopItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-white/10",
        active ? "text-fg" : "text-muted",
      )}
    >
      {children}
      {active && <Check className="size-4 text-accent" />}
    </button>
  );
}

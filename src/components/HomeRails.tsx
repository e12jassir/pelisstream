import { useMemo } from "react";
import { genreLabel } from "../lib/cinemeta";
import { useDedupe } from "../lib/dedupe";
import { useKidsFilter } from "../lib/hooks";
import { navigate } from "../lib/router";
import { actions, useProfileData } from "../lib/store";
import { useRecommendations } from "../lib/taste";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { ContinueCard } from "./Cards";
import { ItemsRail, Rail } from "./Rail";

export function ContinueRail({
  title = "Continuar viendo",
  type,
}: {
  title?: string;
  type?: MediaItem["type"];
}) {
  const data = useProfileData();
  const filter = useKidsFilter();
  const entries = useMemo(
    () =>
      Object.entries(data.progress)
        .filter(([id, p]) => !p.completed && data.meta[id] && (!type || p.type === type))
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .slice(0, 16),
    [data.progress, data.meta, type],
  );
  const items = filter(entries.map(([id]) => data.meta[id]));
  if (!items.length) return null;
  return (
    <Rail title={title}>
      {items.map((item) => {
        const p = data.progress[item.id];
        const pct = p.duration ? (p.position / p.duration) * 100 : 0;
        const remaining = Math.max(1, Math.round((p.duration - p.position) / 60));
        const label =
          p.season && p.episode
            ? `T${p.season}:E${p.episode} · Quedan ${remaining} min`
            : `Quedan ${remaining} min`;
        return (
          <ContinueCard
            key={item.id}
            item={item}
            progress={pct}
            label={label}
            onResume={() =>
              ui.play(
                item,
                p.season && p.episode ? { season: p.season, episode: p.episode } : undefined,
              )
            }
            onRemove={() => {
              actions.removeProgress(item.id);
              ui.toast(`“${item.title}” se quitó de Continuar viendo`);
            }}
          />
        );
      })}
    </Rail>
  );
}

export function ForYouRail({ order }: { order?: number }) {
  const data = useProfileData();
  const filter = useKidsFilter();
  const { items, loading, reasons } = useRecommendations(data, filter);
  const shown = useDedupe(order, items, 20, 6);
  if (!reasons.length) return null;
  return (
    <ItemsRail
      eyebrow="Recomendado para ti"
      title={`Porque te gusta ${reasons.slice(0, 2).map(genreLabel).join(" y ").toLowerCase()}`}
      items={shown}
      loading={loading}
      showSource
    />
  );
}

export function MyListRail() {
  const data = useProfileData();
  const filter = useKidsFilter();
  const items = filter(
    data.list.map((id) => data.meta[id]).filter((x): x is MediaItem => Boolean(x)),
  );
  if (!items.length) return null;
  return (
    <ItemsRail
      title="Mi lista"
      items={items.slice(0, 20)}
      variant="poster"
      onSeeAll={() => navigate({ name: "list" })}
    />
  );
}

import { useEffect, useState } from "react";
import { currentYear, getCatalog, isKidsSafe } from "../lib/cinemeta";
import { DedupeScope } from "../lib/dedupe";
import { navigate } from "../lib/router";
import { getPlatformCatalog, interleave } from "../lib/platforms";
import { useActiveProfile } from "../lib/store";
import type { MediaItem } from "../lib/types";
import { BrandHubs } from "../components/BrandHubs";
import { Hero, SourceEyebrow } from "../components/Hero";
import { ContinueRail, ForYouRail, MyListRail } from "../components/HomeRails";
import { SourceRail } from "../components/Rail";
import { Top10Module } from "../components/Top10";

/** Hero mix: the #1s of every platform plus the global chart. */
function useHeroMix(kids: boolean) {
  const [state, setState] = useState<{ items: MediaItem[]; loading: boolean }>({
    items: [],
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    const safe = (p: Promise<MediaItem[]>) => p.catch(() => [] as MediaItem[]);
    Promise.all([
      safe(getPlatformCatalog("nfx", "series")),
      safe(getPlatformCatalog("hbm", "series")),
      safe(getPlatformCatalog("dnp", "movie")),
      safe(getPlatformCatalog("atp", "series")),
      safe(getPlatformCatalog("amp", "movie")),
      safe(getCatalog(kids ? { type: "movie", genre: "Animation" } : { type: "movie" })),
    ]).then((lists) => {
      if (!alive) return;
      const pool = lists.map((l) =>
        (kids ? l.filter(isKidsSafe) : l).filter((i) => i.background && i.synopsis),
      );
      setState({ items: interleave(pool, 7), loading: false });
    });
    return () => {
      alive = false;
    };
  }, [kids]);
  return state;
}

export function Home() {
  const profile = useActiveProfile();
  const kids = profile?.kids ?? false;
  const hero = useHeroMix(kids);
  const year = String(currentYear());

  return (
    <div className="pb-28">
      <Hero
        items={hero.items}
        loading={hero.loading}
        eyebrowFor={(item) =>
          item.source ? (
            <SourceEyebrow item={item} />
          ) : (
            <span className="eyebrow text-fg/80">N.º 1 en películas hoy</span>
          )
        }
      />
      <DedupeScope>
        <div className="relative z-10 -mt-14 space-y-9 sm:-mt-20 sm:space-y-11">
          <ContinueRail />
          <Top10Module kids={kids} />
          <BrandHubs />
          {kids ? (
            <>
              <SourceRail
                order={1}
                title="Disney+ para toda la familia"
                source={{ kind: "platform", platform: "dnp", type: "movie" }}
              />
              <SourceRail
                order={2}
                title="Series animadas"
                source={{ kind: "catalog", query: { type: "series", genre: "Animation" } }}
                variant="poster"
              />
              <ForYouRail order={3} />
              <SourceRail
                order={4}
                title="Aventuras en Netflix"
                source={{ kind: "platform", platform: "nfx" }}
              />
              <SourceRail
                order={5}
                title="Para ver en familia"
                source={{ kind: "catalog", query: { type: "movie", genre: "Family" } }}
              />
              <MyListRail />
              <SourceRail
                order={6}
                title="Fantasía y magia"
                source={{ kind: "catalog", query: { type: "movie", genre: "Fantasy" } }}
                variant="poster"
              />
              <SourceRail
                order={7}
                title="Las mejor valoradas"
                source={{
                  kind: "catalog",
                  query: { type: "movie", catalog: "imdbRating", genre: "Animation" },
                }}
              />
            </>
          ) : (
            <>
              <SourceRail
                order={1}
                eyebrow="Netflix"
                title="Las series de las que todos hablan"
                source={{ kind: "platform", platform: "nfx", type: "series" }}
                onSeeAll={() => navigate({ name: "brand", platform: "nfx" })}
              />
              <ForYouRail order={2} />
              <SourceRail
                order={3}
                eyebrow="HBO Max"
                title="Prestigio HBO"
                source={{ kind: "platform", platform: "hbm", type: "series" }}
                variant="poster"
                onSeeAll={() => navigate({ name: "brand", platform: "hbm" })}
              />
              <SourceRail
                order={4}
                eyebrow="Disney+"
                title="Marvel, Pixar y la magia de Disney"
                source={{ kind: "platform", platform: "dnp", type: "movie" }}
                onSeeAll={() => navigate({ name: "brand", platform: "dnp" })}
              />
              <SourceRail
                order={5}
                eyebrow="Apple TV+"
                title="Apple Originals"
                source={{ kind: "platform", platform: "atp", type: "series" }}
                onSeeAll={() => navigate({ name: "brand", platform: "atp" })}
              />
              <SourceRail
                order={6}
                eyebrow="Prime Video"
                title="Cine del momento en Prime Video"
                source={{ kind: "platform", platform: "amp", type: "movie" }}
                variant="poster"
                onSeeAll={() => navigate({ name: "brand", platform: "amp" })}
              />
              <SourceRail
                order={7}
                eyebrow="Recién llegados"
                title={`Estrenos ${year}`}
                source={{ kind: "catalog", query: { type: "movie", catalog: "year", genre: year } }}
              />
              <MyListRail />
              <SourceRail
                order={8}
                title="Películas taquilleras en Netflix"
                source={{ kind: "platform", platform: "nfx", type: "movie" }}
                variant="poster"
              />
              <SourceRail
                order={9}
                title="Joyas de la crítica en HBO Max"
                source={{ kind: "platform", platform: "hbm", sort: "rating" }}
              />
              <SourceRail
                order={10}
                title="Acción y adrenalina"
                source={{ kind: "catalog", query: { type: "movie", genre: "Action" } }}
                onSeeAll={() => navigate({ name: "genre", genre: "Action" })}
              />
              <SourceRail
                order={11}
                title="Series de ciencia ficción"
                source={{ kind: "catalog", query: { type: "series", genre: "Sci-Fi" } }}
              />
              <SourceRail
                order={12}
                title="Comedias para desconectar"
                source={{ kind: "platform", platform: "amp", genres: ["Comedy"] }}
              />
              <SourceRail
                order={13}
                title="Crimen y misterio"
                source={{ kind: "catalog", query: { type: "series", genre: "Crime" } }}
                variant="poster"
              />
              <SourceRail
                order={14}
                title={`Series nuevas de ${year}`}
                source={{
                  kind: "catalog",
                  query: { type: "series", catalog: "year", genre: year },
                }}
              />
              <SourceRail
                order={15}
                title="Suspenso que no te deja respirar"
                source={{ kind: "catalog", query: { type: "movie", genre: "Thriller" } }}
              />
              <SourceRail
                order={16}
                title="Animación para todas las edades"
                source={{ kind: "platform", platform: "dnp", genres: ["Animation"] }}
                variant="poster"
              />
              <SourceRail
                order={17}
                title="Documentales fascinantes"
                source={{ kind: "catalog", query: { type: "movie", genre: "Documentary" } }}
              />
              <SourceRail
                order={18}
                title="Noches de terror"
                source={{ kind: "catalog", query: { type: "movie", genre: "Horror" } }}
              />
              <SourceRail
                order={19}
                title="Clásicos mejor valorados"
                source={{ kind: "catalog", query: { type: "movie", catalog: "imdbRating" } }}
                variant="poster"
              />
            </>
          )}
        </div>
      </DedupeScope>
    </div>
  );
}

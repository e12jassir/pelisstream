import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect } from "react";
import { AccountModal } from "./components/AccountModal";
import { BrandMark, Wordmark } from "./components/Brand";
import { DetailsModal } from "./components/DetailsModal";
import { HoverPreview } from "./components/HoverPreview";
import { Player } from "./components/Player";
import { ProfileEditor } from "./components/ProfileEditor";
import { ProfileGate } from "./components/ProfileGate";
import { GUTTER } from "./components/Rail";
import { Sidebar, MobileNav } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PinPrompt } from "./components/PinPrompt";
import { Toasts } from "./components/Toasts";
import { hover } from "./lib/hover";
import { initCloudSync } from "./lib/cloud";
import { navigate, useRoute, type Route } from "./lib/router";
import { useActiveProfile, useSettings } from "./lib/store";
import { uiStore } from "./lib/ui";
import { PLATFORMS } from "./lib/platforms";
import { THEMES, usePalette } from "./lib/themes";
import { Brand } from "./pages/Brand";
import { Browse } from "./pages/Browse";
import { Categories, Genre } from "./pages/Categories";
import { Home } from "./pages/Home";
import { Me } from "./pages/Me";
import { MyList } from "./pages/MyList";
import { NewPopular } from "./pages/NewPopular";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";

function renderPage(route: Route) {
  switch (route.name) {
    case "home":
      return <Home />;
    case "movies":
      return <Browse type="movie" />;
    case "series":
      return <Browse type="series" />;
    case "new":
      return <NewPopular />;
    case "search":
      return <Search initial={route.q} />;
    case "list":
      return <MyList />;
    case "categories":
      return <Categories />;
    case "genre":
      return <Genre genre={route.genre} />;
    case "me":
      return <Me />;
    case "brand":
      return <Brand platform={route.platform} />;
    case "settings":
      return <Settings />;
  }
}

export default function App() {
  const profile = useActiveProfile();
  const settings = useSettings();
  const route = useRoute();
  // Brand pages borrow the platform's palette; everywhere else uses the profile theme.
  usePalette(
    profile && route.name === "brand"
      ? PLATFORMS[route.platform].palette
      : THEMES[settings.theme ?? "ember"].palette,
  );
  const paletteKey =
    profile && route.name === "brand" ? route.platform : (settings.theme ?? "ember");
  const pageKey =
    route.name === "genre"
      ? `genre-${route.genre}`
      : route.name === "brand"
        ? `brand-${route.platform}`
        : route.name;

  useEffect(() => {
    initCloudSync();
  }, []);

  useEffect(() => {
    hover.close();
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pageKey, profile?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const { details, player, profileEditor } = uiStore.get();
      if (e.key === "/" && profile && !details && !player && !profileEditor) {
        e.preventDefault();
        navigate({ name: "search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile]);

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>
      <AnimatePresence>{!profile && <ProfileGate key="gate" />}</AnimatePresence>

      {profile && (
        <div key={profile.id} className="min-h-screen bg-ink">
          {/* Atmosphere dissolve when the palette changes (theme or platform hub). */}
          <motion.div
            key={paletteKey}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-0 z-[45] bg-ink"
          />
          <Sidebar />
          <MobileNav />
          <TopBar />
          <main className="relative overflow-x-clip md:pl-[84px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={pageKey}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderPage(route)}
              </motion.div>
            </AnimatePresence>
            <footer
              className={`border-t border-line pt-10 pb-28 text-sm text-dim md:pb-12 ${GUTTER}`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <BrandMark className="size-6" />
                <Wordmark className="text-lg text-fg" />
              </div>
              <p className="max-w-2xl leading-relaxed">
                Catálogo y metadatos de Cinemeta, imágenes de Metahub y tráileres de YouTube. Tus
                perfiles, listas, calificaciones e historial se guardan en este navegador.
              </p>
            </footer>
          </main>
          <HoverPreview />
          <DetailsModal />
          <Player />
        </div>
      )}

      <ProfileEditor />
      <PinPrompt />
      <AccountModal />
      <Toasts />
    </MotionConfig>
  );
}

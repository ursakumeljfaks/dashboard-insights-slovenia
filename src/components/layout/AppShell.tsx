import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import SiteHeader from "./SiteHeader";

const pageTitles: Record<string, string> = {
  "/": "Pregled stanovanjskega trga | Domografski vpogled",
  "/compare": "Primerjava občin | Domografski vpogled",
  "/map": "Zemljevid občin | Domografski vpogled",
  "/methodology": "Metodologija | Domografski vpogled",
};

const AppShell = () => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const normalizedPath =
      location.pathname.length > 1 ? location.pathname.replace(/\/+$/, "") : location.pathname;
    document.title = pageTitles[normalizedPath] ?? "Stran ni najdena | Domografski vpogled";

    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      window.requestAnimationFrame(() => mainRef.current?.focus());
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[1300] -translate-y-24 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg transition-transform focus:translate-y-0"
      >
        Preskoči na vsebino
      </a>

      <SiteHeader />

      <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-border/80 bg-card/60">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Analitični prikaz občinskih podatkov ni individualna cenitev nepremičnine.</p>
          <div className="flex items-center gap-4">
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/methodology">
              Metodologija
            </Link>
            <span aria-hidden="true">·</span>
            <span>Slovenija</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;

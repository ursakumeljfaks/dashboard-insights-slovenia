import { BarChart3, BookOpen, Map, Scale } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { municipalityData } from "@/data/realEstateData";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Pregled", to: "/", icon: BarChart3, end: true },
  { label: "Primerjava", to: "/compare", icon: Scale, end: false },
  { label: "Zemljevid", to: "/map", icon: Map, end: false },
  { label: "Metodologija", to: "/methodology", icon: BookOpen, end: false },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    isActive
      ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/80"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[0.68rem] font-semibold leading-none transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );

const SiteHeader = () => (
  <header className="sticky top-0 z-[1200] border-b border-border/80 bg-background/90 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        aria-label="Nepremičninski trg Slovenije, domov"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-foreground text-background shadow-sm">
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-primary" aria-hidden="true" />
          <BarChart3 className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold tracking-[-0.01em] text-foreground sm:text-base">
            Nepremičninski trg
          </span>
          <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Slovenija
          </span>
        </span>
      </Link>

      <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Glavna navigacija">
        {navigation.map(({ label, to, end }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto hidden items-center gap-2 border-l pl-4 xl:flex">
        <span className="text-xs font-medium text-muted-foreground">
          Primerjalni nabor: {municipalityData.length}
        </span>
      </div>
    </div>

    <nav className="grid grid-cols-4 gap-1 border-t border-border/70 px-2 py-1 md:hidden" aria-label="Glavna navigacija">
      {navigation.map(({ label, to, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={mobileNavLinkClass}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  </header>
);

export default SiteHeader;

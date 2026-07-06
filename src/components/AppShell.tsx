import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Building2, FileText, Map, LayoutDashboard } from "lucide-react";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/", label: "Pregled", icon: LayoutDashboard },
  { to: "/map", label: "Zemljevid", icon: Map },
  { to: "/methodology", label: "Metodologija", icon: FileText },
];

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="dashboard-surface min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="leading-tight">
              <div className="font-semibold tracking-tight">
                Nepremičninski vpogledi
              </div>
              <div className="text-xs text-muted-foreground">
                Slovenija po občinah
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1 rounded-full border bg-card/80 p-1 shadow-sm">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 rounded-full px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
};

export default AppShell;
import { Link } from "@tanstack/react-router";
import {
  Gauge,
  History,
  House,
  MessageSquarePlus,
  TrainFront,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home", icon: House },
  { to: "/train", label: "Train", icon: TrainFront },
  { to: "/report", label: "Report", icon: MessageSquarePlus },
  { to: "/history", label: "History", icon: History },
  { to: "/admin", label: "Admin", icon: Gauge },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <TrainFront className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight">
                SETU
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                Surge Evaluation &amp; Transit Utility
              </span>
            </span>
          </Link>

          <span className="ml-auto rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            Demo Data · Prototype
          </span>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{
                  className: "bg-accent text-accent-foreground",
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

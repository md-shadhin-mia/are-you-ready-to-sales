"use client";

import * as React from "react";
import { LogOut, Menu } from "lucide-react";
import { cn } from "../lib/utils";
import { Sheet, SheetContent, SheetTitle } from "../components/sheet";
import { Avatar, AvatarFallback } from "../components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { Button } from "../components/button";

export interface AppShellNavItem<T extends string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}

export interface AppShellNavGroup<T extends string> {
  label: string;
  items: AppShellNavItem<T>[];
}

interface AppShellProps<T extends string> {
  brand: { name: string; tagline?: string; mark?: React.ReactNode };
  groups: AppShellNavGroup<T>[];
  activeId: T;
  onNavigate: (id: T) => void;
  user?: { name?: string; email?: string; role?: string };
  onLogout: () => void;
  /** Extra content in the topbar, right side (before the user menu). */
  topbarActions?: React.ReactNode;
  /** Extra content at the top of the sidebar below the brand. */
  sidebarHeader?: React.ReactNode;
  children: React.ReactNode;
}

function initials(name?: string) {
  if (!name) return "U";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function SidebarBody<T extends string>({
  brand,
  groups,
  activeId,
  onNavigate,
  sidebarHeader,
  user,
  onLogout,
}: Omit<AppShellProps<T>, "children" | "topbarActions">) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        {brand.mark ? (
          brand.mark
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0052FF] font-heading text-sm font-bold text-white shadow-sm">
            {brand.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-white">{brand.name}</p>
          {brand.tagline && <p className="truncate text-xs text-sidebar-muted">{brand.tagline}</p>}
        </div>
      </div>

      {sidebarHeader && <div className="border-b border-sidebar-border p-3">{sidebarHeader}</div>}

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 custom-scrollbar">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/80">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[#0052FF] text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-white" : "text-slate-400 group-hover:text-white"
                    )}
                  />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {item.badge}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-2.5 py-2">
          <div className="h-8 w-8 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
            {initials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user?.name || "Student Reseller"}</p>
            {user?.role && <p className="truncate font-mono text-[10px] text-slate-400">{user.role}</p>}
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sidebar + topbar application layout shared by the admin and student dashboards. */
export function AppShell<T extends string>(props: AppShellProps<T>) {
  const { groups, activeId, user, onLogout, topbarActions, children, onNavigate } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const activeItem = groups.flatMap((g) => g.items).find((i) => i.id === activeId);
  const activeGroup = groups.find((g) => g.items.some((i) => i.id === activeId));

  const navigate = (id: T) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <SidebarBody {...props} onNavigate={navigate} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" hideClose className="w-72 border-none p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody {...props} onNavigate={navigate} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
          <div className="min-w-0 flex-1">
            {activeGroup && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{activeGroup.label}</p>}
            <p className="truncate text-base font-bold text-slate-900 tracking-tight">{activeItem?.label}</p>
          </div>
          {topbarActions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#0E2046] text-white font-bold text-xs select-none">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-semibold">{user?.name || "User"}</p>
                {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

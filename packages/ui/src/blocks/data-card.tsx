import * as React from "react";
import { cn } from "../lib/utils";
import { Card } from "../components/card";
import { Skeleton } from "../components/skeleton";
import { EmptyState } from "./empty-state";

interface DataCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header content: filters, search, buttons. */
  toolbar?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}

/** Card shell for tables and lists with header, toolbar, loading skeleton and empty state. */
export function DataCard({
  title,
  description,
  toolbar,
  loading,
  empty,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyIcon,
  children,
  className,
}: DataCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || toolbar) && (
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            {title && <h3 className="font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}
      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : empty ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        children
      )}
    </Card>
  );
}

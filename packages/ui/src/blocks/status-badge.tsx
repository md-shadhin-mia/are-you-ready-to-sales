import * as React from "react";
import { Badge, type BadgeProps } from "../components/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANTS: Record<string, Variant> = {
  // positive
  ACTIVE: "success",
  APPROVED: "success",
  COMPLETED: "success",
  DELIVERED: "success",
  PAID: "success",
  PUBLISHED: "success",
  VERIFIED: "success",
  SETTLED: "success",
  CONFIRMED: "success",
  // in progress
  PENDING: "warning",
  PROCESSING: "info",
  REQUESTED: "warning",
  IN_REVIEW: "warning",
  PACKED: "info",
  SHIPPED: "info",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "info",
  DRAFT: "secondary",
  // negative
  CANCELLED: "destructive",
  CANCELED: "destructive",
  REJECTED: "destructive",
  FAILED: "destructive",
  RETURNED: "destructive",
  SUSPENDED: "destructive",
  BANNED: "destructive",
  FLAGGED: "destructive",
  HIDDEN: "secondary",
  INACTIVE: "secondary",
};

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string | null | undefined;
  /** Override the automatic mapping. */
  variant?: Variant;
}

/** Renders a status string (e.g. "IN_TRANSIT") as a colored badge with a readable label. */
export function StatusBadge({ status, variant, className, ...props }: StatusBadgeProps) {
  const key = (status || "UNKNOWN").toUpperCase();
  const label = key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant={variant ?? STATUS_VARIANTS[key] ?? "outline"} className={className} {...props}>
      {label}
    </Badge>
  );
}

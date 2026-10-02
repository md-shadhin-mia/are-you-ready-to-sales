import React from "react";
import { Badge } from "@repo/ui";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const norm = status?.toUpperCase() || "UNKNOWN";

  const getVariant = () => {
    switch (norm) {
      case "ACTIVE":
      case "APPROVED":
      case "VERIFIED":
      case "COMPLETE":
      case "COMPLETED":
      case "PAID":
      case "DELIVERED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "NEW":
      case "PENDING":
      case "PENDING_APPROVAL":
      case "DRAFT":
      case "INVOICED":
      case "UPCOMING":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "IN_COURIER":
      case "IN_PROGRESS":
      case "IN_TRANSIT":
      case "PARTIAL":
      case "PARTIAL_DELIVERED":
      case "EXCHANGE":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "HOLD":
      case "UNMATCH":
      case "DISPUTED":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "CANCELLED":
      case "REJECTED":
      case "SUSPENDED":
      case "DAMAGED":
      case "RETURNED":
      case "FAILED":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Badge
      variant="outline"
      className={`font-semibold tracking-wider px-2.5 py-0.5 uppercase text-[10px] rounded-full border ${getVariant()} ${className}`}
    >
      {norm.replace(/_/g, " ")}
    </Badge>
  );
};

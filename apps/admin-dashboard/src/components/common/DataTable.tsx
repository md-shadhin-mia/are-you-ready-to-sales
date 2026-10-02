import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Input,
  Button,
  Badge,
} from "@repo/ui";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter } from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  statusOptions?: { label: string; value: string }[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: React.ReactNode;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  actionsHeader?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  searchPlaceholder = "Search records...",
  searchQuery = "",
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions,
  page = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  emptyTitle = "No records found",
  emptyDescription = "There are no matching items for the current filter criteria.",
  onRowClick,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState("");
  const activeSearch = onSearchChange ? searchQuery : internalSearch;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map(keyExtractor));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const filteredData = onSearchChange
    ? data
    : data.filter((row: any) => {
        if (!internalSearch.trim()) return true;
        const s = internalSearch.toLowerCase();
        return Object.values(row).some(
          (val) => val && String(val).toLowerCase().includes(s),
        );
      });

  const allSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={activeSearch}
            onChange={(e) => {
              if (onSearchChange) onSearchChange(e.target.value);
              else setInternalSearch(e.target.value);
            }}
            placeholder={searchPlaceholder}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {statusOptions && onStatusFilterChange && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={statusFilter || ""}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {selectable && (
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.key} className={`text-xs font-semibold ${col.className || ""}`}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {selectable && <TableCell className="w-10" />}
                    {columns.map((col) => (
                      <TableCell key={col.key} className="py-3">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-36 text-center text-muted-foreground"
                  >
                    <p className="font-medium text-sm text-foreground">{emptyTitle}</p>
                    <p className="text-xs mt-1">{emptyDescription}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => {
                  const id = keyExtractor(row);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <TableRow
                      key={id}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`hover:bg-muted/30 transition-colors ${
                        onRowClick ? "cursor-pointer" : ""
                      } ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      {selectable && (
                        <TableCell className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => handleSelectOne(id, e)}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className={`text-xs ${col.className || ""}`}>
                          {col.render ? col.render(row) : (row as any)[col.key] ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer & Pagination */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {totalItems !== undefined
              ? `Showing ${filteredData.length} of ${totalItems} items`
              : `Total ${filteredData.length} items`}
          </div>

          {totalPages > 1 && onPageChange && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Sticky Bulk Actions Bar */}
      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="sticky bottom-4 z-40 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Badge variant="secondary" className="bg-background/20 text-background">
              {selectedIds.length}
            </Badge>
            <span>Items Selected</span>
          </div>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}
    </div>
  );
}

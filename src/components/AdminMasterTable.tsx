"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

type Column<T> = {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  filterFn?: (row: T, query: string) => boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  filterPlaceholder?: string;
  filterable?: boolean;
  sortable?: boolean;
  sortFn?: (rowA: T, rowB: T) => number;
  sortAccessor?: (row: T) => string | number | null | undefined;
};

export type AdminMasterTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  className?: string;
  onSelectionChange?: (selected: string[]) => void;
  pageSize?: number;
  options?: {
    showFilters?: boolean;
    showPagination?: boolean;
    selectable?: boolean;
    pageSizeOptions?: number[];
  };
};

export function AdminMasterTable<T>({
  columns,
  data,
  rowKey,
  className,
  onSelectionChange,
  pageSize: pageSizeProp,
  options,
}: AdminMasterTableProps<T>) {
  const initialFilters = useMemo(
    () => columns.reduce<Record<string, string>>((acc, column) => ({ ...acc, [column.id]: '' }), {}),
    [columns],
  );

  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return columns.every((column) => {
        const query = filters[column.id] || '';
        const filterable = column.filterable ?? true;
        if (!filterable || !query.trim()) return true;
        const normalized = query.trim().toLowerCase();
        if (column.filterFn) return column.filterFn(row, normalized);
        const value = column.accessor(row);
        if (typeof value === 'string' || typeof value === 'number') {
          return `${value}`.toLowerCase().includes(normalized);
        }
        return false;
      });
    });
  }, [data, columns, filters]);

  const getSortValue = (column: Column<T>, row: T) => {
    const accessorValue = column.sortAccessor?.(row);
    if (accessorValue != null) return accessorValue;
    const raw = column.accessor(row);
    if (typeof raw === 'string' || typeof raw === 'number') return raw;
    return null;
  };

  const [sortState, setSortState] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);
  const showFilters = options?.showFilters ?? true;
  const showPagination = options?.showPagination ?? true;
  const selectable = options?.selectable ?? true;

  const sortedData = useMemo(() => {
    if (!sortState) return filteredData;
    const column = columns.find((col) => col.id === sortState.columnId);
    if (!column) return filteredData;
    return [...filteredData].sort((a, b) => {
      const direction = sortState.direction === 'asc' ? 1 : -1;
      if (column.sortFn) return column.sortFn(a, b) * direction;
      const valueA = getSortValue(column, a);
      const valueB = getSortValue(column, b);
      if (valueA === valueB) return 0;
      if (valueA == null) return 1 * direction;
      if (valueB == null) return -1 * direction;
      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  }, [filteredData, sortState, columns]);

  const allVisibleSelected = selectable && sortedData.length > 0 && sortedData.every((row) => selectedIds.has(rowKey(row)));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        sortedData.forEach((row) => next.delete(rowKey(row)));
      } else {
        sortedData.forEach((row) => next.add(rowKey(row)));
      }
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const [currentPageSize, setCurrentPageSize] = useState(pageSizeProp ?? options?.pageSize ?? 5);
  useEffect(() => {
    if (pageSizeProp == null) {
      setCurrentPageSize(options?.pageSize ?? 5);
    }
  }, [options?.pageSize, pageSizeProp]);

  const pageSize = pageSizeProp ?? currentPageSize;
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData.length, pageSize, sortState, showPagination]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const normalizedPage = Math.max(1, Math.min(currentPage, totalPages));
  const pageData = showPagination
    ? sortedData.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize)
    : sortedData;
  const displayData = showPagination ? pageData : sortedData;
  const startIndex = showPagination
    ? filteredData.length === 0
      ? 0
      : (normalizedPage - 1) * pageSize + 1
    : displayData.length === 0
    ? 0
    : 1;
  const endIndex = showPagination
    ? filteredData.length === 0
      ? 0
      : Math.min(normalizedPage * pageSize, filteredData.length)
    : displayData.length;

  return (
    <div className={cn('border rounded-sm overflow-hidden', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 h-12">
            <th className="p-3 w-[52px] text-left">
              {selectable && (
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAll}
                  className="focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
                />
              )}
            </th>
            {columns.map((column) => {
              const isSortable = column.sortable ?? Boolean(column.sortAccessor || column.sortFn);
              const isSorted = sortState?.columnId === column.id;
              const direction = isSorted ? sortState?.direction : null;
              return (
                <th
                  key={column.id}
                  className={cn(
                    'p-3 font-medium text-xs uppercase tracking-wider text-muted-foreground',
                    {
                      'text-right': column.align === 'right',
                      'text-center': column.align === 'center',
                      'cursor-pointer select-none': isSortable,
                    },
                  )}
                  style={{ width: column.width }}
                  onClick={() => {
                    if (!isSortable) return;
                    setSortState((prev) => {
                      if (!prev || prev.columnId !== column.id) return { columnId: column.id, direction: 'asc' };
                      if (prev.direction === 'asc') return { columnId: column.id, direction: 'desc' };
                      return null;
                    });
                  }}
                  role={isSortable ? 'button' : undefined}
                  tabIndex={isSortable ? 0 : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {isSortable && (
                      <span className="text-muted-foreground">
                        {direction === 'asc' && <ArrowUp className="h-3 w-3" aria-label="sorted ascending" />}
                        {direction === 'desc' && <ArrowDown className="h-3 w-3" aria-label="sorted descending" />}
                        {!direction && <ArrowUpDown className="h-3 w-3" aria-label="sortable" />}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
          {showFilters && (
            <tr className="border-b bg-background">
              <th className="p-2.5"></th>
              {columns.map((column) => (
                <th key={`${column.id}-filter`} className="p-2.5">
                  <Input
                    placeholder={column.filterPlaceholder || `Search ${column.header}`}
                    value={filters[column.id]}
                    onChange={(event) => {
                      const next = { ...filters, [column.id]: event.target.value };
                      setFilters(next);
                    }}
                    className="rounded-sm"
                  />
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {displayData.map((row) => (
            <tr className="border-b last:border-0" key={rowKey(row)}>
              <td className="p-3 text-left">
                <Checkbox
                  checked={selectedIds.has(rowKey(row))}
                  onCheckedChange={() => toggleSelectOne(rowKey(row))}
                  className="focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
                />
              </td>
              {columns.map((column) => (
                <td
                  key={`${rowKey(row)}-${column.id}`}
                  className={cn('p-3 align-middle', {
                    'text-right': column.align === 'right',
                    'text-center': column.align === 'center',
                  })}
                >
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted/50 bg-background/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {startIndex}-{endIndex} of {filteredData.length}
          </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={normalizedPage === 1}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {normalizedPage} of {totalPages}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={normalizedPage === totalPages}>
            Next
          </Button>
        </div>
          {options?.pageSizeOptions && options.pageSizeOptions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows</span>
            <select
              className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
              value={pageSize}
              onChange={(event) => {
                setCurrentPageSize(Number(event.target.value));
              }}
            >
              {options.pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

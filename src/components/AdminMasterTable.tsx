"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
    showSelection?: boolean;
    showSorting?: boolean;
    pageSizeOptions?: number[];
    multiSort?: boolean;
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

  const [sortState, setSortState] = useState<Array<{ columnId: string; direction: 'asc' | 'desc' }>>([]);
  const showFilters = options?.showFilters ?? true;
  const showPagination = options?.showPagination ?? true;
  const showSelection = options?.showSelection ?? true;
  const showSorting = options?.showSorting ?? true;
  const allowMultiSort = options?.multiSort ?? false;

  const sortedData = useMemo(() => {
    if (sortState.length === 0) return filteredData;
    return [...filteredData].sort((a, b) => {
      for (const sortEntry of sortState) {
        const column = columns.find(col => col.id === sortEntry.columnId);
        if (!column) continue;
        const direction = sortEntry.direction === 'asc' ? 1 : -1;
        if (column.sortFn) {
          const result = column.sortFn(a, b) * direction;
          if (result !== 0) return result;
          continue;
        }
        const valueA = getSortValue(column, a);
        const valueB = getSortValue(column, b);
        if (valueA === valueB) continue;
        if (valueA == null) return 1 * direction;
        if (valueB == null) return -1 * direction;
        return String(valueA).localeCompare(String(valueB)) * direction;
      }
      return 0;
    });
  }, [filteredData, sortState, columns]);

  const allVisibleSelected = showSelection && sortedData.length > 0 && sortedData.every((row) => selectedIds.has(rowKey(row)));

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
              {showSelection && (
                <th className="p-3 w-[52px] text-left">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    className="focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
                  />
                </th>
              )}
              {columns.map((column) => {
              const isSortable = showSorting && (column.sortable ?? Boolean(column.sortAccessor || column.sortFn));
              const sortEntry = sortState.find(entry => entry.columnId === column.id);
              const direction = sortEntry?.direction ?? null;
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
                  onClick={(event) => {
                    if (!isSortable) return;
                    const shiftKey = event.shiftKey && allowMultiSort;
                    setSortState((prev) => {
                      const existingIndex = prev.findIndex(entry => entry.columnId === column.id);
                      const existingEntry = existingIndex >= 0 ? prev[existingIndex] : null;
                      const clearStates = !shiftKey;

                      if (clearStates) {
                        if (!existingEntry) return [{ columnId: column.id, direction: 'asc' }];
                        if (existingEntry.direction === 'asc') return [{ columnId: column.id, direction: 'desc' }];
                        return [];
                      }

                      const nextState = [...prev];
                      if (!existingEntry) {
                        nextState.push({ columnId: column.id, direction: 'asc' });
                        return nextState;
                      }
                      if (existingEntry.direction === 'asc') {
                        nextState[existingIndex] = { columnId: column.id, direction: 'desc' };
                        return nextState;
                      }
                      nextState.splice(existingIndex, 1);
                      return nextState;
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
              {showSelection && <th className="p-2.5"></th>}
              {columns.map((column) => {
                const filterable = column.filterable ?? true;
                if (!filterable) return <th key={`${column.id}-filter`} className="p-2.5" />;
                return (
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
                );
              })}
            </tr>
          )}
        </thead>
        <tbody>
          {displayData.length === 0 ? (
            <tr>
              <td colSpan={(showSelection ? 1 : 0) + columns.length} className="p-6">
                <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-muted/40 bg-muted/5 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No records to display.</p>
                  <p className="text-xs text-muted-foreground/80">Try adjusting the filters or add new items.</p>
                </div>
              </td>
            </tr>
          ) : (
            displayData.map((row) => (
              <tr className="border-b last:border-0" key={rowKey(row)}>
                {showSelection && (
                  <td className="p-3 text-left">
                    <Checkbox
                      checked={selectedIds.has(rowKey(row))}
                      onCheckedChange={() => toggleSelectOne(rowKey(row))}
                      className="focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
                    />
                  </td>
                )}
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
            ))
          )}
        </tbody>
      </table>
      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted/50 bg-background/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {startIndex}-{endIndex} of {filteredData.length}
          </p>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={normalizedPage === 1}
            onClick={() => setCurrentPage(1)}
            aria-label="Go to first page"
            className="h-8 w-8"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={normalizedPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            aria-label="Go to previous page"
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {normalizedPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={normalizedPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            aria-label="Go to next page"
            className="h-8 w-8"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={normalizedPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            aria-label="Go to last page"
            className="h-8 w-8"
          >
            <ChevronsRight className="h-4 w-4" />
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

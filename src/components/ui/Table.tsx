import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

// ─── Column definition ─────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: keyof T | string;
  header: React.ReactNode;
  /** Custom cell renderer */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Allow sorting on this column */
  sortable?: boolean;
  /** Optional width class e.g. "w-24" */
  width?: string;
  /** Tailwind align class: "text-left" | "text-center" | "text-right" */
  align?: 'text-left' | 'text-center' | 'text-right';
  /** Hide column on small screens */
  hideOnMobile?: boolean;
}

// ─── Table props ───────────────────────────────────────────────────────────────

export interface TableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T>[];
  /** Unique row key accessor */
  rowKey: keyof T | ((row: T) => string | number);
  /** Show a top search bar */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Fields to search; defaults to all string fields */
  searchFields?: (keyof T)[];
  /** Rows per page (default 10) */
  pageSize?: number;
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  emptyDescription?: string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
  /** Optional slot above the table (actions, filters) */
  toolbar?: React.ReactNode;
}

// ─── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded-md bg-[#242220]/8 animate-pulse" />
      </td>
    ))}
  </tr>
);

// ─── Table component ───────────────────────────────────────────────────────────

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  rowKey,
  searchable = false,
  searchPlaceholder = 'Search…',
  searchFields,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No records found',
  emptyDescription,
  onRowClick,
  className,
  toolbar,
}: TableProps<T>) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) => {
      const fields = searchFields ?? (Object.keys(row) as (keyof T)[]);
      return fields.some((field) => {
        const val = row[field];
        return typeof val === 'string' && val.toLowerCase().includes(q);
      });
    });
  }, [data, query, searchFields]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      const cmp = av! < bv! ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const getKey = (row: T): string | number =>
    typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] as string | number);

  const getCellValue = (row: T, col: ColumnDef<T>, index: number): React.ReactNode => {
    const rawValue = typeof col.key === 'string' ? row[col.key] : undefined;
    if (col.render) return col.render(rawValue, row, index);
    if (rawValue == null) return <span className="text-[#242220]/30">—</span>;
    return String(rawValue);
  };

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {searchable && (
            <div className="relative w-full max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#242220]/35"
              />
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                className={clsx(
                  'h-9 w-full rounded-lg border border-[#242220]/18 bg-white pl-9 pr-3 text-sm',
                  'text-[#242220] placeholder:text-[#242220]/35',
                  'focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c]',
                )}
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-[#242220]/8 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#242220]/8 bg-[#faf9f7]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#242220]/50',
                    col.width,
                    col.align,
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.sortable && 'cursor-pointer select-none hover:text-[#242220]',
                  )}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ArrowUpDown
                        size={12}
                        className={clsx(
                          'shrink-0 transition-colors',
                          sortKey === String(col.key)
                            ? 'text-[#c9a84c]'
                            : 'text-[#242220]/25',
                        )}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#242220]/6">
            {loading ? (
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="text-[#242220]/15" />
                    <p className="font-medium text-[#242220]/50">{emptyMessage}</p>
                    {emptyDescription && (
                      <p className="text-xs text-[#242220]/35">{emptyDescription}</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, index) => (
                <tr
                  key={getKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'transition-colors duration-100',
                    onRowClick && 'cursor-pointer hover:bg-[#faf9f7]',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={clsx(
                        'px-4 py-3 text-[#242220]',
                        col.align,
                        col.hideOnMobile && 'hidden md:table-cell',
                      )}
                    >
                      {getCellValue(row, col, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-[#242220]/45 text-xs">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </p>

          <div className="flex items-center gap-1">
            <PaginationBtn
              icon={ChevronsLeft}
              onClick={() => setPage(1)}
              disabled={page === 1}
              label="First page"
            />
            <PaginationBtn
              icon={ChevronLeft}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              label="Previous page"
            />

            {/* Page numbers */}
            {buildPageNumbers(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[#242220]/30">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(Number(p))}
                  className={clsx(
                    'h-8 min-w-[2rem] rounded-lg px-2 text-xs font-medium transition-colors',
                    page === p
                      ? 'bg-[#c9a84c] text-white shadow-sm'
                      : 'text-[#242220]/60 hover:bg-[#242220]/6',
                  )}
                >
                  {p}
                </button>
              ),
            )}

            <PaginationBtn
              icon={ChevronRight}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              label="Next page"
            />
            <PaginationBtn
              icon={ChevronsRight}
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              label="Last page"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function PaginationBtn({
  icon: Icon,
  onClick,
  disabled,
  label,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }>;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#242220]/40 transition-colors hover:bg-[#242220]/6 hover:text-[#242220] disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon size={14} />
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];

  if (current > 3) pages.push('…');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('…');
  pages.push(total);

  return pages;
}

export default Table;

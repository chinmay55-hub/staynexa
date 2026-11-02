import React from 'react';
import clsx from 'clsx';

// ─── Status Enums ─────────────────────────────────────────────────────────────
export type RoomStatus = string;
export type HousekeepingStatus = string;
export type ReservationStatus = string;
export type OrderStatus = string;
export type RequestStatus = string;
export type MaintenanceStatus = string;
export type PaymentStatus = string;
export type HotelStatus = string;
export type AnyStatus = string;

type BadgeStyle = {
  bg: string;
  text: string;
  ring: string;
  dot: string;
  label: string;
};

const STATUS_STYLES: Record<string, BadgeStyle> = {
  // Room
  available:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Available' },
  occupied:        { bg: 'bg-blue-50',     text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500',    label: 'Occupied' },
  reserved:        { bg: 'bg-violet-50',   text: 'text-violet-700',  ring: 'ring-violet-200',  dot: 'bg-violet-500',  label: 'Reserved' },
  maintenance:     { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500',   label: 'Maintenance' },
  out_of_service:  { bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Out of Service' },
  out_of_order:    { bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Out of Order' },

  // Housekeeping
  clean:           { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Clean' },
  dirty:           { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500',   label: 'Dirty' },
  cleaning:        { bg: 'bg-sky-50',      text: 'text-sky-700',     ring: 'ring-sky-200',     dot: 'bg-sky-500',     label: 'Cleaning' },
  in_progress:     { bg: 'bg-sky-50',      text: 'text-sky-700',     ring: 'ring-sky-200',     dot: 'bg-sky-500',     label: 'In Progress' },
  inspected:       { bg: 'bg-teal-50',     text: 'text-teal-700',    ring: 'ring-teal-200',    dot: 'bg-teal-500',    label: 'Inspected' },
  inspection_required: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500', label: 'Needs Inspection' },
  do_not_disturb:  { bg: 'bg-rose-50',     text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500',    label: 'Do Not Disturb' },

  // Reservation
  confirmed:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Confirmed' },
  pending:         { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-400',   label: 'Pending' },
  checked_in:      { bg: 'bg-blue-50',     text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500',    label: 'Checked In' },
  checked_out:     { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-200',   dot: 'bg-slate-400',   label: 'Checked Out' },
  cancelled:       { bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Cancelled' },
  no_show:         { bg: 'bg-orange-50',   text: 'text-orange-700',  ring: 'ring-orange-200',  dot: 'bg-orange-500',  label: 'No Show' },

  // Order
  accepted:        { bg: 'bg-blue-50',     text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500',    label: 'Accepted' },
  preparing:       { bg: 'bg-sky-50',      text: 'text-sky-700',     ring: 'ring-sky-200',     dot: 'bg-sky-500',     label: 'Preparing' },
  ready:           { bg: 'bg-teal-50',     text: 'text-teal-700',    ring: 'ring-teal-200',    dot: 'bg-teal-500',    label: 'Ready' },
  delivered:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Delivered' },

  // Maintenance & Requests
  new:             { bg: 'bg-rose-50',     text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500',    label: 'New' },
  open:            { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500',   label: 'Open' },
  assigned:        { bg: 'bg-blue-50',     text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500',    label: 'Assigned' },
  resolved:        { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Resolved' },
  verified:        { bg: 'bg-purple-50',   text: 'text-purple-700',  ring: 'ring-purple-200',  dot: 'bg-purple-500',  label: 'Verified' },
  closed:          { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-200',   dot: 'bg-slate-400',   label: 'Closed' },
  completed:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Completed' },

  // Payment
  paid:            { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Paid' },
  partial:         { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-400',   label: 'Partial' },
  refunded:        { bg: 'bg-violet-50',   text: 'text-violet-700',  ring: 'ring-violet-200',  dot: 'bg-violet-500',  label: 'Refunded' },
  failed:          { bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Failed' },

  // Hotel
  active:          { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',  label: 'Active' },
  setup:           { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-400',   label: 'Setup' },
  inactive:        { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-200',   dot: 'bg-slate-400',   label: 'Inactive' },
  suspended:       { bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Suspended' },
  trial:           { bg: 'bg-[#c9a84c]/10', text: 'text-[#a87e2e]', ring: 'ring-[#c9a84c]/30', dot: 'bg-[#c9a84c]', label: 'Trial' },
  archived:        { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-200',   dot: 'bg-slate-400',   label: 'Archived' },
};

const FALLBACK_STYLE: BadgeStyle = {
  bg: 'bg-slate-100',
  text: 'text-slate-700',
  ring: 'ring-slate-200',
  dot: 'bg-slate-400',
  label: '',
};

export type BadgeSize = 'xs' | 'sm' | 'md';

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-2.5 py-1 text-sm gap-1.5',
};

export interface BadgeProps {
  status?: string;
  variant?: string;
  label?: string;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  size = 'sm',
  dot = false,
  className,
  children,
}) => {
  const normalizedKey = (status || (typeof children === 'string' ? children : '')).toLowerCase().replace(/-/g, '_');
  const style = STATUS_STYLES[normalizedKey] ?? FALLBACK_STYLE;
  const displayContent = children ?? label ?? (style.label || status);

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        style.bg,
        style.text,
        style.ring,
        sizeStyles[size],
        className,
      )}
    >
      {dot && (
        <span className={clsx('shrink-0 rounded-full h-1.5 w-1.5', style.dot)} />
      )}
      {displayContent}
    </span>
  );
};

export const RoomStatusBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const HousekeepingBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const ReservationBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const OrderBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const RequestBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const MaintenanceBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const PaymentBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);
export const HotelStatusBadge: React.FC<{ status: any; size?: BadgeSize }> = ({ status, size }) => (
  <Badge status={String(status)} size={size} dot />
);

export default Badge;

// GlobalSearch – modal-based search across guests, rooms, reservations
import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, DoorOpen, CalendarDays, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/useAuth';
import { guestService, reservationService, roomService } from '../../services/demoDataService';
import type { Guest, Reservation, Room } from '../../types';

// ─── Result types ─────────────────────────────────────────────────────────────

type ResultCategory = 'guest' | 'reservation' | 'room';

interface SearchResult {
  id: string;
  category: ResultCategory;
  primary: string;
  secondary: string;
  path: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryIcon(cat: ResultCategory) {
  switch (cat) {
    case 'guest':       return <User size={15} className="text-blue-500" />;
    case 'reservation': return <CalendarDays size={15} className="text-green-500" />;
    case 'room':        return <DoorOpen size={15} className="text-purple-500" />;
  }
}

function categoryLabel(cat: ResultCategory) {
  switch (cat) {
    case 'guest':       return 'Guest';
    case 'reservation': return 'Reservation';
    case 'room':        return 'Room';
  }
}

function getBasePath(role: string): string {
  if (role === 'SUPER_ADMIN') return '/super-admin';
  if (role === 'RECEPTION')   return '/reception';
  return '/hotel';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const hotelId = user?.hotel_id;
  const basePath = getBasePath(user?.role ?? '');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setSelectedIdx(0);
    }
  }

  // Auto-focus when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const deferredQuery = useDeferredValue(query);
  const loading = query !== deferredQuery;

  const results = useMemo<SearchResult[]>(() => {
    const q = deferredQuery;
    if (!hotelId || q.trim().length < 2) return [];
    const out: SearchResult[] = [];

    const guestHits: Guest[] = guestService.search(hotelId, q).slice(0, 4);
    guestHits.forEach(g => {
      out.push({
        id: g.id,
        category: 'guest',
        primary: `${g.first_name} ${g.last_name}`,
        secondary: [g.phone, g.email].filter(Boolean).join(' · '),
        path: `${basePath}/guests/${g.id}`,
      });
    });

    const resHits: Reservation[] = reservationService.getAll(hotelId)
      .filter(r =>
        r.id.toLowerCase().includes(q.toLowerCase()) ||
        (r.guest && `${r.guest.first_name} ${r.guest.last_name}`.toLowerCase().includes(q.toLowerCase())) ||
        (r.room && r.room.number.toLowerCase().includes(q.toLowerCase())) ||
        (r.external_booking_id ?? '').toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 4);
    resHits.forEach(r => {
      out.push({
        id: r.id,
        category: 'reservation',
        primary: r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : r.id,
        secondary: `${r.check_in_date} → ${r.check_out_date} · ${r.status}`,
        path: `${basePath}/reservations/${r.id}`,
      });
    });

    const roomHits: Room[] = roomService.getAll(hotelId)
      .filter(r =>
        r.number.toLowerCase().includes(q.toLowerCase()) ||
        (r.room_type?.name ?? '').toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 4);
    roomHits.forEach(r => {
      out.push({
        id: r.id,
        category: 'room',
        primary: `Room ${r.number}`,
        secondary: `${r.room_type?.name ?? ''} · Floor ${r.floor} · ${r.status}`,
        path: `${basePath}/rooms/${r.id}`,
      });
    });

    return out;
  }, [hotelId, basePath, deferredQuery]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  }

  function handleSelect(result: SearchResult) {
    navigate(result.path);
    onClose();
  }

  if (!open) return null;

  // Group results by category
  const grouped: Record<ResultCategory, SearchResult[]> = {
    guest: results.filter(r => r.category === 'guest'),
    reservation: results.filter(r => r.category === 'reservation'),
    room: results.filter(r => r.category === 'room'),
  };

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200/80">
          {loading
            ? <Loader2 size={18} className="text-[#c9a84c] animate-spin shrink-0" />
            : <Search size={18} className="text-[#8a8785] shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            placeholder="Search guests, rooms, reservations…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-[#242220] placeholder-stone-400 bg-transparent outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-1 rounded text-stone-400 hover:text-[#242220] transition-colors"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-stone-400 bg-stone-100 rounded border border-stone-200">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-[420px] overflow-y-auto py-2">
            {(['guest', 'reservation', 'room'] as ResultCategory[]).map(cat => {
              const items = grouped[cat];
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-4 pt-3 pb-1.5">
                    {categoryLabel(cat)}s
                  </p>
                  {items.map(result => {
                    const isSelected = globalIdx === selectedIdx;
                    const currentIdx = globalIdx++;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIdx(currentIdx)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-[#c9a84c]/10' : 'hover:bg-stone-50',
                        )}
                      >
                        <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                          {categoryIcon(result.category)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#242220] truncate">{result.primary}</p>
                          <p className="text-xs text-[#8a8785] truncate">{result.secondary}</p>
                        </div>
                        {isSelected && (
                          <kbd className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-stone-400 font-medium">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="py-12 flex flex-col items-center gap-2 text-center">
            <Search size={28} className="text-stone-300" />
            <p className="text-sm font-medium text-[#8a8785]">No results for "{query}"</p>
            <p className="text-xs text-stone-400">Try searching by name, phone, or room number</p>
          </div>
        ) : query.length < 2 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center px-8">
            <div className="flex gap-3">
              {(['guest', 'reservation', 'room'] as ResultCategory[]).map(cat => (
                <div key={cat} className="flex flex-col items-center gap-1.5">
                  <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center">
                    {categoryIcon(cat)}
                  </div>
                  <span className="text-[11px] text-stone-400 capitalize">{cat}s</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-1">Type at least 2 characters to search</p>
          </div>
        ) : null}

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="border-t border-stone-100 px-4 py-2 flex items-center gap-4 text-[10px] text-stone-400">
            <span className="flex items-center gap-1"><kbd className="bg-stone-100 border border-stone-200 rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-stone-100 border border-stone-200 rounded px-1">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="bg-stone-100 border border-stone-200 rounded px-1">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalSearch;

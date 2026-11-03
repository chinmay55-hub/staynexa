// StayNexa Realtime Synchronization Engine
// Bridges Supabase Realtime WebSockets, BroadcastChannel, and Cross-Tab Storage Events
// Guarantees cross-device and instant synchronization between Guest Portal, KDS, Reception, and Housekeeping

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toDbHotelId } from '../utils/tenantId';
import type { Order, ServiceRequest, HousekeepingTask, Notification, ActivityLog, Reservation, Room, Folio, MaintenanceTicket, MenuItem, MenuCategory } from '../types';

export type RealtimeEventType = 
  | 'NEW_ORDER'
  | 'ORDER_STATUS_CHANGED'
  | 'NEW_SERVICE_REQUEST'
  | 'REQUEST_STATUS_CHANGED'
  | 'NEW_HOUSEKEEPING_TASK'
  | 'HOUSEKEEPING_TASK_UPDATED'
  | 'NEW_MAINTENANCE_TICKET'
  | 'MAINTENANCE_TICKET_UPDATED'
  | 'NEW_NOTIFICATION'
  | 'NEW_ACTIVITY_LOG'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_UPDATED'
  | 'ROOM_UPDATED'
  | 'MENU_UPDATED'
  | 'FOLIO_UPDATED'
  | 'MUTATION_FAILED';

export interface RealtimePayloadMap {
  NEW_ORDER: { order: Order };
  ORDER_STATUS_CHANGED: { orderId: string; status: Order['status']; order: Order };
  NEW_SERVICE_REQUEST: { request: ServiceRequest };
  REQUEST_STATUS_CHANGED: { requestId: string; status: ServiceRequest['status']; request: ServiceRequest };
  NEW_HOUSEKEEPING_TASK: { task: HousekeepingTask };
  HOUSEKEEPING_TASK_UPDATED: { taskId: string; task: HousekeepingTask };
  NEW_MAINTENANCE_TICKET: { ticket: MaintenanceTicket };
  MAINTENANCE_TICKET_UPDATED: { ticketId: string; ticket: MaintenanceTicket };
  NEW_NOTIFICATION: { notification: Notification };
  NEW_ACTIVITY_LOG: { log: ActivityLog };
  RESERVATION_CREATED: { reservation: Reservation };
  RESERVATION_UPDATED: { reservation: Reservation };
  ROOM_UPDATED: { room: Room };
  MENU_UPDATED: { item?: MenuItem; category?: MenuCategory };
  FOLIO_UPDATED: { folio: Folio };
  MUTATION_FAILED: { entity: string; id: string; error: string };
}

type EventCallback<T extends RealtimeEventType> = (payload: RealtimePayloadMap[T]) => void;

interface HotelChannelEntry {
  channel: any;
  refs: number;
  lostConnection: boolean;
}

const SEEN_EVENT_LIMIT = 500;

// Updates to the same record with the same status are distinct events, so they carry the record's timestamp.
const VERSIONED_EVENTS = new Set<string>([
  'ORDER_STATUS_CHANGED',
  'REQUEST_STATUS_CHANGED',
  'HOUSEKEEPING_TASK_UPDATED',
  'MAINTENANCE_TICKET_UPDATED',
  'RESERVATION_UPDATED',
  'ROOM_UPDATED',
  'FOLIO_UPDATED',
]);

// Same entity + status yields the same identity no matter which path delivered it
// (local action, BroadcastChannel, storage, Supabase broadcast, or Postgres change).
function eventIdentity(type: string, payload: any): string {
  const p = payload || {};
  const entity = p.order || p.request || p.task || p.ticket || p.notification || p.reservation || p.room || p.folio || p.log;
  const id = p.orderId ?? p.requestId ?? p.taskId ?? p.ticketId ?? entity?.id ?? p.id;
  if (id === undefined) return `${type}:${JSON.stringify(payload)}`;
  const status = String(p.status ?? entity?.status ?? '').toUpperCase();
  const version = VERSIONED_EVENTS.has(type) ? String(entity?.updated_at ?? '') : '';
  return `${type}:${id}:${status}:${version}`;
}

class RealtimeSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<RealtimeEventType, Set<EventCallback<any>>> = new Map();
  private hotelChannels: Map<string, HotelChannelEntry> = new Map();
  private seenEvents: Set<string> = new Set();
  private isConnectedToSupabase: boolean = false;
  private connectionChangeListeners: Set<(connected: boolean) => void> = new Set();
  private resyncListeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('staynexa_realtime_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type && event.data.payload) {
            this.receive(event.data.type as RealtimeEventType, event.data.payload);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, falling back to storage bus:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'staynexa_global_sync' && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.type && data.payload) {
              this.receive(data.type as RealtimeEventType, data.payload);
            }
          } catch (e) {
            console.warn('[RealtimeSync] Error parsing storage sync event:', e);
          }
        }
      });
    }
  }

  private markSeen(identity: string): boolean {
    if (this.seenEvents.has(identity)) return false;
    this.seenEvents.add(identity);
    if (this.seenEvents.size > SEEN_EVENT_LIMIT) {
      const iter = this.seenEvents.values();
      for (let i = 0; i < SEEN_EVENT_LIMIT / 2; i++) {
        const item = iter.next();
        if (!item.done) this.seenEvents.delete(item.value);
      }
    }
    return true;
  }

  public isSupabaseConnected(): boolean {
    return this.isConnectedToSupabase && isSupabaseConfigured() && !!supabase;
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionChangeListeners.add(callback);
    callback(this.isSupabaseConnected());
    return () => {
      this.connectionChangeListeners.delete(callback);
    };
  }

  // Fired after a dropped hotel channel reconnects, so screens can reload data missed while offline.
  public onResync(callback: () => void): () => void {
    this.resyncListeners.add(callback);
    return () => {
      this.resyncListeners.delete(callback);
    };
  }

  private setConnectionState(connected: boolean): void {
    if (this.isConnectedToSupabase !== connected) {
      this.isConnectedToSupabase = connected;
      this.connectionChangeListeners.forEach(cb => {
        try {
          cb(connected);
        } catch (e) {
          console.warn('[RealtimeSync] Error in connection listener:', e);
        }
      });
    }
  }

  private notifyResync(): void {
    this.resyncListeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.warn('[RealtimeSync] Error in resync listener:', e);
      }
    });
  }

  public subscribe<T extends RealtimeEventType>(type: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(callback);
      }
    };
  }

  private dispatchLocal<T extends RealtimeEventType>(type: T, payload: RealtimePayloadMap[T]): void {
    const set = this.listeners.get(type);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in realtime listener for ${type}:`, e);
        }
      });
    }
  }

  // Applies an event originating from this device's own action; relays it to other tabs and devices.
  public emit<T extends RealtimeEventType>(type: T, payload: RealtimePayloadMap[T]): void {
    this.markSeen(eventIdentity(type, payload));
    this.dispatchLocal(type, payload);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, payload });
      } catch (err) {
        console.warn('Failed to postMessage on BroadcastChannel:', err);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('staynexa_global_sync', JSON.stringify({
          type,
          payload,
          _ts: Date.now(),
        }));
      } catch {
        // Ignore quota limits
      }
    }

    if (isSupabaseConfigured() && supabase) {
      this.hotelChannels.forEach((entry) => {
        try {
          entry.channel.send({
            type: 'broadcast',
            event: type,
            payload,
          });
        } catch (err) {
          console.warn('[RealtimeSync] WebSocket broadcast send failed:', err);
        }
      });
    }
  }

  // Applies an event that arrived from another source; skipped if this device already applied it.
  public receive(type: RealtimeEventType, payload: any): void {
    if (!this.markSeen(eventIdentity(type, payload))) return;
    this.dispatchLocal(type, payload);
  }

  // Shares one channel per hotel between screens; the channel closes when the last screen releases it.
  public connectSupabaseHotelChannel(hotelId: string): () => void {
    if (!isSupabaseConfigured() || !supabase || !hotelId || typeof hotelId !== 'string') {
      return () => {};
    }

    const dbHotelId = toDbHotelId(hotelId);
    const existing = this.hotelChannels.get(dbHotelId);
    if (existing) {
      existing.refs += 1;
    } else {
      this.openHotelChannel(dbHotelId);
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.releaseHotelChannel(dbHotelId);
    };
  }

  private openHotelChannel(dbHotelId: string): void {
    if (!supabase) return;

    const channelKey = `staynexa-hotel-${dbHotelId}`;
    const channel = supabase.channel(channelKey)
      .on(
        'broadcast',
        { event: '*' },
        (event: { event?: string; payload?: any }) => {
          if (event.event && event.payload) {
            this.receive(event.event as RealtimeEventType, event.payload);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `hotel_id=eq.${dbHotelId}` },
        (payload) => {
          const rawOrder = payload.new as Order;
          if (!rawOrder) return;

          const safeOrder: Order = {
            ...rawOrder,
            items: rawOrder.items && Array.isArray(rawOrder.items) ? rawOrder.items : [],
          };

          if (payload.eventType === 'INSERT') {
            this.receive('NEW_ORDER', { order: safeOrder });
          } else if (payload.eventType === 'UPDATE') {
            this.receive('ORDER_STATUS_CHANGED', {
              orderId: rawOrder.id,
              status: rawOrder.status,
              order: safeOrder,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests', filter: `hotel_id=eq.${dbHotelId}` },
        (payload) => {
          const rawReq = payload.new as ServiceRequest;
          if (!rawReq) return;

          if (payload.eventType === 'INSERT') {
            this.receive('NEW_SERVICE_REQUEST', { request: rawReq });
          } else if (payload.eventType === 'UPDATE') {
            this.receive('REQUEST_STATUS_CHANGED', {
              requestId: rawReq.id,
              status: rawReq.status,
              request: rawReq,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'housekeeping_tasks', filter: `hotel_id=eq.${dbHotelId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            this.receive('NEW_HOUSEKEEPING_TASK', { task: payload.new as HousekeepingTask });
          } else if (payload.eventType === 'UPDATE') {
            this.receive('HOUSEKEEPING_TASK_UPDATED', {
              taskId: payload.new.id,
              task: payload.new as HousekeepingTask,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_tickets', filter: `hotel_id=eq.${dbHotelId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            this.receive('NEW_MAINTENANCE_TICKET', { ticket: payload.new as MaintenanceTicket });
          } else if (payload.eventType === 'UPDATE') {
            this.receive('MAINTENANCE_TICKET_UPDATED', {
              ticketId: payload.new.id,
              ticket: payload.new as MaintenanceTicket,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `hotel_id=eq.${dbHotelId}` },
        (payload) => {
          this.receive('NEW_NOTIFICATION', { notification: payload.new as Notification });
        }
      )
      .subscribe((status) => {
        const entry = this.hotelChannels.get(dbHotelId);
        if (!entry || entry.channel !== channel) return;

        if (status === 'SUBSCRIBED') {
          this.setConnectionState(true);
          if (entry.lostConnection) {
            entry.lostConnection = false;
            this.notifyResync();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          entry.lostConnection = true;
          this.setConnectionState(false);
        }
      });

    this.hotelChannels.set(dbHotelId, { channel, refs: 1, lostConnection: false });
  }

  private releaseHotelChannel(dbHotelId: string): void {
    const entry = this.hotelChannels.get(dbHotelId);
    if (!entry) return;

    entry.refs -= 1;
    if (entry.refs > 0) return;

    this.hotelChannels.delete(dbHotelId);
    if (supabase) {
      supabase.removeChannel(entry.channel);
    }
    if (this.hotelChannels.size === 0) {
      this.setConnectionState(false);
    }
  }
}

export const realtimeSync = new RealtimeSyncService();

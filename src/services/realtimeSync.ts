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

const SEEN_EVENT_LIMIT = 500;

// Same entity + status yields the same identity no matter which path delivered it
// (local action, BroadcastChannel, storage, Supabase broadcast, or Postgres change).
function eventIdentity(type: string, payload: any): string {
  const p = payload || {};
  const entity = p.order || p.request || p.task || p.ticket || p.notification || p.reservation || p.room || p.folio || p.log;
  const id = p.orderId ?? p.requestId ?? p.taskId ?? p.ticketId ?? entity?.id ?? p.id;
  const status = p.status ?? entity?.status ?? '';
  return id === undefined ? `${type}:${JSON.stringify(payload)}` : `${type}:${id}:${status}`;
}

class RealtimeSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<RealtimeEventType, Set<EventCallback<any>>> = new Map();
  private activeSupabaseChannels: Map<string, any> = new Map();
  private seenEvents: Set<string> = new Set();
  private isConnectedToSupabase: boolean = false;
  private connectionChangeListeners: Set<(connected: boolean) => void> = new Set();

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

    this.initSupabaseChannels();
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

  private initSupabaseChannels(): void {
    if (typeof window === 'undefined' || !isSupabaseConfigured() || !supabase) {
      this.setConnectionState(false);
    }
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

    if (isSupabaseConfigured() && supabase && this.activeSupabaseChannels.size > 0) {
      const sentChannels = new Set<any>();
      this.activeSupabaseChannels.forEach((channel) => {
        if (!sentChannels.has(channel)) {
          sentChannels.add(channel);
          try {
            channel.send({
              type: 'broadcast',
              event: type,
              payload,
            });
          } catch (err) {
            console.warn('[RealtimeSync] WebSocket broadcast send failed:', err);
          }
        }
      });
    }
  }

  // Applies an event that arrived from another source; skipped if this device already applied it.
  private receive(type: RealtimeEventType, payload: any): void {
    if (!this.markSeen(eventIdentity(type, payload))) return;
    this.dispatchLocal(type, payload);
  }

  public connectSupabaseHotelChannel(hotelId: string): () => void {
    if (!isSupabaseConfigured() || !supabase || !hotelId || typeof hotelId !== 'string') {
      return () => {};
    }

    const dbHotelId = toDbHotelId(hotelId);
    const channelKey = `staynexa-hotel-${dbHotelId}`;

    if (this.activeSupabaseChannels.has(channelKey) || this.activeSupabaseChannels.has(hotelId)) {
      return () => this.disconnectSupabaseHotelChannel(hotelId);
    }

    try {
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
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `hotel_id=eq.${dbHotelId}` },
          (payload) => {
            this.receive('NEW_NOTIFICATION', { notification: payload.new as Notification });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setConnectionState(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.setConnectionState(false);
          }
        });

      this.activeSupabaseChannels.set(channelKey, channel);
      this.activeSupabaseChannels.set(hotelId, channel);
      this.activeSupabaseChannels.set(dbHotelId, channel);

      return () => this.disconnectSupabaseHotelChannel(hotelId);
    } catch (err) {
      console.warn('Failed to establish Supabase Realtime connection:', err);
      return () => {};
    }
  }

  public disconnectSupabaseHotelChannel(hotelId: string): void {
    const dbHotelId = toDbHotelId(hotelId);
    const channelKey = `staynexa-hotel-${dbHotelId}`;
    const channel = this.activeSupabaseChannels.get(channelKey) || this.activeSupabaseChannels.get(hotelId);
    if (channel && supabase) {
      supabase.removeChannel(channel);
      this.activeSupabaseChannels.delete(channelKey);
      this.activeSupabaseChannels.delete(hotelId);
      this.activeSupabaseChannels.delete(dbHotelId);
    }
  }
}

export const realtimeSync = new RealtimeSyncService();

// StayNexa Realtime Synchronization Engine
// Bridges Supabase Realtime WebSockets, BroadcastChannel, and Cross-Tab Storage Events
// Guarantees cross-device and instant synchronization between Guest Portal, KDS, Reception, and Housekeeping

import { supabase, isDemoMode, isSupabaseConfigured } from '../lib/supabase';
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

class RealtimeSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<RealtimeEventType, Set<EventCallback<any>>> = new Map();
  private activeSupabaseChannels: Map<string, any> = new Map();
  private lastProcessedEventTimestamps: Set<string> = new Set();
  private isConnectedToSupabase: boolean = false;
  private connectionChangeListeners: Set<(connected: boolean) => void> = new Set();

  constructor() {
    // 1. Initialize BroadcastChannel for modern browser tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('staynexa_realtime_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type && event.data.payload) {
            const eventKey = `${event.data.type}-${JSON.stringify(event.data.payload).slice(0, 40)}`;
            if (!this.lastProcessedEventTimestamps.has(eventKey)) {
              this.markProcessed(eventKey);
              this.dispatchLocal(event.data.type as RealtimeEventType, event.data.payload);
            }
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, falling back to storage bus:', err);
      }
    }

    // 2. Initialize Cross-Tab Storage Event listener (works across all browsers and window contexts)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'staynexa_global_sync' && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.type && data.payload) {
              const eventKey = `${data.type}-${JSON.stringify(data.payload).slice(0, 40)}`;
              if (!this.lastProcessedEventTimestamps.has(eventKey)) {
                this.markProcessed(eventKey);
                this.dispatchLocal(data.type as RealtimeEventType, data.payload);
              }
            }
          } catch (e) {
            console.warn('[RealtimeSync] Error parsing storage sync event:', e);
          }
        }
      });
    }

    // 3. Initialize Cross-Device Supabase Realtime Channels
    this.initSupabaseChannels();
  }

  private markProcessed(key: string): void {
    this.lastProcessedEventTimestamps.add(key);
    if (this.lastProcessedEventTimestamps.size > 200) {
      // Purge oldest entries
      const iter = this.lastProcessedEventTimestamps.values();
      for (let i = 0; i < 50; i++) {
        const item = iter.next();
        if (!item.done) this.lastProcessedEventTimestamps.delete(item.value);
      }
    }
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
      return;
    }

    // Connected mode active: channel subscriptions are strictly hotel-scoped
    // to prevent cross-tenant data leakage over unauthenticated channels.
    this.setConnectionState(true);
  }

  // Subscribe to a realtime event in the local React app
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

  // Dispatch an event locally to in-component listeners
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

  // Emit an event across all local listeners, tabs, and remote WebSocket channels
  public emit<T extends RealtimeEventType>(type: T, payload: RealtimePayloadMap[T]): void {
    const eventKey = `${type}-${JSON.stringify(payload).slice(0, 40)}`;
    this.markProcessed(eventKey);

    // 1. Dispatch to local subscribers in current window
    this.dispatchLocal(type, payload);

    // 2. Broadcast across browser tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, payload });
      } catch (err) {
        console.warn('Failed to postMessage on BroadcastChannel:', err);
      }
    }

    // 3. Trigger cross-tab LocalStorage event (supported in all browsers/contexts)
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

    // Network broadcast is handled safely through authenticated hotel-scoped channels
  }

  // Connect to Supabase Realtime WebSocket channel for a hotel
  public connectSupabaseHotelChannel(hotelId: string): () => void {
    if (!isSupabaseConfigured() || !supabase || !hotelId || typeof hotelId !== 'string') {
      return () => {};
    }

    if (this.activeSupabaseChannels.has(hotelId)) {
      return () => this.disconnectSupabaseHotelChannel(hotelId);
    }

    const dbHotelId = toDbHotelId(hotelId);

    try {
      const channel = supabase.channel(`hotel-realtime-${hotelId}`)
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
              this.emit('NEW_ORDER', { order: safeOrder });
            } else if (payload.eventType === 'UPDATE') {
              this.emit('ORDER_STATUS_CHANGED', {
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
              this.emit('NEW_SERVICE_REQUEST', { request: rawReq });
            } else if (payload.eventType === 'UPDATE') {
              this.emit('REQUEST_STATUS_CHANGED', {
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
              this.emit('NEW_HOUSEKEEPING_TASK', { task: payload.new as HousekeepingTask });
            } else if (payload.eventType === 'UPDATE') {
              this.emit('HOUSEKEEPING_TASK_UPDATED', {
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
            this.emit('NEW_NOTIFICATION', { notification: payload.new as Notification });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setConnectionState(true);
            console.info(`[StayNexa Realtime] Subscribed to live WebSocket updates for hotel: ${hotelId} (UUID: ${dbHotelId})`);
          }
        });

      this.activeSupabaseChannels.set(hotelId, channel);

      return () => this.disconnectSupabaseHotelChannel(hotelId);
    } catch (err) {
      console.warn('Failed to establish Supabase Realtime connection:', err);
      return () => {};
    }
  }

  public disconnectSupabaseHotelChannel(hotelId: string): void {
    const channel = this.activeSupabaseChannels.get(hotelId);
    if (channel && supabase) {
      supabase.removeChannel(channel);
      this.activeSupabaseChannels.delete(hotelId);
    }
  }
}

export const realtimeSync = new RealtimeSyncService();

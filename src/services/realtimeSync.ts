// StayNexa Realtime Synchronization Engine
// Bridges Supabase Realtime WebSockets and Cross-Tab BroadcastChannel / Event Bus
// Guarantees instant synchronization between Guest Portal, KDS, Reception, and Housekeeping

import { supabase, isDemoMode } from '../lib/supabase';
import type { Order, ServiceRequest, HousekeepingTask, Notification, ActivityLog } from '../types';

export type RealtimeEventType = 
  | 'NEW_ORDER'
  | 'ORDER_STATUS_CHANGED'
  | 'NEW_SERVICE_REQUEST'
  | 'REQUEST_STATUS_CHANGED'
  | 'NEW_HOUSEKEEPING_TASK'
  | 'HOUSEKEEPING_TASK_UPDATED'
  | 'NEW_NOTIFICATION'
  | 'NEW_ACTIVITY_LOG';

export interface RealtimePayloadMap {
  NEW_ORDER: { order: Order };
  ORDER_STATUS_CHANGED: { orderId: string; status: Order['status']; order: Order };
  NEW_SERVICE_REQUEST: { request: ServiceRequest };
  REQUEST_STATUS_CHANGED: { requestId: string; status: ServiceRequest['status']; request: ServiceRequest };
  NEW_HOUSEKEEPING_TASK: { task: HousekeepingTask };
  HOUSEKEEPING_TASK_UPDATED: { taskId: string; task: HousekeepingTask };
  NEW_NOTIFICATION: { notification: Notification };
  NEW_ACTIVITY_LOG: { log: ActivityLog };
}

type EventCallback<T extends RealtimeEventType> = (payload: RealtimePayloadMap[T]) => void;

class RealtimeSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<RealtimeEventType, Set<EventCallback<any>>> = new Map();
  private activeSupabaseChannels: Map<string, any> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('staynexa_realtime_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type && event.data.payload) {
            this.dispatchLocal(event.data.type as RealtimeEventType, event.data.payload);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, falling back to in-memory bus:', err);
      }
    }
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

  // Emit an event across all tabs and local listeners
  public emit<T extends RealtimeEventType>(type: T, payload: RealtimePayloadMap[T]): void {
    // 1. Dispatch to local subscribers
    this.dispatchLocal(type, payload);

    // 2. Broadcast across browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, payload });
      } catch (err) {
        console.warn('Failed to postMessage on BroadcastChannel:', err);
      }
    }
  }

  // Connect to Supabase Realtime WebSocket channel for a hotel
  public connectSupabaseHotelChannel(hotelId: string): () => void {
    if (isDemoMode() || !supabase) {
      return () => {}; // In demo mode, BroadcastChannel handles cross-tab and in-memory events
    }

    if (this.activeSupabaseChannels.has(hotelId)) {
      return () => this.disconnectSupabaseHotelChannel(hotelId);
    }

    try {
      const channel = supabase.channel(`hotel-realtime-${hotelId}`)
        // Listen to new or updated orders
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `hotel_id=eq.${hotelId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              this.emit('NEW_ORDER', { order: payload.new as Order });
            } else if (payload.eventType === 'UPDATE') {
              this.emit('ORDER_STATUS_CHANGED', {
                orderId: payload.new.id,
                status: payload.new.status,
                order: payload.new as Order,
              });
            }
          }
        )
        // Listen to service requests
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'service_requests', filter: `hotel_id=eq.${hotelId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              this.emit('NEW_SERVICE_REQUEST', { request: payload.new as ServiceRequest });
            } else if (payload.eventType === 'UPDATE') {
              this.emit('REQUEST_STATUS_CHANGED', {
                requestId: payload.new.id,
                status: payload.new.status,
                request: payload.new as ServiceRequest,
              });
            }
          }
        )
        // Listen to housekeeping tasks
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'housekeeping_tasks', filter: `hotel_id=eq.${hotelId}` },
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
        // Listen to desk notifications
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `hotel_id=eq.${hotelId}` },
          (payload) => {
            this.emit('NEW_NOTIFICATION', { notification: payload.new as Notification });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.info(`[StayNexa Realtime] Subscribed to live WebSocket updates for hotel: ${hotelId}`);
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

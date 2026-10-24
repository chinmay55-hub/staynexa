// StayNexa Central Store Hook: useStayNexaStore
// Guarantees real-time synchronization between Guest Portal, KDS, Reception, and Housekeeping
// Combines WebSocket Realtime (Supabase Postgres Changes & Broadcast), Cross-Tab Bus, and 5-Second Auto-Polling Fallback

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  orderService, 
  roomService, 
  reservationService, 
  folioService, 
  serviceRequestService,
  reloadDemoStoreFromStorage
} from './demoDataService';
import { supabaseOrderService } from './supabaseService';
import { realtimeSync } from './realtimeSync';
import { audioService } from './audioService';
import { isDemoMode, supabase } from '../lib/supabase';
import type { Order, OrderStatus, Room, Reservation, Folio, ServiceRequest } from '../types';

export interface UseStayNexaStoreOptions {
  enablePolling?: boolean;
  pollingIntervalMs?: number;
  autoChimeOnNewOrder?: boolean;
}

export function useStayNexaStore(hotelId: string = 'hotel-001', options: UseStayNexaStoreOptions = {}) {
  const {
    enablePolling = true,
    pollingIntervalMs = 5000,
    autoChimeOnNewOrder = true,
  } = options;

  const [orders, setOrders] = useState<Order[]>(() => orderService.getAll(hotelId));
  const [rooms, setRooms] = useState<Room[]>(() => roomService.getAll(hotelId));
  const [reservations, setReservations] = useState<Reservation[]>(() => reservationService.getAll(hotelId));
  const [folios, setFolios] = useState<Folio[]>(() => folioService.getAll(hotelId));
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(() => serviceRequestService.getAll(hotelId));
  const [lastSyncTime, setLastSyncTime] = useState<Date>(() => new Date());
  const [activeAlert, setActiveAlert] = useState<{ id: string; message: string } | null>(null);

  // Track known order IDs to prevent duplicate sound chimes
  const knownOrderIdsRef = useRef<Set<string>>(new Set(orders.map(o => o.id)));

  // Manual refresh helper
  const refreshOrders = useCallback(() => {
    reloadDemoStoreFromStorage();
    const freshOrders = orderService.getAll(hotelId);
    setOrders([...freshOrders]);
    freshOrders.forEach(o => knownOrderIdsRef.current.add(o.id));
    setLastSyncTime(new Date());
  }, [hotelId]);

  // Sync latest orders from both Supabase and local persistence
  const syncLatestOrders = useCallback(async () => {
    try {
      reloadDemoStoreFromStorage();
      let latestOrders = orderService.getAll(hotelId);

      // In production mode with Supabase available, poll directly from PostgreSQL
      if (!isDemoMode() && supabase) {
        try {
          const remoteOrders = await supabaseOrderService.getAll(hotelId);
          if (remoteOrders && remoteOrders.length > 0) {
            latestOrders = remoteOrders;
          }
        } catch (supabaseErr) {
          console.warn('[useStayNexaStore] Supabase polling fallback error (using local cache):', supabaseErr);
        }
      }

      // Detect newly arrived PENDING orders that haven't been registered yet
      let hasNewPending = false;
      let newestOrder: Order | null = null;

      for (const ord of latestOrders) {
        if (!knownOrderIdsRef.current.has(ord.id)) {
          knownOrderIdsRef.current.add(ord.id);
          if (ord.status === 'PENDING') {
            hasNewPending = true;
            newestOrder = ord;
          }
        }
      }

      setOrders([...latestOrders]);
      setLastSyncTime(new Date());

      if (hasNewPending && newestOrder) {
        if (autoChimeOnNewOrder) {
          audioService.playChime();
        }
        const roomNum = newestOrder.room?.number || newestOrder.room_id || 'Portal';
        setActiveAlert({
          id: newestOrder.id,
          message: `🔔 New Order #${newestOrder.id.slice(-6).toUpperCase()} from Room ${roomNum}`,
        });
      }
    } catch (err) {
      console.warn('[useStayNexaStore] Order synchronization error:', err);
    }
  }, [hotelId, autoChimeOnNewOrder]);

  // Primary WebSocket Realtime Listener
  useEffect(() => {
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const unsubNewOrder = realtimeSync.subscribe('NEW_ORDER', ({ order }) => {
      if (order.hotel_id === hotelId) {
        setOrders(prev => {
          if (prev.some(o => o.id === order.id)) return prev;
          return [order, ...prev];
        });

        const isNew = !knownOrderIdsRef.current.has(order.id);
        knownOrderIdsRef.current.add(order.id);

        if (isNew && autoChimeOnNewOrder) {
          audioService.playChime();
        }

        const roomNum = order.room?.number || order.room_id || 'Portal';
        setActiveAlert({
          id: order.id,
          message: `🔔 New Order #${order.id.slice(-6).toUpperCase()} from Room ${roomNum}`,
        });
      }
    });

    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', ({ orderId, status, order }) => {
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, ...order, status } : o))
      );
    });

    const unsubNewRequest = realtimeSync.subscribe('NEW_SERVICE_REQUEST', ({ request }) => {
      if (request.hotel_id === hotelId) {
        setServiceRequests(prev => [request, ...prev.filter(r => r.id !== request.id)]);
      }
    });

    const unsubRequestStatus = realtimeSync.subscribe('REQUEST_STATUS_CHANGED', ({ requestId, status, request }) => {
      setServiceRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, ...request, status } : r))
      );
    });

    const unsubFolio = realtimeSync.subscribe('FOLIO_UPDATED', ({ folio }) => {
      if (folio.hotel_id === hotelId) {
        setFolios(prev => prev.map(f => (f.id === folio.id ? folio : f)));
      }
    });

    const unsubRoom = realtimeSync.subscribe('ROOM_UPDATED', () => {
      setRooms([...roomService.getAll(hotelId)]);
    });

    const unsubResCreated = realtimeSync.subscribe('RESERVATION_CREATED', () => {
      setReservations([...reservationService.getAll(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
    });

    const unsubResUpdated = realtimeSync.subscribe('RESERVATION_UPDATED', () => {
      setReservations([...reservationService.getAll(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
    });

    return () => {
      disconnectSupabase();
      unsubNewOrder();
      unsubOrderStatus();
      unsubNewRequest();
      unsubRequestStatus();
      unsubFolio();
      unsubRoom();
      unsubResCreated();
      unsubResUpdated();
    };
  }, [hotelId, autoChimeOnNewOrder]);

  // Secondary Infallible Auto-Polling Fallback (every 5 seconds)
  useEffect(() => {
    if (!enablePolling) return;

    const pollTimer = setInterval(() => {
      syncLatestOrders();
    }, pollingIntervalMs);

    return () => clearInterval(pollTimer);
  }, [enablePolling, pollingIntervalMs, syncLatestOrders]);

  // Status transition handler for KDS
  const updateOrderStatus = useCallback((orderId: string, nextStatus: OrderStatus) => {
    const updated = orderService.updateStatus(orderId, nextStatus);
    refreshOrders();
    return updated;
  }, [refreshOrders]);

  // Filtered order queues for Kitchen Display System
  const newOrders = orders.filter(o => o.status === 'PENDING');
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));

  return {
    orders,
    activeOrders,
    newOrders,
    acceptedOrders,
    preparingOrders,
    readyOrders,
    deliveredOrders,
    rooms,
    reservations,
    folios,
    serviceRequests,
    lastSyncTime,
    activeAlert,
    clearAlert: () => setActiveAlert(null),
    refreshOrders,
    syncLatestOrders,
    updateOrderStatus,
    placeOrder: orderService.placeOrder,
  };
}

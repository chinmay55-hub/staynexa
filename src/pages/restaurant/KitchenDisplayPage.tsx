import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChefHat, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Flame, 
  ArrowRight, 
  LogOut, 
  ArrowLeft, 
  ChevronDown, 
  UserCheck,
  Volume2,
  VolumeX,
  Printer,
  X,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { orderService, hotelService, reloadDemoStoreFromStorage } from '../../services/demoDataService';
import { audioService } from '../../services/audioService';
import { realtimeSync } from '../../services/realtimeSync';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { toDbHotelId, isSameHotel } from '../../utils/tenantId';
import type { Order, OrderStatus } from '../../types';
import { Button } from '../../components/ui';

export default function KitchenDisplayPage() {
  const { user, signOut, signIn } = useAuth();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);

  const [orders, setOrders] = useState<Order[]>(() => orderService.getActive(hotelId));
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [liveAlertBanner, setLiveAlertBanner] = useState<{ id: string; message: string } | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(() => realtimeSync.isSupabaseConnected());

  // Subscribe to realtime connection state changes
  useEffect(() => {
    const unsubConn = realtimeSync.onConnectionChange(setIsRealtimeConnected);
    return unsubConn;
  }, []);

  // KDS Sound State
  const [isMuted, setIsMuted] = useState(() => audioService.isAudioMuted());
  const [isUnlocked, setIsUnlocked] = useState(() => audioService.isAudioUnlocked());

  // KOT Thermal Print Modal State
  const [selectedKotOrder, setSelectedKotOrder] = useState<Order | null>(null);
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');

  // Live timer tick every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const refreshOrders = () => {
    reloadDemoStoreFromStorage();
    setOrders([...orderService.getActive(hotelId)]);
  };

    const handleClearCompleted = () => {
    orderService.clearCompleted(hotelId);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const hotelKey = `staynexa_cleared_orders_${hotelId}`;
        const existing: string[] = JSON.parse(localStorage.getItem(hotelKey) || '[]');
        orders.forEach(o => {
          if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
            if (!existing.includes(o.id)) existing.push(o.id);
          }
        });
        localStorage.setItem(hotelKey, JSON.stringify(existing));
      } catch {}
    }
    fetchDirectKdsOrders().then(fresh => setOrders(fresh));
  };

  // Direct database fetch helper
  const getClearedOrderIds = useCallback((): Set<string> => {
    if (typeof window === 'undefined' || !window.localStorage) return new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(`staynexa_cleared_orders_${hotelId}`) || '[]');
      return new Set(Array.isArray(stored) ? stored : []);
    } catch {
      return new Set();
    }
  }, [hotelId]);

  const fetchDirectKdsOrders = useCallback(async (): Promise<Order[]> => {
    reloadDemoStoreFromStorage();
    const clearedIds = getClearedOrderIds();
    let baseOrders = orderService.getActive(hotelId).filter(o => !clearedIds.has(o.id));

    if (isSupabaseConfigured() && supabase) {
      try {
        const dbHotelId = toDbHotelId(hotelId);
        // Direct query to Supabase orders table: status not in DELIVERED, CANCELLED
        const { data: dbOrders, error: dbErr } = await supabase
          .from('orders')
          .select('*, items:order_items(*), room:rooms(*), guest:guests(*)')
          .eq('hotel_id', dbHotelId)
          .not('status', 'in', '("DELIVERED","CANCELLED","completed")')
          .order('created_at', { ascending: false });

        if (!dbErr && dbOrders && dbOrders.length > 0) {
          return dbOrders.filter(o => !clearedIds.has(o.id)).map(o => ({
            ...o,
            status: (o.status || 'PENDING').toUpperCase() as OrderStatus,
            items: (o.items && Array.isArray(o.items) && o.items.length > 0) ? o.items : [],
            room: o.room || (o.room_number ? { number: o.room_number } : undefined),
          }));
        }

        // Direct fallback query: supabase.from('orders').select('*')
        const { data: simpleDbOrders, error: simpleErr } = await supabase
          .from('orders')
          .select('*')
          .eq('hotel_id', dbHotelId)
          .not('status', 'in', '("DELIVERED","CANCELLED","completed")')
          .order('created_at', { ascending: false });

        if (!simpleErr && simpleDbOrders && simpleDbOrders.length > 0) {
          return simpleDbOrders.map(o => ({
            ...o,
            status: (o.status || 'PENDING').toUpperCase() as OrderStatus,
            items: (o.items && Array.isArray(o.items)) ? o.items : [],
            room: o.room_number ? { number: o.room_number } : undefined,
          }));
        }
      } catch (e) {
        console.warn('[KDS] Direct fetch error:', e);
      }
    }

    return baseOrders;
  }, [hotelId, getClearedOrderIds]);

  // 1. Direct KDS Database Query on Mount (status != 'completed')
  useEffect(() => {
    let isMounted = true;
    fetchDirectKdsOrders().then(fresh => {
      if (isMounted && fresh && fresh.length > 0) {
        setOrders(fresh);
      }
    });
    return () => { isMounted = false; };
  }, [hotelId, fetchDirectKdsOrders]);

  // 2. Realtime WebSocket Listeners (Supabase Postgres Changes on schema: 'public', table: 'orders')
  useEffect(() => {
    const unsubConnection = realtimeSync.onConnectionChange(setIsRealtimeConnected);
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const unsubNewOrder = realtimeSync.subscribe('NEW_ORDER', ({ order }) => {
      if (isSameHotel(order.hotel_id, hotelId)) {
        setOrders(prev => {
          if (prev.some(o => o.id === order.id)) return prev;
          return [order, ...prev];
        });
        audioService.playChime();
        const roomNum = (order as any).room_number || order.room?.number || order.room_id || 'Guest Portal';
        const itemCount = (order.items || []).length;
        setLiveAlertBanner({
          id: order.id,
          message: `🔔 New Order #${order.id.slice(-6).toUpperCase()} from Room ${roomNum} (${itemCount} item${itemCount > 1 ? 's' : ''})`,
        });
      }
    });

    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', ({ orderId, status, order }) => {
      const upStatus = status.toUpperCase();
      if (upStatus === 'DELIVERED' || upStatus === 'CANCELLED') {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, ...order, status: upStatus as OrderStatus } : o))
        );
      }
    });

    return () => {
      unsubConnection();
      disconnectSupabase();
      unsubNewOrder();
      unsubOrderStatus();
    };
  }, [hotelId, fetchDirectKdsOrders]);

  // 3. Infallible Background Interval: Strict 3-Second Database Auto-Polling
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const freshOrders = await fetchDirectKdsOrders();
        setOrders(freshOrders);
      } catch (err) {
        console.warn('[KDS] 3-second polling error:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [hotelId, fetchDirectKdsOrders]);

  // Auto-dismiss live alert banner after 8 seconds
  useEffect(() => {
    if (!liveAlertBanner) return;
    const timeout = setTimeout(() => {
      setLiveAlertBanner(null);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [liveAlertBanner]);

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);

    try {
      await orderService.updateStatusAsync(orderId, nextStatus);
      if (nextStatus === 'DELIVERED' || nextStatus === 'CANCELLED') {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      }
    } catch (err: any) {
      console.error('KDS status transition failed:', err);
      const errorMsg = err?.message || 'Database write rejected status update';
      setLiveAlertBanner({
        id: orderId,
        message: `⚠️ Status update failed: ${errorMsg}. Ticket kept in current queue.`,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filter active orders into 4 pipeline columns
  const newOrders = orders.filter(o => o.status === 'PENDING');
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  // Audio Chime Management: continuous chime alert if new unaccepted tickets exist
  useEffect(() => {
    if (newOrders.length > 0 && !isMuted) {
      audioService.startContinuousAlert(4000);
    } else {
      audioService.stopContinuousAlert();
    }
    return () => {
      audioService.stopContinuousAlert();
    };
  }, [newOrders.length, isMuted]);

  // Close role switch dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSound = () => {
    if (!isUnlocked) {
      audioService.unlockAudio();
      setIsUnlocked(true);
    }
    const muted = audioService.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audioService.playChime();
    }
  };

  const handleSwitchRole = async (email: string) => {
    await signIn(email, 'demo123');
    setRoleMenuOpen(false);
    navigate('/');
  };

  const QUICK_PERSONAS = [
    { label: 'Hotel Admin', email: 'vikram@grandpalace.com', role: 'HOTEL_ADMIN' },
    { label: 'Reception', email: 'anjali@grandpalace.com', role: 'RECEPTION' },
    { label: 'Super Admin', email: 'admin@staynexa.com', role: 'SUPER_ADMIN' },
    { label: 'Housekeeping', email: 'rekha@grandpalace.com', role: 'HOUSEKEEPING' },
    { label: 'Maintenance', email: 'ramesh@grandpalace.com', role: 'MAINTENANCE' },
    { label: 'Kitchen (Current)', email: 'mohan@grandpalace.com', role: 'KITCHEN' },
  ];

  const calcElapsedMins = (createdIso: string) => {
    const diff = currentTime.getTime() - new Date(createdIso).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  return (
    <div className="min-h-screen bg-[#141517] text-white flex flex-col font-sans select-none">
      {/* Print CSS rule injection for thermal receipts */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #kot-receipt-print, #kot-receipt-print * {
            visibility: visible !important;
          }
          #kot-receipt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* KDS Header */}
      <header className="h-16 bg-[#1a1c20] border-b border-white/10 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a84c] flex items-center justify-center text-stone-900 font-bold">
            <ChefHat className="w-6 h-6 text-[#141517]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white tracking-wide">
              {hotel?.name || 'Grand Palace'} · Kitchen Display System
            </h1>
            <p className="text-xs text-white/50">Live In-Room Dining & Restaurant Order Dispatch</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Back to Dashboard (if non-kitchen role or admin) */}
          {user?.role && user.role !== 'KITCHEN' && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}

          {/* Sound Synthesizer Alert Toggle */}
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isMuted 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20' 
                : newOrders.length > 0
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse ring-1 ring-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title={isMuted ? 'Sound muted - Click to unmute and enable synthesized audio chime' : 'Sound active - Click to mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isMuted ? 'Sound Muted' : newOrders.length > 0 ? 'Chime Alerting' : 'KDS Sound ON'}
            </span>
          </button>

          {/* Visual Connection Diagnostic Badge */}
          {isRealtimeConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:inline">Realtime Connected (Supabase Active)</span>
              <span className="md:hidden">Realtime</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="hidden md:inline">Polling Fallback Mode (3s Sync)</span>
              <span className="md:hidden">3s Sync</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Clock className="w-4 h-4 text-[#c9a84c]" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <div className="text-xs font-bold text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/30 px-3 py-1.5 rounded-lg">
            {newOrders.length + acceptedOrders.length + preparingOrders.length} Active Tickets
          </div>

          <button
            onClick={handleClearCompleted}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-200 border border-white/10 hover:border-rose-500/30 text-xs transition-colors"
            title="Clear Delivered / Completed Orders"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear Delivered</span>
          </button>

          <button
            onClick={refreshOrders}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Persona Switcher Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-medium transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#c9a84c]" />
              <div className="flex flex-col text-left">
                <span className="font-semibold">{user?.full_name || 'Chef Mohan'}</span>
                <span className="text-[10px] text-white/60">{user?.role || 'KITCHEN'}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/60 ml-1" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#1e2025] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <div className="text-[10px] uppercase font-bold text-[#c9a84c] tracking-wider">Switch Persona (Demo)</div>
                  <div className="text-xs text-white/70">Click to switch views instantly:</div>
                </div>

                <div className="space-y-1">
                  {QUICK_PERSONAS.map(p => (
                    <button
                      key={p.email}
                      onClick={() => handleSwitchRole(p.email)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                        user?.email === p.email
                          ? 'bg-[#c9a84c]/20 text-[#c9a84c] font-bold border border-[#c9a84c]/30'
                          : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] text-white/40">{p.role}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 mt-2 pt-1">
                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <span>Open Full Login Page...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Sign Out button */}
          <button
            onClick={() => {
              signOut();
              navigate('/login');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-100 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors"
            title="Sign out of current account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Live Incoming Order Alert Banner */}
      {liveAlertBanner && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-6 py-2.5 flex items-center justify-between text-amber-200 animate-pulse">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{liveAlertBanner.message}</span>
          </div>
          <button 
            onClick={() => setLiveAlertBanner(null)} 
            className="p-1 hover:bg-white/10 rounded text-xs text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-Column Order Dispatch Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto">
        {/* Col 1: NEW */}
        <div className="flex flex-col rounded-2xl bg-[#1c1e22] border border-white/5 overflow-hidden">
          <div className="p-3 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-rose-400">
              New Tickets ({newOrders.length})
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {newOrders.map(order => (
              <KdsCard 
                key={order.id} 
                order={order} 
                elapsedMins={calcElapsedMins(order.created_at)}
                actionLabel="Accept Order"
                actionColor="bg-blue-600 hover:bg-blue-500 text-white"
                isUpdating={updatingOrderId === order.id}
                onAction={() => handleAdvanceStatus(order.id, 'ACCEPTED')}
                onPrintKot={() => setSelectedKotOrder(order)}
              />
            ))}
          </div>
        </div>

        {/* Col 2: ACCEPTED */}
        <div className="flex flex-col rounded-2xl bg-[#1c1e22] border border-white/5 overflow-hidden">
          <div className="p-3 bg-blue-950/40 border-b border-blue-900/40 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-blue-400">
              Accepted Queue ({acceptedOrders.length})
            </span>
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {acceptedOrders.map(order => (
              <KdsCard 
                key={order.id} 
                order={order} 
                elapsedMins={calcElapsedMins(order.created_at)}
                actionLabel="Start Preparing"
                actionColor="bg-amber-600 hover:bg-amber-500 text-white"
                isUpdating={updatingOrderId === order.id}
                onAction={() => handleAdvanceStatus(order.id, 'PREPARING')}
                onPrintKot={() => setSelectedKotOrder(order)}
              />
            ))}
          </div>
        </div>

        {/* Col 3: PREPARING */}
        <div className="flex flex-col rounded-2xl bg-[#1c1e22] border border-white/5 overflow-hidden">
          <div className="p-3 bg-amber-950/40 border-b border-amber-900/40 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              On the Stove ({preparingOrders.length})
            </span>
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {preparingOrders.map(order => (
              <KdsCard 
                key={order.id} 
                order={order} 
                elapsedMins={calcElapsedMins(order.created_at)}
                actionLabel="Mark Ready for Delivery"
                actionColor="bg-emerald-600 hover:bg-emerald-500 text-white"
                isUpdating={updatingOrderId === order.id}
                onAction={() => handleAdvanceStatus(order.id, 'READY')}
                onPrintKot={() => setSelectedKotOrder(order)}
              />
            ))}
          </div>
        </div>

        {/* Col 4: READY */}
        <div className="flex flex-col rounded-2xl bg-[#1c1e22] border border-white/5 overflow-hidden">
          <div className="p-3 bg-emerald-950/40 border-b border-emerald-900/40 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Ready on Counter ({readyOrders.length})
            </span>
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {readyOrders.map(order => (
              <KdsCard 
                key={order.id} 
                order={order} 
                elapsedMins={calcElapsedMins(order.created_at)}
                actionLabel="Dispatched / Delivered"
                actionColor="bg-stone-700 hover:bg-stone-600 text-white"
                isUpdating={updatingOrderId === order.id}
                onAction={() => handleAdvanceStatus(order.id, 'DELIVERED')}
                onPrintKot={() => setSelectedKotOrder(order)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Thermal KOT Print Preview Modal */}
      {selectedKotOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1e2025] border border-white/10 rounded-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#141517]">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#c9a84c]" />
                <h3 className="font-display font-bold text-sm text-white">
                  Thermal KOT Simulator · #{selectedKotOrder.id.slice(-6).toUpperCase()}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/10 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setThermalWidth('80mm')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold ${
                      thermalWidth === '80mm' ? 'bg-[#c9a84c] text-stone-900' : 'text-white/60'
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    onClick={() => setThermalWidth('58mm')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold ${
                      thermalWidth === '58mm' ? 'bg-[#c9a84c] text-stone-900' : 'text-white/60'
                    }`}
                  >
                    58mm
                  </button>
                </div>
                <button
                  onClick={() => setSelectedKotOrder(null)}
                  className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print CSS rule isolation for thermal POS */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #kot-receipt-print, #kot-receipt-print * {
                  visibility: visible !important;
                }
                #kot-receipt-print {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${thermalWidth === '80mm' ? '76mm' : '54mm'} !important;
                  margin: 0 !important;
                  padding: 8px !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                }
              }
            `}</style>

            {/* Thermal Slip Preview Canvas */}
            <div className="flex-1 p-6 overflow-y-auto bg-stone-900 flex justify-center">
              <div 
                id="kot-receipt-print"
                className={`bg-[#fdfcf7] text-stone-950 font-mono text-xs p-4 shadow-xl border border-stone-300 rounded-sm space-y-3 leading-relaxed transition-all ${
                  thermalWidth === '80mm' ? 'w-[320px]' : 'w-[250px]'
                }`}
              >
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider">{hotel?.name || 'Grand Palace'}</div>
                  <div className="font-bold text-xs uppercase tracking-widest bg-stone-900 text-white py-0.5 px-2 inline-block">
                    KITCHEN ORDER TICKET (KOT)
                  </div>
                  <div className="text-[11px] text-stone-600">
                    TICKET #{selectedKotOrder.id.slice(-6).toUpperCase()} · {selectedKotOrder.type}
                  </div>
                </div>

                <div className="border-t border-dashed border-stone-800 pt-2 space-y-1">
                  <div className="text-center text-lg font-black tracking-wide py-1 bg-stone-200/80 rounded">
                    {selectedKotOrder.room ? `*** ROOM ${selectedKotOrder.room.number} ***` : '*** DINE-IN RESTAURANT ***'}
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-700">
                    <span>Date: {new Date(selectedKotOrder.created_at).toLocaleDateString('en-IN')}</span>
                    <span>Time: {new Date(selectedKotOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {selectedKotOrder.guest && (
                    <div className="text-[11px] text-stone-700">
                      Guest: <strong>{selectedKotOrder.guest.first_name} {selectedKotOrder.guest.last_name}</strong>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="border-t border-dashed border-stone-800 pt-2">
                  <div className="flex justify-between font-bold text-[11px] border-b border-stone-400 pb-1 mb-1">
                    <span>QTY  ITEM</span>
                    <span>STATION</span>
                  </div>
                  <div className="space-y-1.5">
                    {(selectedKotOrder.items || []).map(i => (
                      <div key={i.id} className="flex justify-between items-start">
                        <div className="font-bold text-xs">
                          <span className="text-sm font-black mr-2">[{i.quantity}]</span>
                          {i.name.toUpperCase()}
                        </div>
                        <span className="text-[10px] text-stone-600 uppercase font-bold">KITCHEN</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                {selectedKotOrder.special_instructions && (
                  <div className="border-t border-dashed border-stone-800 pt-2 bg-amber-100/60 p-2 rounded">
                    <span className="font-bold block text-[10px] uppercase">GUEST INSTRUCTION:</span>
                    <p className="text-[11px] font-bold text-stone-900">{selectedKotOrder.special_instructions}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-dashed border-stone-800 pt-2 text-center text-[10px] text-stone-600 space-y-0.5">
                  <div>DISPATCH VIA: STAYNEXA KDS</div>
                  <div className="font-mono text-[9px]">POS VERIFICATION: {selectedKotOrder.id}</div>
                  <div className="text-[8px] uppercase tracking-wider text-stone-500 pt-1">*** END OF ORDER TICKET ***</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-white/10 flex justify-between bg-[#141517]">
              <Button variant="outline" onClick={() => setSelectedKotOrder(null)}>
                Close Preview
              </Button>
              <Button 
                variant="primary" 
                onClick={() => window.print()}
                iconLeft={<Printer className="w-4 h-4" />}
              >
                Print KOT (Thermal POS)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Touch-friendly Card subcomponent
function KdsCard({
  order,
  elapsedMins,
  actionLabel,
  actionColor,
  isUpdating,
  onAction,
  onPrintKot,
}: {
  order: Order;
  elapsedMins: number;
  actionLabel: string;
  actionColor: string;
  isUpdating?: boolean;
  onAction: () => void;
  onPrintKot: () => void;
}) {
  const isUrgent = elapsedMins >= 20;

  return (
    <div className={`p-4 rounded-xl border bg-[#24272c] transition-all flex flex-col justify-between gap-3 shadow-md ${
      isUrgent ? 'border-rose-500/80 ring-1 ring-rose-500/50' : 'border-white/10'
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <span className="font-extrabold text-lg text-white block">
            {order.room ? `Room ${order.room.number}` : 'Dine-In Restaurant'}
          </span>
          <span className="text-xs font-mono text-white/50">#{order.id.slice(-6)} · {order.type}</span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
          isUrgent ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white/70'
        }`}>
          <Clock className="w-3 h-3" />
          <span>{elapsedMins}m</span>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-1.5 py-2 border-y border-white/5 text-sm">
        {(order.items || []).map((item, idx) => (
          <div key={item.id || item.menu_item_id || `item-${idx}`} className="flex justify-between items-baseline">
            <span className="font-semibold text-white">
              <span className="text-[#c9a84c] font-black mr-2 text-base">{item.quantity}x</span>
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Special instructions */}
      {order.special_instructions && (
        <div className="text-xs text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
          <strong>Note:</strong> {order.special_instructions}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onPrintKot}
          className="p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
          title="Print POS Kitchen Order Ticket (KOT)"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          onClick={onAction}
          disabled={isUpdating}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${actionColor} ${
            isUpdating ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isUpdating ? (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          ) : (
            <>
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  BellRing,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { orderService, hotelService } from '../../services/demoDataService';
import type { Order, OrderStatus } from '../../types';
import { Button } from '../../components/ui';

export default function KitchenDisplayPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);

  const [orders, setOrders] = useState<Order[]>(() => orderService.getAll(hotelId));
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live timer tick every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const refreshOrders = () => {
    setOrders([...orderService.getAll(hotelId)]);
  };

  const handleAdvanceStatus = (orderId: string, nextStatus: OrderStatus) => {
    orderService.updateStatus(orderId, nextStatus);
    refreshOrders();
  };

  // Filter active orders into 4 pipeline columns
  const newOrders = orders.filter(o => o.status === 'PENDING');
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  const calcElapsedMins = (createdIso: string) => {
    const diff = currentTime.getTime() - new Date(createdIso).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  return (
    <div className="min-h-screen bg-[#141517] text-white flex flex-col font-sans select-none">
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

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Clock className="w-4 h-4 text-[#c9a84c]" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <div className="text-xs font-bold text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/30 px-3 py-1.5 rounded-lg">
            {newOrders.length + acceptedOrders.length + preparingOrders.length} Active Tickets
          </div>

          <button
            onClick={refreshOrders}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

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
                onAction={() => handleAdvanceStatus(order.id, 'ACCEPTED')}
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
                onAction={() => handleAdvanceStatus(order.id, 'PREPARING')}
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
                onAction={() => handleAdvanceStatus(order.id, 'READY')}
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
                onAction={() => handleAdvanceStatus(order.id, 'DELIVERED')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Touch-friendly Card subcomponent
function KdsCard({
  order,
  elapsedMins,
  actionLabel,
  actionColor,
  onAction,
}: {
  order: Order;
  elapsedMins: number;
  actionLabel: string;
  actionColor: string;
  onAction: () => void;
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
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-baseline">
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

      {/* Action Button */}
      <button
        onClick={onAction}
        className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${actionColor}`}
      >
        <span>{actionLabel}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChefHat, 
  Clock, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  BellRing,
  ArrowRight,
  LogOut,
  ArrowLeft,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { orderService, hotelService } from '../../services/demoDataService';
import type { Order, OrderStatus } from '../../types';
import { Button } from '../../components/ui';

export default function KitchenDisplayPage() {
  const { user, signOut, signIn } = useAuth();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
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

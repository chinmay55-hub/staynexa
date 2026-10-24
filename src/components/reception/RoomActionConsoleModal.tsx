import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Calendar, 
  CreditCard, 
  LogOut, 
  CheckCircle2, 
  Wrench, 
  User, 
  Phone, 
  Plus, 
  IndianRupee, 
  Check, 
  AlertTriangle,
  Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  roomService, 
  reservationService, 
  guestService, 
  folioService, 
  housekeepingService,
  maintenanceService,
  activityLogService 
} from '../../services/demoDataService';
import { realtimeSync } from '../../services/realtimeSync';
import { generateGuestPortalUrl } from '../../utils/qrCode';
import type { 
  Room, 
  RoomStatus, 
  HousekeepingStatus, 
  Reservation, 
  Folio, 
  FolioItem, 
  Payment, 
  PaymentMethod,
  BookingSource,
  Priority
} from '../../types';
import { 
  Modal, 
  Button, 
  Input, 
  Select, 
  RoomStatusBadge, 
  HousekeepingBadge 
} from '../ui';

export interface RoomActionConsoleModalProps {
  isOpen: boolean;
  room: Room | null;
  hotelId: string;
  onClose: () => void;
  onOpenQuickCheckIn: (roomId: string) => void;
  onRoomUpdated?: (updatedRoom: Room) => void;
}

type ConsoleTab = 'overview' | 'reserve' | 'folio' | 'checkout' | 'housekeeping';

export function RoomActionConsoleModal({
  isOpen,
  room,
  hotelId,
  onClose,
  onOpenQuickCheckIn,
  onRoomUpdated
}: RoomActionConsoleModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ConsoleTab>('overview');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(room);

  // Active reservation & Folio states
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [folio, setFolio] = useState<Folio | null>(null);
  const [folioItems, setFolioItems] = useState<FolioItem[]>([]);
  const [folioPayments, setFolioPayments] = useState<Payment[]>([]);

  // Advance Reservation Form
  const [resMode, setResMode] = useState<'existing' | 'new'>('new');
  const [existingGuestSearch, setExistingGuestSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    idType: 'AADHAAR',
    idNumber: '',
  });
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [adults, setAdults] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [ratePerNight, setRatePerNight] = useState<number>(3500);
  const [bookingSource, setBookingSource] = useState<BookingSource>('DIRECT');
  const [externalRef, setExternalRef] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [resSuccessMessage, setResSuccessMessage] = useState<string | null>(null);

  // Add Folio Charge Form
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeCategory, setChargeCategory] = useState<FolioItem['category']>('ROOM_SERVICE');
  const [chargeAmount, setChargeAmount] = useState<number>(500);
  const [chargeTaxPercent, setChargeTaxPercent] = useState<number>(18);

  // Folio Payment Form
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payReference, setPayReference] = useState('');

  // Checkout Settlement Form
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod>('UPI');
  const [checkoutRef, setCheckoutRef] = useState('');
  const [isCityLedger, setIsCityLedger] = useState(false);
  const [corporateAccount, setCorporateAccount] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Housekeeping & Maintenance Form
  const [serviceType, setServiceType] = useState<'HK_CLEAN' | 'HK_TOWELS' | 'HK_DEEP' | 'MAINT_AC' | 'MAINT_PLUMB' | 'MAINT_ELEC' | 'MAINT_OTHER'>('HK_CLEAN');
  const [servicePriority, setServicePriority] = useState<Priority>('MEDIUM');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceSuccessMsg, setServiceSuccessMsg] = useState<string | null>(null);

  const refreshRoomData = useCallback((roomId: string) => {
    const updated = roomService.getById(roomId);
    if (updated) setCurrentRoom(updated);

    const allRes = reservationService.getAll(hotelId);
    const activeRes = allRes.find(r => r.room_id === roomId && r.status === 'CHECKED_IN');
    setActiveReservation(activeRes || null);

    if (activeRes) {
      const activeFolio = folioService.getByReservation(activeRes.id);
      if (activeFolio) {
        setFolio(activeFolio);
        setFolioItems(folioService.getItems(activeFolio.id));
        setFolioPayments(folioService.getPayments(activeFolio.id));
        setPayAmount(activeFolio.outstanding);
      } else {
        setFolio(null);
        setFolioItems([]);
        setFolioPayments([]);
      }
    } else {
      setFolio(null);
      setFolioItems([]);
      setFolioPayments([]);
    }
  }, [hotelId]);

  // Sync state when room opens or changes
  useEffect(() => {
    if (!room) return;
    setCurrentRoom(room);
    setActiveTab('overview');
    setCheckoutSuccess(false);
    setResSuccessMessage(null);
    setServiceSuccessMsg(null);
    setRatePerNight(room.room_type?.base_rate || 3500);

    // Fetch active checked-in reservation for this room
    refreshRoomData(room.id);
  }, [room, hotelId, refreshRoomData]);

  // Realtime synchronization for Folio and Order charges while modal is open
  useEffect(() => {
    if (!isOpen || !currentRoom) return;

    const unsubFolio = realtimeSync.subscribe('FOLIO_UPDATED', ({ folio: updatedFolio }) => {
      if (updatedFolio.hotel_id === hotelId) {
        refreshRoomData(currentRoom.id);
      }
    });

    const unsubOrder = realtimeSync.subscribe('NEW_ORDER', ({ order }) => {
      if (order.hotel_id === hotelId && (order.room_id === currentRoom.id || order.room?.number === currentRoom.number)) {
        refreshRoomData(currentRoom.id);
      }
    });

    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', ({ order }) => {
      if (order.hotel_id === hotelId && (order.room_id === currentRoom.id || order.room?.number === currentRoom.number)) {
        refreshRoomData(currentRoom.id);
      }
    });

    return () => {
      unsubFolio();
      unsubOrder();
      unsubOrderStatus();
    };
  }, [isOpen, currentRoom, hotelId, refreshRoomData]);

  if (!isOpen || !currentRoom) return null;

  // Calculate nights for advance reservation
  const calculatedNights = Math.max(
    1,
    Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const estimatedStayTariff = calculatedNights * ratePerNight;
  const estimatedGst = Math.round(estimatedStayTariff * 0.18);
  const estimatedTotal = estimatedStayTariff + estimatedGst;

  // Handlers for Room Housekeeping & Operational condition
  const handleUpdateHousekeeping = (newHk: HousekeepingStatus) => {
    const updated = roomService.updateStatus(currentRoom.id, currentRoom.status, newHk);
    if (updated) {
      setCurrentRoom(updated);
      onRoomUpdated?.(updated);
      activityLogService.log({
        hotel_id: hotelId,
        user_id: user?.id,
        actor_name: user?.full_name || 'Front Desk',
        action: 'UPDATE_HOUSEKEEPING',
        entity_type: 'room',
        entity_id: currentRoom.id,
        metadata: { room: currentRoom.number, new_status: newHk }
      });
    }
  };

  const handleUpdateStatus = (newStatus: RoomStatus) => {
    const updated = roomService.updateStatus(currentRoom.id, newStatus, currentRoom.housekeeping_status);
    if (updated) {
      setCurrentRoom(updated);
      onRoomUpdated?.(updated);
    }
  };

  // Handlers for Advance Booking
  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    let guestIdToUse = selectedGuestId;

    if (resMode === 'new') {
      if (!newGuest.firstName.trim() || !newGuest.phone.trim()) {
        alert('Please fill in Guest First Name and Contact Phone Number.');
        return;
      }
      const createdGuest = guestService.create({
        hotel_id: hotelId,
        first_name: newGuest.firstName.trim(),
        last_name: newGuest.lastName.trim() || 'Guest',
        phone: newGuest.phone.trim(),
        email: newGuest.email.trim() || `${newGuest.firstName.toLowerCase()}@guest.staynexa.com`,
        id_type: newGuest.idType,
        id_number: newGuest.idNumber.trim(),
        nationality: 'Indian',
        vip_status: false,
      });
      guestIdToUse = createdGuest.id;
    }

    if (!guestIdToUse) {
      alert('Please select or specify a guest for this reservation.');
      return;
    }

    const createdRes = reservationService.create({
      hotel_id: hotelId,
      guest_id: guestIdToUse,
      room_type_id: currentRoom.room_type_id,
      room_id: currentRoom.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights: calculatedNights,
      adults: Number(adults),
      children: Number(childrenCount),
      rate_per_night: Number(ratePerNight),
      total_amount: estimatedTotal,
      tax_amount: estimatedGst,
      discount_amount: 0,
      deposit_amount: 0,
      source: bookingSource,
      external_booking_id: externalRef || undefined,
      notes: specialNotes || undefined,
      status: 'CONFIRMED',
    });

    activityLogService.log({
      hotel_id: hotelId,
      user_id: user?.id,
      actor_name: user?.full_name || 'Front Desk',
      action: 'CREATE_RESERVATION',
      entity_type: 'reservation',
      entity_id: createdRes.id,
      metadata: { room: currentRoom.number, guest_id: guestIdToUse, nights: calculatedNights }
    });

    setResSuccessMessage(`Reservation #${createdRes.id.slice(-6).toUpperCase()} successfully confirmed & locked for Room ${currentRoom.number}!`);
    refreshRoomData(currentRoom.id);
  };

  // Handlers for Live Folio charges & payments
  const handleAddFolioCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio || !chargeDesc.trim() || chargeAmount <= 0) return;

    const taxAmt = Math.round((chargeAmount * chargeTaxPercent) / 100);
    const totalAmt = chargeAmount + taxAmt;

    folioService.addItem({
      hotel_id: hotelId,
      folio_id: folio.id,
      description: chargeDesc.trim(),
      category: chargeCategory,
      quantity: 1,
      unit_price: chargeAmount,
      tax_percent: chargeTaxPercent,
      tax_amount: taxAmt,
      discount_amount: 0,
      total: totalAmt,
      posted_at: new Date().toISOString(),
      posted_by: user?.full_name || 'Front Desk'
    });

    setIsAddChargeOpen(false);
    setChargeDesc('');
    setChargeAmount(500);
    refreshRoomData(currentRoom.id);
  };

  const handleAddFolioPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio || payAmount <= 0) return;

    folioService.addPayment({
      hotel_id: hotelId,
      folio_id: folio.id,
      guest_id: folio.guest_id,
      reservation_id: folio.reservation_id,
      amount: Number(payAmount),
      method: payMethod,
      reference: payReference || `PAY-${Date.now().toString().slice(-6)}`,
      notes: `Payment collected at Room Console (${payMethod})`,
      received_by: user?.full_name || 'Front Desk'
    });

    setIsAddPaymentOpen(false);
    setPayReference('');
    refreshRoomData(currentRoom.id);
  };

  // Handlers for Quick Check-Out
  const handlePerformCheckOut = () => {
    if (!activeReservation || !folio) return;

    // If balance is outstanding and not city ledger, collect payment first
    if (folio.outstanding > 0) {
      if (isCityLedger) {
        if (!corporateAccount.trim()) {
          alert('Please specify the Corporate Account Name for City Ledger transfer.');
          return;
        }
        // Record corporate folio transfer item
        folioService.addPayment({
          hotel_id: hotelId,
          folio_id: folio.id,
          guest_id: folio.guest_id,
          reservation_id: folio.reservation_id,
          amount: folio.outstanding,
          method: 'OTHER',
          reference: `CITY-LEDGER-${corporateAccount.trim().toUpperCase()}`,
          notes: `Billed to Corporate City Ledger: ${corporateAccount.trim()}`,
          received_by: user?.full_name || 'Front Desk'
        });
      } else {
        // Collect standard payment
        folioService.addPayment({
          hotel_id: hotelId,
          folio_id: folio.id,
          guest_id: folio.guest_id,
          reservation_id: folio.reservation_id,
          amount: folio.outstanding,
          method: checkoutMethod,
          reference: checkoutRef || `POS-${Date.now().toString().slice(-6)}`,
          notes: `Settled in full at Checkout (${checkoutMethod})`,
          received_by: user?.full_name || 'Front Desk'
        });
      }
    }

    // Perform checkout in reservation service
    reservationService.checkOut(activeReservation.id);

    activityLogService.log({
      hotel_id: hotelId,
      user_id: user?.id,
      actor_name: user?.full_name || 'Front Desk',
      action: 'CHECK_OUT',
      entity_type: 'reservation',
      entity_id: activeReservation.id,
      metadata: { room: currentRoom.number, guest: activeReservation.guest?.last_name }
    });

    setCheckoutSuccess(true);
    refreshRoomData(currentRoom.id);
    onRoomUpdated?.(roomService.getById(currentRoom.id)!);
  };

  // Handlers for Housekeeping / Maintenance Request
  const handleCreateServiceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceType.startsWith('HK_')) {
      const taskTypeMap: Record<string, 'TURNDOWN' | 'STAYOVER_CLEAN' | 'DEEP_CLEAN'> = {
        'HK_CLEAN': 'STAYOVER_CLEAN',
        'HK_TOWELS': 'TURNDOWN',
        'HK_DEEP': 'DEEP_CLEAN'
      };
      housekeepingService.createTask({
        hotel_id: hotelId,
        room_id: currentRoom.id,
        reservation_id: activeReservation?.id,
        type: taskTypeMap[serviceType] || 'STAYOVER_CLEAN',
        status: 'PENDING',
        priority: servicePriority,
        notes: serviceNotes || `Immediate Front Desk Request for Room ${currentRoom.number}`
      });
      setServiceSuccessMsg(`Housekeeping task dispatched for Room ${currentRoom.number}!`);
    } else {
      const catMap: Record<string, 'HVAC' | 'PLUMBING' | 'ELECTRICAL' | 'OTHER'> = {
        'MAINT_AC': 'HVAC',
        'MAINT_PLUMB': 'PLUMBING',
        'MAINT_ELEC': 'ELECTRICAL',
        'MAINT_OTHER': 'OTHER'
      };
      maintenanceService.create({
        hotel_id: hotelId,
        room_id: currentRoom.id,
        title: `Room ${currentRoom.number}: ${serviceType.replace('MAINT_', '')} Issue`,
        description: serviceNotes || 'Reported via Front Desk Command Console',
        category: catMap[serviceType] || 'OTHER',
        priority: servicePriority,
        status: 'NEW'
      });
      setServiceSuccessMsg(`Maintenance ticket created and routed to technicians!`);
    }

    setServiceNotes('');
  };

  const portalQrUrl = generateGuestPortalUrl(`gp-r${currentRoom.number}-demo`);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-mono font-bold text-stone-700">StayNexa Command Center</span>
            <span>·</span>
            <span>Room {currentRoom.number}</span>
          </div>
          <Button variant="outline" onClick={onClose}>Close Console</Button>
        </div>
      }
    >
      <div className="space-y-5 -mt-2">
        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-stone-900 to-[#1a2744] text-white shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-display font-extrabold text-2xl text-[#c9a84c] border border-white/15">
              {currentRoom.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-bold text-white">
                  Room {currentRoom.number}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/90 font-medium">
                  Floor {currentRoom.floor}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {currentRoom.room_type?.name || 'Standard Room'} · Base ₹{currentRoom.room_type?.base_rate || 3500}/night
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <RoomStatusBadge status={currentRoom.status} />
            <HousekeepingBadge status={currentRoom.housekeeping_status} />
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-stone-100 border border-stone-200 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: '⚡ Overview & Actions', icon: Sparkles },
            { id: 'reserve', label: '📅 Reserve Room', icon: Calendar },
            { id: 'folio', label: '💳 Live Folio', icon: CreditCard, count: folio ? `₹${folio.outstanding}` : undefined },
            { id: 'checkout', label: '🚪 Express Check-Out', icon: LogOut },
            { id: 'housekeeping', label: '🧹 Housekeeping & Service', icon: Wrench },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ConsoleTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-[#1a2744] text-white shadow-xs font-bold' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-[#c9a84c] text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* If Room is Vacant / Available */}
            {currentRoom.status === 'AVAILABLE' && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-sm text-emerald-950">Room is Vacant & Clean</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Ready for walk-in check-in or arriving guest allocation. Maximum capacity: {currentRoom.room_type?.max_adults || 2} Adults, {currentRoom.room_type?.max_children || 1} Children.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onOpenQuickCheckIn(currentRoom.id);
                  }}
                  iconLeft={<Sparkles className="w-4 h-4" />}
                  className="shrink-0"
                >
                  ⚡ Launch 3-Step Quick Check-In
                </Button>
              </div>
            )}

            {/* If Room is Occupied */}
            {currentRoom.status === 'OCCUPIED' && activeReservation && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Current Occupant Information
                    </span>
                  </div>
                  {activeReservation.guest?.vip_status && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> VIP Guest
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 block">Guest Full Name:</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {activeReservation.guest ? `${activeReservation.guest.first_name} ${activeReservation.guest.last_name}` : 'Registered Occupant'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Booking Reference:</span>
                    <span className="font-mono font-bold text-stone-800">
                      #{activeReservation.id.slice(-6).toUpperCase()} ({activeReservation.source})
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Contact Phone:</span>
                    <span className="font-semibold text-stone-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" />
                      {activeReservation.guest?.phone || 'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Stay Duration:</span>
                    <span className="font-semibold text-stone-800">
                      {activeReservation.check_in_date} to {activeReservation.check_out_date} ({activeReservation.nights} Nights)
                    </span>
                  </div>
                </div>

                {/* Quick actions for occupied room */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-100">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setActiveTab('folio')}
                    iconLeft={<CreditCard className="w-3.5 h-3.5" />}
                  >
                    View & Add Folio Charges
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => setActiveTab('checkout')}
                    iconLeft={<LogOut className="w-3.5 h-3.5" />}
                  >
                    Express Check-Out
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setActiveTab('housekeeping')}
                    iconLeft={<Wrench className="w-3.5 h-3.5" />}
                  >
                    Request Housekeeping
                  </Button>
                </div>
              </div>
            )}

            {/* Room Features & Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-400 block text-[11px]">Room Type</span>
                <span className="font-bold text-stone-900">{currentRoom.room_type?.name || 'Deluxe'}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-400 block text-[11px]">Daily Rate</span>
                <span className="font-bold text-[#c9a84c]">₹{currentRoom.room_type?.base_rate || 3500}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-400 block text-[11px]">Max Capacity</span>
                <span className="font-bold text-stone-900">
                  {currentRoom.room_type?.max_adults || 2} Adults · {currentRoom.room_type?.max_children || 1} Child
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-400 block text-[11px]">Guest Portal URL</span>
                <a 
                  href={portalQrUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-mono text-[#c9a84c] hover:underline font-bold truncate block"
                >
                  /q/gp-r{currentRoom.number}
                </a>
              </div>
            </div>

            {/* Fast Operational State Control */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <span className="text-xs font-bold text-stone-700 block uppercase tracking-wider">
                Operational Status Switch
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={currentRoom.status === 'AVAILABLE' ? 'primary' : 'outline'}
                  disabled={currentRoom.status === 'OCCUPIED'}
                  onClick={() => handleUpdateStatus('AVAILABLE')}
                >
                  Available
                </Button>
                <Button
                  size="sm"
                  variant={currentRoom.status === 'MAINTENANCE' ? 'primary' : 'outline'}
                  onClick={() => handleUpdateStatus('MAINTENANCE')}
                >
                  Maintenance
                </Button>
                <Button
                  size="sm"
                  variant={currentRoom.status === 'OUT_OF_SERVICE' ? 'primary' : 'outline'}
                  onClick={() => handleUpdateStatus('OUT_OF_SERVICE')}
                >
                  Out of Service
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADVANCE RESERVATION */}
        {activeTab === 'reserve' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {resSuccessMessage ? (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{resSuccessMessage}</span>
                </div>
                <p>The reservation is now registered and synced in real time across the hotel management database.</p>
                <Button size="sm" variant="primary" onClick={() => setResSuccessMessage(null)}>
                  Book Another Date
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Lock Reservation for Room {currentRoom.number}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setResMode('new')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        resMode === 'new' ? 'bg-[#c9a84c] text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      New Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setResMode('existing')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        resMode === 'existing' ? 'bg-[#c9a84c] text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      Existing Guest
                    </button>
                  </div>
                </div>

                {/* Guest Inputs */}
                {resMode === 'new' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <Input
                      label="First Name *"
                      required
                      placeholder="e.g. Vikram"
                      value={newGuest.firstName}
                      onChange={e => setNewGuest({ ...newGuest, firstName: e.target.value })}
                    />
                    <Input
                      label="Last Name *"
                      required
                      placeholder="e.g. Singhania"
                      value={newGuest.lastName}
                      onChange={e => setNewGuest({ ...newGuest, lastName: e.target.value })}
                    />
                    <Input
                      label="Phone Number *"
                      required
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={newGuest.phone}
                      onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="e.g. vikram@singhania.com"
                      value={newGuest.email}
                      onChange={e => setNewGuest({ ...newGuest, email: e.target.value })}
                    />
                  </div>
                ) : (
                  <div>
                    <Input
                      label="Search Existing Guest by Name or Phone"
                      placeholder="Type guest name or number..."
                      value={existingGuestSearch}
                      onChange={e => setExistingGuestSearch(e.target.value)}
                    />
                    <div className="mt-2 max-h-32 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl bg-white text-xs">
                      {guestService.search(hotelId, existingGuestSearch).map(g => (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGuestId(g.id)}
                          className={`p-2.5 flex justify-between items-center cursor-pointer transition-colors ${
                            selectedGuestId === g.id ? 'bg-[#c9a84c]/20 font-bold' : 'hover:bg-stone-50'
                          }`}
                        >
                          <div>
                            <span className="text-stone-900">{g.first_name} {g.last_name}</span>
                            <span className="text-stone-400 ml-2 font-normal font-mono">{g.phone}</span>
                          </div>
                          {selectedGuestId === g.id && <Check className="w-4 h-4 text-[#c9a84c]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates & Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <Input
                    label="Check-In Date *"
                    type="date"
                    required
                    value={checkInDate}
                    onChange={e => setCheckInDate(e.target.value)}
                  />
                  <Input
                    label="Check-Out Date *"
                    type="date"
                    required
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                  />
                  <Input
                    label="Nightly Tariff (₹)"
                    type="number"
                    min="500"
                    value={ratePerNight}
                    onChange={e => setRatePerNight(Number(e.target.value))}
                  />
                  <Input
                    label="Adults"
                    type="number"
                    min="1"
                    max={currentRoom.room_type?.max_adults || 4}
                    value={adults}
                    onChange={e => setAdults(Number(e.target.value))}
                  />
                  <Input
                    label="Children"
                    type="number"
                    min="0"
                    max={currentRoom.room_type?.max_children || 3}
                    value={childrenCount}
                    onChange={e => setChildrenCount(Number(e.target.value))}
                  />
                  <Select
                    label="Booking Source"
                    value={bookingSource}
                    onChange={e => setBookingSource(e.target.value as BookingSource)}
                    options={[
                      { value: 'DIRECT', label: 'Direct Walk-In / Front Desk' },
                      { value: 'PHONE', label: 'Phone Reservation' },
                      { value: 'WEBSITE', label: 'Hotel Direct Website' },
                      { value: 'BOOKING_COM', label: 'Booking.com' },
                      { value: 'AGODA', label: 'Agoda' },
                      { value: 'MMT', label: 'MakeMyTrip' },
                      { value: 'AIRBNB', label: 'Airbnb' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <Input
                    label="External Booking / OTA Reference (Optional)"
                    placeholder="e.g. BCOM-98765432"
                    value={externalRef}
                    onChange={e => setExternalRef(e.target.value)}
                  />
                  <Input
                    label="Special Requests / Front Desk Notes (Optional)"
                    placeholder="e.g. Early check-in requested, high floor"
                    value={specialNotes}
                    onChange={e => setSpecialNotes(e.target.value)}
                  />
                </div>

                {/* Tariff Estimation Banner */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-500 block">Calculated Stay Duration</span>
                    <span className="font-bold text-stone-900">{calculatedNights} Night{calculatedNights > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 block">Total Tariff (+18% GST)</span>
                    <span className="font-extrabold text-[#c9a84c] text-sm font-mono">
                      ₹{estimatedTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  📅 Confirm & Lock Room Reservation
                </Button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: LIVE FOLIO & CHARGES */}
        {activeTab === 'folio' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {folio ? (
              <div className="space-y-4">
                {/* 3 Summary metric cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Total Charges</span>
                    <span className="text-base font-bold text-stone-900 font-mono">
                      ₹{folio.total_charges.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 block">Payments Collected</span>
                    <span className="text-base font-bold text-emerald-800 font-mono">
                      ₹{folio.total_payments.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    folio.outstanding > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className={`text-[11px] block ${folio.outstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Balance Due
                    </span>
                    <span className={`text-base font-extrabold font-mono ${
                      folio.outstanding > 0 ? 'text-rose-700' : 'text-emerald-800'
                    }`}>
                      ₹{folio.outstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Folio Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsAddChargeOpen(!isAddChargeOpen)}
                    iconLeft={<Plus className="w-3.5 h-3.5" />}
                  >
                    + Post Room Charge
                  </Button>
                  <Button 
                    size="sm" 
                    variant="primary" 
                    onClick={() => setIsAddPaymentOpen(!isAddPaymentOpen)}
                    iconLeft={<IndianRupee className="w-3.5 h-3.5" />}
                  >
                    + Record Payment
                  </Button>
                </div>

                {/* Inline Add Charge Form */}
                {isAddChargeOpen && (
                  <form onSubmit={handleAddFolioCharge} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 text-xs">
                    <span className="font-bold text-stone-900 block uppercase">Post New Charge to Room Folio</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Charge Description *"
                        required
                        placeholder="e.g. Minibar - Wine & Snacks"
                        value={chargeDesc}
                        onChange={e => setChargeDesc(e.target.value)}
                      />
                      <Select
                        label="Service Category"
                        value={chargeCategory}
                        onChange={e => setChargeCategory(e.target.value as any)}
                        options={[
                          { value: 'ROOM_SERVICE', label: 'Room Service & In-Room Dining' },
                          { value: 'RESTAURANT', label: 'Restaurant & Bar' },
                          { value: 'LAUNDRY', label: 'Laundry & Dry Clean' },
                          { value: 'SPA', label: 'Spa & Wellness' },
                          { value: 'TRANSPORT', label: 'Airport Transfer / Cab' },
                          { value: 'SERVICE', label: 'Other Service' },
                        ]}
                      />
                      <Input
                        label="Amount Before Tax (₹) *"
                        type="number"
                        required
                        min="1"
                        value={chargeAmount}
                        onChange={e => setChargeAmount(Number(e.target.value))}
                      />
                      <Input
                        label="GST Rate (%)"
                        type="number"
                        value={chargeTaxPercent}
                        onChange={e => setChargeTaxPercent(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setIsAddChargeOpen(false)}>Cancel</Button>
                      <Button size="sm" variant="primary" type="submit">Post to Folio</Button>
                    </div>
                  </form>
                )}

                {/* Inline Record Payment Form */}
                {isAddPaymentOpen && (
                  <form onSubmit={handleAddFolioPayment} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3 text-xs">
                    <span className="font-bold text-stone-900 block uppercase">Record Advance Payment</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Payment Amount (₹) *"
                        type="number"
                        required
                        min="1"
                        value={payAmount}
                        onChange={e => setPayAmount(Number(e.target.value))}
                      />
                      <Select
                        label="Payment Method"
                        value={payMethod}
                        onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                        options={[
                          { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                          { value: 'CARD', label: 'Credit / Debit Card POS' },
                          { value: 'CASH', label: 'Cash Collection' },
                          { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                        ]}
                      />
                      <Input
                        label="Reference / Transaction ID"
                        placeholder="e.g. UPI-987654"
                        value={payReference}
                        onChange={e => setPayReference(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
                      <Button size="sm" variant="primary" type="submit">Confirm Payment</Button>
                    </div>
                  </form>
                )}

                {/* Folio Items Table */}
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <div className="bg-stone-50 px-3.5 py-2 border-b border-stone-200 font-bold text-xs text-stone-700">
                    Posted Charges & Consumption ({folioItems.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100">
                        <tr>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-right">Tax</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {folioItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-stone-400">No charges posted yet.</td>
                          </tr>
                        ) : (
                          folioItems.map(item => (
                            <tr key={item.id} className="hover:bg-stone-50/50">
                              <td className="py-2 px-3 font-medium text-stone-900">{item.description}</td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] uppercase font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-stone-500">₹{item.tax_amount}</td>
                              <td className="py-2 px-3 text-right font-bold text-stone-900">₹{item.total.toLocaleString('en-IN')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Folio Payments Table */}
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <div className="bg-stone-50 px-3.5 py-2 border-b border-stone-200 font-bold text-xs text-stone-700">
                    Payments Recorded ({folioPayments.length})
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100">
                        <tr>
                          <th className="py-2 px-3">Method</th>
                          <th className="py-2 px-3">Reference</th>
                          <th className="py-2 px-3">Received By</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {folioPayments.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-stone-400">No payments recorded.</td>
                          </tr>
                        ) : (
                          folioPayments.map(p => (
                            <tr key={p.id}>
                              <td className="py-2 px-3 font-bold text-emerald-800">{p.method}</td>
                              <td className="py-2 px-3 text-stone-500 font-mono">{p.reference || '—'}</td>
                              <td className="py-2 px-3 text-stone-500">{p.received_by || 'Front Desk'}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 space-y-2 border border-dashed border-stone-200 rounded-2xl">
                <CreditCard className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs">Room {currentRoom.number} is currently vacant without an active folio.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EXPRESS CHECK-OUT & SETTLEMENT */}
        {activeTab === 'checkout' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {checkoutSuccess ? (
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-950 text-sm">Guest Checked Out Successfully</h3>
                <p className="text-xs text-emerald-800">
                  Folio has been closed and Room {currentRoom.number} condition is now set to <strong>DIRTY</strong> for cleaning turnaround.
                </p>
                <Button size="sm" variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            ) : currentRoom.status === 'OCCUPIED' && activeReservation && folio ? (
              <div className="space-y-4 text-xs">
                {/* Settlement status check */}
                {folio.outstanding > 0 ? (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Pending Balance: ₹{folio.outstanding.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-stone-600 text-[11px]">
                      Hospitality accounting protocol requires zero-balance payment settlement before key release, unless authorized for corporate billing.
                    </p>

                    {/* Settle or City Ledger */}
                    <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCityLedger}
                          onChange={e => setIsCityLedger(e.target.checked)}
                          className="w-4 h-4 accent-[#c9a84c] rounded"
                        />
                        <span className="font-bold text-stone-900">
                          Corporate B2B / Bill to Company (City Ledger Override)
                        </span>
                      </label>

                      {isCityLedger ? (
                        <Input
                          label="Corporate Entity / Company Account *"
                          required
                          placeholder="e.g. Tata Consultancy Services Ltd"
                          value={corporateAccount}
                          onChange={e => setCorporateAccount(e.target.value)}
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Select
                            label="Collection Method"
                            value={checkoutMethod}
                            onChange={e => setCheckoutMethod(e.target.value as PaymentMethod)}
                            options={[
                              { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                              { value: 'CARD', label: 'Credit / Debit Card POS' },
                              { value: 'CASH', label: 'Cash Collection' },
                            ]}
                          />
                          <Input
                            label="POS Slip / Reference ID"
                            placeholder="e.g. POS-554432"
                            value={checkoutRef}
                            onChange={e => setCheckoutRef(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Folio is fully settled (₹0.00 balance). Ready for immediate key return.</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 space-y-1 text-[11px]">
                  <div>Guest: <strong>{activeReservation.guest?.first_name} {activeReservation.guest?.last_name}</strong></div>
                  <div>Stay: {activeReservation.check_in_date} to {activeReservation.check_out_date} ({activeReservation.nights} Nights)</div>
                  <div>Total Billed: ₹{folio.total_charges.toLocaleString('en-IN')}</div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handlePerformCheckOut}
                >
                  🚪 Confirm Settlement & Complete Check-Out
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 space-y-2 border border-dashed border-stone-200 rounded-2xl">
                <LogOut className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs">No active checked-in guest occupying Room {currentRoom.number}.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HOUSEKEEPING & SERVICE REQUESTS */}
        {activeTab === 'housekeeping' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Condition Switchers */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Update Housekeeping Cleaning State
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant={currentRoom.housekeeping_status === 'CLEAN' ? 'primary' : 'outline'}
                  onClick={() => handleUpdateHousekeeping('CLEAN')}
                >
                  Clean
                </Button>
                <Button
                  size="sm"
                  variant={currentRoom.housekeeping_status === 'DIRTY' ? 'secondary' : 'outline'}
                  onClick={() => handleUpdateHousekeeping('DIRTY')}
                >
                  Dirty
                </Button>
                <Button
                  size="sm"
                  variant={currentRoom.housekeeping_status === 'CLEANING' ? 'primary' : 'outline'}
                  onClick={() => handleUpdateHousekeeping('CLEANING')}
                >
                  Cleaning
                </Button>
                <Button
                  size="sm"
                  variant={currentRoom.housekeeping_status === 'INSPECTION_REQUIRED' ? 'secondary' : 'outline'}
                  onClick={() => handleUpdateHousekeeping('INSPECTION_REQUIRED')}
                >
                  Needs Inspection
                </Button>
              </div>
            </div>

            {/* Instant Task Dispatch Form */}
            <form onSubmit={handleCreateServiceRequest} className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3 text-xs">
              <span className="font-bold text-stone-900 block uppercase">
                Dispatch Task / Maintenance Ticket for Room {currentRoom.number}
              </span>

              {serviceSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>{serviceSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Service / Ticket Type"
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value as any)}
                  options={[
                    { value: 'HK_CLEAN', label: 'Housekeeping: Room Cleaning' },
                    { value: 'HK_TOWELS', label: 'Housekeeping: Extra Towels & Linen' },
                    { value: 'HK_DEEP', label: 'Housekeeping: Deep Disinfection' },
                    { value: 'MAINT_AC', label: 'Maintenance: Air Conditioning (HVAC)' },
                    { value: 'MAINT_PLUMB', label: 'Maintenance: Plumbing / Water Leak' },
                    { value: 'MAINT_ELEC', label: 'Maintenance: Electrical / Lighting' },
                    { value: 'MAINT_OTHER', label: 'Maintenance: General Repair' },
                  ]}
                />
                <Select
                  label="Urgency Priority"
                  value={servicePriority}
                  onChange={e => setServicePriority(e.target.value as Priority)}
                  options={[
                    { value: 'LOW', label: 'Low - Routine schedule' },
                    { value: 'MEDIUM', label: 'Medium - Next available staff' },
                    { value: 'HIGH', label: 'High - Prioritize turnaround' },
                    { value: 'URGENT', label: 'Urgent - Immediate response' },
                  ]}
                />
              </div>

              <Input
                label="Task Notes / Instructions"
                placeholder="e.g. Guest requested fresh feather pillows and extra bath towels"
                value={serviceNotes}
                onChange={e => setServiceNotes(e.target.value)}
              />

              <Button size="sm" variant="primary" type="submit" className="w-full">
                🚀 Dispatch Service Ticket
              </Button>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}

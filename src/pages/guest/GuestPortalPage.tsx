import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { nowMs } from '../../utils/clock';
import { 
  Building2, 
  Wifi, 
  UtensilsCrossed, 
  Sparkles, 
  FileText, 
  Phone, 
  Copy, 
  Check, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Send,
  Star,
  ExternalLink,
  Flame,
  BellRing,
  Printer,
  CreditCard,
  MessageSquare,
  Search,
  X,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { 
  qrService, 
  hotelService, 
  roomService,
  reservationService, 
  menuService, 
  orderService, 
  serviceRequestService, 
  folioService,
  reloadDemoStoreFromStorage
} from '../../services/demoDataService';
import { supabase, isSupabaseConfigured, isDemoMode } from '../../lib/supabase';
import { realtimeSync } from '../../services/realtimeSync';
import { paymentService } from '../../services/paymentService';
import type { 
  Hotel, 
  Room, 
  Guest, 
  Reservation, 
  MenuItem, 
  Order, 
  ServiceRequest, 
  Folio,
  FolioItem,
  MenuCategory,
  HotelService
} from '../../types';
import { Button, Modal } from '../../components/ui';

interface ChatMessage {
  id: string;
  sender: 'GUEST' | 'DESK';
  text: string;
  timestamp: string;
}

export default function GuestPortalPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const rawToken = params.token || params['*'] || searchParams.get('token') || searchParams.get('room') || '';
  const token = rawToken.replace(/^\/+|\/+$/g, '').trim();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [folio, setFolio] = useState<Folio | null>(null);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'HOME' | 'FOOD' | 'ORDERS' | 'SERVICES' | 'CHAT' | 'STAY' | 'CONTACT'>('HOME');

  // Food Cart & Menu state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [menuSearch, setMenuSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'ROOM_CHARGE' | 'UPI'>('ROOM_CHARGE');
  const [orderSpecialInstructions, setOrderSpecialInstructions] = useState('');
  const [orderSuccessToast, setOrderSuccessToast] = useState<string | null>(null);
  const [orderErrorMsg, setOrderErrorMsg] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Services state
  const [services, setServices] = useState<HotelService[]>([]);
  const [serviceCategory, setServiceCategory] = useState<'ALL' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'CONCIERGE'>('ALL');
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [selectedService, setSelectedService] = useState<HotelService | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Wi-Fi Copy state
  const [copiedWifi, setCopiedWifi] = useState(false);

  // Folio Invoice Modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Concierge Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'DESK',
      text: 'Warm greetings from the Front Desk! How may we assist your stay today?',
      timestamp: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  const [loadedToken, setLoadedToken] = useState(token);
  if (token !== loadedToken) {
    setLoadedToken(token);
    setIsLoading(true);
    setError(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function resolveSession() {
      // 1. Secure Supabase session resolution via RPC when Supabase is configured
      if (token && isSupabaseConfigured() && supabase) {
        try {
          let { data: sessionData, error: sessionErr } = await supabase.rpc('resolve_guest_portal_session', { p_token: token });
          
          // Fallback alias resolution for direct room number deep links (e.g. /guest/101 or /guest/room-101)
          if (sessionErr && (token === '101' || token.toLowerCase() === 'room-101' || token.toLowerCase().includes('r101'))) {
            const aliasRes = await supabase.rpc('resolve_guest_portal_session', { p_token: 'gp-r101-abc123' });
            if (!aliasRes.error && aliasRes.data) {
              sessionData = aliasRes.data;
              sessionErr = null;
            }
          } else if (sessionErr && (token === '201' || token.toLowerCase() === 'room-201' || token.toLowerCase().includes('r201'))) {
            const aliasRes = await supabase.rpc('resolve_guest_portal_session', { p_token: 'wb-r201-willow' });
            if (!aliasRes.error && aliasRes.data) {
              sessionData = aliasRes.data;
              sessionErr = null;
            }
          }
          if (sessionErr) {
            if (!isMounted) return;
            const errMsg = sessionErr.message || '';
            if (errMsg.includes('INVALID_QR_TOKEN') || errMsg.includes('deactivated')) {
              setError('This QR code is not recognized or has been deactivated. Please contact the front desk for assistance.');
            } else if (errMsg.includes('HOTEL_INACTIVE')) {
              setError('This hotel is currently inactive. Please contact the front desk.');
            } else {
              setError('Unable to resolve guest session from QR token. Please contact front desk.');
            }
            setIsLoading(false);
            return;
          }

          if (sessionData && isMounted) {
            if (sessionData.hotel) setHotel(sessionData.hotel);
            if (sessionData.room) setRoom(sessionData.room);
            setReservation(sessionData.reservation || null);
            setGuest(sessionData.guest || null);
            if (Array.isArray(sessionData.categories) && sessionData.categories.length > 0) {
              setCategories(sessionData.categories);
            }
            if (Array.isArray(sessionData.menu_items) && sessionData.menu_items.length > 0) {
              setMenuItems(sessionData.menu_items);
            }
            if (Array.isArray(sessionData.services) && sessionData.services.length > 0) {
              setServices(sessionData.services);
            }
            if (Array.isArray(sessionData.orders)) {
              setMyOrders(sessionData.orders);
              if (typeof sessionStorage !== 'undefined') {
                sessionData.orders.forEach((o: any) => {
                  if (o.tracking_token && o.id) {
                    sessionStorage.setItem('staynexa_tracking_' + o.id, o.tracking_token);
                  }
                });
              }
            }
            if (Array.isArray(sessionData.requests)) {
              setMyRequests(sessionData.requests);
              if (typeof sessionStorage !== 'undefined') {
                sessionData.requests.forEach((r: any) => {
                  if (r.tracking_token && r.id) {
                    sessionStorage.setItem('staynexa_req_tracking_' + r.id, r.tracking_token);
                  }
                });
              }
            }
            setDemoNotice(null);
            setIsLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn('[GuestPortal] Supabase session resolve error:', dbErr);
          if (!isDemoMode()) {
            if (isMounted) {
              setError('Network error resolving guest session. Please refresh or contact front desk.');
              setIsLoading(false);
            }
            return;
          }
        }
      }

      if (!isMounted) return;

      // 2. Resilient demo / in-memory token & room resolution
      const allHotels = hotelService.getAll();
      let resolvedHotel: Hotel | undefined = hotelService.getById('hotel-001') || allHotels[0];
      let resolvedRoom: Room | null = null;

      if (token) {
        // 2A. Token lookup via qrService (checking both active and deactivated tokens)
        const qrMatch = qrService.findByToken(token);
        if (qrMatch) {
          if (!qrMatch.is_active) {
            setError('This QR code has been deactivated. Please contact the front desk for assistance.');
            setIsLoading(false);
            return;
          }
          if (qrMatch.hotel) resolvedHotel = qrMatch.hotel;
          if (qrMatch.room) resolvedRoom = qrMatch.room;
        }

        // 2B. Direct roomId or roomNumber matching (e.g. testing with /guest?room=101 or token=101 or token=qr-token-101)
        if (!resolvedRoom) {
          for (const h of allHotels) {
            const hRooms = roomService.getAll(h.id);
            const matched = hRooms.find(r => 
              r.id === token || 
              r.number.toLowerCase() === token.toLowerCase() ||
              `qr-token-${r.number.toLowerCase()}` === token.toLowerCase() ||
              `token-${r.number.toLowerCase()}` === token.toLowerCase()
            );
            if (matched) {
              resolvedRoom = matched;
              resolvedHotel = h;
              break;
            }
          }
        }

        // If token was provided but no valid QR or room was found, fail closed!
        if (!resolvedRoom) {
          setError('Invalid or unrecognized QR token. Please verify your code or contact front desk.');
          setIsLoading(false);
          return;
        }

        setDemoNotice(null);
      } else {
        // 3. Fallback for bare demo preview (no token provided in URL)
        if (resolvedHotel) {
          const hotelRooms = roomService.getAll(resolvedHotel.id);
          resolvedRoom = 
            hotelRooms.find(r => r.number === '101') || 
            hotelRooms.find(r => r.status === 'AVAILABLE' && r.housekeeping_status === 'CLEAN') || 
            hotelRooms[0] || 
            null;
        }
        setDemoNotice('You are viewing an interactive guest portal demo (Room 101).');
      }

      if (!resolvedHotel || !resolvedRoom) {
        setError('Unable to load demo room session. Please refresh.');
        setIsLoading(false);
        return;
      }

      setHotel(resolvedHotel);
      setRoom(resolvedRoom);

      // 4. Resolve active reservation, guest, folio (Strict Fail-Closed)
      const allRes = reservationService.getAll(resolvedHotel.id);
      const activeRes = allRes.find(r => r.room_id === resolvedRoom!.id && r.status === 'CHECKED_IN');

      if (activeRes) {
        setReservation(activeRes);
        if (activeRes.guest) setGuest(activeRes.guest);
        const f = folioService.getByReservation(activeRes.id);
        if (f) setFolio(f);
      } else {
        setReservation(null);
        setGuest(null);
        setFolio(null);
      }

      // 5. Load menu categories, menu items, and services
      setCategories(menuService.getCategories(resolvedHotel.id));
      setMenuItems(menuService.getItems(resolvedHotel.id));
      setServices(serviceRequestService.getServices(resolvedHotel.id));

      // 6. Load orders and requests for this active reservation only
      if (activeRes) {
        const allOrders = orderService.getAll(resolvedHotel.id);
        setMyOrders(allOrders.filter(o => o.room_id === resolvedRoom!.id && o.reservation_id === activeRes.id));

        const allRequests = serviceRequestService.getAll(resolvedHotel.id);
        setMyRequests(allRequests.filter(r => r.room_id === resolvedRoom!.id && r.reservation_id === activeRes.id));
      } else {
        setMyOrders([]);
        setMyRequests([]);
      }

      setIsLoading(false);
    }

    resolveSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Realtime Status Synchronization for Guest Portal
  useEffect(() => {
    if (!hotel) return;

    // Listen to local BroadcastChannel and cross-tab storage events
    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', ({ orderId, status, order }) => {
      setMyOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, ...order, status } : o))
      );
    });

    const unsubRequestStatus = realtimeSync.subscribe('REQUEST_STATUS_CHANGED', ({ requestId, status, request }) => {
      setMyRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, ...request, status } : r))
      );
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        reloadDemoStoreFromStorage();
        if (hotel) {
          setMenuItems(menuService.getItems(hotel.id));
          setCategories(menuService.getCategories(hotel.id));
        }
        if (room && reservation) {
          const allOrders = orderService.getAll(hotel.id);
          setMyOrders(allOrders.filter(o => o.room_id === room.id && o.reservation_id === reservation.id));
          const allRequests = serviceRequestService.getAll(hotel.id);
          setMyRequests(allRequests.filter(r => r.room_id === room.id && r.reservation_id === reservation.id));
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubOrderStatus();
      unsubRequestStatus();
    };
  }, [hotel, room, reservation]);

  // Authenticated Order & Service Request Status Polling (4s interval) via Tracking Token
  useEffect(() => {
    const activeOrders = myOrders.filter(o => !['DELIVERED', 'CANCELLED', 'completed'].includes(o.status));
    const activeRequests = myRequests.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status));
    if (activeOrders.length === 0 && activeRequests.length === 0) return;

    const interval = setInterval(async () => {
      for (const ord of activeOrders) {
        const trackingToken = typeof sessionStorage !== 'undefined' 
          ? sessionStorage.getItem('staynexa_tracking_' + ord.id) 
          : null;
        if (trackingToken) {
          try {
            const fresh = await orderService.fetchGuestOrderStatus(ord.id, trackingToken);
            if (fresh && fresh.status && fresh.status !== ord.status) {
              setMyOrders(prev => prev.map(o => o.id === ord.id ? { ...o, ...fresh, status: fresh.status } : o));
            }
          } catch {
            // Polling silently ignores expired or transient network errors
          }
        }
      }

      for (const req of activeRequests) {
        const trackingToken = typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('staynexa_req_tracking_' + req.id)
          : null;
        if (trackingToken) {
          try {
            const fresh = await serviceRequestService.fetchGuestRequestStatus(req.id, trackingToken);
            if (fresh && fresh.status && fresh.status !== req.status) {
              setMyRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...fresh, status: fresh.status as any } : r));
            }
          } catch {
            // Polling silently ignores expired or transient network errors
          }
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [myOrders, myRequests]);

  const branding = hotel 
    ? ((hotel as any).tagline || (hotel as any).primary_color)
      ? {
          tagline: (hotel as any).tagline,
          logo_url: (hotel as any).logo_url,
          primary_color: (hotel as any).primary_color,
          accent_color: (hotel as any).accent_color,
        }
      : hotelService.getBranding(hotel.id) 
    : null;

  const settings = hotel 
    ? ((hotel as any).wifi_name !== undefined)
      ? {
          wifi_name: (hotel as any).wifi_name,
          wifi_password: (hotel as any).wifi_password,
          allow_room_charge: (hotel as any).allow_room_charge ?? true,
          google_review_url: (hotel as any).google_review_url || 'https://search.google.com/local/writereview?placeid=staynexa-demo',
        }
      : hotelService.getSettings(hotel.id) 
    : null;

  // Cart operations with precision rounding
  const addToCart = (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId);
    if (!item || item.is_available === false) return;
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const count = prev[itemId] || 0;
      if (count <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: count - 1 };
    });
  };

  const rawSubtotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find(i => i.id === itemId);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const taxCalculation = paymentService.calculateTaxes(rawSubtotal, 5);
  const cartSubtotal = taxCalculation.subtotal;
  const cartTax = taxCalculation.totalTax;
  const cartTotal = taxCalculation.grandTotal;
  const cartTotalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      if (token && isSupabaseConfigured() && supabase) {
        const { data: sessionData } = await supabase.rpc('resolve_guest_portal_session', { p_token: token });
        if (sessionData?.orders && Array.isArray(sessionData.orders)) {
          setMyOrders(sessionData.orders);
        }
        if (sessionData?.requests && Array.isArray(sessionData.requests)) {
          setMyRequests(sessionData.requests);
        }
      } else if (hotel && room && reservation) {
        const allOrders = orderService.getAll(hotel.id);
        setMyOrders(allOrders.filter(o => o.room_id === room.id && o.reservation_id === reservation.id));
        const allRequests = serviceRequestService.getAll(hotel.id);
        setMyRequests(allRequests.filter(r => r.room_id === room.id && r.reservation_id === reservation.id));
      }
    } catch (e) {
      console.warn('Manual refresh error:', e);
    } finally {
      setTimeout(() => setIsRefreshingOrders(false), 400);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (selectedCategory !== 'ALL' && item.category_id !== selectedCategory) return false;
    if (vegOnly && !item.is_veg) return false;
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description ? item.description.toLowerCase().includes(q) : false;
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const filteredServices = services.filter(s => {
    if (serviceCategory === 'ALL') return true;
    const cat = (s.category || '').toUpperCase();
    if (serviceCategory === 'HOUSEKEEPING') {
      return cat.includes('HOUSEKEEPING') || s.name.toLowerCase().includes('towel') || s.name.toLowerCase().includes('linen') || s.name.toLowerCase().includes('clean') || s.name.toLowerCase().includes('toilet');
    }
    if (serviceCategory === 'MAINTENANCE') {
      return cat.includes('MAINTENANCE') || s.name.toLowerCase().includes('ac') || s.name.toLowerCase().includes('air') || s.name.toLowerCase().includes('plumb') || s.name.toLowerCase().includes('wifi') || s.name.toLowerCase().includes('electric');
    }
    if (serviceCategory === 'CONCIERGE') {
      return cat.includes('CONCIERGE') || s.name.toLowerCase().includes('wake') || s.name.toLowerCase().includes('luggage') || s.name.toLowerCase().includes('laundry');
    }
    return true;
  });

  // Place Food Order
  const handlePlaceOrder = async () => {
    if (!hotel || !room || !reservation || !guest) {
      setOrderErrorMsg('Active checked-in stay required. Please complete check-in at reception before placing orders.');
      return;
    }
    if (cartTotalItems === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    setOrderErrorMsg(null);

    // Guard against sold-out items (86'd)
    for (const [itemId] of Object.entries(cart)) {
      const item = menuItems.find(i => i.id === itemId);
      if (!item || item.is_available === false) {
        setOrderErrorMsg(`Item "${item?.name || 'Selected item'}" is currently sold out.`);
        setIsSubmittingOrder(false);
        return;
      }
    }

    try {
      const items = Object.entries(cart).map(([itemId, qty]) => {
        const item = menuItems.find(i => i.id === itemId)!;
        const sub = paymentService.roundCurrency(item.price * qty);
        const tax = paymentService.roundCurrency((sub * (item.tax_percent || 5)) / 100);
        return {
          id: `oi-${Date.now()}-${itemId}`,
          order_id: '',
          menu_item_id: item.id,
          name: item.name,
          quantity: qty,
          unit_price: item.price,
          tax_percent: item.tax_percent || 5,
          total: paymentService.roundCurrency(sub + tax),
        };
      });

      const isRoomCharge = paymentOption === 'ROOM_CHARGE';

      const res = await orderService.placeOrder({
        hotel_id: hotel.id,
        room_id: room?.id,
        room_number: room?.number,
        guest_id: guest?.id,
        reservation_id: reservation?.id,
        token: token || undefined,
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        subtotal: cartSubtotal,
        tax_amount: cartTax,
        total: cartTotal,
        charge_to_room: isRoomCharge,
        special_instructions: orderSpecialInstructions || undefined,
        items,
      });

      if (!res.success || !res.order) {
        throw new Error(res.error || 'Failed to place order.');
      }

      const newOrd = res.order;

      // Save tracking token for secure guest status verification
      if (res.trackingToken && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('staynexa_tracking_' + newOrd.id, res.trackingToken);
      }

      // If paid via online UPI, immediately record the payment settlement
      if (paymentOption === 'UPI' && folio) {
        paymentService.recordPayment({
          hotelId: hotel.id,
          folioId: folio.id,
          guestId: guest?.id,
          reservationId: reservation?.id,
          amount: cartTotal,
          method: 'UPI',
          reference: `UPI-ONLINE-${Date.now().toString().slice(-6)}`,
          notes: `Instant UPI settlement for In-Room Dining Order #${newOrd.id.slice(-6)}`,
        });
      }

      // Refresh folio state
      if (folio) {
        setFolio(folioService.getById(folio.id) || null);
      } else if (reservation) {
        const freshFolio = folioService.getByReservation(reservation.id);
        if (freshFolio) setFolio(freshFolio);
      }

      setMyOrders(prev => [newOrd, ...prev.filter(o => o.id !== newOrd.id)]);
      setCart({});
      setIsCartOpen(false);
      setOrderSpecialInstructions('');
      const orderTag = room?.number ? `${room.number}` : newOrd.id.slice(-4).toUpperCase();
      setOrderSuccessToast(`Order #${orderTag} Sent to Kitchen!`);
      setActiveTab('ORDERS');
      setTimeout(() => setOrderSuccessToast(null), 5000);
    } catch (err: any) {
      console.error('[GuestPortal] Order submission error:', err);
      setOrderErrorMsg(err?.message || 'Unable to dispatch order. Please check network or front desk.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Place Service Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !room || !reservation || !guest || !selectedService) {
      setError('Active checked-in stay required to submit service requests. Please contact the front desk.');
      return;
    }

    const res = await serviceRequestService.submitRequest({
      hotel_id: hotel.id,
      room_id: room?.id,
      guest_id: guest?.id,
      reservation_id: reservation?.id,
      service_id: selectedService.id,
      title: selectedService.name,
      description: requestDesc || `Requested from Room ${room?.number || 'Portal'}`,
      priority: 'MEDIUM',
      status: 'PENDING',
      token: token || undefined,
    });

    if (res.success && res.request) {
      if (res.trackingToken && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('staynexa_req_tracking_' + res.request.id, res.trackingToken);
      }
      setMyRequests(prev => [res.request, ...prev.filter(r => r.id !== res.request.id)]);
      setSelectedService(null);
      setRequestDesc('');
      setRequestSuccess(true);
      setTimeout(() => setRequestSuccess(false), 3000);
    } else {
      setError(res.error || 'Failed to submit service request.');
    }
  };

  // Handle Concierge Chat Send
  const handleSendChatMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || !hotel) return;

    const newGuestMsg: ChatMessage = {
      id: `m-${nowMs()}`,
      sender: 'GUEST',
      text,
      timestamp: 'Just now'
    };

    setChatMessages(prev => [...prev, newGuestMsg]);
    if (!textToSend) setChatInput('');

    // Automatically create a Service Request for the reception desk only if guest is active checked-in
    if (reservation) {
      serviceRequestService.create({
        hotel_id: hotel.id,
        room_id: room?.id,
        guest_id: guest?.id,
        reservation_id: reservation?.id,
        title: `Concierge Chat: ${text.slice(0, 32)}`,
        description: text,
        priority: 'MEDIUM',
        status: 'PENDING',
      });
    }

    // Simulated desk response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: `m-reply-${Date.now()}`,
          sender: 'DESK',
          text: `Thank you! Front Desk received your request: "${text}". Our guest service team will attend to Room ${room?.number || ''} shortly.`,
          timestamp: 'Just now'
        }
      ]);
    }, 1200);
  };

  const copyWifiPassword = () => {
    if (settings?.wifi_password) {
      navigator.clipboard.writeText(settings.wifi_password);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-stone-300">Connecting to your room experience...</p>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-stone-200 shadow-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-stone-900">QR Code Not Recognized</h2>
          <p className="text-sm text-stone-600">{error}</p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              Go to StayNexa Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const primaryCol = branding?.primary_color || '#1a2744';
  const accentCol = branding?.accent_color || '#c9a84c';
  const googleReviewLink = settings?.google_review_url || 'https://search.google.com/local/writereview?placeid=staynexa-demo';

  // Render Rate Us on Google Review Card
  const renderGoogleReviewCard = () => (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-stone-900">Enjoying your stay?</h4>
            <p className="text-[10px] text-stone-500">Rate your experience at {hotel.name}</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          ))}
        </div>
      </div>
      
      <p className="text-xs text-stone-600">
        Your rating helps us continually elevate our hospitality standards.
      </p>

      <a
        href={googleReviewLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 px-3 rounded-xl bg-white border border-amber-300 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-100/50 transition-colors shadow-2xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Rate Us on Google</span>
        <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center text-stone-900 font-sans pb-24">
      {/* Mobile viewport constraint */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        {/* Fallback demo session notification banner */}
        {demoNotice && (
          <div className="bg-amber-400 text-stone-950 px-3.5 py-1.5 text-xs font-bold flex items-center justify-between border-b border-amber-500 shadow-xs z-20">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-stone-950 shrink-0" />
              <span className="truncate">{demoNotice}</span>
            </div>
            <span className="text-[10px] bg-stone-900 text-white px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider shrink-0 ml-1">
              Demo Session Loaded
            </span>
          </div>
        )}

        {/* Top Header Banner */}
        <header 
          className="p-5 text-white flex flex-col justify-between relative shadow-md"
          style={{ backgroundColor: primaryCol }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold font-display shadow-xs"
                style={{ backgroundColor: accentCol, color: primaryCol }}
              >
                SN
              </div>
              <div>
                <h1 className="font-display font-bold text-base leading-tight tracking-wide">{hotel.name}</h1>
                <p className="text-[11px] opacity-75">{hotel.city}, {hotel.state}</p>
                {branding?.tagline && (
                  <p className="text-[10px] opacity-70 italic mt-0.5">{branding.tagline}</p>
                )}
              </div>
            </div>

            {room && (
              <div 
                className="px-3 py-1 rounded-full text-xs font-black shadow-xs"
                style={{ backgroundColor: accentCol, color: primaryCol }}
              >
                Room {room.number}
              </div>
            )}
          </div>

          {guest && (
            <div className="mt-4 pt-3 border-t border-white/10 text-xs flex justify-between items-center">
              <span className="opacity-90">Welcome back, <strong>{guest.first_name}</strong></span>
              <span className="opacity-75">{room?.room_type?.name || 'Suite'}</span>
            </div>
          )}
        </header>

        {/* Active Stay Requirement Warning */}
        {!reservation && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-start gap-2 shadow-xs z-10">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">No Active Stay Checked In:</span> Room service ordering and concierge requests will be unlocked once guest check-in is processed at the reception desk.
            </div>
          </div>
        )}

        {/* Global Feedback Banners */}
        {orderSuccessToast && (
          <div className="bg-emerald-600 text-white p-3 text-xs font-bold text-center flex items-center justify-center gap-2 animate-bounce shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            {orderSuccessToast}
          </div>
        )}
        {orderErrorMsg && (
          <div className="bg-rose-600 text-white p-3 text-xs font-bold text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {orderErrorMsg}
          </div>
        )}
        {requestSuccess && (
          <div className="bg-emerald-600 text-white p-3 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Your service request has been logged with Front Desk.
          </div>
        )}

        {/* Tab 1: HOME */}
        {activeTab === 'HOME' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Rate Us on Google Review Card */}
            {renderGoogleReviewCard()}

            {/* Wi-Fi Card */}
            {settings?.wifi_name && (
              <div className="p-4 rounded-2xl bg-stone-900 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-[#c9a84c]" />
                    <span className="font-bold text-sm tracking-wide">High-Speed Guest Wi-Fi</span>
                  </div>
                  <span className="text-[10px] bg-white/10 text-[#c9a84c] px-2 py-0.5 rounded font-bold">Complimentary</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-stone-400">Network: <strong className="text-white">{settings.wifi_name}</strong></div>
                    <div className="text-xs font-mono font-bold mt-0.5">Password: {settings.wifi_password}</div>
                  </div>
                  <button
                    onClick={copyWifiPassword}
                    className="p-2 rounded-lg bg-[#c9a84c] text-stone-950 hover:bg-[#e8d5a3] transition-colors cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedWifi ? <Check className="w-4 h-4 text-emerald-950 font-bold" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('FOOD')}
                className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#c9a84c] hover:shadow-xs transition-all text-left space-y-2 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">In-Room Dining</h3>
                  <p className="text-[11px] text-stone-500">Mains, snacks & mineral water</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('CHAT')}
                className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#c9a84c] hover:shadow-xs transition-all text-left space-y-2 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Live Concierge</h3>
                  <p className="text-[11px] text-stone-500">Chat with Front Desk</p>
                </div>
              </button>
            </div>

            {/* Hotel Timings & Policies */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-3">
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs">Hotel Operating Hours</h3>
              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">Check-In / Out</span>
                  <span className="font-semibold text-stone-800">{hotel.check_in_time} / {hotel.check_out_time}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">In-Room Dining Service</span>
                  <span className="font-semibold text-stone-800">07:00 AM – 11:30 PM</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">Front Desk Assistance</span>
                  <span className="font-semibold text-emerald-700">24 Hours Live</span>
                </div>
              </div>
            </div>

            {/* Reception Direct Call Button */}
            <a
              href={`tel:${hotel.phone}`}
              className="w-full py-3.5 px-4 rounded-2xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-800 shadow-sm"
            >
              <Phone className="w-4 h-4 text-[#c9a84c]" />
              Call Reception Directly ({hotel.phone})
            </a>
          </div>
        )}

        {/* Tab 2: FOOD & DINING */}
        {activeTab === 'FOOD' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Active order quick notification pill */}
            {myOrders.length > 0 && (
              <button
                onClick={() => setActiveTab('ORDERS')}
                className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 font-bold hover:bg-amber-100/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>{myOrders.length} {myOrders.length === 1 ? 'order' : 'orders'} in kitchen workflow</span>
                </div>
                <span className="text-amber-700 underline text-[11px]">Track Status &rarr;</span>
              </button>
            )}

            {/* Menu Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search food, beverages, snacks..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-xs focus:ring-1 focus:ring-[#c9a84c] focus:outline-none bg-stone-50"
              />
              {menuSearch && (
                <button
                  onClick={() => setMenuSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills: Veg-only & Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  vegOnly ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                Veg Only
              </button>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'ALL' ? 'bg-[#1a2744] text-white shadow-xs' : 'bg-stone-100 text-stone-700'
                }`}
              >
                All Menu
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === c.id ? 'bg-[#c9a84c] text-white shadow-xs' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Menu Items List */}
            <div className="space-y-3">
              {filteredMenuItems.length === 0 ? (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <UtensilsCrossed className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs">No menu items match your search or filters.</p>
                  {(menuSearch || vegOnly || selectedCategory !== 'ALL') && (
                    <button
                      onClick={() => { setMenuSearch(''); setVegOnly(false); setSelectedCategory('ALL'); }}
                      className="text-xs font-bold text-[#c9a84c] hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                filteredMenuItems.map(item => {
                  const qty = cart[item.id] || 0;
                  return (
                    <div key={item.id} className="p-3 rounded-2xl border border-stone-200 bg-white flex justify-between items-center gap-3 shadow-2xs">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 border ${
                            item.is_veg ? 'bg-emerald-600 border-emerald-700' : 'bg-rose-600 border-rose-700'
                          }`} />
                          <h4 className="font-bold text-sm text-stone-900">{item.name}</h4>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-2">{item.description}</p>
                        <div className="text-xs font-bold text-stone-900 pt-1">₹{item.price}</div>
                      </div>

                      {/* Add/Remove buttons */}
                      <div className="flex items-center gap-2">
                        {item.is_available === false ? (
                          <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-400 font-bold text-xs border border-stone-200">
                            Sold Out
                          </span>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-stone-800 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold text-xs text-stone-900 w-4 text-center">{qty}</span>
                            <button 
                              onClick={() => addToCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-[#c9a84c] text-white shadow-xs flex items-center justify-center font-bold cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item.id)}
                            className="px-3 py-1.5 rounded-xl border border-[#c9a84c] text-[#c9a84c] font-bold text-xs hover:bg-[#c9a84c] hover:text-white transition-colors cursor-pointer"
                          >
                            Add +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: ORDERS & LIVE KITCHEN DISPATCH TRACKER */}
        {activeTab === 'ORDERS' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900">Your Dining Orders</h3>
                <p className="text-[11px] text-stone-500">Live order status from kitchen to Room {room?.number || ''}</p>
              </div>
              <button
                onClick={handleRefreshOrders}
                disabled={isRefreshingOrders}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                title="Refresh order status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? 'animate-spin text-[#c9a84c]' : ''}`} />
              </button>
            </div>

            {myOrders.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded-2xl space-y-3 my-6">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900">No Orders Placed Yet</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Explore our kitchen menu and place your room service order.</p>
                </div>
                <button
                  onClick={() => setActiveTab('FOOD')}
                  className="px-4 py-2 rounded-xl bg-[#c9a84c] text-white font-bold text-xs hover:bg-[#b8973d] transition-colors shadow-xs cursor-pointer"
                >
                  Browse Dining Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map(ord => {
                  const steps = [
                    { id: 'PENDING', label: 'Placed', icon: Clock },
                    { id: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2 },
                    { id: 'PREPARING', label: 'Cooking', icon: Flame },
                    { id: 'READY', label: 'Ready', icon: BellRing },
                    { id: 'DELIVERED', label: 'Delivered', icon: Check },
                  ];

                  const statusUpper = (ord.status || '').toUpperCase();
                  const currentIdx = steps.findIndex(s => s.id === statusUpper);
                  const activeIdx = currentIdx === -1 ? (statusUpper === 'CANCELLED' ? 0 : 4) : currentIdx;
                  const isCancelled = statusUpper === 'CANCELLED';

                  return (
                    <div key={ord.id} className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-stone-900">Order #{ord.id.slice(-4).toUpperCase()}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCancelled ? 'bg-rose-100 text-rose-700' :
                              statusUpper === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            {ord.created_at ? new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-[#c9a84c] font-mono">₹{ord.total || ord.total_amount || 0}</span>
                          <span className="text-[10px] text-stone-400 block">
                            {ord.charge_to_room !== false ? 'Room Folio' : (ord.payment_status || 'Paid')}
                          </span>
                        </div>
                      </div>

                      {/* 5-step Stepper */}
                      {!isCancelled ? (
                        <div className="pt-2">
                          <div className="flex items-center justify-between relative">
                            <div className="absolute left-3 right-3 top-3.5 h-0.5 bg-stone-200 -z-0" />
                            <div 
                              className="absolute left-3 top-3.5 h-0.5 bg-emerald-500 -z-0 transition-all duration-500" 
                              style={{ width: `${(activeIdx / (steps.length - 1)) * 90}%` }}
                            />

                            {steps.map((st, idx) => {
                              const isPast = idx < activeIdx;
                              const isCurrent = idx === activeIdx;
                              const StepIcon = st.icon;

                              return (
                                <div key={st.id} className="flex flex-col items-center z-10">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    isPast ? 'bg-emerald-600 text-white shadow-xs' :
                                    isCurrent ? 'bg-[#c9a84c] text-white ring-4 ring-[#c9a84c]/20' :
                                    'bg-white border-2 border-stone-300 text-stone-400'
                                  }`}>
                                    {isPast ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                                  </div>
                                  <span className={`text-[9px] mt-1 text-center font-medium ${
                                    isCurrent ? 'text-stone-900 font-bold' :
                                    isPast ? 'text-emerald-700' : 'text-stone-400'
                                  }`}>
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold text-center">
                          This order was cancelled by front desk or kitchen.
                        </div>
                      )}

                      {/* Item Breakdown */}
                      <div className="divide-y divide-stone-100 bg-stone-50/70 p-2.5 rounded-xl border border-stone-100 space-y-1">
                        {(ord.items || []).map((it, idx) => (
                          <div key={it.id || idx} className="flex justify-between items-center text-xs py-1">
                            <span className="text-stone-800">
                              <strong>{it.quantity}x</strong> {it.name}
                            </span>
                            <span className="font-mono text-stone-600 text-[11px]">
                              ₹{it.total || (it.unit_price ? it.unit_price * it.quantity : 0)}
                            </span>
                          </div>
                        ))}
                        <div className="pt-1.5 flex justify-between items-center text-[11px] font-bold text-stone-900 border-t border-stone-200">
                          <span>Total (incl. GST)</span>
                          <span>₹{ord.total || ord.total_amount}</span>
                        </div>
                      </div>

                      {ord.special_instructions && (
                        <div className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-100">
                          <strong>Kitchen Notes:</strong> {ord.special_instructions}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: SERVICES */}
        {activeTab === 'SERVICES' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div>
              <h3 className="font-bold text-sm text-stone-900">In-Room Amenities & Services</h3>
              <p className="text-[11px] text-stone-500">Fast assistance delivered directly to Room {room?.number || ''}</p>
            </div>

            {/* Department filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Services' },
                { id: 'HOUSEKEEPING', label: 'Housekeeping' },
                { id: 'MAINTENANCE', label: 'Maintenance' },
                { id: 'CONCIERGE', label: 'Concierge' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setServiceCategory(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    serviceCategory === f.id ? 'bg-[#1a2744] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredServices.map(s => {
                const cat = (s.category || '').toUpperCase();
                const Icon = cat.includes('MAINTENANCE') ? Wrench : Sparkles;

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-[#c9a84c] hover:shadow-xs transition-all text-left space-y-1 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <Icon className="w-4 h-4 text-[#c9a84c] mb-1.5" />
                      <div className="font-bold text-xs text-stone-900 leading-tight">{s.name}</div>
                      <div className="text-[10px] text-stone-500 line-clamp-2 mt-0.5">{s.description || 'Complimentary service'}</div>
                    </div>
                    <div className="pt-2 text-[10px] font-bold text-[#c9a84c] flex items-center justify-between">
                      <span>{s.price && s.price > 0 ? `₹${s.price}` : 'Complimentary'}</span>
                      <span className="text-[10px] bg-amber-50 px-1.5 py-0.5 rounded">Request &rarr;</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Requests Tracking */}
            {myRequests.length > 0 && (
              <div className="pt-4 border-t border-stone-200 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Recent Service Status</h4>
                  <span className="text-[10px] text-stone-400">Front Desk Live Sync</span>
                </div>
                <div className="space-y-2">
                  {myRequests.map(req => (
                    <div key={req.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-stone-900">{req.title}</div>
                        <div className="text-[11px] text-stone-500 line-clamp-1">{req.description}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: LIVE CONCIERGE CHAT */}
        {activeTab === 'CHAT' && (
          <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div className="text-center py-1">
                <span className="text-[10px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">
                  Live Front Desk Dispatch Channel
                </span>
              </div>

              {/* Chat Bubbles */}
              {chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.sender === 'GUEST' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`p-3 rounded-2xl max-w-[85%] text-xs shadow-2xs ${
                    msg.sender === 'GUEST'
                      ? 'bg-[#1a2744] text-white rounded-br-xs'
                      : 'bg-stone-100 text-stone-900 rounded-bl-xs border border-stone-200'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Quick Action Chips */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  'Extra Bath Towels',
                  'Water Refill (1L)',
                  'Luggage Assistance',
                  'Late Checkout (2 PM)',
                  'Quiet Room Request'
                ].map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleSendChatMessage(chip)}
                    className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-[#c9a84c]/20 hover:text-[#c9a84c] text-[11px] font-semibold whitespace-nowrap text-stone-700 transition-colors cursor-pointer border border-stone-200"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form 
                onSubmit={e => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask concierge or request items..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-1 focus:ring-[#c9a84c] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 rounded-xl bg-[#c9a84c] text-white font-bold disabled:opacity-40 transition-opacity cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 5: STAY & FOLIO */}
        {activeTab === 'STAY' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Stay Summary Card */}
            <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <div>
                  <span className="text-xs text-stone-400 block">Registration</span>
                  <span className="font-bold text-sm">Room {room?.number || '—'} · {room?.room_type?.name}</span>
                </div>
                <span className="text-xs bg-[#c9a84c] text-stone-950 font-bold px-2 py-0.5 rounded">CHECKED IN</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                <div>Arrival: <strong>{reservation?.check_in_date || 'Today'}</strong></div>
                <div>Departure: <strong>{reservation?.check_out_date || 'Tomorrow'}</strong></div>
              </div>
            </div>

            {/* Folio Financial Statement */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs">Live Stay Folio Summary</h3>
                <button
                  onClick={() => setIsInvoiceOpen(true)}
                  className="text-xs font-bold text-[#c9a84c] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  View Invoice
                </button>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">Room Accommodation</span>
                  <span className="font-semibold text-stone-800">₹{reservation?.total_amount || 0}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">Total Posted Charges</span>
                  <span className="font-bold text-stone-900">₹{folio?.total_charges || reservation?.total_amount || 0}</span>
                </div>
                <div className="py-2 flex justify-between text-emerald-700">
                  <span>Advance Deposits & Payments</span>
                  <span className="font-bold">-₹{folio?.total_payments || 0}</span>
                </div>
                <div className="py-2.5 flex justify-between text-sm font-bold border-t border-stone-200">
                  <span className="text-stone-900">Estimated Balance Due:</span>
                  <span className="text-rose-600">₹{(folio?.outstanding ?? reservation?.total_amount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <p className="text-[10px] text-stone-400 text-center">
                Outstanding balance can be settled via UPI, Card, or Cash at the front desk or during check-out.
              </p>
            </div>

            {/* Google Review Card on Stay Tab */}
            {renderGoogleReviewCard()}
          </div>
        )}

        {/* Tab 6: CONTACT */}
        {activeTab === 'CONTACT' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-stone-900">{hotel.name}</h3>
              <p className="text-xs text-stone-500">{hotel.address}, {hotel.city}, {hotel.state}</p>
            </div>

            <div className="space-y-2">
              <a
                href={`tel:${hotel.phone}`}
                className="p-3.5 rounded-xl border border-stone-200 bg-white flex items-center justify-between font-bold text-xs text-stone-800 hover:bg-stone-50"
              >
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Front Desk Direct: {hotel.phone}</span>
                </div>
              </a>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white flex items-center justify-between font-bold text-xs text-stone-400">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-stone-300" />
                  <span>WhatsApp Concierge: (Manual Mode / Unconnected)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Cart Bar (When Food items present) */}
        {cartTotalItems > 0 && activeTab === 'FOOD' && (
          <div className="absolute bottom-16 inset-x-3 p-3 rounded-2xl bg-stone-950 text-white shadow-xl flex items-center justify-between z-30 animate-slide-up">
            <div>
              <span className="text-xs text-stone-400">{cartTotalItems} {cartTotalItems === 1 ? 'item' : 'items'} selected</span>
              <div className="font-bold text-sm text-[#c9a84c]">₹{cartTotal} (incl. 5% GST)</div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              iconRight={<ShoppingBag className="w-4 h-4" />}
            >
              Review Cart
            </Button>
          </div>
        )}

        {/* Fixed Mobile Bottom Navigation */}
        <nav className="absolute bottom-0 inset-x-0 h-16 bg-white border-t border-stone-200 flex items-center justify-around px-1 z-20">
          {[
            { id: 'HOME', label: 'Home', icon: Building2 },
            { id: 'FOOD', label: 'Dining', icon: UtensilsCrossed },
            { id: 'ORDERS', label: 'Orders', icon: Clock, badge: myOrders.length > 0 ? myOrders.length : undefined },
            { id: 'SERVICES', label: 'Services', icon: Sparkles, badge: myRequests.length > 0 ? myRequests.length : undefined },
            { id: 'CHAT', label: 'Concierge', icon: MessageSquare },
            { id: 'STAY', label: 'My Stay', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors cursor-pointer relative ${
                  active ? 'text-[#c9a84c] font-bold' : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#c9a84c] text-stone-950 font-bold text-[9px] rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Review Cart Modal with Payment Mode Selection */}
        <Modal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          title="Review In-Room Dining Order"
          size="sm"
          footer={
            <div className="flex justify-between items-center w-full">
              <Button variant="outline" onClick={() => setIsCartOpen(false)} disabled={isSubmittingOrder}>Back</Button>
              <Button variant="primary" onClick={handlePlaceOrder} disabled={isSubmittingOrder || !reservation}>
                {!reservation 
                  ? 'Active Check-in Required' 
                  : isSubmittingOrder 
                    ? 'Dispatching Order...' 
                    : paymentOption === 'ROOM_CHARGE' 
                      ? 'Charge to Room Folio' 
                      : 'Pay via UPI Now'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {!reservation && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Orders cannot be placed because this room is not currently checked in. Please contact front desk.</span>
              </div>
            )}
            <div className="divide-y divide-stone-100 max-h-48 overflow-y-auto">
              {Object.entries(cart).map(([itemId, qty]) => {
                const item = menuItems.find(i => i.id === itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900">{qty}x {item.name}</span>
                      <span className="text-stone-400 block text-[10px]">₹{item.price} each</span>
                    </div>
                    <span className="font-bold text-stone-900">₹{paymentService.roundCurrency(item.price * qty)}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-1">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal:</span>
                <span>₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>GST (5%):</span>
                <span>₹{cartTax}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-1 border-t border-stone-100">
                <span>Order Total:</span>
                <span className="text-[#c9a84c]">₹{cartTotal}</span>
              </div>
            </div>

            {/* Payment Settlement Method */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-stone-700 font-semibold">Payment Option</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentOption('ROOM_CHARGE')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    paymentOption === 'ROOM_CHARGE'
                      ? 'border-[#c9a84c] bg-amber-50/50 text-[#c9a84c] font-bold'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  <div className="text-[11px] font-bold">Charge to Room</div>
                  <div className="text-[9px] opacity-75">Pay upon check-out</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentOption('UPI')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    paymentOption === 'UPI'
                      ? 'border-[#c9a84c] bg-amber-50/50 text-[#c9a84c] font-bold'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  <div className="text-[11px] font-bold flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Pay via UPI
                  </div>
                  <div className="text-[9px] opacity-75">Instant settlement</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">Kitchen Special Instructions</label>
              <textarea
                rows={2}
                className="w-full p-2 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-[#c9a84c] focus:outline-none"
                placeholder="e.g. Extra spicy, less oil, deliver with cut lemons"
                value={orderSpecialInstructions}
                onChange={e => setOrderSpecialInstructions(e.target.value)}
              />
            </div>
          </div>
        </Modal>

        {/* Service Request Modal */}
        {selectedService && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedService(null)}
            title={`Request: ${selectedService.name}`}
            size="sm"
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button variant="outline" onClick={() => setSelectedService(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateRequest} disabled={!reservation}>
                  {!reservation ? 'Check-in Required' : 'Submit Request'}
                </Button>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              {!reservation && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Service requests are unavailable until room check-in is complete at reception.</span>
                </div>
              )}
              <p className="text-stone-600">{selectedService.description || 'Our housekeeping / concierge team will attend to your room.'}</p>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Additional details or quantity:</label>
                <textarea
                  rows={3}
                  className="w-full p-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#c9a84c] focus:outline-none"
                  placeholder="e.g. Need 2 extra bath towels before 6 PM"
                  value={requestDesc}
                  onChange={e => setRequestDesc(e.target.value)}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Digital Tax Invoice Modal */}
        {isInvoiceOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsInvoiceOpen(false)}
            title="Digital Tax Invoice"
            size="sm"
            footer={
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={() => setIsInvoiceOpen(false)}>Close</Button>
                <Button 
                  variant="primary" 
                  onClick={() => window.print()}
                  iconLeft={<Printer className="w-4 h-4" />}
                >
                  Print Invoice
                </Button>
              </div>
            }
          >
            <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 font-mono text-xs text-stone-900">
              <div className="text-center border-b border-stone-200 pb-2">
                <div className="font-extrabold text-sm">{hotel.name}</div>
                <div className="text-[10px] text-stone-500">{hotel.address}, {hotel.city}</div>
                <div className="text-[10px] text-stone-500">GSTIN: {hotel.gstin || '07AABCG1234A1Z5'}</div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>Room: <strong>{room?.number}</strong></span>
                <span>Invoice: <strong>INV-{reservation?.id ? reservation.id.slice(-6).toUpperCase() : '100001'}</strong></span>
              </div>
              <div className="text-[11px] text-stone-600">
                Guest: {guest?.first_name} {guest?.last_name}
              </div>

              <div className="border-t border-stone-200 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Room Stay Charge:</span>
                  <span>₹{reservation?.total_amount || 0}</span>
                </div>
                {(folio ? folioService.getItems(folio.id) : []).map((it: FolioItem) => (
                  <div key={it.id} className="flex justify-between text-stone-600 text-[10px]">
                    <span className="line-clamp-1">{it.description}</span>
                    <span>₹{it.total}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Total Charges:</span>
                  <span>₹{folio?.total_charges || reservation?.total_amount || 0}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid / Advances:</span>
                  <span>-₹{folio?.total_payments || 0}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300">
                  <span>Outstanding:</span>
                  <span className="text-rose-600">₹{folio?.outstanding || 0}</span>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

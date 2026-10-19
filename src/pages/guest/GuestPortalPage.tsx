import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  Calendar,
  IndianRupee,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { 
  qrService, 
  hotelService, 
  roomService, 
  guestService, 
  reservationService, 
  menuService, 
  orderService, 
  serviceRequestService, 
  folioService 
} from '../../services/demoDataService';
import type { 
  Hotel, 
  Room, 
  Guest, 
  Reservation, 
  MenuItem, 
  Order, 
  ServiceRequest, 
  Folio 
} from '../../types';
import { Button, Badge, Modal } from '../../components/ui';

export default function GuestPortalPage() {
  const { token } = useParams<{ token: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [folio, setFolio] = useState<Folio | null>(null);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'HOME' | 'FOOD' | 'SERVICES' | 'STAY' | 'CONTACT'>('HOME');

  // Food Cart & Menu state
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSpecialInstructions, setOrderSpecialInstructions] = useState('');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Services state
  const [services, setServices] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Wi-Fi Copy state
  const [copiedWifi, setCopiedWifi] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing QR access token.');
      setIsLoading(false);
      return;
    }

    const resolved = qrService.getByToken(token);
    if (!resolved || !resolved.hotel) {
      setError('Invalid or expired room QR code. Please scan the QR code located in your room.');
      setIsLoading(false);
      return;
    }

    setHotel(resolved.hotel);
    setRoom(resolved.room || null);

    // If room is resolved, check active reservation & guest
    if (resolved.room) {
      const activeRes = reservationService.getAll(resolved.hotel.id)
        .find(r => r.room_id === resolved.room!.id && r.status === 'CHECKED_IN');

      if (activeRes) {
        setReservation(activeRes);
        if (activeRes.guest) setGuest(activeRes.guest);
        const f = folioService.getByReservation(activeRes.id);
        if (f) setFolio(f);
      }
    }

    // Load menu and services for this hotel
    setCategories(menuService.getCategories(resolved.hotel.id));
    setMenuItems(menuService.getItems(resolved.hotel.id));
    setServices(serviceRequestService.getServices(resolved.hotel.id));

    // Load active orders and requests for this room
    if (resolved.room) {
      const allOrders = orderService.getAll(resolved.hotel.id);
      setMyOrders(allOrders.filter(o => o.room_id === resolved.room!.id));

      const allRequests = serviceRequestService.getAll(resolved.hotel.id);
      setMyRequests(allRequests.filter(r => r.room_id === resolved.room!.id));
    }

    setIsLoading(false);
  }, [token]);

  const branding = hotel ? hotelService.getBranding(hotel.id) : null;
  const settings = hotel ? hotelService.getSettings(hotel.id) : null;

  // Cart operations
  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const count = prev[itemId] || 0;
      if (count <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: count - 1 };
    });
  };

  const cartTotalItems = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const cartSubtotal = Object.entries(cart).reduce((sum, [itemId, count]) => {
    const item = menuItems.find(i => i.id === itemId);
    return sum + (item ? item.price * count : 0);
  }, 0);
  const cartTax = Math.round(cartSubtotal * 0.05);
  const cartTotal = cartSubtotal + cartTax;

  const handlePlaceOrder = () => {
    if (!hotel || cartTotalItems === 0) return;

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(i => i.id === itemId)!;
      return {
        menu_item_id: item.id,
        name: item.name,
        quantity: qty,
        unit_price: item.price,
        tax_percent: item.tax_percent,
        total: item.price * qty + Math.round(item.price * qty * (item.tax_percent / 100)),
      };
    });

    const newOrd = orderService.create({
      hotel_id: hotel.id,
      reservation_id: reservation?.id,
      room_id: room?.id,
      guest_id: guest?.id,
      status: 'PENDING',
      type: 'ROOM_SERVICE',
      subtotal: cartSubtotal,
      tax_amount: cartTax,
      total: cartTotal,
      charge_to_room: true,
      special_instructions: orderSpecialInstructions,
      items: orderItems,
    });

    // Also auto-post charge to room folio if checked-in
    if (folio) {
      folioService.addItem({
        folio_id: folio.id,
        hotel_id: hotel.id,
        description: `Room Service Order #${newOrd.id.slice(-4)} (${orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ')})`,
        category: 'ROOM_SERVICE',
        quantity: 1,
        unit_price: cartSubtotal,
        tax_percent: 5,
        tax_amount: cartTax,
        discount_amount: 0,
        total: cartTotal,
        posted_at: new Date().toISOString(),
        posted_by: 'Guest QR Portal',
      });
      setFolio(folioService.getById(folio.id) || null);
    }

    setMyOrders(prev => [newOrd, ...prev]);
    setCart({});
    setIsCartOpen(false);
    setOrderSpecialInstructions('');
    setOrderSuccessMsg(true);
    setTimeout(() => setOrderSuccessMsg(false), 4000);
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !selectedService) return;

    const req = serviceRequestService.create({
      hotel_id: hotel.id,
      room_id: room?.id,
      guest_id: guest?.id,
      reservation_id: reservation?.id,
      service_id: selectedService.id,
      title: selectedService.name,
      description: requestDesc || `Requested from Room ${room?.number || 'Portal'}`,
      priority: 'MEDIUM',
      status: 'PENDING',
    });

    setMyRequests(prev => [req, ...prev]);
    setSelectedService(null);
    setRequestDesc('');
    setRequestSuccess(true);
    setTimeout(() => setRequestSuccess(false), 3000);
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

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center text-stone-900 font-sans pb-24">
      {/* Mobile viewport constraint */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
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

        {/* Global Feedback Banners */}
        {orderSuccessMsg && (
          <div className="bg-emerald-600 text-white p-3 text-xs font-bold text-center flex items-center justify-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            Your Room Service order was placed and sent to the kitchen!
          </div>
        )}
        {requestSuccess && (
          <div className="bg-emerald-600 text-white p-3 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Your request has been logged with Front Desk.
          </div>
        )}

        {/* Tab 1: HOME */}
        {activeTab === 'HOME' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
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
                    className="p-2 rounded-lg bg-[#c9a84c] text-stone-950 hover:bg-[#e8d5a3] transition-colors"
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
                className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#c9a84c] hover:shadow-xs transition-all text-left space-y-2 group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">In-Room Dining</h3>
                  <p className="text-[11px] text-stone-500">Breakfast, mains & drinks</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('SERVICES')}
                className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#c9a84c] hover:shadow-xs transition-all text-left space-y-2 group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Guest Services</h3>
                  <p className="text-[11px] text-stone-500">Towels, laundry & tidying</p>
                </div>
              </button>
            </div>

            {/* Hotel Timings & Policies */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-3">
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider text-xs">Hotel Operating Hours</h3>
              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">Check-In / Out</span>
                  <span className="font-semibold text-stone-800">{hotel.check_in_time} / {hotel.check_out_time}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-500">Restaurant Dining</span>
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

        {/* Tab 2: FOOD */}
        {activeTab === 'FOOD' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Category horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === 'ALL' ? 'bg-[#1a2744] text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                All Menu
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === c.id ? 'bg-[#c9a84c] text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Menu Items List */}
            <div className="space-y-3">
              {menuItems
                .filter(i => selectedCategory === 'ALL' || i.category_id === selectedCategory)
                .map(item => {
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
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-stone-800"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold text-xs text-stone-900 w-4 text-center">{qty}</span>
                            <button 
                              onClick={() => addToCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-[#c9a84c] text-white shadow-xs flex items-center justify-center font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item.id)}
                            className="px-3 py-1.5 rounded-xl border border-[#c9a84c] text-[#c9a84c] font-bold text-xs hover:bg-[#c9a84c] hover:text-white transition-colors"
                          >
                            Add +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* My Active Orders History */}
            {myOrders.length > 0 && (
              <div className="pt-4 border-t border-stone-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Live Orders for Room {room?.number}</h4>
                <div className="space-y-2">
                  {myOrders.map(ord => (
                    <div key={ord.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Order #{ord.id.slice(-4)}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.status === 'READY' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'PREPARING' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-stone-500">{ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div>
                      <div className="font-bold text-stone-900 pt-0.5">₹{ord.total} (Charged to Room)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: SERVICES */}
        {activeTab === 'SERVICES' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900">Request In-Room Amenities & Assistance</h3>

            <div className="grid grid-cols-2 gap-3">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-[#c9a84c] hover:shadow-xs transition-all text-left space-y-1"
                >
                  <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                  <div className="font-bold text-xs text-stone-900">{s.name}</div>
                  <div className="text-[10px] text-stone-500 line-clamp-1">{s.description || 'Complimentary service'}</div>
                </button>
              ))}
            </div>

            {/* Active Requests Tracking */}
            {myRequests.length > 0 && (
              <div className="pt-4 border-t border-stone-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Recent Service Status</h4>
                <div className="space-y-2">
                  {myRequests.map(req => (
                    <div key={req.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-stone-900">{req.title}</div>
                        <div className="text-[11px] text-stone-500">{req.description}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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

        {/* Tab 4: STAY & FOLIO */}
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
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider text-xs">Live Stay Folio Summary</h3>
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
                Outstanding balance can be settled via UPI, Card, or Cash at the front desk during check-out.
              </p>
            </div>
          </div>
        )}

        {/* Tab 5: CONTACT */}
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
                <ChevronRight className="w-4 h-4 text-stone-400" />
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
              <div className="font-bold text-sm text-[#c9a84c]">₹{cartTotal} (incl. tax)</div>
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
        <nav className="absolute bottom-0 inset-x-0 h-16 bg-white border-t border-stone-200 flex items-center justify-around px-2 z-20">
          {[
            { id: 'HOME', label: 'Home', icon: Building2 },
            { id: 'FOOD', label: 'Dining', icon: UtensilsCrossed },
            { id: 'SERVICES', label: 'Services', icon: Sparkles },
            { id: 'STAY', label: 'My Stay', icon: FileText },
            { id: 'CONTACT', label: 'Desk', icon: Phone },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-colors ${
                  active ? 'text-[#c9a84c] font-bold' : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Review Cart Modal */}
        <Modal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          title="Review Room Service Order"
          size="sm"
          footer={
            <div className="flex justify-between items-center w-full">
              <Button variant="outline" onClick={() => setIsCartOpen(false)}>Back</Button>
              <Button variant="primary" onClick={handlePlaceOrder}>Confirm & Charge Room</Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
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
                    <span className="font-bold text-stone-900">₹{item.price * qty}</span>
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
                <span>Total to Room Bill:</span>
                <span className="text-[#c9a84c]">₹{cartTotal}</span>
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
                <Button variant="primary" onClick={handleCreateRequest}>Submit Request</Button>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
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
      </div>
    </div>
  );
}

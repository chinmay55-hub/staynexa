import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BedDouble, 
  Users, 
  LogIn, 
  LogOut, 
  IndianRupee, 
  UtensilsCrossed, 
  BellRing, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  analyticsService, 
  reservationService, 
  roomService, 
  serviceRequestService, 
  orderService, 
  hotelService 
} from '../../services/demoDataService';
import { realtimeSync } from '../../services/realtimeSync';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  StatCard, 
  Button, 
  Badge, 
  ReservationBadge, 
  OrderBadge, 
  RequestBadge 
} from '../../components/ui';

export default function ReceptionDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);

  const [stats, setStats] = useState(() => analyticsService.getHotelStats(hotelId));
  const [arrivals, setArrivals] = useState(() => reservationService.getTodayArrivals(hotelId));
  const [departures, setDepartures] = useState(() => reservationService.getTodayDepartures(hotelId));
  const [recentRequests, setRecentRequests] = useState(() => serviceRequestService.getAll(hotelId).slice(0, 5));
  const [activeOrders, setActiveOrders] = useState(() => orderService.getActive(hotelId).slice(0, 5));
  const [deskAlert, setDeskAlert] = useState<{ id: string; title: string; subtitle: string; type: 'ORDER' | 'REQUEST' } | null>(null);

  // Realtime WebSocket & Cross-Tab State Synchronization
  useEffect(() => {
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const refreshData = () => {
      setStats(analyticsService.getHotelStats(hotelId));
      setRecentRequests(serviceRequestService.getAll(hotelId).slice(0, 5));
      setActiveOrders(orderService.getActive(hotelId).slice(0, 5));
      setArrivals(reservationService.getTodayArrivals(hotelId));
      setDepartures(reservationService.getTodayDepartures(hotelId));
    };

    const unsubNewOrder = realtimeSync.subscribe('NEW_ORDER', ({ order }) => {
      if (order.hotel_id === hotelId) {
        refreshData();
        const roomNum = order.room?.number || order.room_id || 'Guest Portal';
        setDeskAlert({
          id: order.id,
          type: 'ORDER',
          title: `New In-Room Dining Order: Room ${roomNum}`,
          subtitle: `${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} · Total: ₹${order.total}`,
        });
      }
    });

    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', () => {
      refreshData();
    });

    const unsubNewRequest = realtimeSync.subscribe('NEW_SERVICE_REQUEST', ({ request }) => {
      if (request.hotel_id === hotelId) {
        refreshData();
        const roomNum = request.room?.number || request.room_id || 'Guest Portal';
        setDeskAlert({
          id: request.id,
          type: 'REQUEST',
          title: `New Service Request: Room ${roomNum}`,
          subtitle: `${request.title} (${request.priority} Priority)`,
        });
      }
    });

    const unsubRequestStatus = realtimeSync.subscribe('REQUEST_STATUS_CHANGED', () => {
      refreshData();
    });

    const unsubHousekeeping = realtimeSync.subscribe('NEW_HOUSEKEEPING_TASK', () => {
      refreshData();
    });

    const unsubHousekeepingUpdate = realtimeSync.subscribe('HOUSEKEEPING_TASK_UPDATED', () => {
      refreshData();
    });

    return () => {
      disconnectSupabase();
      unsubNewOrder();
      unsubOrderStatus();
      unsubNewRequest();
      unsubRequestStatus();
      unsubHousekeeping();
      unsubHousekeepingUpdate();
    };
  }, [hotelId]);

  // Auto-dismiss desk alert after 8 seconds
  useEffect(() => {
    if (!deskAlert) return;
    const timer = setTimeout(() => {
      setDeskAlert(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [deskAlert]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c9a84c] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Front Desk Command Center
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">
            {hotel?.name || 'Hotel'} Operations Desk
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Realtime room occupancy, check-in queue, guest service dispatch, and folio monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/reception/room-board')}
            iconLeft={<BedDouble className="w-4 h-4" />}
          >
            Room Board
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate('/reception/reservations')}
            iconLeft={<LogIn className="w-4 h-4" />}
          >
            New Reservation
          </Button>
        </div>
      </div>

      {/* Live Front Desk Realtime Alert Banner */}
      {deskAlert && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
          deskAlert.type === 'ORDER' 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900' 
            : 'bg-[#c9a84c]/10 border-[#c9a84c]/30 text-stone-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-xs ${
              deskAlert.type === 'ORDER' ? 'bg-amber-600' : 'bg-[#c9a84c]'
            }`}>
              {deskAlert.type === 'ORDER' ? <UtensilsCrossed className="w-5 h-5" /> : <BellRing className="w-5 h-5 text-stone-900" />}
            </div>
            <div>
              <div className="text-sm font-bold">{deskAlert.title}</div>
              <div className="text-xs text-stone-600 mt-0.5">{deskAlert.subtitle}</div>
            </div>
          </div>
          <button 
            onClick={() => setDeskAlert(null)}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            title="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase">Available</div>
            <div className="text-2xl font-display font-bold text-emerald-950 mt-1">{stats.availableRooms}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">of {stats.totalRooms} rooms</div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-blue-800 uppercase">Occupied</div>
            <div className="text-2xl font-display font-bold text-blue-950 mt-1">{stats.occupiedRooms}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">{stats.occupancyPercent}% occupancy</div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/30">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-amber-800 uppercase">Dirty Rooms</div>
            <div className="text-2xl font-display font-bold text-amber-950 mt-1">{stats.dirtyRooms}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">cleaning needed</div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/30">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-purple-800 uppercase">Arrivals Today</div>
            <div className="text-2xl font-display font-bold text-purple-950 mt-1">{stats.todayArrivals}</div>
            <div className="text-[10px] text-purple-700 mt-0.5">expected guests</div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/30">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-rose-800 uppercase">Departures Today</div>
            <div className="text-2xl font-display font-bold text-rose-950 mt-1">{stats.todayDepartures}</div>
            <div className="text-[10px] text-rose-700 mt-0.5">pending checkout</div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 bg-stone-50/50">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-stone-700 uppercase">Unsettled Folios</div>
            <div className="text-2xl font-display font-bold text-stone-900 mt-1">
              ₹{(stats.pendingPayments || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">pending collection</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-column Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <Card className="shadow-xs">
          <CardHeader 
            title="Today's Arrivals Queue" 
            description="Expected guest check-ins scheduled for today"
            action={
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/reception/reservations')}
                className="text-xs"
              >
                All Bookings <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          />
          <CardContent>
            {arrivals.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">
                No arrivals scheduled for today or all guests checked in.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {arrivals.map(res => (
                  <div key={res.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">
                        {res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : 'Guest'}
                      </div>
                      <div className="text-xs text-stone-500">
                        {res.room_type?.name} · {res.adults} Adults · Source: <span className="font-medium text-stone-700">{res.source}</span>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => navigate('/reception/reservations')}
                    >
                      Process Check-In
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card className="shadow-xs">
          <CardHeader 
            title="Today's Departures Queue" 
            description="Checked-in guests departing today needing checkout & billing"
            action={
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/reception/reservations')}
                className="text-xs"
              >
                All Bookings <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          />
          <CardContent>
            {departures.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">
                No departures due today.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {departures.map(res => (
                  <div key={res.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">
                        {res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : 'Guest'}
                      </div>
                      <div className="text-xs text-stone-500">
                        Room <span className="font-bold text-stone-800">{res.room?.number || '—'}</span> · {res.nights} Nights Stay
                      </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => navigate('/reception/folios')}
                    >
                      Folio & Check-Out
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Active Guest Requests & F&B Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Requests */}
        <Card className="shadow-xs">
          <CardHeader 
            title="Pending Guest & Service Requests" 
            description="Concierge, housekeeping, and front desk tasks"
            action={
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/reception/requests')}
                className="text-xs"
              >
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          />
          <CardContent>
            <div className="divide-y divide-stone-100">
              {recentRequests.map(req => (
                <div key={req.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 text-sm">{req.title}</span>
                      <span className="text-xs font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                        Room {req.room?.number || 'Desk'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1">{req.description || 'No special details'}</p>
                  </div>
                  <RequestBadge status={req.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Restaurant Orders */}
        <Card className="shadow-xs">
          <CardHeader 
            title="Active F&B & Room Service Orders" 
            description="Live orders currently preparing or pending delivery"
            action={
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/restaurant')}
                className="text-xs"
              >
                Manage Kitchen <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          />
          <CardContent>
            {activeOrders.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">
                No active food or drink orders.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {activeOrders.map(ord => (
                  <div key={ord.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-stone-900 text-sm flex items-center gap-2">
                        <span>Order #{ord.id.slice(-4)}</span>
                        <span className="text-xs font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                          Room {ord.room?.number || 'Dine-In'}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500">
                        {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} · Total: ₹{ord.total}
                      </div>
                    </div>
                    <OrderBadge status={ord.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

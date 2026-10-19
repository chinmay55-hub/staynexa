import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Filter, 
  UserCheck, 
  LogOut, 
  LogIn, 
  Eye, 
  X, 
  Check, 
  IndianRupee, 
  Clock,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  reservationService, 
  roomService, 
  guestService, 
  folioService, 
  hotelService,
  activityLogService
} from '../../services/demoDataService';
import type { 
  Reservation, 
  ReservationStatus, 
  BookingSource, 
  Room, 
  Guest 
} from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Select, 
  ReservationBadge, 
  Modal 
} from '../../components/ui';

export default function ReservationsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [reservations, setReservations] = useState(() => reservationService.getAll(hotelId));
  const [guests, setGuests] = useState(() => guestService.getAll(hotelId));
  const [rooms, setRooms] = useState(() => roomService.getAll(hotelId));
  const [roomTypes] = useState(() => roomService.getTypes(hotelId));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Check-in modal state
  const [checkInRes, setCheckInRes] = useState<Reservation | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Check-out modal state
  const [checkOutRes, setCheckOutRes] = useState<Reservation | null>(null);

  // New Reservation modal state
  const [isNewResOpen, setIsNewResOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [newResForm, setNewResForm] = useState({
    guestId: '',
    newGuestFirstName: '',
    newGuestLastName: '',
    newGuestPhone: '',
    newGuestEmail: '',
    roomTypeId: roomTypes[0]?.id || '',
    checkInDate: todayStr,
    checkOutDate: tomorrowStr,
    adults: 2,
    children: 0,
    ratePerNight: roomTypes[0]?.base_rate || 4500,
    source: 'DIRECT' as BookingSource,
    externalBookingId: '',
    notes: '',
  });

  const filtered = reservations.filter(res => {
    const guestName = res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : '';
    const roomNum = res.room?.number || '';
    const extId = res.external_booking_id || '';
    const matchesSearch = 
      guestName.toLowerCase().includes(search.toLowerCase()) ||
      roomNum.includes(search) ||
      extId.toLowerCase().includes(search.toLowerCase()) ||
      res.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || res.status === statusFilter;
    const matchesSource = sourceFilter === 'ALL' || res.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Calculate nights
  const calcNights = (d1: string, d2: string) => {
    const diff = new Date(d2).getTime() - new Date(d1).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Handle Check-in submission
  const handleConfirmCheckIn = () => {
    if (!checkInRes || !selectedRoomId) return;
    reservationService.checkIn(checkInRes.id, selectedRoomId);
    setReservations([...reservationService.getAll(hotelId)]);
    setRooms([...roomService.getAll(hotelId)]);
    activityLogService.log({
      hotel_id: hotelId,
      user_id: user?.id,
      actor_name: user?.full_name,
      action: 'CHECK_IN',
      entity_type: 'reservation',
      entity_id: checkInRes.id,
      metadata: { guest: `${checkInRes.guest?.first_name} ${checkInRes.guest?.last_name}`, room_id: selectedRoomId }
    });
    setCheckInRes(null);
    setSelectedRoomId('');
  };

  // Handle Checkout submission
  const handleConfirmCheckout = () => {
    if (!checkOutRes) return;
    reservationService.checkOut(checkOutRes.id);
    setReservations([...reservationService.getAll(hotelId)]);
    setRooms([...roomService.getAll(hotelId)]);
    activityLogService.log({
      hotel_id: hotelId,
      user_id: user?.id,
      actor_name: user?.full_name,
      action: 'CHECK_OUT',
      entity_type: 'reservation',
      entity_id: checkOutRes.id,
      metadata: { guest: `${checkOutRes.guest?.first_name} ${checkOutRes.guest?.last_name}` }
    });
    setCheckOutRes(null);
  };

  // Handle New Reservation submission
  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    let guestId = newResForm.guestId;

    // Create guest if not selected
    if (!guestId && newResForm.newGuestFirstName && newResForm.newGuestPhone) {
      const g = guestService.create({
        hotel_id: hotelId,
        first_name: newResForm.newGuestFirstName,
        last_name: newResForm.newGuestLastName || '',
        phone: newResForm.newGuestPhone,
        email: newResForm.newGuestEmail,
        vip_status: false,
      });
      guestId = g.id;
      setGuests([...guestService.getAll(hotelId)]);
    }

    if (!guestId) return;

    const nights = calcNights(newResForm.checkInDate, newResForm.checkOutDate);
    const subtotal = nights * newResForm.ratePerNight;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    reservationService.create({
      hotel_id: hotelId,
      guest_id: guestId,
      room_type_id: newResForm.roomTypeId,
      status: 'CONFIRMED',
      source: newResForm.source,
      external_booking_id: newResForm.externalBookingId || undefined,
      check_in_date: newResForm.checkInDate,
      check_out_date: newResForm.checkOutDate,
      adults: Number(newResForm.adults),
      children: Number(newResForm.children),
      nights,
      rate_per_night: Number(newResForm.ratePerNight),
      total_amount: total,
      tax_amount: tax,
      discount_amount: 0,
      deposit_amount: 0,
      notes: newResForm.notes,
    });

    setReservations([...reservationService.getAll(hotelId)]);
    setIsNewResOpen(false);
  };

  // Rooms available for the selected check-in room type
  const availableRoomsForCheckIn = checkInRes 
    ? rooms.filter(r => r.status === 'AVAILABLE' && r.room_type_id === checkInRes.room_type_id)
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Reservations & Bookings</h1>
          <p className="text-stone-500 text-sm">Direct, website, walk-in, and OTA bookings management.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsNewResOpen(true)}
          iconLeft={<Plus className="w-4 h-4" />}
        >
          New Reservation
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by guest name, room number, or external booking ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4 text-stone-400" />}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'CHECKED_IN', label: 'Checked In' },
                { value: 'CHECKED_OUT', label: 'Checked Out' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Sources' },
                { value: 'DIRECT', label: 'Direct Desk' },
                { value: 'WEBSITE', label: 'Website' },
                { value: 'WALK_IN', label: 'Walk-In' },
                { value: 'PHONE', label: 'Phone' },
                { value: 'MMT', label: 'MakeMyTrip (OTA)' },
                { value: 'BOOKING_COM', label: 'Booking.com (OTA)' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Room & Type</th>
                  <th className="py-3 px-4">Stay Dates</th>
                  <th className="py-3 px-4">Rate & Total</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(res => (
                  <tr key={res.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-stone-700">
                      #{res.id.slice(-6)}
                      {res.external_booking_id && (
                        <div className="text-[10px] text-stone-400 font-normal">{res.external_booking_id}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">
                        {res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : 'Unknown'}
                      </div>
                      <div className="text-xs text-stone-500">{res.guest?.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-800">
                        {res.room ? `Room ${res.room.number}` : <span className="text-amber-600 font-semibold text-xs">Unassigned</span>}
                      </div>
                      <div className="text-xs text-stone-500">{res.room_type?.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-700">
                      <div>{res.check_in_date} to {res.check_out_date}</div>
                      <div className="text-stone-400">{res.nights} Nights · {res.adults} Adults</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-bold text-stone-900">₹{res.total_amount.toLocaleString('en-IN')}</div>
                      <div className="text-stone-400">₹{res.rate_per_night}/nt</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                        {res.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <ReservationBadge status={res.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {res.status === 'CONFIRMED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          iconLeft={<LogIn className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setCheckInRes(res);
                            setSelectedRoomId(res.room_id || '');
                          }}
                        >
                          Check In
                        </Button>
                      )}
                      {res.status === 'CHECKED_IN' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          iconLeft={<LogOut className="w-3.5 h-3.5" />}
                          onClick={() => setCheckOutRes(res)}
                        >
                          Check Out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Check-In Modal */}
      {checkInRes && (
        <Modal
          isOpen={true}
          onClose={() => setCheckInRes(null)}
          title="Guest Check-In Procedure"
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setCheckInRes(null)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmCheckIn}
                disabled={!selectedRoomId}
              >
                Confirm & Assign Room
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-sm space-y-1">
              <div className="font-bold text-stone-900 text-base">
                {checkInRes.guest?.first_name} {checkInRes.guest?.last_name}
              </div>
              <div className="text-xs text-stone-600">Phone: {checkInRes.guest?.phone} · Email: {checkInRes.guest?.email || 'N/A'}</div>
              <div className="text-xs text-stone-600">ID: {checkInRes.guest?.id_type || 'Aadhaar'} ({checkInRes.guest?.id_number || 'Verified at desk'})</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                Assign Room ({checkInRes.room_type?.name})
              </label>
              <Select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                options={[
                  { value: '', label: 'Select an available clean room...' },
                  ...availableRoomsForCheckIn.map(r => ({
                    value: r.id,
                    label: `Room ${r.number} (Floor ${r.floor}) - ${r.housekeeping_status}`
                  }))
                ]}
              />
              {availableRoomsForCheckIn.length === 0 && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No available clean rooms of this type currently. Check housekeeping status!
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
              ✓ Confirming check-in will automatically open an active folio ledger and mark the assigned room as OCCUPIED.
            </div>
          </div>
        </Modal>
      )}

      {/* Check-Out Modal */}
      {checkOutRes && (
        <Modal
          isOpen={true}
          onClose={() => setCheckOutRes(null)}
          title="Guest Checkout & Room Release"
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setCheckOutRes(null)}>Back</Button>
              <Button variant="danger" onClick={handleConfirmCheckout}>Complete Checkout</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-sm space-y-1">
              <div className="font-bold text-stone-900">
                {checkOutRes.guest?.first_name} {checkOutRes.guest?.last_name}
              </div>
              <div className="text-xs text-stone-600">Room {checkOutRes.room?.number} · {checkOutRes.nights} Nights</div>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="font-bold uppercase tracking-wider text-stone-700">Folio Verification</div>
              <div className="flex justify-between">
                <span>Total Stay Charges:</span>
                <span className="font-semibold text-stone-900">₹{checkOutRes.total_amount}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Account Status:</span>
                <span>Ready for Settlement</span>
              </div>
            </div>

            <p className="text-xs text-stone-500">
              Completing checkout will release Room {checkOutRes.room?.number} and automatically transition its housekeeping state to <strong className="text-amber-800">DIRTY</strong> for cleaning turnaround.
            </p>
          </div>
        </Modal>
      )}

      {/* New Reservation Modal */}
      <Modal
        isOpen={isNewResOpen}
        onClose={() => setIsNewResOpen(false)}
        title="Create New Reservation"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsNewResOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateReservation}>Confirm Reservation</Button>
          </div>
        }
      >
        <form className="space-y-4">
          {/* Guest selection or creation */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              1. Guest Information
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Existing Guest"
                value={newResForm.guestId}
                onChange={e => setNewResForm({ ...newResForm, guestId: e.target.value })}
                options={[
                  { value: '', label: '+ Create / Enter New Guest Details' },
                  ...guests.map(g => ({ value: g.id, label: `${g.first_name} ${g.last_name} (${g.phone})` }))
                ]}
              />
              {!newResForm.guestId && (
                <>
                  <Input
                    label="First Name"
                    required
                    placeholder="Guest first name"
                    value={newResForm.newGuestFirstName}
                    onChange={e => setNewResForm({ ...newResForm, newGuestFirstName: e.target.value })}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Guest surname"
                    value={newResForm.newGuestLastName}
                    onChange={e => setNewResForm({ ...newResForm, newGuestLastName: e.target.value })}
                  />
                  <Input
                    label="Phone Number"
                    required
                    placeholder="+91 98765 00000"
                    value={newResForm.newGuestPhone}
                    onChange={e => setNewResForm({ ...newResForm, newGuestPhone: e.target.value })}
                  />
                </>
              )}
            </div>
          </div>

          {/* Stay & Room details */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              2. Stay & Room Allocation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Room Type"
                value={newResForm.roomTypeId}
                onChange={e => {
                  const rt = roomTypes.find(t => t.id === e.target.value);
                  setNewResForm({ 
                    ...newResForm, 
                    roomTypeId: e.target.value,
                    ratePerNight: rt?.base_rate || newResForm.ratePerNight
                  });
                }}
                options={roomTypes.map(rt => ({
                  value: rt.id,
                  label: `${rt.name} (Base ₹${rt.base_rate}/nt)`
                }))}
              />
              <Select
                label="Booking Channel / Source"
                value={newResForm.source}
                onChange={e => setNewResForm({ ...newResForm, source: e.target.value as BookingSource })}
                options={[
                  { value: 'DIRECT', label: 'Direct Desk' },
                  { value: 'WALK_IN', label: 'Walk-In Guest' },
                  { value: 'WEBSITE', label: 'Direct Web Booking' },
                  { value: 'PHONE', label: 'Telephone Reservation' },
                  { value: 'MMT', label: 'MakeMyTrip' },
                  { value: 'BOOKING_COM', label: 'Booking.com' },
                  { value: 'GOIBIBO', label: 'Goibibo' },
                  { value: 'AGODA', label: 'Agoda' },
                ]}
              />
              <Input
                label="Check-In Date"
                type="date"
                required
                value={newResForm.checkInDate}
                onChange={e => setNewResForm({ ...newResForm, checkInDate: e.target.value })}
              />
              <Input
                label="Check-Out Date"
                type="date"
                required
                value={newResForm.checkOutDate}
                onChange={e => setNewResForm({ ...newResForm, checkOutDate: e.target.value })}
              />
              <Input
                label="Adults"
                type="number"
                min="1"
                value={newResForm.adults}
                onChange={e => setNewResForm({ ...newResForm, adults: Number(e.target.value) })}
              />
              <Input
                label="Agreed Rate / Night (₹)"
                type="number"
                value={newResForm.ratePerNight}
                onChange={e => setNewResForm({ ...newResForm, ratePerNight: Number(e.target.value) })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

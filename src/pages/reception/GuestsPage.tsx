import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  CreditCard, 
  Calendar, 
  Clock, 
  FileText,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { guestService, reservationService, folioService } from '../../services/demoDataService';
import type { Guest, Reservation, Folio } from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Select, 
  Badge, 
  Modal 
} from '../../components/ui';

export default function GuestsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [guests, setGuests] = useState<Guest[]>(() => guestService.getAll(hotelId));
  const [reservations] = useState(() => reservationService.getAll(hotelId));
  const [search, setSearch] = useState('');

  // Selected guest for 360 Profile
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestNotes, setGuestNotes] = useState('');

  // Add Guest Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_type: 'AADHAAR',
    id_number: '',
    nationality: 'Indian',
    city: '',
    gender: 'MALE' as const,
    vip_status: false,
    notes: '',
  });

  const filtered = guests.filter(g => {
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
    const q = search.toLowerCase();
    return fullName.includes(q) || g.phone.includes(q) || (g.email && g.email.toLowerCase().includes(q));
  });

  const handleOpen360 = (guest: Guest) => {
    setSelectedGuest(guest);
    setGuestNotes(guest.notes || '');
  };

  const handleSaveNotes = () => {
    if (!selectedGuest) return;
    const updated = guestService.update(selectedGuest.id, { notes: guestNotes });
    if (updated) {
      setGuests([...guestService.getAll(hotelId)]);
      setSelectedGuest(updated);
    }
  };

  const handleCreateGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.first_name || !newGuest.phone) return;
    guestService.create({
      ...newGuest,
      hotel_id: hotelId,
    });
    setGuests([...guestService.getAll(hotelId)]);
    setIsAddOpen(false);
    setNewGuest({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      id_type: 'AADHAAR',
      id_number: '',
      nationality: 'Indian',
      city: '',
      gender: 'MALE',
      vip_status: false,
      notes: '',
    });
  };

  const guestStays = selectedGuest 
    ? reservations.filter(r => r.guest_id === selectedGuest.id)
    : [];

  const currentStay = guestStays.find(r => r.status === 'CHECKED_IN');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Guest Profiles & 360° History</h1>
          <p className="text-stone-500 text-sm">Guest identity verification, stay history, VIP records, and preferences.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsAddOpen(true)}
          iconLeft={<Plus className="w-4 h-4" />}
        >
          Add New Guest
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <Input
            placeholder="Search guests by name, phone number or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4 text-stone-400" />}
          />
        </CardContent>
      </Card>

      {/* Guest Directory Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Guest Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Identity / Nationality</th>
                  <th className="py-3 px-4">VIP Status</th>
                  <th className="py-3 px-4">Total Stays</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(guest => {
                  const staysCount = reservations.filter(r => r.guest_id === guest.id).length;
                  return (
                    <tr key={guest.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{guest.first_name} {guest.last_name}</div>
                        <div className="text-xs text-stone-500">{guest.city || 'India'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-stone-800">{guest.phone}</div>
                        <div className="text-stone-500">{guest.email || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-700">
                        <div>{guest.id_type || 'Aadhaar'}: <span className="font-mono">{guest.id_number || 'Verified'}</span></div>
                        <div className="text-stone-400">{guest.nationality || 'Indian'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {guest.vip_status ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            VIP Guest
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">Standard</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-stone-800">
                        {staysCount} {staysCount === 1 ? 'Stay' : 'Stays'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpen360(guest)}
                        >
                          Guest 360°
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Guest 360 Modal */}
      {selectedGuest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedGuest(null)}
          title={`Guest 360° Profile: ${selectedGuest.first_name} ${selectedGuest.last_name}`}
          size="lg"
          footer={
            <div className="flex justify-between items-center w-full">
              <span className="text-xs text-stone-400">Guest ID: {selectedGuest.id}</span>
              <Button variant="outline" onClick={() => setSelectedGuest(null)}>Close</Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Top guest info banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-200 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-stone-900">{selectedGuest.first_name} {selectedGuest.last_name}</h3>
                  {selectedGuest.vip_status && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">VIP</span>
                  )}
                </div>
                <div className="text-xs text-stone-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Phone: {selectedGuest.phone}</span>
                  <span>Email: {selectedGuest.email || 'None'}</span>
                  <span>Location: {selectedGuest.city || 'India'}</span>
                </div>
              </div>
            </div>

            {/* Current Active Stay */}
            {currentStay && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Currently In-House</span>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">CHECKED IN</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  Room {currentStay.room?.number} ({currentStay.room_type?.name})
                </div>
                <div className="text-xs text-stone-600 flex justify-between">
                  <span>Stay: {currentStay.check_in_date} to {currentStay.check_out_date} ({currentStay.nights} nights)</span>
                  <span className="font-bold">Total: ₹{currentStay.total_amount}</span>
                </div>
              </div>
            )}

            {/* Stay History Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">Past Reservation History</h4>
              {guestStays.length === 0 ? (
                <p className="text-xs text-stone-400 py-3">No reservation records found for this guest.</p>
              ) : (
                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 border-b border-stone-200">
                        <th className="p-2">Dates</th>
                        <th className="p-2">Room Type</th>
                        <th className="p-2">Source</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {guestStays.map(s => (
                        <tr key={s.id}>
                          <td className="p-2">{s.check_in_date} to {s.check_out_date}</td>
                          <td className="p-2">{s.room_type?.name}</td>
                          <td className="p-2">{s.source}</td>
                          <td className="p-2 font-medium">{s.status}</td>
                          <td className="p-2 text-right font-semibold">₹{s.total_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Internal Staff Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Concierge & Front Desk Internal Notes
              </label>
              <textarea
                rows={3}
                className="w-full p-3 rounded-lg border border-stone-200 text-xs focus:ring-2 focus:ring-[#c9a84c] focus:outline-none"
                placeholder="Add special guest preferences, allergies, dietary constraints or VIP requests..."
                value={guestNotes}
                onChange={e => setGuestNotes(e.target.value)}
              />
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={handleSaveNotes}>
                  Save Guest Notes
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Guest Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register New Guest Profile"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateGuest}>Save Profile</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              placeholder="e.g. Rahul"
              value={newGuest.first_name}
              onChange={e => setNewGuest({ ...newGuest, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Verma"
              value={newGuest.last_name}
              onChange={e => setNewGuest({ ...newGuest, last_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mobile Phone"
              required
              placeholder="+91 98765 00000"
              value={newGuest.phone}
              onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="guest@domain.com"
              value={newGuest.email}
              onChange={e => setNewGuest({ ...newGuest, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="ID Proof Type"
              value={newGuest.id_type}
              onChange={e => setNewGuest({ ...newGuest, id_type: e.target.value })}
              options={[
                { value: 'AADHAAR', label: 'Aadhaar Card' },
                { value: 'PASSPORT', label: 'Passport' },
                { value: 'PAN', label: 'PAN Card' },
                { value: 'DRIVING_LICENSE', label: 'Driving License' },
              ]}
            />
            <Input
              label="ID Document Number"
              placeholder="e.g. XXXX XXXX 1234"
              value={newGuest.id_number}
              onChange={e => setNewGuest({ ...newGuest, id_number: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

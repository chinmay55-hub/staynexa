import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Mail
} from 'lucide-react';
import { hotelService, subscriptionService, reloadDemoStoreFromStorage } from '../../services/demoDataService';
import type { Hotel, HotelStatus } from '../../types';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  HotelStatusBadge, 
  Badge,
  Modal 
} from '../../components/ui';

export default function HotelsManagementPage() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>(() => hotelService.getAll());
  const [subscriptions] = useState(() => subscriptionService.getAll());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        reloadDemoStoreFromStorage();
        setHotels([...hotelService.getAll()]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  // Selected hotel for detail / status editing
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusUpdateVal, setStatusUpdateVal] = useState<HotelStatus>('ACTIVE');
  
  // New Hotel quick modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHotelForm, setNewHotelForm] = useState({
    name: '',
    legal_name: '',
    type: 'HOTEL' as const,
    city: '',
    state: '',
    country: 'India',
    pin_code: '',
    phone: '',
    email: '',
    total_rooms: 25,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    check_in_time: '14:00',
    check_out_time: '12:00',
    address: ''
  });

  const filteredHotels = hotels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()) ||
      h.state.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDetail = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setStatusUpdateVal(hotel.status);
    setIsDetailOpen(true);
  };

  const handleSaveStatus = () => {
    if (!selectedHotel) return;
    const updated = hotelService.update(selectedHotel.id, { status: statusUpdateVal });
    if (updated) {
      setHotels([...hotelService.getAll()]);
      setSelectedHotel(updated);
    }
    setIsDetailOpen(false);
  };

  const handleCreateHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelForm.name || !newHotelForm.city) return;
    const slug = newHotelForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    hotelService.create({
      ...newHotelForm,
      slug,
      status: 'SETUP',
    });
    setHotels([...hotelService.getAll()]);
    setIsAddOpen(false);
    // Reset form
    setNewHotelForm({
      name: '',
      legal_name: '',
      type: 'HOTEL',
      city: '',
      state: '',
      country: 'India',
      pin_code: '',
      phone: '',
      email: '',
      total_rooms: 25,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      check_in_time: '14:00',
      check_out_time: '12:00',
      address: ''
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Hotel Tenants Management</h1>
          <p className="text-stone-500 text-sm">Provision, configure, and inspect individual tenant instances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/onboarding')}
          >
            Launch Onboarding Wizard
          </Button>
          <Button 
            variant="primary" 
            iconLeft={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Quick Add Tenant
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input 
              placeholder="Search by hotel name, city or state..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4 text-stone-400" />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'TRIAL', label: 'Trial' },
                { value: 'SETUP', label: 'Setup' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHotels.map(hotel => {
          const sub = subscriptions.find(s => s.hotel_id === hotel.id);
          const branding = hotelService.getBranding(hotel.id);

          return (
            <Card key={hotel.id} className="hover:shadow-md transition-shadow border-stone-200">
              <div 
                className="h-3 rounded-t-xl" 
                style={{ backgroundColor: branding?.primary_color || '#1a2744' }} 
              />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-900">{hotel.name}</h3>
                    <p className="text-xs text-stone-500">{hotel.legal_name || hotel.type}</p>
                  </div>
                  <HotelStatusBadge status={hotel.status} />
                </div>

                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{hotel.city}, {hotel.state}, {hotel.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{hotel.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{hotel.email}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-400">Total Rooms:</span>{' '}
                    <span className="font-semibold text-stone-800">{hotel.total_rooms}</span>
                  </div>
                  <div>
                    <span className="text-stone-400">Plan:</span>{' '}
                    <Badge variant="secondary" className="font-medium text-[11px] ml-1">
                      {sub?.plan || 'PRO'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenDetail(hotel)}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => navigate(`/onboarding/${hotel.id}`)}
                  >
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hotel Detail / Status Modal */}
      {selectedHotel && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Tenant: ${selectedHotel.name}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-stone-400">Tenant ID: {selectedHotel.id}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                <Button variant="primary" onClick={handleSaveStatus}>Save Lifecycle State</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl text-sm">
              <div>
                <span className="text-xs text-stone-500 block">Type</span>
                <span className="font-medium text-stone-800">{selectedHotel.type}</span>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">GSTIN</span>
                <span className="font-medium text-stone-800">{selectedHotel.gstin || 'Not configured'}</span>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Check-in / Check-out</span>
                <span className="font-medium text-stone-800">{selectedHotel.check_in_time} / {selectedHotel.check_out_time}</span>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Currency & Timezone</span>
                <span className="font-medium text-stone-800">{selectedHotel.currency} ({selectedHotel.timezone})</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Update Tenant Lifecycle State
              </label>
              <Select
                value={statusUpdateVal}
                onChange={e => setStatusUpdateVal(e.target.value as HotelStatus)}
                options={[
                  { value: 'SETUP', label: 'SETUP (Onboarding in progress)' },
                  { value: 'TRIAL', label: 'TRIAL (Free evaluation period)' },
                  { value: 'ACTIVE', label: 'ACTIVE (Full operational production)' },
                  { value: 'SUSPENDED', label: 'SUSPENDED (Billing/Policy freeze)' },
                  { value: 'INACTIVE', label: 'INACTIVE (Offboarded)' },
                  { value: 'ARCHIVED', label: 'ARCHIVED (Historical record only)' },
                ]}
              />
              <p className="text-xs text-stone-500 mt-1">
                Changing status to SUSPENDED will prevent staff logins while preserving historical records.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Add Hotel Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Quick Provision Tenant"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateHotel}>Provision Hotel</Button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hotel Name"
              required
              placeholder="e.g. Royal Orchid Palace"
              value={newHotelForm.name}
              onChange={e => setNewHotelForm({ ...newHotelForm, name: e.target.value })}
            />
            <Input
              label="Legal Entity Name"
              placeholder="e.g. Orchid Hospitality Pvt Ltd"
              value={newHotelForm.legal_name}
              onChange={e => setNewHotelForm({ ...newHotelForm, legal_name: e.target.value })}
            />
            <Input
              label="City"
              required
              placeholder="e.g. Jaipur"
              value={newHotelForm.city}
              onChange={e => setNewHotelForm({ ...newHotelForm, city: e.target.value })}
            />
            <Input
              label="State"
              placeholder="e.g. Rajasthan"
              value={newHotelForm.state}
              onChange={e => setNewHotelForm({ ...newHotelForm, state: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="+91 98765 00000"
              value={newHotelForm.phone}
              onChange={e => setNewHotelForm({ ...newHotelForm, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              placeholder="contact@hotel.com"
              type="email"
              value={newHotelForm.email}
              onChange={e => setNewHotelForm({ ...newHotelForm, email: e.target.value })}
            />
            <Input
              label="Initial Room Count"
              type="number"
              value={newHotelForm.total_rooms}
              onChange={e => setNewHotelForm({ ...newHotelForm, total_rooms: Number(e.target.value) })}
            />
            <Select
              label="Property Type"
              value={newHotelForm.type}
              onChange={e => setNewHotelForm({ ...newHotelForm, type: e.target.value as any })}
              options={[
                { value: 'HOTEL', label: 'Hotel' },
                { value: 'RESORT', label: 'Resort' },
                { value: 'BOUTIQUE', label: 'Boutique' },
                { value: 'HOSTEL', label: 'Hostel' },
                { value: 'APARTMENT', label: 'Serviced Apartment' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

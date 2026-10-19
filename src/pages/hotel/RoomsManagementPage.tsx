import React, { useState } from 'react';
import { 
  BedDouble, 
  Plus, 
  Search, 
  Layers, 
  Edit2, 
  Check, 
  Sparkles, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { roomService } from '../../services/demoDataService';
import type { Room, RoomType, RoomStatus, HousekeepingStatus } from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Select, 
  RoomStatusBadge, 
  HousekeepingBadge, 
  Modal 
} from '../../components/ui';

export default function RoomsManagementPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [activeTab, setActiveTab] = useState<'ROOMS' | 'TYPES'>('ROOMS');
  const [rooms, setRooms] = useState(() => roomService.getAll(hotelId));
  const [roomTypes, setRoomTypes] = useState(() => roomService.getTypes(hotelId));
  const [search, setSearch] = useState('');

  // Add Room Modal
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    number: '',
    floor: 1,
    room_type_id: roomTypes[0]?.id || '',
    status: 'AVAILABLE' as RoomStatus,
    housekeeping_status: 'CLEAN' as HousekeepingStatus,
  });

  // Add Room Type Modal
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({
    name: '',
    code: '',
    base_rate: 4500,
    max_adults: 2,
    max_children: 1,
    amenities: 'AC, High-Speed WiFi, LCD Smart TV, Mini Bar, Safe, Coffee Maker',
    description: '',
  });

  const filteredRooms = rooms.filter(r => 
    r.number.includes(search) || (r.room_type && r.room_type.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomForm.number) return;
    roomService.create({
      hotel_id: hotelId,
      number: newRoomForm.number,
      floor: Number(newRoomForm.floor),
      room_type_id: newRoomForm.room_type_id,
      status: newRoomForm.status,
      housekeeping_status: newRoomForm.housekeeping_status,
      is_active: true,
    });
    setRooms([...roomService.getAll(hotelId)]);
    setIsAddRoomOpen(false);
    setNewRoomForm({
      number: '',
      floor: 1,
      room_type_id: roomTypes[0]?.id || '',
      status: 'AVAILABLE',
      housekeeping_status: 'CLEAN',
    });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeForm.name || !newTypeForm.code) return;
    const amenitiesArr = newTypeForm.amenities.split(',').map(s => s.trim()).filter(Boolean);
    roomService.createType({
      hotel_id: hotelId,
      name: newTypeForm.name,
      code: newTypeForm.code.toUpperCase(),
      base_rate: Number(newTypeForm.base_rate),
      max_adults: Number(newTypeForm.max_adults),
      max_children: Number(newTypeForm.max_children),
      amenities: amenitiesArr,
      images: [],
      is_active: true,
      description: newTypeForm.description,
    });
    setRoomTypes([...roomService.getTypes(hotelId)]);
    setIsAddTypeOpen(false);
    setNewTypeForm({
      name: '',
      code: '',
      base_rate: 4500,
      max_adults: 2,
      max_children: 1,
      amenities: 'AC, High-Speed WiFi, LCD Smart TV, Mini Bar, Safe, Coffee Maker',
      description: '',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Room Inventory & Categories</h1>
          <p className="text-stone-500 text-sm">Configure physical rooms, rate classifications, and standard amenities.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'ROOMS' ? (
            <Button 
              variant="primary" 
              onClick={() => setIsAddRoomOpen(true)}
              iconLeft={<Plus className="w-4 h-4" />}
            >
              Add Physical Room
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={() => setIsAddTypeOpen(true)}
              iconLeft={<Plus className="w-4 h-4" />}
            >
              Add Room Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('ROOMS')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'ROOMS' 
              ? 'border-[#c9a84c] text-stone-900' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Physical Rooms ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('TYPES')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'TYPES' 
              ? 'border-[#c9a84c] text-stone-900' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Room Categories & Rates ({roomTypes.length})
        </button>
      </div>

      {activeTab === 'ROOMS' ? (
        <div className="space-y-4">
          <Card className="shadow-xs">
            <CardContent className="p-4">
              <Input
                placeholder="Search by room number or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4 text-stone-400" />}
              />
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                      <th className="py-3 px-4">Room Number</th>
                      <th className="py-3 px-4">Floor</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Base Rate</th>
                      <th className="py-3 px-4">Occupancy State</th>
                      <th className="py-3 px-4">Housekeeping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredRooms.map(room => (
                      <tr key={room.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          Room {room.number}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 text-xs">
                          Floor {room.floor}
                        </td>
                        <td className="py-3.5 px-4 text-stone-800 font-medium text-xs">
                          {room.room_type?.name || 'Standard'}
                        </td>
                        <td className="py-3.5 px-4 text-stone-700 text-xs font-semibold">
                          ₹{room.room_type?.base_rate.toLocaleString('en-IN') || 4500}/nt
                        </td>
                        <td className="py-3.5 px-4">
                          <RoomStatusBadge status={room.status} />
                        </td>
                        <td className="py-3.5 px-4">
                          <HousekeepingBadge status={room.housekeeping_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map(rt => {
            const count = rooms.filter(r => r.room_type_id === rt.id).length;
            return (
              <Card key={rt.id} className="border-stone-200 shadow-xs">
                <CardHeader
                  title={rt.name}
                  description={`${rt.code} · ${count} Rooms Configured`}
                  action={
                    <span className="text-base font-bold text-stone-900 font-display">
                      ₹{rt.base_rate.toLocaleString('en-IN')}<span className="text-xs text-stone-400 font-normal">/nt</span>
                    </span>
                  }
                />
                <CardContent className="space-y-3">
                  <p className="text-xs text-stone-600">{rt.description || 'Premium guest accommodation'}</p>
                  
                  <div className="flex gap-4 text-xs text-stone-500 pt-2 border-t border-stone-100">
                    <span>Max Adults: <strong>{rt.max_adults}</strong></span>
                    <span>Max Children: <strong>{rt.max_children}</strong></span>
                  </div>

                  <div className="space-y-1 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Amenities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rt.amenities.map(a => (
                        <span key={a} className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        title="Add Physical Room"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddRoomOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateRoom}>Save Room</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room Number"
              required
              placeholder="e.g. 301"
              value={newRoomForm.number}
              onChange={e => setNewRoomForm({ ...newRoomForm, number: e.target.value })}
            />
            <Input
              label="Floor Number"
              type="number"
              required
              value={newRoomForm.floor}
              onChange={e => setNewRoomForm({ ...newRoomForm, floor: Number(e.target.value) })}
            />
          </div>
          <Select
            label="Room Category"
            value={newRoomForm.room_type_id}
            onChange={e => setNewRoomForm({ ...newRoomForm, room_type_id: e.target.value })}
            options={roomTypes.map(rt => ({ value: rt.id, label: `${rt.name} (${rt.code})` }))}
          />
        </form>
      </Modal>

      {/* Add Room Type Modal */}
      <Modal
        isOpen={isAddTypeOpen}
        onClose={() => setIsAddTypeOpen(false)}
        title="Add Room Category"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddTypeOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateType}>Save Category</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category Name"
              required
              placeholder="e.g. Royal Heritage Suite"
              value={newTypeForm.name}
              onChange={e => setNewTypeForm({ ...newTypeForm, name: e.target.value })}
            />
            <Input
              label="Code"
              required
              placeholder="e.g. RHS"
              value={newTypeForm.code}
              onChange={e => setNewTypeForm({ ...newTypeForm, code: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Base Rate (₹)"
              type="number"
              value={newTypeForm.base_rate}
              onChange={e => setNewTypeForm({ ...newTypeForm, base_rate: Number(e.target.value) })}
            />
            <Input
              label="Max Adults"
              type="number"
              value={newTypeForm.max_adults}
              onChange={e => setNewTypeForm({ ...newTypeForm, max_adults: Number(e.target.value) })}
            />
            <Input
              label="Max Children"
              type="number"
              value={newTypeForm.max_children}
              onChange={e => setNewTypeForm({ ...newTypeForm, max_children: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Amenities (Comma separated)"
            value={newTypeForm.amenities}
            onChange={e => setNewTypeForm({ ...newTypeForm, amenities: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Brief overview of room ambiance and features"
            value={newTypeForm.description}
            onChange={e => setNewTypeForm({ ...newTypeForm, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

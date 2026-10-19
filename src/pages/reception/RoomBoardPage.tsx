import React, { useState } from 'react';
import { 
  BedDouble, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  Eye, 
  IndianRupee,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  roomService, 
  reservationService, 
  guestService, 
  folioService, 
  maintenanceService,
  activityLogService
} from '../../services/demoDataService';
import type { Room, RoomStatus, HousekeepingStatus, Reservation, Folio } from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Badge, 
  RoomStatusBadge, 
  HousekeepingBadge, 
  Modal 
} from '../../components/ui';

export default function RoomBoardPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [rooms, setRooms] = useState(() => roomService.getAll(hotelId));
  const [reservations] = useState(() => reservationService.getAll(hotelId));
  const [maintenanceTickets] = useState(() => maintenanceService.getAll(hotelId));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [hkFilter, setHkFilter] = useState<string>('ALL');
  const [groupByFloor, setGroupByFloor] = useState(true);

  // Detail Modal state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeReservations = reservations.filter(r => r.status === 'CHECKED_IN');

  const filteredRooms = rooms.filter(room => {
    const matchStatus = statusFilter === 'ALL' || room.status === statusFilter;
    const matchHk = hkFilter === 'ALL' || room.housekeeping_status === hkFilter;
    return matchStatus && matchHk;
  });

  // Group rooms by floor
  const floors = Array.from(new Set(filteredRooms.map(r => r.floor))).sort((a, b) => a - b);

  const handleOpenRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  const handleUpdateHK = (newHk: HousekeepingStatus) => {
    if (!selectedRoom) return;
    const updated = roomService.update(selectedRoom.id, { housekeeping_status: newHk });
    if (updated) {
      setRooms([...roomService.getAll(hotelId)]);
      setSelectedRoom(updated);
      activityLogService.log({
        hotel_id: hotelId,
        user_id: user?.id,
        actor_name: user?.full_name,
        action: 'UPDATE_HOUSEKEEPING',
        entity_type: 'room',
        entity_id: selectedRoom.id,
        metadata: { room: selectedRoom.number, new_status: newHk }
      });
    }
  };

  const handleUpdateStatus = (newStatus: RoomStatus) => {
    if (!selectedRoom) return;
    const updated = roomService.update(selectedRoom.id, { status: newStatus });
    if (updated) {
      setRooms([...roomService.getAll(hotelId)]);
      setSelectedRoom(updated);
    }
  };

  const currentReservation = selectedRoom 
    ? activeReservations.find(r => r.room_id === selectedRoom.id)
    : null;

  const roomFolio = currentReservation
    ? folioService.getByReservation(currentReservation.id)
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Live Room Operations Board</h1>
          <p className="text-stone-500 text-sm">Visual floor-by-floor occupancy, housekeeping condition, and guest allocation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={groupByFloor ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setGroupByFloor(!groupByFloor)}
            iconLeft={<Layers className="w-4 h-4" />}
          >
            {groupByFloor ? 'Grouped by Floor' : 'All Rooms Grid'}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="text-stone-400 py-1.5 mr-1 font-semibold uppercase tracking-wider text-[11px]">Room State:</span>
            {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  statusFilter === st 
                    ? 'bg-[#1a2744] text-white border-[#1a2744]' 
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium pt-2 border-t border-stone-100">
            <span className="text-stone-400 py-1.5 mr-1 font-semibold uppercase tracking-wider text-[11px]">Housekeeping:</span>
            {['ALL', 'CLEAN', 'DIRTY', 'CLEANING', 'INSPECTION_REQUIRED'].map(hk => (
              <button
                key={hk}
                onClick={() => setHkFilter(hk)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  hkFilter === hk 
                    ? 'bg-[#c9a84c] text-white font-bold' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {hk}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Room Board View */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
          No rooms match the selected status filters.
        </div>
      ) : groupByFloor ? (
        <div className="space-y-6">
          {floors.map(floor => {
            const floorRooms = filteredRooms.filter(r => r.floor === floor);
            return (
              <div key={floor} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                    Floor {floor === 0 ? 'Ground / Beach' : floor}
                  </h2>
                  <span className="text-xs text-stone-400">({floorRooms.length} rooms)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {floorRooms.map(room => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      activeReservation={activeReservations.find(r => r.room_id === room.id)}
                      hasMaintenance={maintenanceTickets.some(m => m.room_id === room.id && m.status !== 'CLOSED')}
                      onClick={() => handleOpenRoom(room)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredRooms.map(room => (
            <RoomCard 
              key={room.id} 
              room={room} 
              activeReservation={activeReservations.find(r => r.room_id === room.id)}
              hasMaintenance={maintenanceTickets.some(m => m.room_id === room.id && m.status !== 'CLOSED')}
              onClick={() => handleOpenRoom(room)}
            />
          ))}
        </div>
      )}

      {/* Room Detail Modal */}
      {selectedRoom && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Room ${selectedRoom.number} Overview`}
          size="md"
          footer={
            <div className="flex justify-end w-full">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Done</Button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <div className="text-xs text-stone-500">Type & Floor</div>
                <div className="font-bold text-stone-900">{selectedRoom.room_type?.name || 'Standard'} (Floor {selectedRoom.floor})</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <RoomStatusBadge status={selectedRoom.status} />
                <HousekeepingBadge status={selectedRoom.housekeeping_status} />
              </div>
            </div>

            {/* Current Guest info if occupied */}
            {currentReservation ? (
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
                <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">Current Guest Occupant</div>
                <div className="font-semibold text-stone-900 text-sm">
                  {currentReservation.guest ? `${currentReservation.guest.first_name} ${currentReservation.guest.last_name}` : 'Registered Guest'}
                </div>
                <div className="text-xs text-stone-600 flex justify-between">
                  <span>Stay: {currentReservation.check_in_date} to {currentReservation.check_out_date}</span>
                  <span>{currentReservation.adults} Adults, {currentReservation.children} Child</span>
                </div>
                {roomFolio && (
                  <div className="pt-2 border-t border-blue-100 text-xs flex justify-between font-medium">
                    <span>Folio Outstanding:</span>
                    <span className={roomFolio.outstanding > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                      ₹{roomFolio.outstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-400">
                No active checked-in reservation for this room.
              </div>
            )}

            {/* Quick Actions: Housekeeping State */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Update Housekeeping Condition
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant={selectedRoom.housekeeping_status === 'CLEAN' ? 'primary' : 'outline'}
                  onClick={() => handleUpdateHK('CLEAN')}
                >
                  Mark Clean
                </Button>
                <Button 
                  size="sm" 
                  variant={selectedRoom.housekeeping_status === 'DIRTY' ? 'secondary' : 'outline'}
                  onClick={() => handleUpdateHK('DIRTY')}
                >
                  Mark Dirty
                </Button>
                <Button 
                  size="sm" 
                  variant={selectedRoom.housekeeping_status === 'CLEANING' ? 'primary' : 'outline'}
                  onClick={() => handleUpdateHK('CLEANING')}
                >
                  Mark Cleaning
                </Button>
                <Button 
                  size="sm" 
                  variant={selectedRoom.housekeeping_status === 'INSPECTION_REQUIRED' ? 'secondary' : 'outline'}
                  onClick={() => handleUpdateHK('INSPECTION_REQUIRED')}
                >
                  Needs Inspection
                </Button>
              </div>
            </div>

            {/* Room Operational State */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Operational State
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUpdateStatus('AVAILABLE')}
                  disabled={selectedRoom.status === 'OCCUPIED'}
                >
                  Available
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUpdateStatus('MAINTENANCE')}
                >
                  Maintenance
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUpdateStatus('OUT_OF_SERVICE')}
                >
                  Out of Order
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Subcomponent for individual Room card
function RoomCard({ 
  room, 
  activeReservation, 
  hasMaintenance, 
  onClick 
}: { 
  room: Room; 
  activeReservation?: Reservation; 
  hasMaintenance?: boolean;
  onClick: () => void; 
}) {
  // Border color based on status
  const getCardStyle = () => {
    switch (room.status) {
      case 'OCCUPIED':
        return 'border-blue-300 bg-blue-50/20 hover:border-blue-500';
      case 'RESERVED':
        return 'border-amber-300 bg-amber-50/20 hover:border-amber-500';
      case 'MAINTENANCE':
      case 'OUT_OF_SERVICE':
        return 'border-rose-300 bg-rose-50/20 hover:border-rose-500';
      case 'AVAILABLE':
      default:
        return 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-500';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-sm flex flex-col justify-between ${getCardStyle()}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div>
          <span className="font-display font-extrabold text-lg text-stone-900 block leading-tight">
            {room.number}
          </span>
          <span className="text-[11px] text-stone-500 font-medium line-clamp-1">
            {room.room_type?.code || 'RM'}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`w-2 h-2 rounded-full ${
            room.status === 'AVAILABLE' ? 'bg-emerald-500' :
            room.status === 'OCCUPIED' ? 'bg-blue-500' :
            room.status === 'RESERVED' ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
          {hasMaintenance && <Wrench className="w-3.5 h-3.5 text-rose-500" />}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
        <HousekeepingBadge status={room.housekeeping_status} />
        {activeReservation?.guest && (
          <span className="text-[10px] text-stone-600 font-semibold truncate max-w-[80px]">
            {activeReservation.guest.last_name}
          </span>
        )}
      </div>
    </div>
  );
}

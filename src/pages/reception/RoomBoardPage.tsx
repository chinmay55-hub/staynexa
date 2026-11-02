import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  roomService, 
  reservationService, 
  maintenanceService,
  folioService,
  reloadDemoStoreFromStorage
} from '../../services/demoDataService';
import { realtimeSync } from '../../services/realtimeSync';
import type { Room, Reservation, Folio } from '../../types';
import { QuickCheckInModal } from '../../components/reception/QuickCheckInModal';
import { RoomActionConsoleModal } from '../../components/reception/RoomActionConsoleModal';
import { 
  Card, 
  CardContent, 
  Button, 
  HousekeepingBadge 
} from '../../components/ui';

export default function RoomBoardPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [rooms, setRooms] = useState(() => roomService.getAll(hotelId));
  const [reservations, setReservations] = useState(() => reservationService.getAll(hotelId));
  const [folios, setFolios] = useState<Folio[]>(() => folioService.getAll(hotelId));
  const [maintenanceTickets, setMaintenanceTickets] = useState(() => maintenanceService.getAll(hotelId));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [hkFilter, setHkFilter] = useState<string>('ALL');
  const [groupByFloor, setGroupByFloor] = useState(true);

  // Detail Modal state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkInRoomId, setCheckInRoomId] = useState<string | null>(null);

  // Synchronize state across tabs & central services in real time
  useEffect(() => {
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const refreshBoard = () => {
      reloadDemoStoreFromStorage();
      setRooms([...roomService.getAll(hotelId)]);
      setReservations([...reservationService.getAll(hotelId)]);
      setFolios([...folioService.getAll(hotelId)]);
      setMaintenanceTickets([...maintenanceService.getAll(hotelId)]);
    };

    const unsubRoom = realtimeSync.subscribe('ROOM_UPDATED', refreshBoard);
    const unsubResCreated = realtimeSync.subscribe('RESERVATION_CREATED', refreshBoard);
    const unsubResUpdated = realtimeSync.subscribe('RESERVATION_UPDATED', refreshBoard);
    const unsubFolio = realtimeSync.subscribe('FOLIO_UPDATED', refreshBoard);
    const unsubOrder = realtimeSync.subscribe('NEW_ORDER', refreshBoard);
    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', refreshBoard);
    const unsubMaintNew = realtimeSync.subscribe('NEW_MAINTENANCE_TICKET', refreshBoard);
    const unsubMaintUpdated = realtimeSync.subscribe('MAINTENANCE_TICKET_UPDATED', refreshBoard);
    const unsubHkNew = realtimeSync.subscribe('NEW_HOUSEKEEPING_TASK', refreshBoard);
    const unsubHkUpdated = realtimeSync.subscribe('HOUSEKEEPING_TASK_UPDATED', refreshBoard);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        refreshBoard();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      disconnectSupabase();
      unsubRoom();
      unsubResCreated();
      unsubResUpdated();
      unsubFolio();
      unsubOrder();
      unsubOrderStatus();
      unsubMaintNew();
      unsubMaintUpdated();
      unsubHkNew();
      unsubHkUpdated();
    };
  }, [hotelId]);

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
                  {floorRooms.map(room => {
                    const activeRes = activeReservations.find(r => r.room_id === room.id);
                    const roomFolio = activeRes ? (folios.find(f => f.reservation_id === activeRes.id) || folioService.getByReservation(activeRes.id)) : undefined;
                    return (
                      <RoomCard 
                        key={room.id} 
                        room={room} 
                        activeReservation={activeRes}
                        folio={roomFolio}
                        hasMaintenance={maintenanceTickets.some(m => m.room_id === room.id && m.status !== 'CLOSED')}
                        onClick={() => handleOpenRoom(room)}
                        onQuickCheckIn={(id) => setCheckInRoomId(id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredRooms.map(room => {
            const activeRes = activeReservations.find(r => r.room_id === room.id);
            const roomFolio = activeRes ? (folios.find(f => f.reservation_id === activeRes.id) || folioService.getByReservation(activeRes.id)) : undefined;
            return (
              <RoomCard 
                key={room.id} 
                room={room} 
                activeReservation={activeRes}
                folio={roomFolio}
                hasMaintenance={maintenanceTickets.some(m => m.room_id === room.id && m.status !== 'CLOSED')}
                onClick={() => handleOpenRoom(room)}
                onQuickCheckIn={(id) => setCheckInRoomId(id)}
              />
            );
          })}
        </div>
      )}

      {/* All-in-One Room Action Console Modal */}
      {selectedRoom && (
        <RoomActionConsoleModal
          isOpen={isModalOpen}
          room={selectedRoom}
          hotelId={hotelId}
          onClose={() => setIsModalOpen(false)}
          onOpenQuickCheckIn={(roomId) => {
            setIsModalOpen(false);
            setCheckInRoomId(roomId);
          }}
          onRoomUpdated={(updatedRoom) => {
            setRooms([...roomService.getAll(hotelId)]);
            setSelectedRoom(updatedRoom);
          }}
        />
      )}

      {/* 3-Step Express Check-In Modal */}
      {checkInRoomId && (
        <QuickCheckInModal
          isOpen={true}
          preselectedRoomId={checkInRoomId}
          hotelId={hotelId}
          onClose={() => setCheckInRoomId(null)}
          onSuccess={() => {
            setRooms([...roomService.getAll(hotelId)]);
            setReservations([...reservationService.getAll(hotelId)]);
            setCheckInRoomId(null);
          }}
        />
      )}
    </div>
  );
}

// Subcomponent for individual Room card
function RoomCard({ 
  room, 
  activeReservation, 
  folio,
  hasMaintenance, 
  onClick,
  onQuickCheckIn,
}: { 
  room: Room; 
  activeReservation?: Reservation; 
  folio?: Folio;
  hasMaintenance?: boolean; 
  onClick: () => void; 
  onQuickCheckIn?: (roomId: string) => void;
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
        {room.status === 'AVAILABLE' && onQuickCheckIn ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickCheckIn(room.id);
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer"
          >
            + Check-In
          </button>
        ) : activeReservation?.guest ? (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] text-stone-600 font-semibold truncate max-w-[70px]">
              {activeReservation.guest.last_name}
            </span>
            {folio && folio.outstanding > 0 ? (
              <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                ₹{folio.outstanding}
              </span>
            ) : folio ? (
              <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-emerald-100 text-emerald-800">
                Paid
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

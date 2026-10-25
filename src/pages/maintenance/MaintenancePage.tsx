import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Check, 
  Play,
  Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  maintenanceService, 
  roomService, 
  staffService, 
  activityLogService,
  reloadDemoStoreFromStorage
} from '../../services/demoDataService';
import { realtimeSync } from '../../services/realtimeSync';
import type { MaintenanceTicket, MaintenanceStatus, Priority } from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Select, 
  MaintenanceBadge, 
  Modal,
  useToast
} from '../../components/ui';

export default function MaintenancePage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [tickets, setTickets] = useState(() => maintenanceService.getAll(hotelId));
  const [rooms, setRooms] = useState(() => roomService.getAll(hotelId));
  const [staff, setStaff] = useState(() => staffService.getAll(hotelId));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Realtime & Cross-Tab State Synchronization
  useEffect(() => {
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const refreshTickets = () => {
      reloadDemoStoreFromStorage();
      setTickets([...maintenanceService.getAll(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
      setStaff([...staffService.getAll(hotelId)]);
    };

    const unsubNew = realtimeSync.subscribe('NEW_MAINTENANCE_TICKET', ({ ticket }) => {
      if (ticket.hotel_id === hotelId) {
        setTickets(prev => {
          if (prev.some(t => t.id === ticket.id)) return prev;
          return [ticket, ...prev];
        });
      }
    });

    const unsubUpdate = realtimeSync.subscribe('MAINTENANCE_TICKET_UPDATED', ({ ticketId, ticket }) => {
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, ...ticket } : t))
      );
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        refreshTickets();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      disconnectSupabase();
      unsubNew();
      unsubUpdate();
    };
  }, [hotelId]);

  // New Ticket Modal
  const toast = useToast();
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    room_id: rooms[0]?.id || '',
    category: 'HVAC',
    priority: 'HIGH' as Priority,
    assigned_to: '',
  });

  const filtered = tickets.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.room && t.room.number.includes(search)) ||
      (t.assigned_to && t.assigned_to.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  const handleAssignTech = async (ticketId: string, techName: string) => {
    try {
      const updated = await maintenanceService.updateAsync(ticketId, {
        assigned_to: techName,
        status: 'ASSIGNED',
      });
      if (updated) {
        setTickets([...maintenanceService.getAll(hotelId)]);
        activityLogService.log({
          hotel_id: hotelId,
          user_id: user?.id,
          actor_name: user?.full_name,
          action: 'UPDATE_MAINTENANCE_TICKET',
          entity_type: 'maintenance_ticket',
          entity_id: ticketId,
          metadata: { assigned_to: techName, new_status: 'ASSIGNED' }
        });
        toast.success('Technician assigned', `${techName} assigned to ticket`);
      }
    } catch (err: any) {
      toast.error('Failed to assign technician', err?.message || 'Database write rejected');
    }
  };

  const handleUpdateStatus = async (ticketId: string, nextStatus: MaintenanceStatus) => {
    const timeUpdates: Partial<MaintenanceTicket> = {};
    if (nextStatus === 'RESOLVED') timeUpdates.resolved_at = new Date().toISOString();
    if (nextStatus === 'VERIFIED' || nextStatus === 'CLOSED') timeUpdates.verified_at = new Date().toISOString();

    try {
      const updated = await maintenanceService.updateAsync(ticketId, {
        status: nextStatus,
        ...timeUpdates,
      });
      if (updated) {
        setTickets([...maintenanceService.getAll(hotelId)]);
        activityLogService.log({
          hotel_id: hotelId,
          user_id: user?.id,
          actor_name: user?.full_name,
          action: 'UPDATE_MAINTENANCE_TICKET',
          entity_type: 'maintenance_ticket',
          entity_id: ticketId,
          metadata: { new_status: nextStatus }
        });
        toast.success('Ticket updated', `Status changed to ${nextStatus}`);
      }
    } catch (err: any) {
      toast.error('Failed to update ticket status', err?.message || 'Database write rejected');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title || isSubmittingTicket) return;
    setTicketError(null);
    setIsSubmittingTicket(true);

    try {
      await maintenanceService.createAsync({
        hotel_id: hotelId,
        room_id: newTicket.room_id || undefined,
        title: newTicket.title,
        description: newTicket.description,
        category: newTicket.category,
        priority: newTicket.priority,
        status: newTicket.assigned_to ? 'ASSIGNED' : 'NEW',
        assigned_to: newTicket.assigned_to || undefined,
      });
      setTickets([...maintenanceService.getAll(hotelId)]);
      setIsAddOpen(false);
      setNewTicket({
        title: '',
        description: '',
        room_id: rooms[0]?.id || '',
        category: 'HVAC',
        priority: 'HIGH',
        assigned_to: '',
      });
      toast.success('Ticket created', 'Maintenance ticket registered');
    } catch (err: any) {
      const msg = err?.message || 'Database write rejected maintenance ticket';
      setTicketError(msg);
      toast.error('Failed to create ticket', msg);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Maintenance & Equipment Repairs</h1>
          <p className="text-stone-500 text-sm">HVAC, plumbing, electrical issues, technician dispatch, and resolution verification.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsAddOpen(true)}
          iconLeft={<Plus className="w-4 h-4" />}
        >
          Create Repair Ticket
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by title, room or assigned technician..."
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
                { value: 'NEW', label: 'New' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'VERIFIED', label: 'Verified & Closed' },
              ]}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'HVAC', label: 'HVAC / Air Conditioning' },
                { value: 'PLUMBING', label: 'Plumbing & Drainage' },
                { value: 'ELECTRICAL', label: 'Electrical & Lighting' },
                { value: 'CARPENTRY', label: 'Carpentry & Furniture' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{ticket.title}</div>
                      <div className="text-xs text-stone-500 line-clamp-1">{ticket.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-800 text-xs">
                      {ticket.room ? `Room ${ticket.room.number}` : 'Common Area'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-semibold text-stone-600">
                      {ticket.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        ticket.priority === 'HIGH' || ticket.priority === 'URGENT' 
                          ? 'bg-rose-100 text-rose-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-700">
                      {ticket.assigned_to ? (
                        <span className="font-semibold text-stone-800">{ticket.assigned_to}</span>
                      ) : (
                        <select
                          aria-label={`Assign technician for ticket ${ticket.id}`}
                          className="text-xs bg-stone-50 border border-stone-200 rounded px-2 py-1 text-stone-600 focus:outline-none focus:ring-1 focus:ring-[#c9a84c] cursor-pointer"
                          value=""
                          onChange={e => e.target.value && handleAssignTech(ticket.id, e.target.value)}
                        >
                          <option value="">Assign Tech...</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.full_name}>{s.full_name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <MaintenanceBadge status={ticket.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {(ticket.status === 'NEW' || ticket.status === 'ASSIGNED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                          iconLeft={<Play className="w-3.5 h-3.5" />}
                        >
                          Start Repair
                        </Button>
                      )}
                      {ticket.status === 'IN_PROGRESS' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}
                          iconLeft={<Check className="w-3.5 h-3.5" />}
                        >
                          Mark Resolved
                        </Button>
                      )}
                      {ticket.status === 'RESOLVED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateStatus(ticket.id, 'VERIFIED')}
                          iconLeft={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Verify & Close
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

      {/* New Ticket Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Log Engineering Breakdown Ticket"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateTicket}>Submit Ticket</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Input
            label="Issue Summary"
            required
            placeholder="e.g. AC cooling coil frozen or leaking water"
            value={newTicket.title}
            onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Room Location"
              value={newTicket.room_id}
              onChange={e => setNewTicket({ ...newTicket, room_id: e.target.value })}
              options={[
                { value: '', label: 'Common Area / General Facility' },
                ...rooms.map(r => ({ value: r.id, label: `Room ${r.number}` })),
              ]}
            />
            <Select
              label="Category"
              value={newTicket.category}
              onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
              options={[
                { value: 'HVAC', label: 'HVAC / Air Conditioning' },
                { value: 'PLUMBING', label: 'Plumbing' },
                { value: 'ELECTRICAL', label: 'Electrical' },
                { value: 'CARPENTRY', label: 'Carpentry' },
                { value: 'OTHER', label: 'Other Facility' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={newTicket.priority}
              onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as Priority })}
              options={[
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
            <Select
              label="Assign Technician"
              value={newTicket.assigned_to}
              onChange={e => setNewTicket({ ...newTicket, assigned_to: e.target.value })}
              options={[
                { value: '', label: 'Unassigned (General Queue)' },
                ...staff.map(s => ({ value: s.full_name, label: s.full_name })),
              ]}
            />
          </div>
          <Input
            label="Detailed Description"
            placeholder="Observed malfunction details and required tools"
            value={newTicket.description}
            onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

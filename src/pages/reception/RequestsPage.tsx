import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Clock, 
  User, 
  AlertTriangle,
  Play,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  serviceRequestService, 
  roomService, 
  guestService, 
  staffService,
  activityLogService,
  reloadDemoStoreFromStorage
} from '../../services/demoDataService';
import { realtimeSync } from '../../services/realtimeSync';
import type { ServiceRequest, RequestStatus, Priority } from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Select, 
  RequestBadge, 
  Modal,
  useToast
} from '../../components/ui';

export default function RequestsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [requests, setRequests] = useState(() => serviceRequestService.getAll(hotelId));
  const [rooms] = useState(() => roomService.getAll(hotelId));
  const [staff] = useState(() => staffService.getAll(hotelId));
  const [services] = useState(() => serviceRequestService.getServices(hotelId));

  // Async Mutation & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Realtime WebSocket & Cross-Tab State Synchronization
  useEffect(() => {
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const unsubNewRequest = realtimeSync.subscribe('NEW_SERVICE_REQUEST', ({ request }) => {
      if (request.hotel_id === hotelId) {
        setRequests(prev => {
          if (prev.some(r => r.id === request.id)) return prev;
          return [request, ...prev];
        });
      }
    });

    const unsubStatusChange = realtimeSync.subscribe('REQUEST_STATUS_CHANGED', ({ requestId, status, request }) => {
      setRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, ...request, status } : r))
      );
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        reloadDemoStoreFromStorage();
        setRequests([...serviceRequestService.getAll(hotelId)]);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      disconnectSupabase();
      unsubNewRequest();
      unsubStatusChange();
    };
  }, [hotelId]);

  // New Request Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newReq, setNewReq] = useState({
    title: '',
    description: '',
    room_id: rooms[0]?.id || '',
    service_id: services[0]?.id || '',
    priority: 'MEDIUM' as Priority,
    assigned_to: '',
  });

  const filtered = requests.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      (req.room && req.room.number.includes(search)) ||
      (req.assigned_to && req.assigned_to.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || req.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleUpdateStatus = async (id: string, newStatus: RequestStatus) => {
    try {
      const updated = await serviceRequestService.updateAsync(id, {
        status: newStatus,
        ...(newStatus === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {})
      });
      if (updated) {
        setRequests([...serviceRequestService.getAll(hotelId)]);
        activityLogService.log({
          hotel_id: hotelId,
          user_id: user?.id,
          actor_name: user?.full_name,
          action: 'UPDATE_SERVICE_REQUEST',
          entity_type: 'service_request',
          entity_id: id,
          metadata: { new_status: newStatus }
        });
        toast.success('Request updated', `Status changed to ${newStatus}`);
      }
    } catch (err: any) {
      toast.error('Failed to update request', err?.message || 'Database write rejected');
    }
  };

  const handleAssign = async (id: string, staffName: string) => {
    try {
      const updated = await serviceRequestService.updateAsync(id, {
        assigned_to: staffName,
        status: 'ASSIGNED'
      });
      if (updated) {
        setRequests([...serviceRequestService.getAll(hotelId)]);
        toast.success('Staff assigned', `${staffName} assigned to ticket`);
      }
    } catch (err: any) {
      toast.error('Failed to assign staff', err?.message || 'Database write rejected');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.title || isSubmitting) return;
    setReqError(null);
    setIsSubmitting(true);

    try {
      await serviceRequestService.createAsync({
        hotel_id: hotelId,
        title: newReq.title,
        description: newReq.description,
        room_id: newReq.room_id || undefined,
        service_id: newReq.service_id || undefined,
        priority: newReq.priority,
        status: newReq.assigned_to ? 'ASSIGNED' : 'PENDING',
        assigned_to: newReq.assigned_to || undefined,
      });
      setRequests([...serviceRequestService.getAll(hotelId)]);
      setIsAddOpen(false);
      setNewReq({
        title: '',
        description: '',
        room_id: rooms[0]?.id || '',
        service_id: services[0]?.id || '',
        priority: 'MEDIUM',
        assigned_to: '',
      });
      toast.success('Request created', 'Service ticket registered and notified');
    } catch (err: any) {
      const msg = err?.message || 'Database write rejected request.';
      setReqError(msg);
      toast.error('Failed to create ticket', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Guest Service Requests</h1>
          <p className="text-stone-500 text-sm">Concierge items, housekeeping needs, and front-desk dispatch tickets.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsAddOpen(true)}
          iconLeft={<Plus className="w-4 h-4" />}
        >
          Create Request
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by title, room or assigned staff..."
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
                { value: 'PENDING', label: 'Pending' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Request Item</th>
                  <th className="py-3 px-4">Room / Guest</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Logged</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{req.title}</div>
                      <div className="text-xs text-stone-500 line-clamp-1">{req.description || 'No special instructions'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-stone-800">
                      Room {req.room?.number || 'Desk'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        req.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                        req.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        req.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <RequestBadge status={req.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-700">
                      {req.assigned_to ? (
                        <span className="font-medium">{req.assigned_to}</span>
                      ) : (
                        <select
                          className="text-xs border border-stone-200 rounded p-1 bg-white text-stone-600"
                          onChange={e => e.target.value && handleAssign(req.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Assign staff...</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.full_name}>{s.full_name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-400 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {req.status !== 'IN_PROGRESS' && req.status !== 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(req.id, 'IN_PROGRESS')}
                        >
                          Start
                        </Button>
                      )}
                      {req.status !== 'COMPLETED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(req.id, 'COMPLETED')}
                        >
                          Complete
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

      {/* New Request Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => !isSubmitting && setIsAddOpen(false)}
        title="Create New Service Request"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateRequest} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        }
      >
        <form className="space-y-3" onSubmit={handleCreateRequest}>
          {reqError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <span className="font-bold">Error:</span>
              <span>{reqError}</span>
            </div>
          )}
          <Input
            label="Request Title"
            required
            placeholder="e.g. Extra Bath Towels & Water Bottles"
            value={newReq.title}
            onChange={e => setNewReq({ ...newReq, title: e.target.value })}
            disabled={isSubmitting}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Associated Room"
              value={newReq.room_id}
              onChange={e => setNewReq({ ...newReq, room_id: e.target.value })}
              options={rooms.map(r => ({ value: r.id, label: `Room ${r.number}` }))}
            />
            <Select
              label="Priority Level"
              value={newReq.priority}
              onChange={e => setNewReq({ ...newReq, priority: e.target.value as Priority })}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
          </div>
          <Input
            label="Details & Special Instructions"
            placeholder="e.g. Guest requested delivery before 5 PM"
            value={newReq.description}
            onChange={e => setNewReq({ ...newReq, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

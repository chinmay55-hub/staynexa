import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Play, 
  Wrench, 
  Check,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { nowIso } from '../../utils/clock';
import { 
  housekeepingService, 
  roomService, 
  maintenanceService,
  activityLogService,
  reloadDemoStoreFromStorage,
  serviceRequestService,
  demoDataService
} from '../../services/demoDataService';
import { realtimeSync } from '../../services/realtimeSync';
import { isSameHotel } from '../../utils/tenantId';
import type { HousekeepingTask, Room, Priority } from '../../types';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  HousekeepingBadge, 
  Modal,
  useToast
} from '../../components/ui';

export default function HousekeepingPage({ defaultTab = 'TASKS' }: { defaultTab?: 'TASKS' | 'REQUESTS' | 'ROOMS' } = {}) {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const isHousekeepingReq = (r: any) => {
    if (!r) return false;
    const cat = (r.service?.category || '').toUpperCase();
    if (cat.includes('HOUSEKEEPING') || cat.includes('ROOM') || cat.includes('AMENIT')) return true;
    const sId = r.service_id;
    if (sId) {
      const allServices = serviceRequestService.getServices(hotelId);
      const svc = allServices.find(s => s.id === sId);
      if (svc && (svc.category || '').toUpperCase().includes('HOUSEKEEPING')) return true;
    }
    const title = (r.title || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    return title.includes('towel') || title.includes('clean') || title.includes('linen') || 
           title.includes('toilet') || title.includes('water') || title.includes('pillow') ||
           title.includes('blanket') || title.includes('bed') || title.includes('trash') ||
           title.includes('iron') || title.includes('kit') || desc.includes('clean') || desc.includes('towel');
  };

  const [tasks, setTasks] = useState(() => housekeepingService.getTasks(hotelId));
  const [rooms, setRooms] = useState(() => roomService.getAll(hotelId));
  const [guestRequests, setGuestRequests] = useState(() => serviceRequestService.getAll(hotelId).filter(isHousekeepingReq));
  const [activeTab, setActiveTab] = useState<'TASKS' | 'REQUESTS' | 'ROOMS'>(defaultTab);
  const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);
  if (prevDefaultTab !== defaultTab) {
    setPrevDefaultTab(defaultTab);
    setActiveTab(defaultTab);
  }

  // Initial Supabase Data Synchronization
  useEffect(() => {
    if (hotelId) {
      demoDataService.syncFromSupabase(hotelId).then(() => {
        setTasks([...housekeepingService.getTasks(hotelId)]);
        setRooms([...roomService.getAll(hotelId)]);
        setGuestRequests(serviceRequestService.getAll(hotelId).filter(isHousekeepingReq));
      });
    }
  }, [hotelId]);

  // Realtime WebSocket & Cross-Tab State Synchronization
  useEffect(() => {
    const disconnectSupabase = realtimeSync.connectSupabaseHotelChannel(hotelId);

    const refreshHousekeeping = () => {
      reloadDemoStoreFromStorage();
      setTasks([...housekeepingService.getTasks(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
      setGuestRequests(serviceRequestService.getAll(hotelId).filter(isHousekeepingReq));
    };

    const unsubResync = realtimeSync.onResync(refreshHousekeeping);

    const unsubNewTask = realtimeSync.subscribe('NEW_HOUSEKEEPING_TASK', ({ task }) => {
      if (isSameHotel(task.hotel_id, hotelId)) {
        setTasks(prev => {
          if (prev.some(t => t.id === task.id)) return prev;
          return [task, ...prev];
        });
      }
    });

    const unsubUpdateTask = realtimeSync.subscribe('HOUSEKEEPING_TASK_UPDATED', ({ taskId, task }) => {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, ...task } : t))
      );
      setRooms([...roomService.getAll(hotelId)]);
    });

    const unsubNewReq = realtimeSync.subscribe('NEW_SERVICE_REQUEST', ({ request }) => {
      if (isSameHotel(request.hotel_id, hotelId) && isHousekeepingReq(request)) {
        setGuestRequests(prev => [request, ...prev.filter(r => r.id !== request.id)]);
      }
    });

    const unsubReqStatus = realtimeSync.subscribe('REQUEST_STATUS_CHANGED', ({ requestId, status, request }) => {
      setGuestRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, ...request, status } : r))
      );
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        refreshHousekeeping();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      disconnectSupabase();
      unsubNewTask();
      unsubUpdateTask();
      unsubNewReq();
      unsubResync();
      unsubReqStatus();
    };
  }, [hotelId]);

  // Report Maintenance Modal
  const [maintenanceRoom, setMaintenanceRoom] = useState<Room | null>(null);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCategory, setMaintCategory] = useState<'HVAC' | 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'OTHER'>('PLUMBING');
  const [maintPriority, setMaintPriority] = useState<Priority>('HIGH');

  // Async Mutation & Error States
  const toast = useToast();
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Add Task Modal
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    room_id: rooms[0]?.id || '',
    type: 'CHECKOUT_CLEAN' as HousekeepingTask['type'],
    priority: 'HIGH' as Priority,
    notes: '',
  });

  const handleStartTask = async (taskId: string) => {
    try {
      await housekeepingService.updateTaskAsync(taskId, {
        status: 'IN_PROGRESS',
        started_at: nowIso(),
      });
      setTasks([...housekeepingService.getTasks(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
      toast.success('Task started', 'Housekeeping cleaning in progress');
    } catch (err: any) {
      toast.error('Failed to start task', err?.message || 'Database write rejected');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await housekeepingService.updateTaskAsync(taskId, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });
      setTasks([...housekeepingService.getTasks(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
      activityLogService.log({
        hotel_id: hotelId,
        user_id: user?.id,
        actor_name: user?.full_name,
        action: 'HOUSEKEEPING_COMPLETED',
        entity_type: 'housekeeping_task',
        entity_id: taskId
      });
      toast.success('Task completed', 'Room marked for inspection');
    } catch (err: any) {
      toast.error('Failed to complete task', err?.message || 'Database write rejected');
    }
  };

  const handleInspectTask = async (taskId: string) => {
    try {
      await housekeepingService.updateTaskAsync(taskId, { status: 'INSPECTED' });
      setTasks([...housekeepingService.getTasks(hotelId)]);
      setRooms([...roomService.getAll(hotelId)]);
      toast.success('Task inspected', 'Room marked as clean and available');
    } catch (err: any) {
      toast.error('Failed to inspect task', err?.message || 'Database write rejected');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTask) return;
    setTaskError(null);
    setIsSubmittingTask(true);

    try {
      await housekeepingService.createTaskAsync({
        hotel_id: hotelId,
        room_id: newTask.room_id,
        type: newTask.type,
        status: 'PENDING',
        priority: newTask.priority,
        notes: newTask.notes,
        assigned_to: user?.full_name || 'Housekeeping Crew',
      });
      setTasks([...housekeepingService.getTasks(hotelId)]);
      setIsAddTaskOpen(false);
      toast.success('Task created', 'Housekeeping dispatch scheduled');
    } catch (err: any) {
      const msg = err?.message || 'Database write rejected housekeeping task';
      setTaskError(msg);
      toast.error('Failed to create task', msg);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceRoom || !maintTitle) return;
    try {
      await maintenanceService.createAsync({
        hotel_id: hotelId,
        room_id: maintenanceRoom.id,
        title: maintTitle,
        description: maintDesc,
        category: maintCategory,
        priority: maintPriority,
        status: 'NEW',
      });
      setMaintenanceRoom(null);
      setMaintTitle('');
      setMaintDesc('');
      setMaintCategory('PLUMBING');
      toast.success('Maintenance ticket created', 'Issue reported to maintenance queue');
    } catch (err: any) {
      toast.error('Failed to create maintenance ticket', err?.message || 'Database write rejected');
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'INSPECTED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'INSPECTED');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Housekeeping & Room Hygiene</h1>
          <p className="text-stone-500 text-sm">Room cleaning queue, inspection workflows, and turnover checklists.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsAddTaskOpen(true)}
          iconLeft={<Plus className="w-4 h-4" />}
        >
          Assign Cleaning Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'TASKS' ? 'border-[#c9a84c] text-stone-900 font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Active Tasks Queue ({pendingTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'REQUESTS' ? 'border-[#c9a84c] text-stone-900 font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Guest Amenity Requests ({guestRequests.filter(r => r.status !== 'COMPLETED').length})
        </button>
        <button
          onClick={() => setActiveTab('ROOMS')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ROOMS' ? 'border-[#c9a84c] text-stone-900 font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Room Cleaning Status ({rooms.length})
        </button>
      </div>

      {activeTab === 'TASKS' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTasks.map(task => (
              <Card key={task.id} className="border-stone-200 shadow-xs flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-lg text-stone-900 block">
                        Room {task.room?.number || 'TBA'}
                      </span>
                      <span className="text-xs text-stone-500 font-medium">Floor {task.room?.floor} · {task.type}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      task.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  {task.notes && (
                    <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded">
                      <strong>Note:</strong> {task.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
                    <span>Assigned: {task.assigned_to || 'General Crew'}</span>
                    <HousekeepingBadge status={task.status as any} />
                  </div>

                  <div className="pt-2 flex gap-2">
                    {task.status === 'PENDING' && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleStartTask(task.id)}
                        iconLeft={<Play className="w-3.5 h-3.5" />}
                      >
                        Start Cleaning
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                        onClick={() => handleCompleteTask(task.id)}
                        iconLeft={<Check className="w-3.5 h-3.5" />}
                      >
                        Mark Clean
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => task.room && setMaintenanceRoom(task.room)}
                      title="Report Maintenance Issue"
                    >
                      <Wrench className="w-3.5 h-3.5 text-stone-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Completed history */}
          {completedTasks.length > 0 && (
            <div className="pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Completed Cleaning Tasks Today</h3>
              <div className="divide-y divide-stone-100 bg-white border border-stone-200 rounded-xl">
                {completedTasks.map(t => (
                  <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-stone-900">Room {t.room?.number}</span>
                      <span className="text-stone-500">{t.type} completed by {t.assigned_to || 'Staff'}</span>
                    </div>
                    {t.status === 'INSPECTED' ? (
                      <span className="flex items-center gap-1 text-teal-700 font-semibold px-2 py-1 bg-teal-50 rounded text-xs border border-teal-200">
                        <Check className="w-3.5 h-3.5 text-teal-600" /> Inspected
                      </span>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleInspectTask(t.id)}
                        iconLeft={<Eye className="w-3.5 h-3.5 text-stone-500" />}
                      >
                        Mark Inspected
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'REQUESTS' ? (
        <div className="space-y-4">
          {guestRequests.length === 0 ? (
            <Card className="border-stone-200">
              <CardContent className="p-8 text-center text-stone-500">
                <Sparkles className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">No active housekeeping requests from guests.</p>
                <p className="text-xs text-stone-400 mt-1">When in-house guests request towels, water, or room cleaning from the guest portal, they appear here live.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guestRequests.map(req => {
                const isPending = req.status === 'PENDING' || req.status === 'ASSIGNED' || req.status === 'IN_PROGRESS';
                return (
                  <Card key={req.id} data-testid="housekeeping-request-card" data-request-id={req.id} className="border-stone-200 shadow-xs flex flex-col justify-between">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-extrabold text-lg text-stone-900 block">
                            Room {req.room?.number || 'Guest'}
                          </span>
                          <span className="text-xs text-[#c9a84c] font-bold">{req.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {req.description && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                          {req.description}
                        </p>
                      )}

                      <div className="text-[10px] text-stone-400 flex justify-between items-center pt-1 border-t border-stone-100">
                        <span>Requested: {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-bold text-stone-600">Priority: {req.priority}</span>
                      </div>

                      {isPending && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full mt-2"
                          iconLeft={<Check className="w-3.5 h-3.5" />}
                          onClick={async () => {
                            try {
                              await serviceRequestService.updateAsync(req.id, { status: 'COMPLETED' });
                              setGuestRequests(serviceRequestService.getAll(hotelId).filter(isHousekeepingReq));
                              toast.success('Request fulfilled', `${req.title} for Room ${req.room?.number || ''} completed`);
                            } catch (err: any) {
                              toast.error('Failed to update request', err?.message || 'Update failed');
                            }
                          }}
                        >
                          Mark Delivered / Fulfilled
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Card className="shadow-xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                    <th className="py-3 px-4">Room Number</th>
                    <th className="py-3 px-4">Floor</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Housekeeping Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rooms.map(room => (
                    <tr key={room.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        Room {room.number}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-600">
                        Floor {room.floor}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-800">
                        {room.room_type?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <HousekeepingBadge status={room.housekeeping_status} />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            roomService.update(room.id, { housekeeping_status: 'CLEAN' });
                            setRooms([...roomService.getAll(hotelId)]);
                          }}
                        >
                          Set Clean
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            roomService.update(room.id, { housekeeping_status: 'DIRTY' });
                            setRooms([...roomService.getAll(hotelId)]);
                          }}
                        >
                          Set Dirty
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title="Assign Room Cleaning Task"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateTask}>Assign Task</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Select
            label="Room to Clean"
            value={newTask.room_id}
            onChange={e => setNewTask({ ...newTask, room_id: e.target.value })}
            options={rooms.map(r => ({ value: r.id, label: `Room ${r.number} (${r.housekeeping_status})` }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Cleaning Type"
              value={newTask.type}
              onChange={e => setNewTask({ ...newTask, type: e.target.value as any })}
              options={[
                { value: 'CHECKOUT_CLEAN', label: 'Checkout Clean (Full Turnover)' },
                { value: 'STAYOVER_CLEAN', label: 'Stayover Daily Tidy' },
                { value: 'DEEP_CLEAN', label: 'Deep Clean / Sanitize' },
                { value: 'TURNDOWN', label: 'Evening Turndown Service' },
              ]}
            />
            <Select
              label="Priority"
              value={newTask.priority}
              onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
              options={[
                { value: 'HIGH', label: 'High (Immediate Check-In Expected)' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </div>
          <Input
            label="Notes"
            placeholder="e.g. Extra pillows requested, replace bath mat"
            value={newTask.notes}
            onChange={e => setNewTask({ ...newTask, notes: e.target.value })}
          />
          {taskError && (
            <p role="alert" className="text-sm text-red-700">{taskError}</p>
          )}
        </form>
      </Modal>

      {/* Report Maintenance Issue Modal */}
      {maintenanceRoom && (
        <Modal
          isOpen={true}
          onClose={() => setMaintenanceRoom(null)}
          title={`Report Maintenance: Room ${maintenanceRoom.number}`}
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setMaintenanceRoom(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateMaintenance}>Submit Ticket</Button>
            </div>
          }
        >
          <form className="space-y-3">
            <Input
              label="Issue Summary"
              required
              placeholder="e.g. Shower drain clogged"
              value={maintTitle}
              onChange={e => setMaintTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={maintCategory}
                onChange={e => setMaintCategory(e.target.value as any)}
                options={[
                  { value: 'HVAC', label: 'HVAC / Air Conditioning' },
                  { value: 'PLUMBING', label: 'Plumbing & Drainage' },
                  { value: 'ELECTRICAL', label: 'Electrical & Lighting' },
                  { value: 'CARPENTRY', label: 'Carpentry & Furniture' },
                  { value: 'OTHER', label: 'Other Facility' },
                ]}
              />
              <Select
                label="Priority Level"
                value={maintPriority}
                onChange={e => setMaintPriority(e.target.value as any)}
                options={[
                  { value: 'HIGH', label: 'High / Critical' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'LOW', label: 'Low' },
                ]}
              />
            </div>
            <Input
              label="Description of Breakdown"
              placeholder="Provide technical specifics for the repair technician"
              value={maintDesc}
              onChange={e => setMaintDesc(e.target.value)}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  BedDouble, 
  IndianRupee, 
  Users, 
  Sparkles, 
  QrCode
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../../contexts/useAuth';
import { 
  hotelService, 
  analyticsService, 
  activityLogService 
} from '../../services/demoDataService';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  StatCard, 
  Button 
} from '../../components/ui';

export default function HotelDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);
  const stats = analyticsService.getHotelStats(hotelId);
  const activityLogs = activityLogService.getAll(hotelId, 6);

  // Revenue trend data
  const revenueTrend = [
    { day: 'Mon', revenue: 18500 },
    { day: 'Tue', revenue: 24200 },
    { day: 'Wed', revenue: 19800 },
    { day: 'Thu', revenue: 29500 },
    { day: 'Fri', revenue: 42000 },
    { day: 'Sat', revenue: 48500 },
    { day: 'Sun', revenue: 38000 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c9a84c] uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Hotel Management Portal
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">
            {hotel?.name || 'Property'} Management Dashboard
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Operational KPIs, staff permissions, revenue pacing, and guest experience controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/hotel/qr-codes')}
            iconLeft={<QrCode className="w-4 h-4" />}
          >
            Room QR Codes
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate('/reception')}
          >
            Reception Console
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Occupancy Rate"
          value={`${stats.occupancyPercent}%`}
          icon={<BedDouble className="w-5 h-5 text-blue-600" />}
          change={12}
          changeLabel="vs last week"
        />
        <StatCard
          label="In-House Guests"
          value={stats.currentGuests}
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          change={5}
          changeLabel="across rooms"
        />
        <StatCard
          label="Today's Revenue"
          value={`₹${(stats.todayRevenue || 12850).toLocaleString('en-IN')}`}
          icon={<IndianRupee className="w-5 h-5 text-[#c9a84c]" />}
          change={14}
          changeLabel="collected payments"
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingRequests}
          icon={<Sparkles className="w-5 h-5 text-purple-600" />}
          changeLabel="concierge queue"
        />
      </div>

      {/* Charts & Operational Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Velocity Chart */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader 
            title="7-Day Revenue Velocity (₹)" 
            description="Combined room nights, F&B, and ancillary service collections"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }} 
                />
                <Bar dataKey="revenue" fill="#c9a84c" radius={[4, 4, 0, 0]} name="Daily Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Room Status Gauge */}
        <Card className="shadow-xs">
          <CardHeader title="Room Inventory State" description="Current operational state across property" />
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Occupied ({stats.occupiedRooms})</span>
                <span>{stats.occupancyPercent}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${stats.occupancyPercent}%` }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-[11px] text-emerald-800 font-semibold">Available</div>
                <div className="text-xl font-bold text-emerald-950 mt-0.5">{stats.availableRooms}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-[11px] text-amber-800 font-semibold">Housekeeping</div>
                <div className="text-xl font-bold text-amber-950 mt-0.5">{stats.dirtyRooms} Dirty</div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/hotel/rooms')}
              >
                Manage Room Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity Audit */}
      <Card className="shadow-xs">
        <CardHeader 
          title="Recent Property Activity Audit" 
          description="Live operational events logged across front desk, F&B, and housekeeping"
        />
        <CardContent>
          <div className="divide-y divide-stone-100">
            {activityLogs.map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-[10px]">
                    {log.actor_name?.[0] || 'S'}
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900">{log.actor_name || 'Staff'}</span>{' '}
                    <span className="text-stone-500">performed</span>{' '}
                    <span className="font-mono font-semibold text-stone-800">{log.action}</span>
                  </div>
                </div>
                <div className="text-stone-400">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

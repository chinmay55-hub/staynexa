import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  IndianRupee, 
  BedDouble, 
  UtensilsCrossed, 
  Sparkles,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService, hotelService } from '../../services/demoDataService';
import { Card, CardContent, CardHeader, Button, StatCard } from '../../components/ui';

export default function ReportsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);

  const [activeTab, setActiveTab] = useState<'OCCUPANCY' | 'REVENUE' | 'HOUSEKEEPING'>('OCCUPANCY');

  const stats = analyticsService.getHotelStats(hotelId);

  // Realistic occupancy chart data (last 14 days)
  const occupancyData = [
    { date: 'Oct 01', rate: 65 },
    { date: 'Oct 02', rate: 70 },
    { date: 'Oct 03', rate: 68 },
    { date: 'Oct 04', rate: 85 },
    { date: 'Oct 05', rate: 92 },
    { date: 'Oct 06', rate: 88 },
    { date: 'Oct 07', rate: 74 },
    { date: 'Oct 08', rate: 62 },
    { date: 'Oct 09', rate: 69 },
    { date: 'Oct 10', rate: 78 },
    { date: 'Oct 11', rate: 94 },
    { date: 'Oct 12', rate: 96 },
    { date: 'Oct 13', rate: 82 },
    { date: 'Oct 14', rate: stats.occupancyPercent || 75 },
  ];

  // Dynamic revenue source breakdown from analytics
  const revenueBreakdown = stats.revenueBreakdown || [
    { name: 'Room Nights', value: 345000, color: '#1a2744' },
    { name: 'Restaurant & Bar', value: 89000, color: '#c9a84c' },
    { name: 'Room Service', value: 42000, color: '#3b82f6' },
    { name: 'Laundry & Spa', value: 18500, color: '#10b981' },
  ];

  const totalRevenueMtd = stats.totalRevenueMtd || 494500;
  const fnbRevenue = (revenueBreakdown.find(r => r.name === 'Restaurant & Bar')?.value || 0) + 
                     (revenueBreakdown.find(r => r.name === 'Room Service')?.value || 0);
  const fnbPercent = totalRevenueMtd > 0 ? ((fnbRevenue / totalRevenueMtd) * 100).toFixed(1) : '26.4';
  const revPar = stats.totalRooms > 0 ? Math.round(totalRevenueMtd / (stats.totalRooms * 30)) : 3450;

  // Housekeeping efficiency turnaround
  const housekeepingMetrics = [
    { day: 'Mon', avgMins: 32 },
    { day: 'Tue', avgMins: 28 },
    { day: 'Wed', avgMins: 25 },
    { day: 'Thu', avgMins: 30 },
    { day: 'Fri', avgMins: 22 },
    { day: 'Sat', avgMins: 24 },
    { day: 'Sun', avgMins: 26 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Hotel Operational Intelligence & Reports</h1>
          <p className="text-stone-500 text-sm">Historical occupancy velocity, RevPAR analysis, and department turnaround metrics.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.print()}
          iconLeft={<Download className="w-4 h-4" />}
        >
          Export Report Summary
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {[
          { id: 'OCCUPANCY', label: 'Occupancy & Pacing' },
          { id: 'REVENUE', label: 'Revenue & Ancillary Sales' },
          { id: 'HOUSEKEEPING', label: 'Housekeeping Turnaround' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-[#c9a84c] text-stone-900 font-bold' 
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OCCUPANCY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Current Property Occupancy" value={`${stats.occupancyPercent}%`} change={stats.occupiedRooms} changeLabel={`of ${stats.totalRooms} rooms occupied`} />
            <StatCard label="Peak Weekend Occupancy" value="96.0%" change={4} changeLabel="Saturday nights" />
            <StatCard label="Average Length of Stay" value="2.4 Nights" change={0.3} changeLabel="days per guest" />
          </div>

          <Card className="shadow-xs">
            <CardHeader title="14-Day Occupancy Velocity (%)" description="Daily room occupancy percentage across property inventory" />
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#78716c' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#78716c' }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="rate" stroke="#1a2744" strokeWidth={3} dot={{ r: 4, fill: '#c9a84c' }} name="Occupancy %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'REVENUE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Revenue (MTD)" value={`₹${totalRevenueMtd.toLocaleString('en-IN')}`} change={18} changeLabel="all departments" />
            <StatCard label="F&B Contribution" value={`${fnbPercent}%`} change={3} changeLabel="share of total GMV" />
            <StatCard label="RevPAR (Revenue/Avail Room)" value={`₹${revPar.toLocaleString('en-IN')}`} change={8} changeLabel="per room/night" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader title="Revenue Share by Category" description="Gross revenue distribution across hotel departments" />
              <CardContent className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader title="Revenue Department Breakdown" description="Itemized billing totals across operational divisions" />
              <CardContent className="space-y-4">
                {revenueBreakdown.map(item => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-semibold text-stone-800">{item.name}</span>
                    </div>
                    <span className="font-bold text-stone-900">₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'HOUSEKEEPING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Rooms Clean / Inspected" value={`${stats.cleanRooms} / ${stats.totalRooms}`} changeLabel={`${stats.dirtyRooms} dirty, ${stats.cleaningRooms} cleaning`} />
            <StatCard label="Avg Checkout Clean Time" value="27 Mins" change={-4} changeLabel="faster turnaround" />
            <StatCard label="Daily Clean Queue Complete" value="100%" changeLabel="before 4:00 PM" />
          </div>

          <Card className="shadow-xs">
            <CardHeader title="Average Cleaning Turnaround Duration (Minutes)" description="Time taken from dirty status to clean inspection" />
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={housekeepingMetrics}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#78716c' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }} />
                  <Bar dataKey="avgMins" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Minutes / Room" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { Hotel, BedDouble, Users, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, StatCard } from '../../components/ui';
import { analyticsService, hotelService } from '../../services/demoDataService';

export default function PlatformAnalyticsPage() {
  const [platformStats] = useState(() => analyticsService.getPlatformStats());
  const [hotels] = useState(() => hotelService.getAll());

  // Data for Properties by Size
  const hotelSizeData = hotels.map(h => ({
    name: h.name.split(' ')[0],
    rooms: h.total_rooms,
  }));

  // Subscription breakdown
  const planDistribution = [
    { name: 'Pro', value: 1, color: '#a855f7' },
    { name: 'Starter', value: 1, color: '#3b82f6' },
    { name: 'Enterprise', value: 1, color: '#c9a84c' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-stone-900">Platform Analytics & Growth</h1>
        <p className="text-stone-500 text-sm">Aggregated operational and business performance across all hotel tenants.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Managed Rooms"
          value={platformStats.totalRooms}
          icon={<BedDouble className="w-5 h-5 text-[#c9a84c]" />}
          change={18}
          changeLabel="portfolio size"
        />
        <StatCard
          label="Total Active Tenants"
          value={platformStats.active}
          icon={<Hotel className="w-5 h-5 text-emerald-600" />}
          change={10}
          changeLabel="3 on platform"
        />
        <StatCard
          label="Staff & Operators"
          value={platformStats.totalUsers}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          change={6}
          changeLabel="active accounts"
        />
        <StatCard
          label="Aggregated GMV"
          value={`₹${(platformStats.totalRevenue || 45000).toLocaleString('en-IN')}`}
          icon={<IndianRupee className="w-5 h-5 text-purple-600" />}
          change={24}
          changeLabel="total processed"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rooms per Property Chart */}
        <Card className="shadow-sm">
          <CardHeader 
            title="Room Capacity by Property" 
            description="Comparison of total room inventory across onboarded hotels" 
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hotelSizeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }} 
                />
                <Bar dataKey="rooms" fill="#1a2744" radius={[4, 4, 0, 0]} name="Rooms" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Plan Distribution */}
        <Card className="shadow-sm">
          <CardHeader 
            title="SaaS Subscription Tiers" 
            description="Active tenant distribution across commercial plan tiers" 
          />
          <CardContent className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

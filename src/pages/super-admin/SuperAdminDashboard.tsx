import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Hotel as HotelIcon, 
  Users, 
  BedDouble, 
  TrendingUp, 
  CreditCard, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { hotelService, analyticsService, subscriptionService } from '../../services/demoDataService';
import { Card, CardContent, CardHeader, StatCard, Badge, HotelStatusBadge, Button } from '../../components/ui';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats] = useState(() => analyticsService.getPlatformStats());
  const [hotels] = useState(() => hotelService.getAll());
  const [subscriptions] = useState(() => subscriptionService.getAll());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#1a2744] to-[#243561] p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin Console
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Platform Command Center</h1>
          <p className="text-blue-200 text-sm mt-1">Multi-tenant management, global subscriptions, and hotel lifecycle control.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            className="bg-white/10 hover:bg-white/20 text-white border-transparent"
            onClick={() => navigate('/super-admin/hotels')}
          >
            All Hotels
          </Button>
          <Button 
            variant="primary" 
            iconLeft={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/onboarding')}
          >
            New Hotel Onboarding
          </Button>
        </div>
      </div>

      {/* High-level metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Hotels"
          value={stats.total}
          icon={<HotelIcon className="w-5 h-5 text-blue-600" />}
          change={12}
          changeLabel="vs last quarter"
        />
        <StatCard
          label="Active Properties"
          value={stats.active}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          change={8}
          changeLabel="100% operational"
        />
        <StatCard
          label="Total Rooms"
          value={stats.totalRooms}
          icon={<BedDouble className="w-5 h-5 text-[#c9a84c]" />}
          change={15}
          changeLabel="inventory managed"
        />
        <StatCard
          label="Total Users & Staff"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          change={5}
          changeLabel="across 9 roles"
        />
      </div>

      {/* Middle row: Status Breakdown & Platform Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hotel status distribution */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader title="Tenant Lifecycle States" description="Properties by current deployment status" />
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-950">Active Production</span>
              </div>
              <span className="font-bold text-emerald-900">{stats.active}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-blue-950">Trial Period</span>
              </div>
              <span className="font-bold text-blue-900">{stats.trial}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-950">Setup & Onboarding</span>
              </div>
              <span className="font-bold text-amber-900">{stats.setup}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-sm font-medium text-rose-950">Suspended / Inactive</span>
              </div>
              <span className="font-bold text-rose-900">{stats.suspended}</span>
            </div>
          </CardContent>
        </Card>

        {/* Managed Hotels quick overview */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader 
            title="Managed Hotel Tenants" 
            description="Overview of onboarded properties and operational metrics"
            action={
              <button 
                onClick={() => navigate('/super-admin/hotels')}
                className="text-xs font-semibold text-[#c9a84c] hover:underline flex items-center gap-1"
              >
                View Details <ExternalLink className="w-3 h-3" />
              </button>
            }
          />
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="pb-3">Property</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Rooms</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {hotels.map(h => {
                    const sub = subscriptions.find(s => s.hotel_id === h.id);
                    return (
                      <tr key={h.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5">
                          <div className="font-semibold text-stone-900">{h.name}</div>
                          <div className="text-xs text-stone-500">{h.legal_name || h.type}</div>
                        </td>
                        <td className="py-3.5 text-stone-600">
                          {h.city}, {h.state}
                        </td>
                        <td className="py-3.5 font-medium text-stone-800">
                          {h.total_rooms} rooms
                        </td>
                        <td className="py-3.5">
                          <HotelStatusBadge status={h.status} />
                        </td>
                        <td className="py-3.5">
                          <Badge variant="secondary" className="font-medium text-xs">
                            {sub?.plan || 'PRO'}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/super-admin/hotels')}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

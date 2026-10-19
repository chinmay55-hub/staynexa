import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { subscriptionService, hotelService } from '../../services/demoDataService';
import { Card, CardContent, CardHeader, Badge, Button, Select, Modal } from '../../components/ui';
import type { SubscriptionPlan, Subscription } from '../../types';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => subscriptionService.getAll());
  const [hotels] = useState(() => hotelService.getAll());
  const [planFilter, setPlanFilter] = useState('ALL');
  
  // Modal state
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('PRO');
  const [editStatus, setEditStatus] = useState<Subscription['status']>('ACTIVE');
  const [successMsg, setSuccessMsg] = useState('');

  const filtered = subscriptions.filter(s => planFilter === 'ALL' || s.plan === planFilter);

  const getPlanBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'ENTERPRISE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">ENTERPRISE</span>;
      case 'PRO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">PRO</span>;
      case 'STARTER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">STARTER</span>;
      case 'FREE_TRIAL':
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-800 border border-stone-300">FREE TRIAL</span>;
    }
  };

  const handleOpenModify = (sub: Subscription) => {
    setSelectedSub(sub);
    setEditPlan(sub.plan);
    setEditStatus(sub.status);
    setIsModifyOpen(true);
  };

  const handleSaveSubscription = () => {
    if (!selectedSub) return;
    subscriptionService.update(selectedSub.id, {
      plan: editPlan,
      status: editStatus,
    });
    setSubscriptions([...subscriptionService.getAll()]);
    setIsModifyOpen(false);
    setSuccessMsg(`Updated subscription tier for ${selectedHotelName || 'property'} to ${editPlan}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const selectedHotelName = selectedSub ? hotels.find(h => h.id === selectedSub.hotel_id)?.name : '';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Tenant Subscriptions</h1>
          <p className="text-stone-500 text-sm">Tier allocations, billing cycles, and feature access tiers across all properties.</p>
        </div>
        <div className="w-48">
          <Select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Plans' },
              { value: 'ENTERPRISE', label: 'Enterprise' },
              { value: 'PRO', label: 'Pro' },
              { value: 'STARTER', label: 'Starter' },
              { value: 'FREE_TRIAL', label: 'Free Trial' },
            ]}
          />
        </div>
      </div>

      {/* Plan summary tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Free Trial</div>
            <div className="text-2xl font-display font-bold text-stone-800 mt-1">14 Days</div>
            <div className="text-xs text-stone-500 mt-1">Basic operations, 15 rooms max</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/20">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Starter</div>
            <div className="text-2xl font-display font-bold text-stone-900 mt-1">₹4,999<span className="text-xs text-stone-500 font-normal">/mo</span></div>
            <div className="text-xs text-stone-500 mt-1">Front desk, folios, up to 25 rooms</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/20">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Pro</div>
            <div className="text-2xl font-display font-bold text-stone-900 mt-1">₹9,999<span className="text-xs text-stone-500 font-normal">/mo</span></div>
            <div className="text-xs text-stone-500 mt-1">KDS, QR ordering, up to 75 rooms</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/20">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Enterprise</div>
            <div className="text-2xl font-display font-bold text-stone-900 mt-1">₹24,999<span className="text-xs text-stone-500 font-normal">/mo</span></div>
            <div className="text-xs text-stone-500 mt-1">Unlimited rooms, channel sync, SLA</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="shadow-sm">
        <CardHeader title="Active Subscriptions Ledger" description="All hotel memberships and active subscription validity periods" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium">
                  <th className="pb-3">Hotel Tenant</th>
                  <th className="pb-3">Subscription Tier</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Billing Cycle Window</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(sub => {
                  const hotel = hotels.find(h => h.id === sub.hotel_id);
                  return (
                    <tr key={sub.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-4">
                        <div className="font-semibold text-stone-900">{hotel?.name || sub.hotel_id}</div>
                        <div className="text-xs text-stone-500">{hotel?.city}, {hotel?.state} · {hotel?.total_rooms} rooms</div>
                      </td>
                      <td className="py-4">
                        {getPlanBadge(sub.plan)}
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-4 text-stone-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{sub.current_period_start || '2024-01-01'} to {sub.current_period_end || '2024-12-31'}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenModify(sub)}
                        >
                          Modify Tier
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

      {/* Modify Tier Modal */}
      {selectedSub && (
        <Modal
          isOpen={isModifyOpen}
          onClose={() => setIsModifyOpen(false)}
          title={`Subscription Tier: ${selectedHotelName}`}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setIsModifyOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveSubscription}>Update Subscription</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                Subscription Plan Tier
              </label>
              <Select
                value={editPlan}
                onChange={e => setEditPlan(e.target.value as SubscriptionPlan)}
                options={[
                  { value: 'FREE_TRIAL', label: 'FREE TRIAL (14 Days, 15 rooms max)' },
                  { value: 'STARTER', label: 'STARTER (₹4,999/mo, 25 rooms max)' },
                  { value: 'PRO', label: 'PRO (₹9,999/mo, 75 rooms, KDS & QR)' },
                  { value: 'ENTERPRISE', label: 'ENTERPRISE (₹24,999/mo, Unlimited rooms)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                Subscription Lifecycle Status
              </label>
              <Select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as Subscription['status'])}
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE (Subscription current)' },
                  { value: 'TRIAL', label: 'TRIAL (Evaluation period)' },
                  { value: 'EXPIRED', label: 'EXPIRED (Payment overdue / lapsed)' },
                  { value: 'CANCELLED', label: 'CANCELLED (Terminated by tenant)' },
                ]}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

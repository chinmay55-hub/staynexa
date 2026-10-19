import React, { useState } from 'react';
import { Shield, Clock, Search, Filter, User, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, Input, Select, Badge } from '../../components/ui';
import { DEMO_ACTIVITY_LOGS, DEMO_HOTELS } from '../../data/demo';

export default function ActivityLogsPage() {
  const [logs] = useState(() => DEMO_ACTIVITY_LOGS);
  const [hotels] = useState(() => DEMO_HOTELS);
  const [search, setSearch] = useState('');
  const [hotelFilter, setHotelFilter] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    const hotel = hotels.find(h => h.id === log.hotel_id);
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.actor_name && log.actor_name.toLowerCase().includes(search.toLowerCase())) ||
      (hotel && hotel.name.toLowerCase().includes(search.toLowerCase()));
    const matchesHotel = hotelFilter === 'ALL' || log.hotel_id === hotelFilter;
    return matchesSearch && matchesHotel;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Platform Activity Audit Trail</h1>
          <p className="text-stone-500 text-sm">Append-only immutable record of critical state transitions, check-ins, and payments.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by action, actor or property..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4 text-stone-400" />}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={hotelFilter}
              onChange={e => setHotelFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Hotel Tenants' },
                ...hotels.map(h => ({ value: h.id, label: h.name })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader 
          title="Security & Operations Event Log" 
          description="Detailed chronological ledger of tenant mutations"
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Tenant</th>
                  <th className="pb-3">Action Type</th>
                  <th className="pb-3">Target Entity</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLogs.map(log => {
                  const hotel = hotels.find(h => h.id === log.hotel_id);
                  return (
                    <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 text-xs text-stone-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-semibold">
                            {log.actor_name?.[0] || 'U'}
                          </div>
                          <span className="font-medium text-stone-900">{log.actor_name || 'System Worker'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-stone-700 font-medium text-xs">
                        {hotel?.name || 'Platform'}
                      </td>
                      <td className="py-3.5">
                        <Badge variant="outline" className="font-mono text-xs font-semibold">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-xs text-stone-600 uppercase">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(-4)})` : ''}
                      </td>
                      <td className="py-3.5 text-right text-xs text-stone-500 font-mono">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
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
  );
}

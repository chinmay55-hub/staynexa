import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, Button, Select } from '../../components/ui';
import { hotelService, featureFlagService } from '../../services/demoDataService';

interface FeatureFlagItem {
  key: string;
  name: string;
  description: string;
  category: 'OPERATIONS' | 'COMMUNICATION' | 'INTEGRATION' | 'AI';
  enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlagItem[] = [
  { key: 'restaurant_module', name: 'Restaurant & POS Module', description: 'Enable menu management, dine-in, and F&B operations', category: 'OPERATIONS', enabled: true },
  { key: 'room_service', name: 'In-Room Dining & Orders', description: 'Allow guests to place room service orders from guest portal', category: 'OPERATIONS', enabled: true },
  { key: 'kitchen_display', name: 'Kitchen Display System (KDS)', description: 'Realtime touch-friendly order queue for kitchen staff', category: 'OPERATIONS', enabled: true },
  { key: 'housekeeping_module', name: 'Housekeeping Task Automation', description: 'Automatic room cleaning workflow on guest checkout', category: 'OPERATIONS', enabled: true },
  { key: 'maintenance_tickets', name: 'Maintenance Dispatch System', description: 'Track equipment breakdowns, assignments, and resolution', category: 'OPERATIONS', enabled: true },
  { key: 'guest_qr_portal', name: 'Guest Mobile QR Experience', description: 'Token-based guest self-service portal without app installation', category: 'COMMUNICATION', enabled: true },
  { key: 'whatsapp_notifications', name: 'WhatsApp Business API Gateway', description: 'Automated booking confirmations and check-in links (Requires Meta API key)', category: 'COMMUNICATION', enabled: false },
  { key: 'digital_checkin', name: 'Contactless Digital Pre-Checkin', description: 'Guests upload Aadhaar/Passport prior to arrival', category: 'OPERATIONS', enabled: true },
  { key: 'ota_channel_sync', name: 'OTA Channel Manager Engine', description: 'Sync rates & availability with MMT, Goibibo, Booking.com (Requires channel manager API)', category: 'INTEGRATION', enabled: false },
  { key: 'custom_domains', name: 'White-Label Custom Subdomains', description: 'Enable hotel-branded domain hostnames (e.g. portal.grandpalace.com)', category: 'INTEGRATION', enabled: true },
  { key: 'ai_concierge', name: 'AI Guest Concierge Agent', description: 'Automated conversational recommendations and concierge answers (Beta)', category: 'AI', enabled: false },
];

export default function FeatureFlagsPage() {
  const [selectedHotel, setSelectedHotel] = useState<string>('GLOBAL');
  const [hotels] = useState(() => hotelService.getAll());
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [flags, setFlags] = useState<FeatureFlagItem[]>(() => {
    const scopeMap = featureFlagService.getFlagsForScope('GLOBAL');
    return DEFAULT_FLAGS.map(f => ({
      ...f,
      enabled: scopeMap[f.key] !== undefined ? scopeMap[f.key] : f.enabled,
    }));
  });

  // Reload when scope changes
  React.useEffect(() => {
    const scopeMap = featureFlagService.getFlagsForScope(selectedHotel);
    setFlags(DEFAULT_FLAGS.map(f => ({
      ...f,
      enabled: scopeMap[f.key] !== undefined ? scopeMap[f.key] : f.enabled,
    })));
  }, [selectedHotel]);

  const toggleFlag = (key: string) => {
    setFlags(prev => prev.map(f => {
      if (f.key === key) {
        const next = !f.enabled;
        featureFlagService.setFlag(selectedHotel, key, next);
        return { ...f, enabled: next };
      }
      return f;
    }));
  };

  const handleSave = () => {
    const map: Record<string, boolean> = {};
    flags.forEach(f => { map[f.key] = f.enabled; });
    featureFlagService.saveFlagsForScope(selectedHotel, map);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Platform Feature Flags</h1>
          <p className="text-stone-500 text-sm">Control runtime module availability globally or scoped to specific properties.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select
              value={selectedHotel}
              onChange={e => setSelectedHotel(e.target.value)}
              options={[
                { value: 'GLOBAL', label: 'Global (All Tenants)' },
                ...hotels.map(h => ({ value: h.id, label: h.name })),
              ]}
            />
          </div>
          <Button variant="primary" onClick={handleSave}>
            {saveFeedback ? 'Changes Saved!' : 'Save Flags'}
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 text-sm">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Tenant Isolation Note:</span> Flags toggled under "Global" set baseline defaults. Setting a flag for a specific property overrides the platform default specifically for that property's tenant context.
        </div>
      </div>

      <div className="space-y-4">
        {['OPERATIONS', 'COMMUNICATION', 'INTEGRATION', 'AI'].map(cat => {
          const categoryFlags = flags.filter(f => f.category === cat);
          return (
            <Card key={cat} className="shadow-sm">
              <CardHeader 
                title={`${cat} FEATURES`} 
                description={`Core modular controls governing ${cat.toLowerCase()} subsystems.`}
              />
              <CardContent className="divide-y divide-stone-100 p-0">
                {categoryFlags.map(flag => (
                  <div key={flag.key} className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-900">{flag.name}</span>
                        <code className="text-[11px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                          {flag.key}
                        </code>
                      </div>
                      <p className="text-xs text-stone-500">{flag.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFlag(flag.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:ring-offset-2 ${
                        flag.enabled ? 'bg-[#c9a84c]' : 'bg-stone-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          flag.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

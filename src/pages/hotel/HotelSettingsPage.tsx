import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Wifi, 
  Receipt, 
  FileText, 
  Check, 
  Eye, 
  EyeOff,
  Building2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hotelService } from '../../services/demoDataService';
import type { Hotel, HotelBranding, HotelSettings } from '../../types';
import { Card, CardContent, CardHeader, Button, Input } from '../../components/ui';

export default function HotelSettingsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'BRANDING' | 'WIFI' | 'BILLING' | 'POLICIES'>('GENERAL');
  const [hotel, setHotel] = useState<Hotel>(() => hotelService.getById(hotelId)!);
  const [branding, setBranding] = useState<HotelBranding>(() => hotelService.getBranding(hotelId) || {
    id: 'b-1',
    hotel_id: hotelId,
    primary_color: '#1a3a5c',
    accent_color: '#c9a84c',
    tagline: 'Where Luxury Meets Legacy'
  });
  const [settings, setSettings] = useState<HotelSettings>(() => hotelService.getSettings(hotelId) || {
    id: 's-1',
    hotel_id: hotelId,
    wifi_name: 'GrandPalace_Guest',
    wifi_password: 'WelcomeGP2024',
    default_tax_percent: 18,
    service_charge_percent: 10,
    invoice_prefix: 'GP',
    allow_room_charge: true,
    require_deposit: true,
    deposit_percent: 20
  });

  const [showWifiPass, setShowWifiPass] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    hotelService.update(hotelId, hotel);
    hotelService.updateBranding(hotelId, branding);
    hotelService.updateSettings(hotelId, settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Hotel Properties & Configuration</h1>
          <p className="text-stone-500 text-sm">Fine-tune branding, guest Wi-Fi credentials, GST rates, and operating policies.</p>
        </div>
        <Button variant="primary" onClick={handleSave}>
          {saveSuccess ? 'Settings Saved!' : 'Save Configuration'}
        </Button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200">
        {[
          { id: 'GENERAL', label: 'General Info', icon: Building2 },
          { id: 'BRANDING', label: 'White-Label Branding', icon: Palette },
          { id: 'WIFI', label: 'Guest Wi-Fi', icon: Wifi },
          { id: 'BILLING', label: 'GST & Billing Rates', icon: Receipt },
          { id: 'POLICIES', label: 'Policies & House Rules', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-[#c9a84c] text-stone-900 font-bold' 
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'GENERAL' && (
        <Card className="shadow-xs">
          <CardHeader title="General Hotel Information" description="Official property profile and check-in/out operating hours" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Property Display Name"
                value={hotel.name}
                onChange={e => setHotel({ ...hotel, name: e.target.value })}
              />
              <Input
                label="Legal Business Name (For Invoices)"
                value={hotel.legal_name || ''}
                onChange={e => setHotel({ ...hotel, legal_name: e.target.value })}
              />
              <Input
                label="Phone Number"
                value={hotel.phone}
                onChange={e => setHotel({ ...hotel, phone: e.target.value })}
              />
              <Input
                label="Reservations Email"
                value={hotel.email}
                onChange={e => setHotel({ ...hotel, email: e.target.value })}
              />
              <Input
                label="Standard Check-In Time"
                value={hotel.check_in_time}
                onChange={e => setHotel({ ...hotel, check_in_time: e.target.value })}
              />
              <Input
                label="Standard Check-Out Time"
                value={hotel.check_out_time}
                onChange={e => setHotel({ ...hotel, check_out_time: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'BRANDING' && (
        <Card className="shadow-xs">
          <CardHeader title="White-Label Guest Portal Styling" description="Colors, logos, and custom slogans displayed on guest QR portals" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-10 h-10 rounded border border-stone-300 cursor-pointer p-0.5"
                    value={branding.primary_color}
                    onChange={e => setBranding({ ...branding, primary_color: e.target.value })}
                  />
                  <Input
                    value={branding.primary_color}
                    onChange={e => setBranding({ ...branding, primary_color: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Accent Gold Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-10 h-10 rounded border border-stone-300 cursor-pointer p-0.5"
                    value={branding.accent_color}
                    onChange={e => setBranding({ ...branding, accent_color: e.target.value })}
                  />
                  <Input
                    value={branding.accent_color}
                    onChange={e => setBranding({ ...branding, accent_color: e.target.value })}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Hotel Slogan / Tagline"
                  value={branding.tagline || ''}
                  placeholder="e.g. Where Heritage Meets Modern Luxury"
                  onChange={e => setBranding({ ...branding, tagline: e.target.value })}
                />
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="p-4 rounded-xl border border-stone-200 mt-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Live Portal Header Preview</span>
              <div 
                className="p-5 rounded-lg text-white flex justify-between items-center"
                style={{ backgroundColor: branding.primary_color }}
              >
                <div>
                  <h3 className="font-display font-bold text-lg">{hotel.name}</h3>
                  <p className="text-xs opacity-80" style={{ color: branding.accent_color }}>{branding.tagline || 'One Stay. One Platform.'}</p>
                </div>
                <div 
                  className="px-3 py-1.5 rounded text-xs font-bold"
                  style={{ backgroundColor: branding.accent_color, color: '#1a2744' }}
                >
                  Room 101 Portal
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'WIFI' && (
        <Card className="shadow-xs">
          <CardHeader title="Guest Wi-Fi Setup" description="Shown in the guest portal with one-click credential copy" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="SSID / Wi-Fi Network Name"
                value={settings.wifi_name || ''}
                placeholder="e.g. GrandPalace_Guest"
                onChange={e => setSettings({ ...settings, wifi_name: e.target.value })}
              />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Guest Wi-Fi Password
                </label>
                <div className="relative">
                  <Input
                    type={showWifiPass ? 'text' : 'password'}
                    value={settings.wifi_password || ''}
                    onChange={e => setSettings({ ...settings, wifi_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWifiPass(!showWifiPass)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    {showWifiPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'BILLING' && (
        <Card className="shadow-xs">
          <CardHeader title="Taxes & Invoicing Rules" description="Indian GST rates, invoice numbering prefix, and deposit policies" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Invoice Prefix"
                value={settings.invoice_prefix}
                placeholder="e.g. GP"
                onChange={e => setSettings({ ...settings, invoice_prefix: e.target.value })}
              />
              <Input
                label="Default GST Rate (%)"
                type="number"
                value={settings.default_tax_percent}
                onChange={e => setSettings({ ...settings, default_tax_percent: Number(e.target.value) })}
              />
              <Input
                label="Service Charge (%)"
                type="number"
                value={settings.service_charge_percent}
                onChange={e => setSettings({ ...settings, service_charge_percent: Number(e.target.value) })}
              />
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-stone-900 block">Allow In-Room Guest Charges</span>
                <span className="text-xs text-stone-500">Enable food orders and service requests to post directly to the guest folio ledger.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_room_charge}
                onChange={e => setSettings({ ...settings, allow_room_charge: e.target.checked })}
                className="w-5 h-5 accent-[#c9a84c] rounded cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'POLICIES' && (
        <Card className="shadow-xs">
          <CardHeader title="Hotel Policies & House Rules" description="Displayed in the guest digital portal during their stay" />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Check-in & Identification Policy
              </label>
              <textarea
                rows={3}
                className="w-full p-3 rounded-lg border border-stone-200 text-xs focus:ring-2 focus:ring-[#c9a84c] focus:outline-none"
                defaultValue="Valid government-issued photo ID (Aadhaar / Passport / Driving License) required for all adult guests at check-in. PAN cards are not accepted as proof of address under local law."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Cancellation & Refund Terms
              </label>
              <textarea
                rows={3}
                className="w-full p-3 rounded-lg border border-stone-200 text-xs focus:ring-2 focus:ring-[#c9a84c] focus:outline-none"
                defaultValue="Free cancellation up to 48 hours prior to arrival date. Late cancellations or no-shows incur a 1-night room charge."
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

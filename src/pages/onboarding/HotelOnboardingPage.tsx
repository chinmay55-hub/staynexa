import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  RotateCcw,
  FileText
} from 'lucide-react';
import { 
  hotelService, 
  roomService, 
  staffService, 
  qrService, 
  serviceRequestService
} from '../../services/demoDataService';
import type { Hotel, RoomType } from '../../types';
import { Button, Input, Card, CardContent } from '../../components/ui';
import { realtimeSync } from '../../services/realtimeSync';

const STEPS = [
  'Hotel Info',
  'Branding',
  'Configuration',
  'Room Types',
  'Rooms',
  'Departments',
  'Admin User',
  'Services',
  'Restaurant',
  'QR Setup',
  'Review',
  'Activate',
];

export default function HotelOnboardingPage() {
  const navigate = useNavigate();
  const { hotelId } = useParams();

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [hotelInfo, setHotelInfo] = useState({
    name: 'The Royal Haveli Heritage',
    legal_name: 'Haveli Hospitality Group LLP',
    type: 'HOTEL' as Hotel['type'],
    address: 'Circular Road, Near Clock Tower',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    pin_code: '302001',
    phone: '+91 141 2345678',
    email: 'contact@royalhaveli.in',
    gstin: '08AABCR1234F1Z9',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    check_in_time: '14:00',
    check_out_time: '12:00',
  });

  const [branding, setBranding] = useState({
    primary_color: '#8b263e',
    accent_color: '#e5b358',
    tagline: 'Timeless Royal Heritage in the Pink City',
  });

  const [config, setConfig] = useState({
    wifi_name: 'RoyalHaveli_Guest',
    wifi_password: 'Haveli@Stay2024',
    invoice_prefix: 'RH',
    default_tax_percent: 18,
    service_charge_percent: 5,
    allow_room_charge: true,
  });

  const [roomTypes, setRoomTypes] = useState([
    { name: 'Heritage Deluxe Room', code: 'HDR', rate: 5500, max_adults: 2, amenities: 'AC, WiFi, Mini Bar, Safe' },
    { name: 'Maharaja Suite', code: 'MHS', rate: 14000, max_adults: 3, amenities: 'AC, WiFi, Jacuzzi, Living Room, Butler' },
  ]);

  const [rooms, setRooms] = useState([
    { number: '101', floor: 1, type_code: 'HDR' },
    { number: '102', floor: 1, type_code: 'HDR' },
    { number: '201', floor: 2, type_code: 'MHS' },
    { number: '202', floor: 2, type_code: 'MHS' },
  ]);

  const [departments, setDepartments] = useState([
    { name: 'Front Desk', code: 'FD' },
    { name: 'Housekeeping', code: 'HK' },
    { name: 'Restaurant & Kitchen', code: 'FB' },
    { name: 'Engineering Maintenance', code: 'ENG' },
  ]);

  const [adminUser, setAdminUser] = useState({
    full_name: 'Rajendra Singh',
    email: 'rajendra@royalhaveli.in',
    phone: '+91 98290 12345',
    password: 'password123',
  });

  const [services, setServices] = useState([
    { name: 'Extra Towels & Linens', category: 'Housekeeping' },
    { name: 'Daily Room Cleaning', category: 'Housekeeping' },
    { name: 'Airport / Station Pickup', category: 'Transport' },
    { name: 'Heritage Walking Tour', category: 'Concierge' },
  ]);

  const [restaurant, setRestaurant] = useState({
    name: 'Darbar Fine Dining & Rooftop',
    open_time: '07:00',
    close_time: '23:30',
  });

  const [autoGenerateQrs, setAutoGenerateQrs] = useState(true);
  const [activatedHotelId, setActivatedHotelId] = useState<string | null>(null);


  // Manual addition & editing forms state
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [newRoomType, setNewRoomType] = useState({ name: '', code: '', rate: 4500, max_adults: 2, amenities: 'AC, WiFi' });

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: '', floor: 1, type_code: '' });

  const [showAddDept, setShowAddDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '' });

  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: '', category: 'Housekeeping' });

  const handleStartBlank = () => {
    setHotelInfo({
      name: '',
      legal_name: '',
      type: 'HOTEL',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pin_code: '',
      phone: '',
      email: '',
      gstin: '',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      check_in_time: '14:00',
      check_out_time: '12:00',
    });
    setBranding({
      primary_color: '#1a2744',
      accent_color: '#c9a84c',
      tagline: '',
    });
    setConfig({
      wifi_name: '',
      wifi_password: '',
      invoice_prefix: 'HTL',
      default_tax_percent: 18,
      service_charge_percent: 5,
      allow_room_charge: true,
    });
    setRoomTypes([]);
    setRooms([]);
    setDepartments([
      { name: 'Front Desk', code: 'FD' },
      { name: 'Housekeeping', code: 'HK' },
      { name: 'Restaurant & Kitchen', code: 'FB' },
    ]);
    setAdminUser({ full_name: '', email: '', phone: '', password: '' });
    setServices([]);
    setRestaurant({ name: '', open_time: '07:00', close_time: '23:00' });
  };

  const handleLoadDemoPreset = () => {
    setHotelInfo({
      name: 'The Royal Haveli Heritage',
      legal_name: 'Haveli Hospitality Group LLP',
      type: 'HOTEL',
      address: 'Circular Road, Near Clock Tower',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      pin_code: '302001',
      phone: '+91 141 2345678',
      email: 'contact@royalhaveli.in',
      gstin: '08AABCR1234F1Z9',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      check_in_time: '14:00',
      check_out_time: '12:00',
    });
    setBranding({
      primary_color: '#8b263e',
      accent_color: '#e5b358',
      tagline: 'Timeless Royal Heritage in the Pink City',
    });
    setConfig({
      wifi_name: 'RoyalHaveli_Guest',
      wifi_password: 'Haveli@Stay2024',
      invoice_prefix: 'RH',
      default_tax_percent: 18,
      service_charge_percent: 5,
      allow_room_charge: true,
    });
    setRoomTypes([
      { name: 'Heritage Deluxe Room', code: 'HDR', rate: 5500, max_adults: 2, amenities: 'AC, WiFi, Mini Bar, Safe' },
      { name: 'Maharaja Suite', code: 'MHS', rate: 14000, max_adults: 3, amenities: 'AC, WiFi, Jacuzzi, Living Room, Butler' },
    ]);
    setRooms([
      { number: '101', floor: 1, type_code: 'HDR' },
      { number: '102', floor: 1, type_code: 'HDR' },
      { number: '201', floor: 2, type_code: 'MHS' },
      { number: '202', floor: 2, type_code: 'MHS' },
    ]);
    setDepartments([
      { name: 'Front Desk', code: 'FD' },
      { name: 'Housekeeping', code: 'HK' },
      { name: 'Restaurant & Kitchen', code: 'FB' },
      { name: 'Engineering Maintenance', code: 'ENG' },
    ]);
    setAdminUser({
      full_name: 'Rajendra Singh',
      email: 'rajendra@royalhaveli.in',
      phone: '+91 98290 12345',
      password: 'password123',
    });
    setServices([
      { name: 'Extra Towels & Linens', category: 'Housekeeping' },
      { name: 'Daily Room Cleaning', category: 'Housekeeping' },
      { name: 'Airport / Station Pickup', category: 'Transport' },
      { name: 'Heritage Walking Tour', category: 'Concierge' },
    ]);
    setRestaurant({
      name: 'Darbar Fine Dining & Rooftop',
      open_time: '07:00',
      close_time: '23:30',
    });
  };

  // Restore existing hotel data if hotelId param is present, otherwise load draft
  const restoreOnboardingState = () => {
    if (hotelId) {
      const existing = hotelService.getById(hotelId);
      if (existing) {
        setHotelInfo({
          name: existing.name,
          legal_name: existing.legal_name || '',
          type: existing.type || 'HOTEL',
          address: existing.address || '',
          city: existing.city || '',
          state: existing.state || '',
          country: existing.country || 'India',
          pin_code: existing.pin_code || '',
          phone: existing.phone || '',
          email: existing.email || '',
          gstin: existing.gstin || '',
          currency: existing.currency || 'INR',
          timezone: existing.timezone || 'Asia/Kolkata',
          check_in_time: existing.check_in_time || '14:00',
          check_out_time: existing.check_out_time || '12:00',
        });
        const existingBranding = hotelService.getBranding(hotelId);
        if (existingBranding) {
          setBranding({
            primary_color: existingBranding.primary_color,
            accent_color: existingBranding.accent_color,
            tagline: existingBranding.tagline || '',
          });
        }
        const existingSettings = hotelService.getSettings(hotelId);
        if (existingSettings) {
          setConfig({
            wifi_name: existingSettings.wifi_name || '',
            wifi_password: existingSettings.wifi_password || '',
            invoice_prefix: existingSettings.invoice_prefix || 'INV',
            default_tax_percent: existingSettings.default_tax_percent || 18,
            service_charge_percent: existingSettings.service_charge_percent || 5,
            allow_room_charge: existingSettings.allow_room_charge ?? true,
          });
        }
        const existingRoomTypes = roomService.getTypes(hotelId);
        if (existingRoomTypes.length > 0) {
          setRoomTypes(existingRoomTypes.map(rt => ({
            name: rt.name,
            code: rt.code,
            rate: rt.base_rate,
            max_adults: rt.max_adults,
            amenities: (rt.amenities || []).join(', '),
          })));
        }
        const existingRooms = roomService.getAll(hotelId);
        if (existingRooms.length > 0) {
          setRooms(existingRooms.map(r => ({
            number: r.number,
            floor: r.floor || 1,
            type_code: existingRoomTypes.find(rt => rt.id === r.room_type_id)?.code || 'STD',
          })));
        }
        const existingDepts = staffService.getDepartments(hotelId);
        if (existingDepts.length > 0) {
          setDepartments(existingDepts.map(d => ({
            name: d.name,
            code: d.code,
          })));
        }
        return;
      }
    }

    try {
      const saved = localStorage.getItem('staynexa_onboarding_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hotelInfo) setHotelInfo(parsed.hotelInfo);
        if (parsed.branding) setBranding(parsed.branding);
        if (parsed.config) setConfig(parsed.config);
      }
    } catch {}
  };

  const restoreKey = hotelId ?? '';
  const [appliedRestoreKey, setAppliedRestoreKey] = useState<string | null>(null);
  if (appliedRestoreKey !== restoreKey) {
    setAppliedRestoreKey(restoreKey);
    restoreOnboardingState();
  }

  const saveDraft = () => {
    try {
      localStorage.setItem('staynexa_onboarding_draft', JSON.stringify({
        hotelInfo,
        branding,
        config,
        roomTypes,
        rooms,
      }));
    } catch {}
  };

  const handleNext = () => {
    saveDraft();
    setCurrentStep(prev => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleActivate = () => {
    let targetHotelId = hotelId;

    if (targetHotelId) {
      // Update existing Hotel Tenant
      hotelService.update(targetHotelId, {
        ...hotelInfo,
        total_rooms: rooms.length,
        updated_at: new Date().toISOString(),
      });
    } else {
      // 1. Create Hotel Tenant
      const newHotel = hotelService.create({
        ...hotelInfo,
        slug: hotelInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        status: 'ACTIVE',
        total_rooms: rooms.length,
      });
      targetHotelId = newHotel.id;
    }

    // 2. Set Branding & Settings
    hotelService.updateBranding(targetHotelId, {
      hotel_id: targetHotelId,
      ...branding,
    });

    hotelService.updateSettings(targetHotelId, {
      hotel_id: targetHotelId,
      ...config,
    });

    // 3. Create Room Types
    const existingTypes = roomService.getTypes(targetHotelId);
    const createdTypes: { [code: string]: RoomType } = {};
    existingTypes.forEach(rt => { createdTypes[rt.code] = rt; });

    roomTypes.forEach(rt => {
      if (!createdTypes[rt.code]) {
        const created = roomService.createType({
          hotel_id: targetHotelId!,
          name: rt.name,
          code: rt.code,
          base_rate: rt.rate,
          max_adults: rt.max_adults,
          max_children: 1,
          amenities: rt.amenities.split(',').map(s => s.trim()),
          images: [],
          is_active: true,
        });
        createdTypes[rt.code] = created;
      }
    });

    // 4. Create Rooms
    const existingRooms = roomService.getAll(targetHotelId);
    rooms.forEach(r => {
      const roomType = createdTypes[r.type_code] || Object.values(createdTypes)[0];
      const alreadyExists = existingRooms.some(ex => ex.number === r.number);
      if (!alreadyExists && roomType) {
        const createdRoom = roomService.create({
          hotel_id: targetHotelId!,
          number: r.number,
          floor: r.floor,
          room_type_id: roomType.id,
          status: 'AVAILABLE',
          housekeeping_status: 'CLEAN',
          is_active: true,
        });

        // 5. Generate QRs
        if (autoGenerateQrs) {
          qrService.generate(targetHotelId!, createdRoom.id);
        }
      }
    });

    // 6. Create Departments
    const existingDepts = staffService.getDepartments(targetHotelId);
    departments.forEach(d => {
      if (!existingDepts.some(ed => ed.code.toLowerCase() === d.code.toLowerCase())) {
        staffService.createDepartment({
          hotel_id: targetHotelId!,
          name: d.name,
          code: d.code,
          description: `${d.name} Department`,
        });
      }
    });

    // 7. Create Primary Admin User
    if (adminUser.email) {
      let adminProfile = staffService.getByEmail(adminUser.email);
      if (!adminProfile) {
        adminProfile = staffService.createProfile({
          full_name: adminUser.full_name || 'Hotel Admin',
          email: adminUser.email,
          phone: adminUser.phone || '',
          role: 'HOTEL_ADMIN',
          is_active: true,
        });
      }
            const existingMemberships = staffService.getAllMemberships();
      if (!existingMemberships.some(m => m.user_id === adminProfile!.user_id && m.hotel_id === targetHotelId)) {
        staffService.createMembership({
          hotel_id: targetHotelId!,
          user_id: adminProfile.user_id,
          role: 'HOTEL_ADMIN',
          is_active: true,
        });
      }

      // Save custom admin credentials for instant login across all devices
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const customCreds = JSON.parse(localStorage.getItem('staynexa_custom_credentials') || '{}');
          customCreds[adminUser.email.toLowerCase().trim()] = {
            password: adminUser.password || 'password123',
            userId: adminProfile.user_id,
            role: 'HOTEL_ADMIN',
            hotelId: targetHotelId,
            fullName: adminUser.full_name || 'Hotel Admin',
          };
          localStorage.setItem('staynexa_custom_credentials', JSON.stringify(customCreds));
        } catch {}
      }

      // Emit real-time notification
      realtimeSync.emit('NEW_NOTIFICATION', {
        notification: {
          id: `notif-${Date.now()}`,
          hotel_id: targetHotelId,
          user_id: adminProfile.user_id,
          type: 'SYSTEM',
          title: 'Hotel Onboarded & Credentials Active',
          message: `Property ${hotelInfo.name} activated with login ${adminUser.email}`,
          is_read: false,
          created_at: new Date().toISOString(),
        }
      });
    }

    // 8. Provision Initial Services
    const existingServices = serviceRequestService.getServices(targetHotelId);
    services.forEach(s => {
      if (!existingServices.some(es => es.name.toLowerCase() === s.name.toLowerCase())) {
        serviceRequestService.createService({
          hotel_id: targetHotelId!,
          name: s.name,
          category: s.category.toUpperCase(),
          is_available: true,
          requires_scheduling: false,
        });
      }
    });

    setActivatedHotelId(targetHotelId);
    localStorage.removeItem('staynexa_onboarding_draft');
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c9a84c] flex items-center justify-center text-white font-bold font-display shadow-sm">
              SN
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-stone-900">Hotel Onboarding Wizard</h1>
              <p className="text-xs text-stone-500">Zero-code multi-tenant property setup & instant activation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartBlank}
              iconLeft={<RotateCcw className="w-3.5 h-3.5 text-stone-600" />}
              title="Clear all prefilled defaults and enter your hotel details from scratch"
            >
              Start Blank
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDemoPreset}
              iconLeft={<FileText className="w-3.5 h-3.5 text-stone-600" />}
              title="Load sample hotel preset"
            >
              Load Demo Preset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')}>
              Cancel & Exit
            </Button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 overflow-x-auto pb-1 gap-4">
            {STEPS.map((step, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step} className="flex items-center gap-2 whitespace-nowrap">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    isPast ? 'bg-emerald-600 text-white' :
                    isCurrent ? 'bg-[#c9a84c] text-white' : 'bg-stone-100 text-stone-400'
                  }`}>
                    {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className={isCurrent ? 'text-stone-900 font-bold' : isPast ? 'text-stone-700' : 'text-stone-400'}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Card */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            {/* STEP 0: HOTEL INFO */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 1: Hotel Identification & Location</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Hotel Display Name"
                    required
                    value={hotelInfo.name}
                    onChange={e => setHotelInfo({ ...hotelInfo, name: e.target.value })}
                  />
                  <Input
                    label="Legal Corporate Name (For Invoices)"
                    value={hotelInfo.legal_name}
                    onChange={e => setHotelInfo({ ...hotelInfo, legal_name: e.target.value })}
                  />
                  <Input
                    label="Official Contact Phone"
                    required
                    value={hotelInfo.phone}
                    onChange={e => setHotelInfo({ ...hotelInfo, phone: e.target.value })}
                  />
                  <Input
                    label="Reservations Email"
                    required
                    type="email"
                    value={hotelInfo.email}
                    onChange={e => setHotelInfo({ ...hotelInfo, email: e.target.value })}
                  />
                  <Input
                    label="City"
                    required
                    value={hotelInfo.city}
                    onChange={e => setHotelInfo({ ...hotelInfo, city: e.target.value })}
                  />
                  <Input
                    label="State"
                    value={hotelInfo.state}
                    onChange={e => setHotelInfo({ ...hotelInfo, state: e.target.value })}
                  />
                  <Input
                    label="GSTIN Number"
                    placeholder="e.g. 08AABCR1234F1Z9"
                    value={hotelInfo.gstin}
                    onChange={e => setHotelInfo({ ...hotelInfo, gstin: e.target.value })}
                  />
                  <Input
                    label="Postal PIN Code"
                    value={hotelInfo.pin_code}
                    onChange={e => setHotelInfo({ ...hotelInfo, pin_code: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 1: BRANDING */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 2: White-Label Guest Portal Styling</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Primary Theme Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={e => setBranding({ ...branding, primary_color: e.target.value })}
                        className="w-10 h-10 rounded border border-stone-300 cursor-pointer p-0.5"
                      />
                      <Input
                        value={branding.primary_color}
                        onChange={e => setBranding({ ...branding, primary_color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Accent Gold Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={e => setBranding({ ...branding, accent_color: e.target.value })}
                        className="w-10 h-10 rounded border border-stone-300 cursor-pointer p-0.5"
                      />
                      <Input
                        value={branding.accent_color}
                        onChange={e => setBranding({ ...branding, accent_color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Hotel Tagline / Welcome Slogan"
                      value={branding.tagline}
                      onChange={e => setBranding({ ...branding, tagline: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CONFIGURATION */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 3: Wi-Fi & Billing Parameters</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Guest Wi-Fi Network Name (SSID)"
                    value={config.wifi_name}
                    onChange={e => setConfig({ ...config, wifi_name: e.target.value })}
                  />
                  <Input
                    label="Guest Wi-Fi Password"
                    value={config.wifi_password}
                    onChange={e => setConfig({ ...config, wifi_password: e.target.value })}
                  />
                  <Input
                    label="Invoice Prefix Code"
                    value={config.invoice_prefix}
                    onChange={e => setConfig({ ...config, invoice_prefix: e.target.value })}
                  />
                  <Input
                    label="Default GST Tax Rate (%)"
                    type="number"
                    value={config.default_tax_percent}
                    onChange={e => setConfig({ ...config, default_tax_percent: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: ROOM TYPES */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold font-display text-stone-900">Step 4: Room Categories & Nightly Rates</h2>
                    <p className="text-xs text-stone-500">Edit any category name, rate, or amenities inline, or add custom room types.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    iconLeft={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddRoomType(!showAddRoomType)}
                  >
                    {showAddRoomType ? 'Close Form' : '+ Add Category'}
                  </Button>
                </div>

                {/* Add Category Form */}
                {showAddRoomType && (
                  <div className="p-4 rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/5 space-y-3">
                    <div className="font-bold text-xs uppercase text-[#c9a84c] tracking-wider">New Room Category</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Category Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Presidential Suite"
                          value={newRoomType.name}
                          onChange={e => setNewRoomType({ ...newRoomType, name: e.target.value })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Code</label>
                        <input
                          type="text"
                          placeholder="e.g. PRS"
                          value={newRoomType.code}
                          onChange={e => setNewRoomType({ ...newRoomType, code: e.target.value.toUpperCase() })}
                          className="w-full text-sm font-mono uppercase bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Nightly Rate (₹)</label>
                        <input
                          type="number"
                          value={newRoomType.rate}
                          onChange={e => setNewRoomType({ ...newRoomType, rate: Number(e.target.value) })}
                          className="w-full text-sm font-bold bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Max Adults</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newRoomType.max_adults}
                          onChange={e => setNewRoomType({ ...newRoomType, max_adults: Number(e.target.value) })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Amenities (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="AC, WiFi, Mini Bar, Safe, Bathtub"
                          value={newRoomType.amenities}
                          onChange={e => setNewRoomType({ ...newRoomType, amenities: e.target.value })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddRoomType(false)}>Cancel</Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!newRoomType.name) return;
                          const code = newRoomType.code || newRoomType.name.substring(0, 3).toUpperCase();
                          setRoomTypes([...roomTypes, { ...newRoomType, code }]);
                          setNewRoomType({ name: '', code: '', rate: 4500, max_adults: 2, amenities: 'AC, WiFi' });
                          setShowAddRoomType(false);
                        }}
                      >
                        Save Category
                      </Button>
                    </div>
                  </div>
                )}

                {/* Categories List */}
                <div className="space-y-3">
                  {roomTypes.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-sm">
                      No room categories added yet. Click &quot;+ Add Category&quot; above to create one.
                    </div>
                  ) : (
                    roomTypes.map((rt, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:border-stone-300 transition-colors space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <input
                              type="text"
                              value={rt.name}
                              onChange={e => {
                                const list = [...roomTypes];
                                list[idx].name = e.target.value;
                                setRoomTypes(list);
                              }}
                              className="font-bold text-base text-stone-900 bg-white border border-stone-300 rounded px-2 py-1 flex-1 outline-none focus:border-[#c9a84c]"
                              placeholder="Category Name"
                            />
                            <input
                              type="text"
                              value={rt.code}
                              onChange={e => {
                                const list = [...roomTypes];
                                list[idx].code = e.target.value.toUpperCase();
                                setRoomTypes(list);
                              }}
                              className="w-16 font-mono text-xs uppercase text-center bg-white border border-stone-300 rounded px-2 py-1 outline-none focus:border-[#c9a84c]"
                              placeholder="CODE"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 font-bold text-sm text-stone-900">
                              <span>₹</span>
                              <input
                                type="number"
                                value={rt.rate}
                                onChange={e => {
                                  const list = [...roomTypes];
                                  list[idx].rate = Number(e.target.value);
                                  setRoomTypes(list);
                                }}
                                className="w-24 text-right bg-white border border-stone-300 rounded px-2 py-1 font-bold outline-none focus:border-[#c9a84c]"
                              />
                              <span className="text-xs text-stone-500 font-normal">/nt</span>
                            </div>
                            <button
                              onClick={() => setRoomTypes(roomTypes.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Room Type"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-stone-200/60">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-semibold text-stone-500 whitespace-nowrap">Max Adults:</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={rt.max_adults}
                              onChange={e => {
                                const list = [...roomTypes];
                                list[idx].max_adults = Number(e.target.value);
                                setRoomTypes(list);
                              }}
                              className="w-14 text-center text-xs bg-white border border-stone-200 rounded px-1.5 py-0.5 outline-none focus:border-[#c9a84c]"
                            />
                          </div>
                          <div className="sm:col-span-3 flex items-center gap-2">
                            <label className="text-[11px] font-semibold text-stone-500 whitespace-nowrap">Amenities:</label>
                            <input
                              type="text"
                              value={rt.amenities}
                              onChange={e => {
                                const list = [...roomTypes];
                                list[idx].amenities = e.target.value;
                                setRoomTypes(list);
                              }}
                              className="w-full text-xs text-stone-700 bg-white border border-stone-200 rounded px-2 py-0.5 outline-none focus:border-[#c9a84c]"
                              placeholder="AC, WiFi, Mini Bar, Safe..."
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: PHYSICAL ROOMS */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold font-display text-stone-900">Step 5: Physical Rooms Assignment</h2>
                    <p className="text-xs text-stone-500">Assign room numbers, floors, and link each room to a category.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      iconLeft={<Plus className="w-4 h-4" />}
                      onClick={() => setShowAddRoom(!showAddRoom)}
                    >
                      {showAddRoom ? 'Close Form' : '+ Add Room'}
                    </Button>
                  </div>
                </div>

                {/* Add Room Form */}
                {showAddRoom && (
                  <div className="p-4 rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/5 space-y-3">
                    <div className="font-bold text-xs uppercase text-[#c9a84c] tracking-wider">Add Physical Room</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Room Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 101, 201A, Villa-1"
                          value={newRoom.number}
                          onChange={e => setNewRoom({ ...newRoom, number: e.target.value })}
                          className="w-full text-sm font-bold bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Floor Level</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newRoom.floor}
                          onChange={e => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Room Category</label>
                        <select
                          value={newRoom.type_code || roomTypes[0]?.code || ''}
                          onChange={e => setNewRoom({ ...newRoom, type_code: e.target.value })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        >
                          {roomTypes.map(rt => (
                            <option key={rt.code} value={rt.code}>{rt.name} ({rt.code})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddRoom(false)}>Cancel</Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!newRoom.number) return;
                          const typeCode = newRoom.type_code || roomTypes[0]?.code || 'STD';
                          setRooms([...rooms, { number: newRoom.number, floor: newRoom.floor || 1, type_code: typeCode }]);
                          setNewRoom({ number: '', floor: 1, type_code: '' });
                          setShowAddRoom(false);
                        }}
                      >
                        Add Room
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rooms Grid */}
                {rooms.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-sm">
                    No physical rooms configured. Click &quot;+ Add Room&quot; above to add rooms.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {rooms.map((r, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors shadow-2xs space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase text-stone-400">Room</span>
                          <button
                            onClick={() => setRooms(rooms.filter((_, i) => i !== idx))}
                            className="text-stone-300 hover:text-rose-600 transition-colors"
                            title="Remove Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={r.number}
                          onChange={e => {
                            const list = [...rooms];
                            list[idx].number = e.target.value;
                            setRooms(list);
                          }}
                          className="w-full text-center font-extrabold text-lg text-stone-900 bg-stone-50 border border-stone-200 rounded py-1 outline-none focus:border-[#c9a84c]"
                        />
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-stone-500 text-[11px] font-medium">Floor</span>
                          <input
                            type="number"
                            value={r.floor}
                            onChange={e => {
                              const list = [...rooms];
                              list[idx].floor = Number(e.target.value);
                              setRooms(list);
                            }}
                            className="w-12 text-center bg-stone-50 border border-stone-200 rounded py-0.5 outline-none focus:border-[#c9a84c]"
                          />
                        </div>
                        <select
                          value={r.type_code}
                          onChange={e => {
                            const list = [...rooms];
                            list[idx].type_code = e.target.value;
                            setRooms(list);
                          }}
                          className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded py-1 px-1.5 text-stone-700 outline-none focus:border-[#c9a84c]"
                        >
                          {roomTypes.map(rt => (
                            <option key={rt.code} value={rt.code}>{rt.code} - {rt.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: DEPARTMENTS */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold font-display text-stone-900">Step 6: Operational Departments</h2>
                    <p className="text-xs text-stone-500">Configure departments for ticket routing, staff assignment, and operations.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    iconLeft={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddDept(!showAddDept)}
                  >
                    {showAddDept ? 'Close Form' : '+ Add Department'}
                  </Button>
                </div>

                {showAddDept && (
                  <div className="p-4 rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/5 space-y-3">
                    <div className="font-bold text-xs uppercase text-[#c9a84c] tracking-wider">New Department</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Department Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Concierge & Travel Desk"
                          value={newDept.name}
                          onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Code</label>
                        <input
                          type="text"
                          placeholder="e.g. CNC"
                          value={newDept.code}
                          onChange={e => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                          className="w-full text-sm font-mono uppercase bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddDept(false)}>Cancel</Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!newDept.name) return;
                          const code = newDept.code || newDept.name.substring(0, 3).toUpperCase();
                          setDepartments([...departments, { name: newDept.name, code }]);
                          setNewDept({ name: '', code: '' });
                          setShowAddDept(false);
                        }}
                      >
                        Add Department
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {departments.map((d, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={d.code}
                          onChange={e => {
                            const list = [...departments];
                            list[idx].code = e.target.value.toUpperCase();
                            setDepartments(list);
                          }}
                          className="w-16 font-mono text-xs font-bold text-center bg-white border border-stone-300 rounded px-1.5 py-1 uppercase outline-none focus:border-[#c9a84c]"
                        />
                        <input
                          type="text"
                          value={d.name}
                          onChange={e => {
                            const list = [...departments];
                            list[idx].name = e.target.value;
                            setDepartments(list);
                          }}
                          className="font-bold text-sm text-stone-900 bg-white border border-stone-300 rounded px-2 py-1 flex-1 outline-none focus:border-[#c9a84c]"
                        />
                      </div>
                      <button
                        onClick={() => setDepartments(departments.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: HOTEL ADMIN */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 7: Primary Hotel Administrator</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Administrator Full Name"
                    required
                    value={adminUser.full_name}
                    onChange={e => setAdminUser({ ...adminUser, full_name: e.target.value })}
                  />
                  <Input
                    label="Administrator Email (Login ID)"
                    required
                    type="email"
                    value={adminUser.email}
                    onChange={e => setAdminUser({ ...adminUser, email: e.target.value })}
                  />
                  <Input
                    label="Mobile Phone"
                    required
                    value={adminUser.phone}
                    onChange={e => setAdminUser({ ...adminUser, phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 7: SERVICES */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold font-display text-stone-900">Step 8: In-Room & Guest Services</h2>
                    <p className="text-xs text-stone-500">Configure standard services guests can request from the mobile portal.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    iconLeft={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddService(!showAddService)}
                  >
                    {showAddService ? 'Close Form' : '+ Add Service'}
                  </Button>
                </div>

                {showAddService && (
                  <div className="p-4 rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/5 space-y-3">
                    <div className="font-bold text-xs uppercase text-[#c9a84c] tracking-wider">New Guest Service</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Service Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Iron & Ironing Board"
                          value={newService.name}
                          onChange={e => setNewService({ ...newService, name: e.target.value })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">Category</label>
                        <select
                          value={newService.category}
                          onChange={e => setNewService({ ...newService, category: e.target.value })}
                          className="w-full text-sm bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-[#c9a84c] outline-none"
                        >
                          <option value="Housekeeping">Housekeeping</option>
                          <option value="Transport">Transport</option>
                          <option value="Concierge">Concierge</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Dining">Dining</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddService(false)}>Cancel</Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!newService.name) return;
                          setServices([...services, { ...newService }]);
                          setNewService({ name: '', category: 'Housekeeping' });
                          setShowAddService(false);
                        }}
                      >
                        Add Service
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <input
                          type="text"
                          value={s.category}
                          onChange={e => {
                            const list = [...services];
                            list[idx].category = e.target.value;
                            setServices(list);
                          }}
                          className="text-[10px] font-bold text-[#c9a84c] uppercase bg-white border border-stone-200 rounded px-1.5 py-0.5 outline-none focus:border-[#c9a84c]"
                        />
                        <input
                          type="text"
                          value={s.name}
                          onChange={e => {
                            const list = [...services];
                            list[idx].name = e.target.value;
                            setServices(list);
                          }}
                          className="w-full font-bold text-sm text-stone-900 bg-white border border-stone-300 rounded px-2 py-1 outline-none focus:border-[#c9a84c]"
                        />
                      </div>
                      <button
                        onClick={() => setServices(services.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Delete Service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 8: RESTAURANT */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 9: F&B & Dining Configuration</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Restaurant Name"
                    value={restaurant.name}
                    onChange={e => setRestaurant({ ...restaurant, name: e.target.value })}
                  />
                  <Input
                    label="Opening Time"
                    type="time"
                    value={restaurant.open_time}
                    onChange={e => setRestaurant({ ...restaurant, open_time: e.target.value })}
                  />
                  <Input
                    label="Closing Time"
                    type="time"
                    value={restaurant.close_time}
                    onChange={e => setRestaurant({ ...restaurant, close_time: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 9: QR SETUP */}
            {currentStep === 9 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 10: QR Code Generation Automation</h2>
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">Auto-Generate Standees for All Rooms</h3>
                    <p className="text-xs text-stone-500">Automatically provisions unique cryptographic tokens for all {rooms.length} rooms upon activation.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoGenerateQrs}
                    onChange={e => setAutoGenerateQrs(e.target.checked)}
                    className="w-5 h-5 accent-[#c9a84c] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* STEP 10: REVIEW */}
            {currentStep === 10 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 11: Final Tenant Audit Checklist</h2>
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hotel Details: {hotelInfo.name} ({hotelInfo.city}, {hotelInfo.state})
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Room Capacity: {rooms.length} Physical Rooms across {roomTypes.length} Categories
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    GST Tax: {config.default_tax_percent}% with Prefix {config.invoice_prefix}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Guest Portal Wi-Fi: {config.wifi_name}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Admin Account: {adminUser.full_name} ({adminUser.email})
                  </div>
                </div>
              </div>
            )}

            {/* STEP 11: ACTIVATE */}
            {currentStep === 11 && (
              <div className="text-center py-6 space-y-4">
                {activatedHotelId ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-stone-900">Property Successfully Activated!</h2>
                    <p className="text-sm text-stone-600">
                      <strong>{hotelInfo.name}</strong> is now live on StayNexa with all operational modules.
                    </p>
                    <div className="flex justify-center gap-3 pt-3">
                      <Button variant="primary" onClick={() => navigate('/super-admin/hotels')}>
                        View in Super Admin
                      </Button>
                      <Button variant="secondary" onClick={() => navigate('/hotel/dashboard')}>
                        Open Property Dashboard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-stone-900">Ready to Deploy Property Instance</h2>
                    <p className="text-sm text-stone-600 max-w-md mx-auto">
                      Clicking Activate will commit this hotel tenant to the multi-tenant database, provision isolated room inventory, and activate operational dashboards.
                    </p>
                    <Button variant="primary" size="lg" onClick={handleActivate}>
                      Deploy & Activate Hotel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Footer Navigation Buttons */}
            {currentStep < 11 && (
              <div className="flex justify-between items-center pt-6 mt-6 border-t border-stone-200">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  iconLeft={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  iconRight={<ChevronRight className="w-4 h-4" />}
                >
                  {currentStep === 10 ? 'Proceed to Activation' : 'Next Step'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

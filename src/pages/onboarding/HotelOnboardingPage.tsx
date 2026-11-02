import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Sparkles
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
  });

  const [services] = useState([
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

  // Restore existing hotel data if hotelId param is present, otherwise load draft
  useEffect(() => {
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
  }, [hotelId]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c9a84c] flex items-center justify-center text-white font-bold font-display shadow-sm">
              SN
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-stone-900">Hotel Onboarding Wizard</h1>
              <p className="text-xs text-stone-500">Zero-code multi-tenant property setup & instant activation.</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')}>
            Cancel & Exit
          </Button>
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
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold font-display text-stone-900">Step 4: Room Categories & Nightly Rates</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRoomTypes([...roomTypes, { name: 'Executive Suite', code: 'EXE', rate: 8500, max_adults: 2, amenities: 'AC, WiFi, Mini Bar' }])}
                  >
                    + Add Category
                  </Button>
                </div>
                <div className="space-y-3">
                  {roomTypes.map((rt, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-stone-900">{rt.name} ({rt.code})</div>
                        <div className="text-xs text-stone-500">Max Adults: {rt.max_adults} · Amenities: {rt.amenities}</div>
                      </div>
                      <span className="font-bold text-sm text-stone-900">₹{rt.rate}/nt</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: PHYSICAL ROOMS */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold font-display text-stone-900">Step 5: Physical Rooms Assignment</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRooms([...rooms, { number: `${rooms.length + 101}`, floor: 1, type_code: roomTypes[0]?.code || 'STD' }])}
                  >
                    + Add Room
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {rooms.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-stone-200 bg-white text-center">
                      <div className="font-extrabold text-base text-stone-900">Room {r.number}</div>
                      <div className="text-[11px] text-stone-500">Floor {r.floor} · {r.type_code}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: DEPARTMENTS */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-stone-900">Step 6: Operational Departments</h2>
                <div className="grid grid-cols-2 gap-3">
                  {departments.map((d, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                      <span className="font-mono text-xs font-bold text-stone-400 block">{d.code}</span>
                      <span className="font-bold text-sm text-stone-900">{d.name}</span>
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
                <h2 className="text-lg font-bold font-display text-stone-900">Step 8: In-Room & Guest Services</h2>
                <div className="grid grid-cols-2 gap-3">
                  {services.map((s, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                      <span className="text-[10px] font-bold text-[#c9a84c] uppercase block">{s.category}</span>
                      <span className="font-bold text-sm text-stone-900">{s.name}</span>
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

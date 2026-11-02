import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  BedDouble, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { 
  reservationService, 
  roomService, 
  guestService, 
  folioService, 
  activityLogService 
} from '../../services/demoDataService';
import type { Reservation, Room, PaymentMethod } from '../../types';
import { Modal, Button, Input, Select, RoomStatusBadge, HousekeepingBadge, useToast } from '../ui';

export interface QuickCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reservation: Reservation, room: Room) => void;
  reservation?: Reservation | null;
  preselectedRoomId?: string | null;
  hotelId: string;
}

export const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reservation,
  preselectedRoomId,
  hotelId,
}) => {
  const { user } = useAuth();
  const rooms = roomService.getAll(hotelId);
  const roomTypes = roomService.getTypes(hotelId);
  const allReservations = reservationService.getAll(hotelId);
  const allGuests = guestService.getAll(hotelId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeRes, setActiveRes] = useState<Reservation | null>(reservation || null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(preselectedRoomId || '');
  const [allowUpgrade, setAllowUpgrade] = useState(false);

  // Step 1: Guest Information
  const [guestForm, setGuestForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    idType: 'AADHAAR',
    idNumber: '',
    idVerified: true,
  });

  // Step 3: Advance Deposit
  const [depositAmount, setDepositAmount] = useState<number>(2000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [isDepositWaived, setIsDepositWaived] = useState<boolean>(false);

  // Success & Error & Pending Mutation states
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedRoom, setCompletedRoom] = useState<Room | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createdWalkInResRef = useRef<Reservation | null>(null);
  const toast = useToast();

  // Synchronize state when modal opens or reservation changes
  useEffect(() => {
    createdWalkInResRef.current = null;
    setSubmitError(null);
    setIsSubmitting(false);

    if (reservation) {
      setActiveRes(reservation);
      if (reservation.room_id) {
        setSelectedRoomId(reservation.room_id);
      }
      if (reservation.guest) {
        setGuestForm({
          firstName: reservation.guest.first_name || '',
          lastName: reservation.guest.last_name || '',
          phone: reservation.guest.phone || '',
          email: reservation.guest.email || '',
          idType: reservation.guest.id_type || 'AADHAAR',
          idNumber: reservation.guest.id_number || '',
          idVerified: true,
        });
      }
      // Calculate suggested deposit (20% of stay or 2000 min)
      const suggested = Math.max(1000, Math.round((reservation.total_amount || 5000) * 0.2));
      setDepositAmount(suggested);
    } else if (preselectedRoomId) {
      setSelectedRoomId(preselectedRoomId);
      // Check if there is an arriving confirmed reservation for this room
      const arrivingRes = allReservations.find(
        r => r.room_id === preselectedRoomId && (r.status === 'CONFIRMED' || r.status === 'PENDING')
      );
      if (arrivingRes) {
        setActiveRes(arrivingRes);
        if (arrivingRes.guest) {
          setGuestForm({
            firstName: arrivingRes.guest.first_name || '',
            lastName: arrivingRes.guest.last_name || '',
            phone: arrivingRes.guest.phone || '',
            email: arrivingRes.guest.email || '',
            idType: arrivingRes.guest.id_type || 'AADHAAR',
            idNumber: arrivingRes.guest.id_number || '',
            idVerified: true,
          });
        }
      } else {
        // Walk-in mode for this room
        setActiveRes(null);
        setGuestForm({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          idType: 'AADHAAR',
          idNumber: '',
          idVerified: true,
        });
      }
    }
    setStep(1);
    setIsCompleted(false);
  }, [reservation, preselectedRoomId, isOpen]);

  // Clean Available Rooms matching criteria
  const availableRooms = rooms.filter(r => {
    if (r.status !== 'AVAILABLE') return false;
    if (!activeRes) return true; // Walk-in can pick any available
    if (allowUpgrade) return true; // Upgrade enabled
    return r.room_type_id === activeRes.room_type_id;
  });

  const selectedRoomObj = rooms.find(r => r.id === selectedRoomId);
  const targetRoomType = selectedRoomObj?.room_type || roomTypes.find(rt => rt.id === selectedRoomObj?.room_type_id);

  // Check if selected room is an upgrade
  const isUpgradedRoom = activeRes && selectedRoomObj && selectedRoomObj.room_type_id !== activeRes.room_type_id;

  const handleNext = () => {
    if (step === 1) {
      if (!guestForm.firstName || !guestForm.phone) return;
      // Auto-assign first available room if none selected
      if (!selectedRoomId && availableRooms.length > 0) {
        setSelectedRoomId(availableRooms[0].id);
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedRoomId) return;
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as any);
  };

  const handleCompleteCheckIn = async () => {
    if (!selectedRoomId || isSubmitting) return;

    let resToUse = activeRes;
    const roomToAssign = rooms.find(r => r.id === selectedRoomId);
    if (!roomToAssign) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. If no existing reservation (walk-in from Room Board), create one on the fly (or reuse already created one if retrying)
      if (!resToUse) {
        if (createdWalkInResRef.current) {
          resToUse = createdWalkInResRef.current;
        } else {
          let guestId = '';
          const existingGuest = allGuests.find(g => g.phone === guestForm.phone);
          if (existingGuest) {
            guestId = existingGuest.id;
            guestService.update(guestId, {
              id_type: guestForm.idType as any,
              id_number: guestForm.idNumber,
            });
          } else {
            const newGuest = guestService.create({
              hotel_id: hotelId,
              first_name: guestForm.firstName,
              last_name: guestForm.lastName,
              phone: guestForm.phone,
              email: guestForm.email,
              id_type: guestForm.idType as any,
              id_number: guestForm.idNumber,
              vip_status: false,
            });
            guestId = newGuest.id;
          }

          const todayStr = new Date().toISOString().split('T')[0];
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          const rate = targetRoomType?.base_rate || 4500;
          const subtotal = rate;
          const tax = Math.round(subtotal * 0.18);

          resToUse = await reservationService.createAsync({
            hotel_id: hotelId,
            guest_id: guestId,
            room_type_id: roomToAssign.room_type_id,
            status: 'CONFIRMED',
            source: 'WALK_IN',
            check_in_date: todayStr,
            check_out_date: tomorrowStr,
            adults: 2,
            children: 0,
            nights: 1,
            rate_per_night: rate,
            total_amount: subtotal + tax,
            tax_amount: tax,
            discount_amount: 0,
            deposit_amount: isDepositWaived ? 0 : depositAmount,
          });
          createdWalkInResRef.current = resToUse;
        }
      } else {
        // Update existing guest identity details
        if (resToUse.guest_id) {
          guestService.update(resToUse.guest_id, {
            first_name: guestForm.firstName,
            last_name: guestForm.lastName,
            phone: guestForm.phone,
            email: guestForm.email,
            id_type: guestForm.idType as any,
            id_number: guestForm.idNumber,
          });
        }
      }

      // 2. Perform Check-In
      const checkedInRes = await reservationService.checkInAsync(resToUse.id, selectedRoomId);
      if (!checkedInRes) {
        throw new Error('Check-in was rejected by the database. Room could not be assigned.');
      }

      // 3. Setup Folio & Post Stay Charges & Advance Deposit
      const folio = folioService.getByReservation(checkedInRes.id);
      if (folio) {
        // Ensure room stay charge is on folio
        const folioItems = folioService.getItems(folio.id);
        const hasRoomCharge = folioItems.some(i => i.category === 'ROOM');
        if (!hasRoomCharge) {
          const roomChargeTotal = checkedInRes.total_amount;
          const taxAmount = checkedInRes.tax_amount || Math.round(roomChargeTotal * 0.18);
          await folioService.addItemAsync({
            hotel_id: hotelId,
            folio_id: folio.id,
            description: `Accommodation: Room ${roomToAssign.number} (${checkedInRes.nights} Nights)`,
            category: 'ROOM',
            quantity: checkedInRes.nights || 1,
            unit_price: checkedInRes.rate_per_night,
            tax_percent: 18,
            tax_amount: taxAmount,
            discount_amount: 0,
            total: roomChargeTotal,
            posted_at: new Date().toISOString(),
            posted_by: user?.full_name || 'Front Desk',
          });
        }

        // 4. Record Deposit Payment if collected
        if (!isDepositWaived && depositAmount > 0) {
          try {
            await folioService.addPaymentAsync({
              hotel_id: hotelId,
              folio_id: folio.id,
              guest_id: checkedInRes.guest_id,
              reservation_id: checkedInRes.id,
              amount: Number(depositAmount),
              method: paymentMethod,
              reference: paymentRef || `DEP-${Date.now().toString().slice(-6)}`,
              notes: `Advance security deposit collected at check-in (${paymentMethod})`,
              received_by: user?.full_name || 'Front Desk',
            });

            await reservationService.updateAsync(checkedInRes.id, {
              deposit_amount: (checkedInRes.deposit_amount || 0) + Number(depositAmount),
            });
          } catch (payErr: any) {
            // Document partial failure in compound workflow:
            // Walk-in reservation and room check-in have committed, but payment collection failed.
            console.error('Check-in partial failure (deposit rejected):', payErr);
            throw new Error(`Guest was checked in to Room ${roomToAssign.number}, but deposit payment failed to confirm (${payErr?.message || 'Database error'}). Please collect deposit manually in Folios.`);
          }
        }
      }

      // 5. Audit Logging
      activityLogService.log({
        hotel_id: hotelId,
        user_id: user?.id,
        actor_name: user?.full_name || 'Front Desk Receptionist',
        action: 'CHECK_IN',
        entity_type: 'reservation',
        entity_id: checkedInRes.id,
        metadata: {
          guest: `${guestForm.firstName} ${guestForm.lastName}`,
          room_number: roomToAssign.number,
          deposit_collected: isDepositWaived ? 0 : depositAmount,
          is_upgrade: isUpgradedRoom,
        },
      });

      setCompletedRoom(roomToAssign);
      setIsCompleted(true);
      toast.success('Check-in complete', `Room ${roomToAssign.number} is now OCCUPIED`);
      onSuccess(checkedInRes, roomToAssign);
    } catch (err: any) {
      console.error('Check-in workflow failed:', err);
      const msg = err?.message || 'Check-in failed due to database write rejection. Please try again.';
      setSubmitError(msg);
      toast.error('Check-in failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCompleted ? 'Check-In Complete!' : '3-Step Express Check-In Command'}
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          {isCompleted ? (
            <div className="flex justify-end w-full">
              <Button variant="primary" onClick={onClose}>
                Done & View Room Board
              </Button>
            </div>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={step === 1 ? onClose : handleBack}
                iconLeft={step > 1 ? <ArrowLeft className="w-4 h-4" /> : undefined}
              >
                {step === 1 ? 'Cancel' : 'Previous Step'}
              </Button>

              {step < 3 ? (
                <Button 
                  variant="primary" 
                  onClick={handleNext}
                  disabled={step === 1 && (!guestForm.firstName || !guestForm.phone)}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to {step === 1 ? 'Room Selection' : 'Deposit & Keys'}
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={handleCompleteCheckIn}
                  disabled={!selectedRoomId || isSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  iconLeft={<CheckCircle2 className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Checking in...' : 'Complete Check-In & Issue Key'}
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {isCompleted && completedRoom ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs animate-in zoom-in-95">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-[#c9a84c] tracking-widest block">SUCCESSFUL ARRIVAL</span>
            <h3 className="font-display font-extrabold text-2xl text-stone-900 mt-1">
              Guest Allocated to Room {completedRoom.number}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {guestForm.firstName} {guestForm.lastName} is officially checked in. The room state is now marked <strong>OCCUPIED</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 max-w-md mx-auto text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-stone-500">Allocated Room:</span>
              <span className="font-bold text-stone-900">Room {completedRoom.number} ({completedRoom.room_type?.name})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Advance Deposit Collected:</span>
              <span className="font-bold text-emerald-700">
                {isDepositWaived ? 'Waived / Credit Line' : `₹${depositAmount.toLocaleString('en-IN')} (${paymentMethod})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Digital Guest Portal QR:</span>
              <span className="font-mono text-stone-700 font-semibold">Ready for in-room scan</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            {[
              { id: 1, label: '1. Guest & Gov ID', icon: UserCheck },
              { id: 2, label: '2. Room & Upgrade', icon: BedDouble },
              { id: 3, label: '3. Deposit & Settle', icon: CreditCard },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive ? 'bg-[#c9a84c] text-white shadow-xs' :
                    isPast ? 'bg-emerald-600 text-white' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {isPast ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${
                    isActive ? 'text-stone-900 font-bold' : isPast ? 'text-emerald-800' : 'text-stone-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* STEP 1: GUEST DETAILS & ID */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-stone-500 block">Check-In Type</span>
                  <span className="font-bold text-stone-900">
                    {activeRes ? `Booking Ref: #${activeRes.id.slice(-6).toUpperCase()} (${activeRes.source})` : 'Walk-In Guest Registration'}
                  </span>
                </div>
                {activeRes?.total_amount && (
                  <div className="text-right">
                    <span className="text-stone-500 block">Stay Tariff</span>
                    <span className="font-bold text-[#c9a84c]">₹{activeRes.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Guest First Name *"
                  required
                  placeholder="e.g. Arjun"
                  value={guestForm.firstName}
                  onChange={e => setGuestForm({ ...guestForm, firstName: e.target.value })}
                />
                <Input
                  label="Guest Last Name"
                  placeholder="e.g. Sharma"
                  value={guestForm.lastName}
                  onChange={e => setGuestForm({ ...guestForm, lastName: e.target.value })}
                />
                <Input
                  label="Mobile Number *"
                  required
                  placeholder="+91 98765 43210"
                  value={guestForm.phone}
                  onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="guest@example.com"
                  value={guestForm.email}
                  onChange={e => setGuestForm({ ...guestForm, email: e.target.value })}
                />
              </div>

              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Government Identification Document
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Identity Document Type"
                    value={guestForm.idType}
                    onChange={e => setGuestForm({ ...guestForm, idType: e.target.value })}
                    options={[
                      { value: 'AADHAAR', label: 'Aadhaar Card (India)' },
                      { value: 'PASSPORT', label: 'Passport (International)' },
                      { value: 'DRIVING_LICENSE', label: 'Driving License' },
                      { value: 'VOTER_ID', label: 'Voter ID' },
                    ]}
                  />
                  <Input
                    label="Document / ID Number *"
                    placeholder="e.g. 5432 9876 1234 or Pass #"
                    value={guestForm.idNumber}
                    onChange={e => setGuestForm({ ...guestForm, idNumber: e.target.value })}
                  />
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guestForm.idVerified}
                    onChange={e => setGuestForm({ ...guestForm, idVerified: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="text-xs font-medium text-emerald-950">
                    Physical / Digital ID verified by Front Desk agent at check-in counter.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: ROOM SELECTION & UPGRADE */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-700">Requested Category:</span>
                  <span className="font-bold text-stone-900">
                    {activeRes?.room_type?.name || 'Walk-In Inventory'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-700">Available Clean Inventory:</span>
                  <span className="font-bold text-emerald-700">
                    {availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} available
                  </span>
                </div>
              </div>

              {/* Room Upgrade Toggle */}
              {activeRes && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Offer Category Upgrade</span>
                      <span className="text-[11px] text-stone-600">Include superior suites and deluxe rooms in assignment dropdown</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowUpgrade}
                    onChange={e => setAllowUpgrade(e.target.checked)}
                    className="w-4 h-4 accent-[#c9a84c] rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Room Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Select Room for Allocation *
                </label>
                {availableRooms.length === 0 ? (
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>No clean rooms available in this category. Enable category upgrade or check with housekeeping!</span>
                  </div>
                ) : (
                  <Select
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    options={[
                      { value: '', label: 'Select an available room...' },
                      ...availableRooms.map(r => {
                        const isUpgrade = activeRes && r.room_type_id !== activeRes.room_type_id;
                        return {
                          value: r.id,
                          label: `Room ${r.number} (Floor ${r.floor}) - ${r.room_type?.name || 'Standard'}${isUpgrade ? ' ★ UPGRADE' : ''} [${r.housekeeping_status}]`
                        };
                      })
                    ]}
                  />
                )}
              </div>

              {/* Selected Room Details Card */}
              {selectedRoomObj && (
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-stone-400 font-semibold block uppercase">Allocated Room</span>
                      <span className="font-display font-extrabold text-xl text-stone-900">Room {selectedRoomObj.number}</span>
                      <span className="text-xs text-stone-500 block">Floor {selectedRoomObj.floor} · {selectedRoomObj.room_type?.name}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RoomStatusBadge status={selectedRoomObj.status} />
                      <HousekeepingBadge status={selectedRoomObj.housekeeping_status} />
                    </div>
                  </div>

                  {isUpgradedRoom && (
                    <div className="p-2.5 rounded-lg bg-[#c9a84c]/15 text-[#8f6d20] border border-[#c9a84c]/30 text-xs flex items-center justify-between font-medium">
                      <span>★ Complimentary Upgrade Applied</span>
                      <span className="font-bold">No Charge</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ADVANCE DEPOSIT & COMPLETE */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              {submitError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Check-In Mutation Error</strong>
                    <span className="leading-relaxed">{submitError}</span>
                  </div>
                </div>
              )}
              <div className="p-4 rounded-xl bg-stone-900 text-white space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-400">Guest:</span>
                  <span className="font-bold">{guestForm.firstName} {guestForm.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Allocated Room:</span>
                  <span className="font-bold text-[#c9a84c]">Room {selectedRoomObj?.number}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-medium">
                  <span className="text-stone-400">Total Stay Tariff:</span>
                  <span className="text-sm font-bold text-white">
                    ₹{(activeRes?.total_amount || (targetRoomType?.base_rate || 4500) * 1.18).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Deposit Waiver Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Waive Advance Deposit</span>
                  <span className="text-[11px] text-stone-500">Provide direct house credit line (VIP / Corporate)</span>
                </div>
                <input
                  type="checkbox"
                  checked={isDepositWaived}
                  onChange={e => setIsDepositWaived(e.target.checked)}
                  className="w-4 h-4 accent-[#c9a84c] rounded cursor-pointer"
                />
              </div>

              {/* Deposit Collection Details */}
              {!isDepositWaived && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Deposit Amount (₹) *"
                      type="number"
                      required
                      value={depositAmount}
                      onChange={e => setDepositAmount(Number(e.target.value))}
                    />
                    <Select
                      label="Collection Payment Method *"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      options={[
                        { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                        { value: 'CARD', label: 'Credit / Debit Card (POS Machine)' },
                        { value: 'CASH', label: 'Cash Currency Collection' },
                        { value: 'BANK_TRANSFER', label: 'NEFT / RTGS Transfer' },
                      ]}
                    />
                  </div>

                  <Input
                    label="Transaction Reference / POS Slip #"
                    placeholder="e.g. UPI-123456 or Card Approval #"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                  />
                </div>
              )}

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Ready to Complete Check-In
                </div>
                <p className="text-[11px] text-emerald-800">
                  Room {selectedRoomObj?.number} will be transitioned to <strong>OCCUPIED</strong>. An active guest folio will be opened, and room service QR portal access will activate immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

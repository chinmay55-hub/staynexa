import React, { useState } from 'react';
import { 
  IndianRupee, 
  Search, 
  CreditCard, 
  Plus, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  folioService, 
  reservationService, 
  guestService, 
  roomService, 
  hotelService,
  activityLogService
} from '../../services/demoDataService';
import type { 
  Folio, 
  FolioItem, 
  Payment, 
  PaymentMethod,
  Reservation
} from '../../types';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  PaymentBadge, 
  Modal 
} from '../../components/ui';

export default function FoliosPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);

  const [reservations] = useState(() => reservationService.getAll(hotelId));
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null);
  const [folioItems, setFolioItems] = useState<FolioItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceNumber] = useState(() => `INV-${Math.floor(100000 + Math.random() * 900000)}`);
  const [invoiceDate] = useState(() => new Date().toLocaleDateString('en-IN'));

  // Form states
  const [chargeForm, setChargeForm] = useState({
    description: '',
    category: 'ROOM_SERVICE' as FolioItem['category'],
    quantity: 1,
    unit_price: 500,
    tax_percent: 5,
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 1000,
    method: 'UPI' as PaymentMethod,
    reference: '',
    notes: 'Front desk payment collection',
  });

  const activeReservations = reservations.filter(r => r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT');

  const handleOpenFolio = (res: Reservation) => {
    let folio = folioService.getByReservation(res.id);
    if (!folio) {
      // Auto-create initial folio if missing
      folio = {
        id: `folio-${res.id}`,
        hotel_id: hotelId,
        reservation_id: res.id,
        guest_id: res.guest_id,
        status: 'PENDING',
        total_charges: res.total_amount,
        total_payments: res.deposit_amount || 0,
        outstanding: res.total_amount - (res.deposit_amount || 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    setSelectedFolio(folio);
    setFolioItems(folioService.getItems(folio.id));
    setPayments(folioService.getPayments(folio.id));
    setIsDetailOpen(true);
  };

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio || !chargeForm.description) return;
    const subtotal = chargeForm.quantity * chargeForm.unit_price;
    const tax = Math.round(subtotal * (chargeForm.tax_percent / 100));
    const total = subtotal + tax;

    folioService.addItem({
      folio_id: selectedFolio.id,
      hotel_id: hotelId,
      description: chargeForm.description,
      category: chargeForm.category,
      quantity: Number(chargeForm.quantity),
      unit_price: Number(chargeForm.unit_price),
      tax_percent: Number(chargeForm.tax_percent),
      tax_amount: tax,
      discount_amount: 0,
      total,
      posted_at: new Date().toISOString(),
      posted_by: user?.full_name,
    });

    const refreshedFolio = folioService.getById(selectedFolio.id);
    if (refreshedFolio) setSelectedFolio(refreshedFolio);
    setFolioItems(folioService.getItems(selectedFolio.id));
    setIsAddChargeOpen(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio || paymentForm.amount <= 0) return;

    folioService.addPayment({
      hotel_id: hotelId,
      folio_id: selectedFolio.id,
      guest_id: selectedFolio.guest_id,
      reservation_id: selectedFolio.reservation_id,
      amount: Number(paymentForm.amount),
      method: paymentForm.method,
      reference: paymentForm.reference || `REF-${Date.now().toString().slice(-6)}`,
      notes: paymentForm.notes,
      received_by: user?.full_name,
    });

    activityLogService.log({
      hotel_id: hotelId,
      user_id: user?.id,
      actor_name: user?.full_name,
      action: 'PAYMENT_RECORDED',
      entity_type: 'folio',
      entity_id: selectedFolio.id,
      metadata: { amount: paymentForm.amount, method: paymentForm.method }
    });

    const refreshedFolio = folioService.getById(selectedFolio.id);
    if (refreshedFolio) setSelectedFolio(refreshedFolio);
    setPayments(folioService.getPayments(selectedFolio.id));
    setIsRecordPaymentOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Guest Billing & Folios</h1>
          <p className="text-stone-500 text-sm">Post charges, collect UPI/Card payments, and generate GST-compliant invoices.</p>
        </div>
      </div>

      {/* Folios Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Room & Guest</th>
                  <th className="py-3 px-4">Stay Dates</th>
                  <th className="py-3 px-4">Posted Charges</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Balance Outstanding</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {activeReservations.map(res => {
                  const folio = folioService.getByReservation(res.id);
                  const totalCharges = folio?.total_charges ?? res.total_amount;
                  const totalPayments = folio?.total_payments ?? (res.deposit_amount || 0);
                  const balance = folio?.outstanding ?? (totalCharges - totalPayments);
                  const status = folio?.status ?? (balance <= 0 ? 'PAID' : totalPayments > 0 ? 'PARTIAL' : 'PENDING');

                  return (
                    <tr key={res.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">
                          {res.room ? `Room ${res.room.number}` : 'Room TBA'}
                        </div>
                        <div className="text-xs text-stone-500">
                          {res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : 'Guest'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-700">
                        <div>{res.check_in_date} to {res.check_out_date}</div>
                        <div className="text-stone-400">{res.nights} Nights</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-900 text-xs">
                        ₹{totalCharges.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-700 text-xs">
                        ₹{totalPayments.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          ₹{balance.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <PaymentBadge status={status} />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenFolio(res)}
                        >
                          View Folio
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

      {/* Folio Detail Modal */}
      {selectedFolio && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Guest Stay Folio Ledger`}
          size="lg"
          footer={
            <div className="flex justify-between items-center w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsInvoiceOpen(true)}
                iconLeft={<Receipt className="w-4 h-4" />}
              >
                Generate Tax Invoice
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsAddChargeOpen(true)}
                  iconLeft={<Plus className="w-3.5 h-3.5" />}
                >
                  Post Charge
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => setIsRecordPaymentOpen(true)}
                  iconLeft={<IndianRupee className="w-3.5 h-3.5" />}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Financial summary cards */}
            <div className="grid grid-cols-3 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div>
                <span className="text-xs text-stone-500 block">Total Charges</span>
                <span className="text-lg font-bold text-stone-900">₹{selectedFolio.total_charges.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Total Paid</span>
                <span className="text-lg font-bold text-emerald-700">₹{selectedFolio.total_payments.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Outstanding</span>
                <span className={`text-lg font-bold ${selectedFolio.outstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{selectedFolio.outstanding.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Posted Charges List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">Itemized Charges</h4>
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Tax</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {folioItems.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-stone-400">No additional itemized charges posted.</td></tr>
                    ) : (
                      folioItems.map(item => (
                        <tr key={item.id}>
                          <td className="p-2.5 font-medium text-stone-900">{item.description}</td>
                          <td className="p-2.5 text-stone-500">{item.category}</td>
                          <td className="p-2.5">{item.quantity}</td>
                          <td className="p-2.5">₹{item.unit_price}</td>
                          <td className="p-2.5 text-stone-500">{item.tax_percent}% (₹{item.tax_amount})</td>
                          <td className="p-2.5 text-right font-semibold text-stone-900">₹{item.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">Payment Receipts</h4>
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="p-2.5">Receipt ID</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Reference / Transaction</th>
                      <th className="p-2.5">Received By</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {payments.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-stone-400">No payments recorded yet.</td></tr>
                    ) : (
                      payments.map(p => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono text-stone-600">#{p.id.slice(-6)}</td>
                          <td className="p-2.5 font-semibold text-stone-800">{p.method}</td>
                          <td className="p-2.5 text-stone-500">{p.reference || '—'}</td>
                          <td className="p-2.5 text-stone-500">{p.received_by || 'Front Desk'}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Charge Modal */}
      <Modal
        isOpen={isAddChargeOpen}
        onClose={() => setIsAddChargeOpen(false)}
        title="Post Hotel Charge to Folio"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddChargeOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddCharge}>Post to Folio</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Input
            label="Charge Description"
            required
            placeholder="e.g. Laundry Express Dry Clean (2 Items)"
            value={chargeForm.description}
            onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Service Category"
              value={chargeForm.category}
              onChange={e => setChargeForm({ ...chargeForm, category: e.target.value as any })}
              options={[
                { value: 'ROOM_SERVICE', label: 'Room Service' },
                { value: 'RESTAURANT', label: 'Restaurant / Bar' },
                { value: 'LAUNDRY', label: 'Laundry & Dry Clean' },
                { value: 'SPA', label: 'Spa & Wellness' },
                { value: 'TRANSPORT', label: 'Airport Transfer' },
                { value: 'SERVICE', label: 'Other Service' },
              ]}
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={chargeForm.quantity}
              onChange={e => setChargeForm({ ...chargeForm, quantity: Number(e.target.value) })}
            />
            <Input
              label="Unit Price (₹)"
              type="number"
              value={chargeForm.unit_price}
              onChange={e => setChargeForm({ ...chargeForm, unit_price: Number(e.target.value) })}
            />
            <Input
              label="GST Tax Rate (%)"
              type="number"
              value={chargeForm.tax_percent}
              onChange={e => setChargeForm({ ...chargeForm, tax_percent: Number(e.target.value) })}
            />
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title="Collect & Record Payment"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsRecordPaymentOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRecordPayment}>Confirm Payment</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Input
            label="Payment Amount (₹)"
            type="number"
            required
            value={paymentForm.amount}
            onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
          />
          <Select
            label="Payment Method"
            value={paymentForm.method}
            onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethod })}
            options={[
              { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
              { value: 'CARD', label: 'Credit / Debit Card (POS)' },
              { value: 'CASH', label: 'Cash Collection' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
              { value: 'ONLINE', label: 'Payment Gateway Link' },
            ]}
          />
          <Input
            label="Reference / Transaction ID"
            placeholder="e.g. UPI-9876543210 or POS Slip #"
            value={paymentForm.reference}
            onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
          />
        </form>
      </Modal>

      {/* Professional Tax Invoice Modal */}
      {isInvoiceOpen && selectedFolio && (
        <Modal
          isOpen={true}
          onClose={() => setIsInvoiceOpen(false)}
          title="Tax Invoice"
          size="lg"
          footer={
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setIsInvoiceOpen(false)}>Close</Button>
              <Button 
                variant="primary" 
                onClick={() => window.print()}
                iconLeft={<Printer className="w-4 h-4" />}
              >
                Print Tax Invoice
              </Button>
            </div>
          }
        >
          <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-6 text-stone-900 print:border-none">
            {/* Letterhead */}
            <div className="flex justify-between items-start border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-display font-bold text-xl text-stone-900">{hotel?.name || 'Grand Palace Hotel'}</h2>
                <p className="text-xs text-stone-500">{hotel?.legal_name || 'Hospitality Pvt Ltd'}</p>
                <p className="text-xs text-stone-500">{hotel?.address}, {hotel?.city}, {hotel?.state} - {hotel?.pin_code}</p>
                <p className="text-xs font-semibold text-stone-700 mt-1">GSTIN: {hotel?.gstin || '07AABCG1234A1Z5'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-[#c9a84c]">TAX INVOICE</span>
                <div className="text-base font-bold font-mono mt-1">{invoiceNumber}</div>
                <div className="text-xs text-stone-500">Date: {invoiceDate}</div>
              </div>
            </div>

            {/* Items */}
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-y border-stone-200 font-semibold text-stone-700">
                <tr>
                  <th className="py-2 px-1">Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Tax (GST)</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {folioItems.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 px-1 font-medium">{item.description}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">₹{item.unit_price}</td>
                    <td className="py-2 text-right">₹{item.tax_amount} ({item.tax_percent}%)</td>
                    <td className="py-2 text-right font-semibold">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-stone-200 pt-3 space-y-1.5 text-xs text-right">
              <div className="flex justify-between font-semibold">
                <span>Total Invoice Value:</span>
                <span>₹{selectedFolio.total_charges.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Payments Received:</span>
                <span>-₹{selectedFolio.total_payments.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-stone-200 text-stone-900">
                <span>Balance Due:</span>
                <span>₹{selectedFolio.outstanding.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-[10px] text-stone-400 text-center pt-4 border-t border-stone-100">
              This is a computer-generated invoice from StayNexa Operating System.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

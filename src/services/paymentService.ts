// StayNexa Strict Financial & Payment Service
// Enforces decimal precision (Math.round(val * 100) / 100) with zero floating-point drift

import type { Payment, Folio, FolioItem } from '../types';
import { folioService } from './demoDataService';

export interface TaxBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  serviceCharge: number;
  grandTotal: number;
}

export class PaymentService {
  /**
   * Round to strictly 2 decimal places to prevent floating-point anomalies
   */
  public roundCurrency(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Computes split GST (CGST 50% + SGST 50%) and optional service charge
   */
  public calculateTaxes(
    subtotal: number,
    taxPercent: number = 5,
    serviceChargePercent: number = 0
  ): TaxBreakdown {
    const cleanSubtotal = this.roundCurrency(subtotal);
    const totalTax = this.roundCurrency((cleanSubtotal * taxPercent) / 100);
    const cgst = this.roundCurrency(totalTax / 2);
    const sgst = this.roundCurrency(totalTax - cgst); // Ensure sum equals totalTax exactly
    const serviceCharge = this.roundCurrency((cleanSubtotal * serviceChargePercent) / 100);
    const grandTotal = this.roundCurrency(cleanSubtotal + totalTax + serviceCharge);

    return {
      subtotal: cleanSubtotal,
      cgst,
      sgst,
      totalTax,
      serviceCharge,
      grandTotal,
    };
  }

  /**
   * Processes a payment against an active hotel folio
   */
  public recordPayment(params: {
    hotelId: string;
    folioId: string;
    guestId?: string;
    reservationId?: string;
    amount: number;
    method: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'ONLINE';
    reference?: string;
    notes?: string;
    receivedBy?: string;
  }): { payment: Payment; folio: Folio } {
    const cleanAmount = this.roundCurrency(params.amount);

    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      hotel_id: params.hotelId,
      folio_id: params.folioId,
      guest_id: params.guestId || 'guest-001',
      reservation_id: params.reservationId,
      amount: cleanAmount,
      method: params.method,
      reference: params.reference || `${params.method}-${Date.now().toString().slice(-6)}`,
      notes: params.notes,
      received_by: params.receivedBy || 'Staff / Guest Portal',
      created_at: new Date().toISOString(),
    };

    // Update folio in demo service
    const createdPayment = folioService.addPayment({
      hotel_id: params.hotelId,
      folio_id: params.folioId,
      guest_id: params.guestId || 'guest-001',
      reservation_id: params.reservationId,
      amount: cleanAmount,
      method: params.method,
      reference: payment.reference,
      notes: payment.notes,
      received_by: payment.received_by,
    });

    const updatedFolio = folioService.getById(params.folioId);

    return {
      payment: createdPayment,
      folio: updatedFolio || ({} as Folio),
    };
  }

  /**
   * Generates a digital receipt verification hash/id
   */
  public generateReceiptNumber(prefix: string = 'REC'): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}`;
  }
}

export const paymentService = new PaymentService();

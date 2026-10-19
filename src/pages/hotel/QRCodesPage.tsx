import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Plus, 
  Download, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  Eye,
  ShieldCheck,
  Building2
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { qrService, roomService, hotelService } from '../../services/demoDataService';
import type { QRCode as QRCodeType, Room } from '../../types';
import { Card, CardContent, CardHeader, Button, Badge, Modal } from '../../components/ui';

export default function QRCodesPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';
  const hotel = hotelService.getById(hotelId);

  const [qrCodes, setQrCodes] = useState<QRCodeType[]>(() => qrService.getAll(hotelId));
  const [rooms] = useState(() => roomService.getAll(hotelId));
  const [previewQr, setPreviewQr] = useState<QRCodeType | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // Generate QR data URL when preview opens
  useEffect(() => {
    if (previewQr) {
      const fullUrl = `${window.location.origin}/guest/${previewQr.token}`;
      QRCode.toDataURL(fullUrl, { width: 250, margin: 2, color: { dark: '#1a2744', light: '#ffffff' } })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => console.error('QR Gen error:', err));
    }
  }, [previewQr]);

  const handleGenerateAll = () => {
    // Generate QR for rooms that don't have an active one
    rooms.forEach(room => {
      const hasQr = qrCodes.some(q => q.room_id === room.id && q.is_active);
      if (!hasQr) {
        qrService.generate(hotelId, room.id);
      }
    });
    setQrCodes([...qrService.getAll(hotelId)]);
  };

  const handleDeactivate = (id: string) => {
    qrService.deactivate(id);
    setQrCodes([...qrService.getAll(hotelId)]);
  };

  const handleRegenerate = (roomId: string) => {
    const existing = qrCodes.find(q => q.room_id === roomId && q.is_active);
    if (existing) qrService.deactivate(existing.id);
    qrService.generate(hotelId, roomId);
    setQrCodes([...qrService.getAll(hotelId)]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Room QR Code Management</h1>
          <p className="text-stone-500 text-sm">Generate secure, revocable tokenized QR codes for guest digital self-service.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPrintSheetOpen(true)}
            iconLeft={<Printer className="w-4 h-4" />}
          >
            Bulk Print Standees
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerateAll}
            iconLeft={<Plus className="w-4 h-4" />}
          >
            Generate Missing QRs
          </Button>
        </div>
      </div>

      {/* Security Info Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-950 text-xs sm:text-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Cryptographic Tokenization Security:</span> QR codes do not embed raw room numbers or database credentials in the URL. Each QR uses an isolated, revocable token that securely resolves to the verified tenant room session.
        </div>
      </div>

      {/* QR Codes Grid / Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4">Access URL Pattern</th>
                  <th className="py-3 px-4">Token ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rooms.map(room => {
                  const qr = qrCodes.find(q => q.room_id === room.id && q.is_active);

                  return (
                    <tr key={room.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        Room {room.number}
                        <span className="text-xs text-stone-400 block font-normal">{room.room_type?.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-stone-600">
                        {qr ? (
                          <a 
                            href={`/guest/${qr.token}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[#c9a84c] hover:underline flex items-center gap-1 font-semibold"
                          >
                            /guest/{qr.token} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-stone-400">No active QR generated</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-stone-500">
                        {qr?.token || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {qr ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">Unprovisioned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {qr ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setPreviewQr(qr)}
                              iconLeft={<Eye className="w-3.5 h-3.5" />}
                            >
                              Preview
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRegenerate(room.id)}
                            >
                              Regenerate
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => {
                              qrService.generate(hotelId, room.id);
                              setQrCodes([...qrService.getAll(hotelId)]);
                            }}
                          >
                            Create QR
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* QR Preview Modal */}
      {previewQr && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewQr(null)}
          title={`Digital Standee Preview: Room ${previewQr.room?.number || ''}`}
          size="sm"
          footer={
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setPreviewQr(null)}>Close</Button>
              <Button 
                variant="primary" 
                onClick={() => window.print()}
                iconLeft={<Printer className="w-4 h-4" />}
              >
                Print Standee
              </Button>
            </div>
          }
        >
          <div className="p-6 bg-white border border-stone-200 rounded-2xl text-center space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900">{hotel?.name}</h3>
              <div className="inline-block px-3 py-1 bg-[#1a2744] text-[#c9a84c] rounded-full text-xs font-bold mt-1">
                Room {previewQr.room?.number}
              </div>
            </div>

            <div className="flex justify-center p-3 bg-stone-50 rounded-xl border border-stone-200">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Room QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-stone-400">Rendering QR...</div>
              )}
            </div>

            <div className="space-y-1 text-xs text-stone-600">
              <p className="font-bold text-stone-900">Scan with your smartphone camera</p>
              <p className="text-[11px] text-stone-400">Order room service · Request housekeeping · View WiFi</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Print Sheet Modal */}
      {isPrintSheetOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsPrintSheetOpen(false)}
          title="Printable Room Standees Sheet"
          size="lg"
          footer={
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setIsPrintSheetOpen(false)}>Close</Button>
              <Button 
                variant="primary" 
                onClick={() => window.print()}
                iconLeft={<Printer className="w-4 h-4" />}
              >
                Print All Standees
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-2">
            {rooms.map(room => (
              <div key={room.id} className="p-4 border-2 border-dashed border-stone-300 rounded-xl text-center space-y-2">
                <div className="font-bold text-sm text-stone-800">{hotel?.name}</div>
                <div className="text-xl font-extrabold text-[#1a2744]">Room {room.number}</div>
                <div className="w-24 h-24 mx-auto bg-stone-100 rounded flex items-center justify-center text-stone-400 text-xs">
                  <QrCode className="w-12 h-12 text-[#1a2744]" />
                </div>
                <div className="text-[10px] text-stone-500 font-medium">Scan for In-Room Dining & Concierge</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

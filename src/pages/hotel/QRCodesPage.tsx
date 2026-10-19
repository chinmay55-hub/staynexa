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
  const [bulkQrUrls, setBulkQrUrls] = useState<{ [roomId: string]: string }>({});

  // Generate QR data URL when preview opens
  useEffect(() => {
    if (previewQr) {
      const fullUrl = `${window.location.origin}/guest/${previewQr.token}`;
      QRCode.toDataURL(fullUrl, { width: 250, margin: 2, color: { dark: '#1a2744', light: '#ffffff' } })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => console.error('QR Gen error:', err));
    }
  }, [previewQr]);

  // Generate QR data URLs for all rooms when bulk print sheet opens
  useEffect(() => {
    if (isPrintSheetOpen) {
      rooms.forEach(room => {
        const qr = qrCodes.find(q => q.room_id === room.id && q.is_active);
        const token = qr?.token || `gp-r${room.number}-demo`;
        const fullUrl = `${window.location.origin}/guest/${token}`;
        QRCode.toDataURL(fullUrl, { width: 180, margin: 1, color: { dark: '#1a2744', light: '#ffffff' } })
          .then((url: string) => {
            setBulkQrUrls(prev => ({ ...prev, [room.id]: url }));
          })
          .catch((err: any) => console.error('Bulk QR generation error:', err));
      });
    }
  }, [isPrintSheetOpen, rooms, qrCodes]);

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

  const handleDownloadPng = (qr: QRCodeType) => {
    if (!qrDataUrl) return;
    const roomNum = qr.room?.number || qr.room_id || 'room';
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `StayNexa-QR-Room-${roomNum}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <div className="flex justify-between items-center w-full gap-2">
              <Button variant="outline" onClick={() => setPreviewQr(null)}>Close</Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPng(previewQr)}
                  iconLeft={<Download className="w-4 h-4" />}
                >
                  Download PNG
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => window.print()}
                  iconLeft={<Printer className="w-4 h-4" />}
                >
                  Print Standee
                </Button>
              </div>
            </div>
          }
        >
          {/* Print CSS rule injection for single standee */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #single-qr-standee-print, #single-qr-standee-print * {
                visibility: visible !important;
              }
              #single-qr-standee-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 380px !important;
                margin: 40px auto !important;
                padding: 24px !important;
                border: 2px dashed #999 !important;
                background: white !important;
                color: black !important;
              }
            }
          `}</style>

          <div id="single-qr-standee-print" className="p-6 bg-white border border-stone-200 rounded-2xl text-center space-y-4">
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
          title="Printable Room Standees Sheet (Tent Cards)"
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
          {/* Print CSS rule injection */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #bulk-qr-sheet-print, #bulk-qr-sheet-print * {
                visibility: visible !important;
              }
              #bulk-qr-sheet-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 16px !important;
              }
            }
          `}</style>

          <div id="bulk-qr-sheet-print" className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-2">
            {rooms.map(room => (
              <div 
                key={room.id} 
                className="p-5 border-2 border-dashed border-stone-300 rounded-2xl text-center space-y-2.5 bg-white break-inside-avoid shadow-2xs"
              >
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#c9a84c] border-b border-dashed border-stone-200 pb-1">
                  FOLD LINE · TABLE TENT STAND
                </div>
                <div className="font-display font-bold text-sm text-stone-900">{hotel?.name}</div>
                <div className="text-xl font-extrabold text-[#1a2744]">Room {room.number}</div>
                
                <div className="w-32 h-32 mx-auto flex items-center justify-center p-1 bg-stone-50 rounded-xl border border-stone-200">
                  {bulkQrUrls[room.id] ? (
                    <img src={bulkQrUrls[room.id]} alt={`Room ${room.number} QR`} className="w-28 h-28 mx-auto" />
                  ) : (
                    <div className="text-xs text-stone-400">Rendering QR...</div>
                  )}
                </div>

                <div className="text-xs font-bold text-stone-800">Scan for In-Room Dining & Concierge</div>
                <div className="text-[10px] text-stone-500">Wi-Fi Access · Room Service · Instant Requests</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

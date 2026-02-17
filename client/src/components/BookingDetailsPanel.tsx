import React, { useState } from 'react';
import { X, Edit, Trash2, Printer, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatDate } from '@/lib/dateFormatter';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

interface Booking {
  id: number;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date | string;
  numberOfPassengers: number;
  fare: string | number;
  status?: string;
  notes?: string;
  vehicleId?: number | null;
  driverId?: number | null;
  bookingSource?: string;
  flightNumber?: string;
}

interface BookingDetailsPanelProps {
  booking: Booking | null;
  onClose: () => void;
  isOpen: boolean;
  onBookingUpdated?: () => void;
  onAddNewBooking?: () => void;
  onEdit?: () => void;
}

export const BookingDetailsPanel: React.FC<BookingDetailsPanelProps> = ({
  booking,
  onClose,
  isOpen,
  onBookingUpdated,
  onAddNewBooking,
  onEdit,
}) => {
  const [, navigate] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const deleteBooking = trpc.bookings.delete.useMutation();
  const cancelBooking = trpc.bookings.cancelBooking.useMutation();

  if (!isOpen || !booking) return null;

  const pickupTime = booking.pickupDateTime instanceof Date 
    ? formatDateTime(booking.pickupDateTime)
    : formatDateTime(new Date(booking.pickupDateTime));

  const handleDelete = async () => {
    try {
      await deleteBooking.mutateAsync({ id: booking.id });
      setShowDeleteConfirm(false);
      onClose();
      onBookingUpdated?.();
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelBooking.mutateAsync({ bookingId: booking.id });
      setShowCancelConfirm(false);
      onClose();
      onBookingUpdated?.();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>تفاصيل الحجز - ${booking.bookingNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
            .field { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { font-weight: bold; }
            .value { text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تفاصيل الحجز</h1>
            <p>رقم الحجز: ${booking.bookingNumber}</p>
          </div>
          
          <div class="section">
            <div class="section-title">معلومات العميل</div>
            <div class="field">
              <span class="label">الاسم:</span>
              <span class="value">${booking.customerName}</span>
            </div>
            <div class="field">
              <span class="label">الهاتف:</span>
              <span class="value">${booking.customerPhone}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">تفاصيل الرحلة</div>
            <div class="field">
              <span class="label">موقع الانطلاق:</span>
              <span class="value">${booking.pickupLocation}</span>
            </div>
            <div class="field">
              <span class="label">موقع الوصول:</span>
              <span class="value">${booking.dropoffLocation}</span>
            </div>
            <div class="field">
              <span class="label">تاريخ ووقت الانطلاق:</span>
              <span class="value">${pickupTime}</span>
            </div>
            <div class="field">
              <span class="label">عدد الركاب:</span>
              <span class="value">${booking.numberOfPassengers}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">السعر</div>
            <div class="field">
              <span class="label">الإجمالي:</span>
              <span class="value" style="font-size: 18px; font-weight: bold; color: green;">${booking.fare} د.ا</span>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="relative w-full max-w-md bg-background shadow-lg animate-in slide-in-from-right flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">
            تفاصيل الحجز
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 pb-48">
          <div className="space-y-4">
            {/* Booking Number */}
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  رقم الحجز
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {booking.bookingNumber}
                </p>
              </div>
            </Card>

            {/* Customer Info */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  معلومات العميل
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-medium text-foreground">
                      {booking.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الهاتف</p>
                    <p className="font-medium text-foreground">
                      {booking.customerPhone}
                    </p>
                  </div>
                  {booking.customerEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-medium text-foreground">
                        {booking.customerEmail}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Trip Details */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  تفاصيل الرحلة
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">موقع الانطلاق</p>
                    <p className="font-medium text-foreground">
                      {booking.pickupLocation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">موقع الوصول</p>
                    <p className="font-medium text-foreground">
                      {booking.dropoffLocation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ ووقت الانطلاق</p>
                    <p className="font-medium text-foreground">
                      {pickupTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">عدد الركاب</p>
                    <p className="font-medium text-foreground">
                      {booking.numberOfPassengers}
                    </p>
                  </div>
                  {booking.flightNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الرحلة</p>
                      <p className="font-medium text-foreground text-blue-600 font-semibold">
                        {booking.flightNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Pricing */}
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  السعر
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {booking.fare} د.ا
                </p>
              </div>
            </Card>

            {/* Status */}
            {booking.status && (
              <Card className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    الحالة
                  </p>
                  <div className="inline-block rounded-full bg-blue-100 px-3 py-1">
                    <p className="text-sm font-medium text-blue-900">
                      {booking.status}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Booking Source */}
            {booking.bookingSource && (
              <Card className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    مصدر الحجز
                  </p>
                  <p className="font-medium text-foreground">
                    {booking.bookingSource}
                  </p>
                </div>
              </Card>
            )}

            {/* Notes */}
            {booking.notes && (
              <Card className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    ملاحظات
                  </p>
                  <p className="text-sm text-foreground">
                    {booking.notes}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                تأكيد إلغاء الحجز
              </h3>
              <p className="text-muted-foreground mb-6">
                هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟ سيتم نقل الحجز إلى قائمة الحجوزات الملغاة.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={cancelBooking.isPending}
                >
                  {cancelBooking.isPending ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                تأكيد الحذف
              </h3>
              <p className="text-muted-foreground mb-6">
                هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={deleteBooking.isPending}
                >
                  {deleteBooking.isPending ? 'جاري الحذف...' : 'حذف'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-background p-4 space-y-2 flex-shrink-0 z-40">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                onEdit?.();
              }}
            >
              <Edit className="h-4 w-4" />
              تعديل
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setShowCancelConfirm(true)}
              disabled={booking.status === 'cancelled'}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </div>
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            size="sm"
            onClick={() => {
              onAddNewBooking?.();
              onClose();
            }}
          >
            <Plus className="h-4 w-4" />
            إضافة حجز جديد
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
};

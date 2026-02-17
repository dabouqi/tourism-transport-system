import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { toDatetimeLocal } from '@/lib/dateFormatter';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDate?: Date;
  onSuccess?: () => void;
  editingBooking?: any; // Booking data for edit mode
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  onClose,
  prefilledDate,
  onSuccess,
  editingBooking,
}) => {
  const [formData, setFormData] = useState({
    clientId: undefined as number | undefined,
    bookingNumber: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDateTime: prefilledDate ? toDatetimeLocal(prefilledDate) : new Date().toISOString().slice(0, 16),
    fare: '0',
    bookingSource: 'internal' as 'internal' | 'talixo' | 'get_transfer' | 'transfeero',
    status: 'pending' as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
    notes: '',
    programDays: '',
    programEndDate: '',
    flightNumber: '',
    sendWhatsApp: false,
    passengerCount: '',
    passengerNames: '',
  });

  const clients = trpc.clients.list.useQuery();
  const createBooking = trpc.bookings.create.useMutation();
  const updateBooking = trpc.bookings.update.useMutation();
  const utils = trpc.useUtils();

  React.useEffect(() => {
    if (editingBooking && isOpen) {
      // Load existing booking data for edit
      setFormData({
        clientId: editingBooking.clientId,
        bookingNumber: editingBooking.bookingNumber,
        customerName: editingBooking.customerName,
        customerPhone: editingBooking.customerPhone,
        customerEmail: editingBooking.customerEmail,
        pickupLocation: editingBooking.pickupLocation,
        dropoffLocation: editingBooking.dropoffLocation,
        pickupDateTime: toDatetimeLocal(editingBooking.pickupDateTime),
        fare: editingBooking.fare?.toString() || '0',
        bookingSource: editingBooking.bookingSource,
        status: editingBooking.status,
        notes: editingBooking.notes,
        programDays: editingBooking.programDays?.toString() || '',
        programEndDate: editingBooking.programEndDate ? new Date(editingBooking.programEndDate).toISOString().split('T')[0] : '',
        sendWhatsApp: editingBooking.sendWhatsApp || false,
        passengerCount: editingBooking.passengerCount?.toString() || '',
        passengerNames: editingBooking.passengerNames || '',
      });
    } else if (prefilledDate && isOpen) {
      setFormData(prev => ({
        ...prev,
        pickupDateTime: toDatetimeLocal(prefilledDate),
      }));
    }
  }, [editingBooking, prefilledDate, isOpen]);

  const handleSave = async () => {
    console.log('[handleSave] Starting...');
    try {
      if (!formData.customerName.trim()) {
        toast.error('اسم العميل مطلوب');
        return;
      }
      if (!formData.customerPhone.trim()) {
        toast.error('رقم الهاتف مطلوب');
        return;
      }
      if (!formData.pickupLocation.trim()) {
        toast.error('موقع الاستقبال مطلوب');
        return;
      }
      if (!formData.dropoffLocation.trim()) {
        toast.error('موقع الإنزال مطلوب');
        return;
      }

      const fareValue = parseFloat(formData.fare);
      if (isNaN(fareValue) || fareValue <= 0) {
        toast.error('المبلغ مطلوب ويجب أن يكون أكبر من صفر');
        return;
      }

      const dataToSend = {
        ...formData,
        pickupDateTime: new Date(formData.pickupDateTime),
        programEndDate: formData.programEndDate ? new Date(formData.programEndDate) : undefined,
        fare: fareValue,
        programDays: parseInt(formData.programDays) || 0,
        passengerCount: formData.passengerCount ? parseInt(formData.passengerCount) : undefined,
      };

      if (editingBooking) {
        await updateBooking.mutateAsync({ id: editingBooking.id, ...dataToSend });
        toast.success('تم تحديث الحجز بنجاح');
      } else {
        console.log('[handleSave] Creating booking with data:', dataToSend);
        const result = await createBooking.mutateAsync(dataToSend);
        console.log('[handleSave] Booking created successfully:', result);
        toast.success('تم إنشاء الحجز بنجاح');
      }

      // Reset form
      setFormData({
        clientId: undefined,
        bookingNumber: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        pickupLocation: '',
        dropoffLocation: '',
        pickupDateTime: prefilledDate ? toDatetimeLocal(prefilledDate) : new Date().toISOString().slice(0, 16),
        fare: '0',
        bookingSource: 'internal',
        status: 'pending',
        notes: '',
        programDays: '',
        programEndDate: '',
        sendWhatsApp: false,
      });

      // Invalidate queries
      utils.bookings.list.invalidate();
      utils.dashboard.getStats.invalidate();
      utils.dashboard.getTotalReceivables.invalidate();

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('[handleSave] Error:', error);
      toast.error('فشل إنشاء الحجز');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingBooking ? 'تعديل الحجز' : 'إنشاء حجز جديد'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <Label>رقم الحجز</Label>
            <Input
              value={formData.bookingNumber}
              onChange={(e) => setFormData({ ...formData, bookingNumber: e.target.value })}
              placeholder="أدخل رقم الحجز"
            />
          </div>
          <div>
            <Label>العميل</Label>
            <Select value={formData.clientId?.toString() || ''} onValueChange={(value) => {
              const client = clients.data?.find(c => c.id === parseInt(value));
              setFormData({
                ...formData,
                clientId: parseInt(value),
                customerName: client?.name || '',
                customerPhone: client?.phone || '',
                customerEmail: client?.email || ''
              });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عميل" />
              </SelectTrigger>
              <SelectContent>
                {clients.data?.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>اسم العميل</Label>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="أدخل اسم العميل"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الهاتف</Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="رقم الهاتف"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="البريد الإلكتروني"
              />
            </div>
            <div>
              <Label>رقم الرحلة (اختياري)</Label>
              <Input
                value={formData.flightNumber}
                onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                placeholder="رقم الرحلة"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>من</Label>
              <Input
                value={formData.pickupLocation}
                onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                placeholder="موقع الاستقبال"
              />
            </div>
            <div>
              <Label>إلى</Label>
              <Input
                value={formData.dropoffLocation}
                onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                placeholder="موقع الإنزال"
              />
            </div>
          </div>
          <div>
            <Label>تاريخ ووقت الاستقبال</Label>
            <Input
              type="datetime-local"
              value={formData.pickupDateTime}
              onChange={(e) => setFormData({ ...formData, pickupDateTime: e.target.value })}
            />
          </div>
          <div>
            <Label>المبلغ</Label>
            <Input
              type="number"
              value={formData.fare}
              onChange={(e) => setFormData({ ...formData, fare: e.target.value })}
              placeholder="أدخل المبلغ"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>عدد أيام البرنامج</Label>
              <Input
                type="number"
                value={formData.programDays}
                onChange={(e) => setFormData({ ...formData, programDays: e.target.value })}
                placeholder="أدخل عدد الأيام"
              />
            </div>
            <div>
              <Label>تاريخ انتهاء البرنامج</Label>
              <Input
                type="date"
                value={formData.programEndDate}
                onChange={(e) => setFormData({ ...formData, programEndDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>عدد الركاب (اختياري)</Label>
              <Input
                type="number"
                value={formData.passengerCount}
                onChange={(e) => setFormData({ ...formData, passengerCount: e.target.value })}
                placeholder="أدخل عدد الركاب"
              />
            </div>
            <div>
              <Label>أسماء الركاب (اختياري)</Label>
              <Input
                value={formData.passengerNames}
                onChange={(e) => setFormData({ ...formData, passengerNames: e.target.value })}
                placeholder="أدخل الأسماء مفصولة بفواصل"
              />
            </div>
          </div>
          <div>
            <Label>الحالة</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">حجز الرحلة</SelectItem>
                <SelectItem value="confirmed">بدء الرحلة</SelectItem>
                <SelectItem value="in_progress">جاري الرحلة</SelectItem>
                <SelectItem value="completed">انتهاء الرحلة</SelectItem>
                <SelectItem value="cancelled">إلغاء الرحلة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="sendWhatsApp"
              checked={formData.sendWhatsApp}
              onChange={(e) => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="sendWhatsApp" className="cursor-pointer text-sm font-medium text-blue-900">
              ✓ إرسال رسالة WhatsApp لهذا الحجز
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button onClick={() => handleSave()} disabled={createBooking.isPending || updateBooking.isPending}>
              {(createBooking.isPending || updateBooking.isPending) ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

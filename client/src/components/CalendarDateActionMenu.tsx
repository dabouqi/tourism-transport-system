import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye } from 'lucide-react';

interface CalendarDateActionMenuProps {
  date: number;
  month: number;
  year: number;
  hasBookings: boolean;
  onCreateBooking: (date: Date) => void;
  onViewBookings: () => void;
  onClose: () => void;
}

export const CalendarDateActionMenu: React.FC<CalendarDateActionMenuProps> = ({
  date,
  month,
  year,
  hasBookings,
  onCreateBooking,
  onViewBookings,
  onClose,
}) => {
  const handleCreateBooking = () => {
    const selectedDate = new Date(year, month, date);
    onCreateBooking(selectedDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="p-6 max-w-sm bg-orange-900 border-orange-700">
        <h3 className="text-lg font-semibold text-orange-100 mb-4">
          {date} {new Date(year, month).toLocaleString('ar-SA', { month: 'long' })}
        </h3>
        
        <div className="space-y-3">
          {hasBookings && (
            <Button
              variant="outline"
              className="w-full gap-2 justify-start"
              onClick={onViewBookings}
            >
              <Eye className="h-4 w-4" />
              عرض الحجوزات السابقة
            </Button>
          )}
          
          <Button
            className="w-full gap-2 justify-start bg-blue-600 hover:bg-blue-700"
            onClick={handleCreateBooking}
          >
            <Plus className="h-4 w-4" />
            إنشاء حجز جديد
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            إلغاء
          </Button>
        </div>
      </Card>
    </div>
  );
};

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Search, AlertCircle, Eye } from "lucide-react";
import { useState, useMemo } from "react";
import { BookingDetailsPanel } from "@/components/BookingDetailsPanel";
import { toast } from "sonner";

export default function CancelledOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [restoreBookingId, setRestoreBookingId] = useState<number | null>(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch cancelled bookings
  const { data: cancelledBookings = [], isLoading, refetch } = trpc.bookings.getCancelledBookings.useQuery();

  // Restore booking mutation
  const restoreMutation = trpc.bookings.restoreBooking.useMutation({
    onSuccess: () => {
      toast.success("تم استرجاع الحجز بنجاح!");
      setRestoreBookingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء استرجاع الحجز");
    },
  });

  // Filter bookings based on search
  const filteredBookings = useMemo(() => {
    return cancelledBookings.filter((booking) =>
      booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerPhone.includes(searchTerm)
    );
  }, [cancelledBookings, searchTerm]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ar-JO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="w-8 h-8 text-red-500" />
          الحجوزات الملغاة
        </h1>
        <p className="text-foreground/60 mt-2">إدارة الحجوزات الملغاة واستعادتها</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <Input
            placeholder="ابحث برقم الحجز أو اسم العميل أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Cancelled Bookings Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-foreground/60">جاري التحميل...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-foreground/60">
            {cancelledBookings.length === 0
              ? "لا توجد حجوزات ملغاة"
              : "لم يتم العثور على نتائج"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الحجز</TableHead>
                <TableHead>اسم العميل</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>تاريخ الرحلة</TableHead>
                <TableHead>وقت الرحلة</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="bg-red-50 hover:bg-red-100">
                  <TableCell className="font-bold text-red-700">
                    {booking.bookingNumber}
                  </TableCell>
                  <TableCell>{booking.customerName}</TableCell>
                  <TableCell>{booking.customerPhone}</TableCell>
                  <TableCell>{formatDate(booking.pickupDateTime)}</TableCell>
                  <TableCell>{formatTime(booking.pickupDateTime)}</TableCell>
                  <TableCell className="font-semibold">
                    {booking.fare} د.ا
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-800 rounded text-sm">
                      <AlertCircle className="w-4 h-4" />
                      ملغى
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedBookingForDetails(booking);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRestoreBookingId(booking.id)}
                        className="gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        استرجاع
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Booking Details Panel */}
      {selectedBookingForDetails && (
        <BookingDetailsPanel
          booking={selectedBookingForDetails}
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedBookingForDetails(null);
          }}
        />
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreBookingId !== null} onOpenChange={(open) => {
        if (!open) setRestoreBookingId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>استرجاع الحجز</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من رغبتك في استرجاع هذا الحجز؟ سيعود الحجز إلى حالته الأصلية.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreBookingId) {
                  restoreMutation.mutate({ bookingId: restoreBookingId });
                }
              }}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "جاري الاسترجاع..." : "استرجاع"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

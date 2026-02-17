import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Download, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { formatDateTime } from "@/lib/dateFormatter";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "انتهاء الرحلة",
  cancelled: "إلغاء الرحلة",
  pending: "حجز الرحلة",
  in_progress: "جاري الرحلة",
  confirmed: "بدء الرحلة",
};

export default function BookingsArchive() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"thisWeek" | "thisMonth" | "lastWeek" | "lastMonth" | "year" | "all">("lastMonth");
  const [sortBy, setSortBy] = useState<"date" | "price">("date");

  // Fetch all bookings
  const { data: bookings = [], isLoading } = trpc.bookings.list.useQuery();
  const updateBooking = trpc.bookings.update.useMutation({
    onSuccess: () => {
      toast.success("تم استعادة الحجز بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء استعادة الحجز");
    },
  });

  // Filter and process data
  const archivedBookings = useMemo(() => {
    const now = new Date();
    // استخدام UTC للحصول على التاريخ الحالي بدون تأثر بـ timezone
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let rangeStart = new Date(Date.UTC(1900, 0, 1));
    let rangeEnd = new Date(Date.UTC(2100, 11, 31));

    if (dateRange === "thisWeek") {
      const dayOfWeek = today.getUTCDay();
      rangeStart = new Date(today);
      rangeStart.setUTCDate(today.getUTCDate() - dayOfWeek);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setUTCDate(rangeStart.getUTCDate() + 7);
    } else if (dateRange === "thisMonth") {
      rangeStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      rangeEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    } else if (dateRange === "lastWeek") {
      const dayOfWeek = today.getUTCDay();
      rangeEnd = new Date(today);
      rangeEnd.setUTCDate(today.getUTCDate() - dayOfWeek);
      rangeStart = new Date(rangeEnd);
      rangeStart.setUTCDate(rangeEnd.getUTCDate() - 7);
    } else if (dateRange === "lastMonth") {
      rangeStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      rangeEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    } else if (dateRange === "year") {
      rangeStart = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
      rangeEnd = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    }

    let filtered = bookings.filter((booking: any) => {
      // Only show past bookings
      const bookingEndDate = new Date(booking.dropoffDateTime);
      if (bookingEndDate > now) return false;

      // Filter by date range - compare dates only (ignore time)
      if (dateRange !== "all") {
        // استخدام UTC للحصول على التاريخ فقط بدون الوقت
        const bookingDateOnly = new Date(Date.UTC(
          bookingEndDate.getUTCFullYear(),
          bookingEndDate.getUTCMonth(),
          bookingEndDate.getUTCDate()
        ));
        
        const bookingTime = bookingDateOnly.getTime();
        const startTime = rangeStart.getTime();
        const endTime = rangeEnd.getTime();
        
        if (!(bookingTime >= startTime && bookingTime < endTime)) {
          return false;
        }
      }

      // Filter by status
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;

      // Filter by search term
      if (
        searchTerm &&
        !booking.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !booking.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !booking.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    // Sort
    if (sortBy === "date") {
      filtered.sort(
        (a: any, b: any) =>
          new Date(b.dropoffDateTime).getTime() - new Date(a.dropoffDateTime).getTime()
      );
    } else if (sortBy === "price") {
      filtered.sort((a: any, b: any) => (b.fare || 0) - (a.fare || 0));
    }

    return filtered;
  }, [bookings, statusFilter, searchTerm, dateRange, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = archivedBookings.filter((b: any) => b.status === "completed").length;
    const cancelled = archivedBookings.filter((b: any) => b.status === "cancelled").length;
    const totalRevenue = archivedBookings.reduce((sum: number, b: any) => sum + (parseFloat(b.fare) || 0), 0);

    return {
      total: archivedBookings.length,
      completed,
      cancelled,
      totalRevenue: totalRevenue || 0,
      averagePrice: archivedBookings.length > 0 ? (totalRevenue || 0) / archivedBookings.length : 0,
    };
  }, [archivedBookings]);

  const handleRestore = (booking: any) => {
    if (window.confirm("هل تريد استعادة هذا الحجز إلى الحالة السابقة؟")) {
      updateBooking.mutate({
        id: booking.id,
        ...booking,
        status: "pending",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const csv = [
      ["رقم الحجز", "من", "إلى", "التاريخ", "الحالة", "السعر"],
      ...archivedBookings.map((b: any) => [
        b.bookingNumber,
        b.pickupLocation,
        b.dropoffLocation,
        formatDateTime(b.dropoffDateTime),
        STATUS_LABELS[b.status] || b.status,
        b.fare,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", "bookings-archive.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-slate-900" />
            <h1 className="text-4xl font-bold text-slate-900">أرشيف الحجوزات</h1>
          </div>
          <p className="text-slate-600">إدارة الحجوزات المنتهية والمكتملة</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">إجمالي الحجوزات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-500 mt-1">في الأرشيف</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">المكتملة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">الملغاة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600">الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">د.ا {(stats.totalRevenue || 0).toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">
                متوسط: د.ا {(stats.averagePrice || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>الفلاتر والإجراءات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الفترة الزمنية</label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    <SelectItem value="thisWeek">هذا الأسبوع</SelectItem>
                    <SelectItem value="thisMonth">هذا الشهر</SelectItem>
                    <SelectItem value="lastWeek">أسبوع الماضي</SelectItem>
                    <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
                    <SelectItem value="year">السنة الماضية</SelectItem>
                    <SelectItem value="all">جميع الفترات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الحالة</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="completed">انتهاء الرحلة</SelectItem>
                    <SelectItem value="cancelled">إلغاء الرحلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الترتيب</label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    <SelectItem value="date">التاريخ (الأحدث أولاً)</SelectItem>
                    <SelectItem value="price">السعر (الأعلى أولاً)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">البحث</label>
                <Input
                  placeholder="ابحث عن موقع أو رقم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  تحميل
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الحجوزات المؤرشفة ({archivedBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {archivedBookings.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">لا توجد حجوزات مؤرشفة</p>
                <p className="text-slate-500 text-sm">الحجوزات المنتهية ستظهر هنا</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحجز</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>التاريخ والوقت</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedBookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                        <TableCell>{booking.pickupLocation}</TableCell>
                        <TableCell>{booking.dropoffLocation}</TableCell>
                        <TableCell>{formatDateTime(booking.pickupDateTime)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[booking.status] || ""}>
                            {STATUS_LABELS[booking.status] || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(booking.fare || 0)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(booking)}
                            className="gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            استعادة
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

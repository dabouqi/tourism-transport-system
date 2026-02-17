import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/dateFormatter";
import { formatCurrency } from "@/lib/formatters";
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
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle, XCircle, Clock, TrendingUp, Printer, Download } from "lucide-react";

const BOOKING_STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  cancelled: "#ef4444",
  pending: "#f59e0b",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  completed: "انتهاء الرحلة",
  cancelled: "إلغاء الرحلة",
  pending: "حجز الرحلة",
};

// استخدام formatDateTime من المكتبة بدلاً من دالة محلية

export default function CompletedBookingsReport() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<"thisWeek" | "thisMonth" | "lastWeek" | "lastMonth" | "lastYear" | "all">("all");

  // Fetch all bookings with calculated status
  const { data: bookings = [], isLoading } = trpc.bookingsStatus.listWithCalculatedStatus.useQuery();



  // Filter and process data
  const filteredBookings = useMemo(() => {
    const now = new Date();
    // استخدام UTC للحصول على التاريخ الحالي بدون تأثر بـ timezone
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    


    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    // حساب النطاق الزمني بشكل صحيح باستخدام UTC
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
    } else if (dateRange === "lastYear") {
      rangeStart = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
      rangeEnd = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    }

    const result = bookings
      .filter((booking: any) => {
        // فلتر: الحجوزات المنتهية فقط
        const dropoffDate = new Date(booking.dropoffDateTime);
        if (dropoffDate > now) return false;

        // فلتر: النطاق الزمني
        if (dateRange !== "all" && rangeStart && rangeEnd) {
          const dropoffDate = new Date(booking.dropoffDateTime);
          // استخدام UTC للحصول على التاريخ فقط بدون الوقت
          const bookingDateOnly = new Date(Date.UTC(
            dropoffDate.getUTCFullYear(),
            dropoffDate.getUTCMonth(),
            dropoffDate.getUTCDate()
          ));

          // مقارنة بالـ timestamps
          const bookingTime = bookingDateOnly.getTime();
          const startTime = rangeStart.getTime();
          const endTime = rangeEnd.getTime();

          if (!(bookingTime >= startTime && bookingTime < endTime)) {
            return false;
          }
        }

        // فلتر: الحالة
        if (statusFilter !== "all" && booking.calculatedStatus !== statusFilter) {
          return false;
        }

        // فلتر: البحث
        if (
          searchTerm &&
          !booking.pickupLocation.includes(searchTerm) &&
          !booking.dropoffLocation.includes(searchTerm) &&
          !booking.clientName?.includes(searchTerm)
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.dropoffDateTime).getTime() - new Date(a.dropoffDateTime).getTime()
      );



    return result;
  }, [bookings, statusFilter, searchTerm, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = filteredBookings.filter((b: any) => b.calculatedStatus === "completed").length;
    const cancelled = filteredBookings.filter((b: any) => b.calculatedStatus === "cancelled").length;
    const pending = filteredBookings.filter((b: any) => b.calculatedStatus === "pending").length;
    const totalRevenue = filteredBookings.reduce((sum: number, b: any) => sum + (Number(b.fare) || Number(b.price) || 0), 0);

    return {
      total: filteredBookings.length,
      completed,
      cancelled,
      pending,
      totalRevenue,
      completionRate: filteredBookings.length > 0 ? (completed / filteredBookings.length) * 100 : 0,
    };
  }, [filteredBookings]);

  // Prepare chart data
  const statusChartData = [
    { name: "مكتملة", value: stats.completed, fill: BOOKING_STATUS_COLORS.completed },
    { name: "ملغاة", value: stats.cancelled, fill: BOOKING_STATUS_COLORS.cancelled },
    { name: "معلقة", value: stats.pending, fill: BOOKING_STATUS_COLORS.pending },
  ].filter((item) => item.value > 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const csv = [
      ["رقم الحجز", "من", "إلى", "التاريخ", "الحالة", "السعر"],
      ...filteredBookings.map((b: any) => [
        b.id,
        b.pickupLocation,
        b.dropoffLocation,
        formatDateTime(b.pickupDateTime),
        BOOKING_STATUS_LABELS[b.calculatedStatus] || b.calculatedStatus,
        b.price,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", "completed-bookings-report.csv");
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">تقارير الحجوزات المنتهية</h1>
          <p className="text-slate-600">تتبع الحجوزات المكتملة والملغاة والمعلقة</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">إجمالي الحجوزات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-500 mt-1">في الفترة المحددة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                مكتملة
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                ملغاة
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                معلقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                الإيرادات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-slate-500 mt-1">إجمالي الإيرادات</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {statusChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>توزيع الحجوزات حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} حجزة`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إحصائيات الحالة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">نسبة الإنجاز</span>
                  <span className="text-2xl font-bold text-green-600">{stats.completionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">الفترة الزمنية</label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    <SelectItem value="thisWeek">هذا الأسبوع</SelectItem>
                    <SelectItem value="thisMonth">هذا الشهر</SelectItem>
                    <SelectItem value="lastWeek">أسبوع الماضي</SelectItem>
                    <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
                    <SelectItem value="lastYear">السنة الماضية</SelectItem>
                    <SelectItem value="all">جميع الفترات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الحالة</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="completed">انتهاء الرحلة</SelectItem>
                    <SelectItem value="cancelled">إلغاء الرحلة</SelectItem>
                    <SelectItem value="pending">حجز الرحلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">البحث</label>
                <Input
                  placeholder="ابحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-end">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  طباعة
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  تحميل
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الحجوزات المنتهية ({filteredBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الحجز</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.bookingNumber || booking.id}</TableCell>
                        <TableCell>{booking.pickupLocation}</TableCell>
                        <TableCell>{booking.dropoffLocation}</TableCell>
                        <TableCell>
                          {booking.dropoffDateTime ? formatDateTime(booking.dropoffDateTime) : formatDateTime(booking.pickupDateTime)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`${
                              booking.calculatedStatus === "completed"
                                ? "bg-green-100 text-green-800"
                                : booking.calculatedStatus === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {BOOKING_STATUS_LABELS[booking.calculatedStatus] || booking.calculatedStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(booking.fare || booking.price || 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        لا توجد حجوزات مطابقة للمعايير المحددة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

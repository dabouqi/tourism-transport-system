"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangeSelect } from "@/components/DateRangeSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Eye, Calendar, TrendingUp, Users, DollarSign, AlertCircle, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { formatDateTime, toDatetimeLocal } from "@/lib/dateFormatter";
import { BookingTrackingMap } from "@/components/BookingTrackingMap";

type DateRange = "today" | "week" | "nextWeek" | "month" | "custom" | "all";

export default function BookingsRefactored() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [bookingTab, setBookingTab] = useState<"all" | "active" | "completed">("active");
  const [showTracking, setShowTracking] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("id");
    if (bookingId) {
      setSelectedBookingId(parseInt(bookingId));
      setShowTracking(true);
    }
  }, []);

  const [formData, setFormData] = useState({
    clientId: undefined as number | undefined,
    bookingNumber: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    pickupLocation: "",
    dropoffLocation: "",
    pickupDateTime: new Date().toISOString().slice(0, 16),
    fare: "0",
    bookingSource: "internal" as "internal" | "talixo" | "get_transfer" | "transfeero",
    status: "pending" as "pending" | "confirmed" | "in_progress" | "completed" | "cancelled",
    notes: "",
    programDays: "",
    programEndDate: "",
    flightNumber: "",
    sendWhatsApp: false,
    passengerCount: "",
    passengerNames: "",
  });

  const clients = trpc.clients.list.useQuery();
  const bookings = trpc.bookings.listWithCalculatedStatus.useQuery();
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();
  const bookingWithTracking = trpc.bookings.getWithTracking.useQuery(
    { id: selectedBookingId || 0 },
    { enabled: !!selectedBookingId && showTracking }
  );
  
  const utils = trpc.useUtils();
  
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: tomorrow };
    } else if (dateRange === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: weekAgo, end: tomorrow };
    } else if (dateRange === "nextWeek") {
      // الأسبوع القادم: من غد إلى غد + 7 أيام
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeekEnd = new Date(tomorrow);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
      return { start: tomorrow, end: nextWeekEnd };
    } else if (dateRange === "month") {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { start: firstDayOfMonth, end: firstDayOfNextMonth };
    } else if (dateRange === "all") {
      // عرض جميع الحجوزات بدون تصفية زمنية
      return { start: new Date(1970, 0, 1), end: new Date(2099, 11, 31) };
    } else {
      return {
        start: customStartDate ? new Date(customStartDate) : today,
        end: customEndDate ? new Date(customEndDate) : new Date(),
      };
    }
  };

  const dateRangeForTotals = useMemo(() => {
    const range = getDateRange();
    return { startDate: range.start, endDate: range.end };
  }, [dateRange, customStartDate, customEndDate]);
  
  const bookingsTotals = trpc.bookings.getTotals.useQuery(dateRangeForTotals);
  
  const createBooking = trpc.bookings.create.useMutation();
  const updateBooking = trpc.bookings.update.useMutation({
    onSuccess: (result) => {
      if (result.priceChanged) {
        utils.bookings.list.invalidate();
        utils.receivables.list.invalidate();
        utils.invoices.getAll.invalidate();
        utils.transactions.list.invalidate();
        utils.dashboard.getTotalReceivables.invalidate();
        utils.dashboard.getStats.invalidate();
      }
    }
  });
  const deleteBooking = trpc.bookings.delete.useMutation();

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const { start, end } = getDateRange();

    const filtered = (bookings.data || []).filter((booking: any) => {
      const bookingDate = new Date(booking.pickupDateTime);
      const matchesDateRange = bookingDate >= start && bookingDate <= end;
      const matchesSearch = searchText === "" || 
        booking.bookingNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
        booking.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
        booking.pickupLocation?.toLowerCase().includes(searchText.toLowerCase());

      // استخدام status والفترة الزمنية للفلترة
      if (bookingTab === "all") {
        return matchesSearch && matchesDateRange;
      }

      if (bookingTab === "active") {
        return matchesSearch && matchesDateRange && ["pending", "confirmed", "in_progress"].includes(booking.calculatedStatus || booking.status);
      } else if (bookingTab === "completed") {
        return matchesSearch && matchesDateRange && (booking.calculatedStatus || booking.status) === "completed";
      }
      return matchesSearch && matchesDateRange;
    });

    // Sort by date descending (newest date first)
    return filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.pickupDateTime).getTime();
      const dateB = new Date(b.pickupDateTime).getTime();
      return dateB - dateA;
    });
  }, [bookings.data, dateRange, customStartDate, customEndDate, searchText, bookingTab]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const data = bookings.data || [];
    const now = new Date();
    
    // حساب الذمم المستحقة من الحجوزات غير المكتملة
    const totalReceivables = data
      .filter((b: any) => b.status !== 'completed' && b.status !== 'cancelled')
      .reduce((sum: number, b: any) => sum + (Number(b.fare) || 0), 0);
    return {
      total: data.length,
      active: data.filter((b: any) => new Date(b.pickupDateTime) > now).length,
      completed: data.filter((b: any) => new Date(b.pickupDateTime) <= now).length,
      totalRevenue: data.reduce((sum: number, b: any) => sum + (Number(b.fare) || 0), 0),
      avgFare: data.length > 0 ? data.reduce((sum: number, b: any) => sum + (Number(b.fare) || 0), 0) / data.length : 0,
      totalReceivables: totalReceivables,
    };
  }, [bookings.data]);

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.customerName.trim()) {
        toast.error("اسم العميل مطلوب");
        return;
      }
      if (!formData.customerPhone.trim()) {
        toast.error("رقم الهاتف مطلوب");
        return;
      }
      if (!formData.pickupLocation.trim()) {
        toast.error("موقع الاستقبال مطلوب");
        return;
      }
      if (!formData.dropoffLocation.trim()) {
        toast.error("موقع الإنزال مطلوب");
        return;
      }
      
      const fareValue = parseFloat(formData.fare);
      if (isNaN(fareValue) || fareValue <= 0) {
        toast.error("المبلغ مطلوب ويجب أن يكون أكبر من صفر");
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

      if (editingId) {
        await updateBooking.mutateAsync({ id: editingId, ...dataToSend });
        toast.success("تم تحديث الحجز بنجاح");
      } else {
        await createBooking.mutateAsync(dataToSend);
        toast.success("تم إنشاء الحجز بنجاح");
      }

      setIsOpen(false);
      setEditingId(null);
      setFormData({
        clientId: undefined,
        bookingNumber: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        pickupLocation: "",
        dropoffLocation: "",
        pickupDateTime: new Date().toISOString().slice(0, 16),
        fare: "0",
        bookingSource: "internal",
        status: "pending",
        notes: "",
        programDays: "",
        programEndDate: "",
        flightNumber: "",
        sendWhatsApp: false,
        passengerCount: "",
        passengerNames: "",
      });
    } catch (error) {
      toast.error(editingId ? "فشل تحديث الحجز" : "فشل إنشاء الحجز");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBooking.mutateAsync({ id });
      toast.success("تم حذف الحجز بنجاح");
    } catch (error) {
      toast.error("فشل حذف الحجز");
    }
  };

  const cancelBookingMutation = trpc.bookings.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الحجز بنجاح");
      bookings.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إلغاء الحجز");
    },
  });

  const handleCancelBooking = async (id: number) => {
    if (confirm("هل أنت متأكد من رغبتك في إلغاء هذا الحجز")) {
      await cancelBookingMutation.mutateAsync({ bookingId: id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "حجز الرحلة",
      confirmed: "بدء الرحلة",
      in_progress: "جاري الرحلة",
      completed: "انتهاء الرحلة",
      cancelled: "إلغاء الرحلة",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6 p-6">
      {/* العنوان والزر */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة الحجوزات</h1>
          <p className="text-gray-600 mt-1">إدارة جميع حجوزات النقل والرحلات السياحية</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 ml-2" />
              حجز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل الحجز" : "إنشاء حجز جديد"}</DialogTitle>
              <DialogDescription>{editingId ? "قم بتعديل بيانات الحجز" : "أضف حجز جديد للنظام"}</DialogDescription>
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
                <Select value={formData.clientId?.toString() || ""} onValueChange={(value) => {
                  const client = clients.data?.find(c => c.id === parseInt(value));
                  setFormData({
                    ...formData,
                    clientId: parseInt(value),
                    customerName: client?.name || "",
                    customerPhone: client?.phone || "",
                    customerEmail: client?.email || ""
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
                <Button variant="outline" onClick={() => {
                  setIsOpen(false);
                  setEditingId(null);
                }}>إلغاء</Button>
                <Button onClick={() => handleSave()}>حفظ</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">إجمالي الحجوزات</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">الحجوزات النشطة</p>
                <p className="text-3xl font-bold mt-2">{stats.active}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">الحجوزات المكتملة</p>
                <p className="text-3xl font-bold mt-2">{stats.completed}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">إجمالي الإيرادات</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">إجمالي الذمم المستحقة</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(stats.totalReceivables)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Split Receivables Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-purple-700">الذمم الحالية</p>
                <p className="text-2xl font-bold text-purple-600">د.ا {(splitReceivables.data?.current ?? 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100"><AlertCircle className="w-6 h-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-700">الذمم المستقبلية</p>
                <p className="text-2xl font-bold text-blue-600">د.ا {(splitReceivables.data?.future ?? 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100"><AlertCircle className="w-6 h-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">الفترة الزمنية</Label>
              <DateRangeSelect
                value={dateRange}
                onChange={(value: any) => setDateRange(value)}
                options={[
                  { value: "today", label: "اليوم" },
                  { value: "week", label: "الأسبوع الماضي" },
                  { value: "nextWeek", label: "الأسبوع القادم" },
                  { value: "month", label: "هذا الشهر" },
                  { value: "all", label: "الجميع" },
                  { value: "custom", label: "مخصص" },
                ]}
              />
            </div>

            {dateRange === "custom" && (
              <>
                <div>
                  <Label className="text-sm font-medium">من التاريخ</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">إلى التاريخ</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <Label className="text-sm font-medium">البحث</Label>
            <Input
              placeholder="ابحث عن رقم حجز أو اسم عميل..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* التبويبات والجدول */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={bookingTab} onValueChange={(value: any) => setBookingTab(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">النشطة</TabsTrigger>
              <TabsTrigger value="all">جميعها</TabsTrigger>
              <TabsTrigger value="completed">المكتملة</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحجز</TableHead>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                          لا توجد حجوزات نشطة
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking: any) => {
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                            <TableCell>{booking.customerName}</TableCell>
                            <TableCell>{booking.clientName || '-'}</TableCell>
                            <TableCell>{booking.pickupLocation}</TableCell>
                            <TableCell>{booking.dropoffLocation}</TableCell>
                            <TableCell>{formatDateTime(booking.pickupDateTime)}</TableCell>
                            <TableCell>{formatCurrency(booking.fare)}</TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.calculatedStatus || booking.status)}`}>
                                {getStatusLabel(booking.calculatedStatus || booking.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSelectedBookingForDetails(booking);
                                  setShowDetailsDialog(true);
                                }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setFormData({
                                    clientId: booking.clientId,
                                    bookingNumber: booking.bookingNumber,
                                    customerName: booking.customerName,
                                    customerPhone: booking.customerPhone,
                                    customerEmail: booking.customerEmail,
                                    pickupLocation: booking.pickupLocation,
                                    dropoffLocation: booking.dropoffLocation,
                                    pickupDateTime: toDatetimeLocal(booking.pickupDateTime),
                                    fare: booking.fare?.toString() || "0",
                                    bookingSource: booking.bookingSource,
                                    status: booking.status,
                                    notes: booking.notes,
                                    programDays: booking.programDays?.toString() || "",
                                    programEndDate: booking.programEndDate ? new Date(booking.programEndDate).toISOString().split('T')[0] : "",
                                  });
                                  setEditingId(booking.id);
                                  setIsOpen(true);
                                }}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(booking.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="text-orange-500 hover:text-orange-700"
                                  title="إلغاء الحجز"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحجز</TableHead>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                          لا توجد حجوزات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking: any) => {
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                            <TableCell>{booking.customerName}</TableCell>
                            <TableCell>{booking.clientName || '-'}</TableCell>
                            <TableCell>{booking.pickupLocation}</TableCell>
                            <TableCell>{booking.dropoffLocation}</TableCell>
                            <TableCell>{formatDateTime(booking.pickupDateTime)}</TableCell>
                            <TableCell>{formatCurrency(booking.fare)}</TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.calculatedStatus || booking.status)}`}>
                                {getStatusLabel(booking.calculatedStatus || booking.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSelectedBookingForDetails(booking);
                                  setShowDetailsDialog(true);
                                }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setFormData({
                                    clientId: booking.clientId,
                                    bookingNumber: booking.bookingNumber,
                                    customerName: booking.customerName,
                                    customerPhone: booking.customerPhone,
                                    customerEmail: booking.customerEmail,
                                    pickupLocation: booking.pickupLocation,
                                    dropoffLocation: booking.dropoffLocation,
                                    pickupDateTime: toDatetimeLocal(booking.pickupDateTime),
                                    fare: booking.fare?.toString() || "0",
                                    bookingSource: booking.bookingSource,
                                    status: booking.status,
                                    notes: booking.notes,
                                    programDays: booking.programDays?.toString() || "",
                                    programEndDate: booking.programEndDate ? new Date(booking.programEndDate).toISOString().split('T')[0] : "",
                                  });
                                  setEditingId(booking.id);
                                  setIsOpen(true);
                                }}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(booking.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="text-orange-500 hover:text-orange-700"
                                  title="إلغاء الحجز"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحجز</TableHead>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                          لا توجد حجوزات مكتملة
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking: any) => {
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                            <TableCell>{booking.customerName}</TableCell>
                            <TableCell>{booking.clientName || '-'}</TableCell>
                            <TableCell>{booking.pickupLocation}</TableCell>
                            <TableCell>{booking.dropoffLocation}</TableCell>
                            <TableCell>{formatDateTime(booking.pickupDateTime)}</TableCell>
                            <TableCell>{formatCurrency(booking.fare)}</TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.calculatedStatus || booking.status)}`}>
                                {getStatusLabel(booking.calculatedStatus || booking.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSelectedBookingForDetails(booking);
                                  setShowDetailsDialog(true);
                                }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setFormData({
                                    clientId: booking.clientId,
                                    bookingNumber: booking.bookingNumber,
                                    customerName: booking.customerName,
                                    customerPhone: booking.customerPhone,
                                    customerEmail: booking.customerEmail,
                                    pickupLocation: booking.pickupLocation,
                                    dropoffLocation: booking.dropoffLocation,
                                    pickupDateTime: toDatetimeLocal(booking.pickupDateTime),
                                    fare: booking.fare?.toString() || "0",
                                    bookingSource: booking.bookingSource,
                                    status: booking.status,
                                    notes: booking.notes,
                                    programDays: booking.programDays?.toString() || "",
                                    programEndDate: booking.programEndDate ? new Date(booking.programEndDate).toISOString().split('T')[0] : "",
                                  });
                                  setEditingId(booking.id);
                                  setIsOpen(true);
                                }}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(booking.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="text-orange-500 hover:text-orange-700"
                                  title="إلغاء الحجز"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Totals Summary */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">إجمالي الحجوزات النشطة</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(bookingsTotals.data?.active || 0)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">إجمالي الحجوزات المكتملة</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(bookingsTotals.data?.completed || 0)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">إجمالي جميع الحجوزات</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(bookingsTotals.data?.total || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog عرض التتبع */}
      <Dialog open={showTracking} onOpenChange={setShowTracking}>
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تتبع المركبة - الحجز #{selectedBookingId}</DialogTitle>
            <DialogDescription>عرض موقع المركبة الحالي</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {bookingWithTracking.isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">جاري تحميل بيانات التتبع...</p>
              </div>
            ) : bookingWithTracking.data ? (
              <BookingTrackingMap
                vehicle={bookingWithTracking.data.vehicle}
                tracking={bookingWithTracking.data.tracking}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">لم يتم العثور على بيانات التتبع</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الحجز</DialogTitle>
            <DialogDescription>معلومات كاملة عن الحجز</DialogDescription>
          </DialogHeader>
          {selectedBookingForDetails && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">رقم الحجز</Label>
                  <p className="text-lg font-semibold">{selectedBookingForDetails.bookingNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">الحالة</Label>
                  <p className="text-lg font-semibold">{getStatusLabel(selectedBookingForDetails.calculatedStatus || selectedBookingForDetails.status)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-base mb-3">بيانات العميل</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">الاسم</Label>
                    <p className="text-base">{selectedBookingForDetails.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">الهاتف</Label>
                    <p className="text-base">{selectedBookingForDetails.customerPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-600">البريد الإلكتروني</Label>
                    <p className="text-base">{selectedBookingForDetails.customerEmail || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-base mb-3">تفاصيل الرحلة</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">رقم الرحلة</Label>
                    <p className="text-base font-semibold text-blue-600">{selectedBookingForDetails.flightNumber || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">من</Label>
                    <p className="text-base">{selectedBookingForDetails.pickupLocation}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">إلى</Label>
                    <p className="text-base">{selectedBookingForDetails.dropoffLocation}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">تاريخ الاستقبال</Label>
                    <p className="text-base">{formatDateTime(selectedBookingForDetails.pickupDateTime)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">المبلغ</Label>
                    <p className="text-base font-semibold text-green-600">{formatCurrency(selectedBookingForDetails.fare)}</p>
                  </div>
                </div>
              </div>

              {(selectedBookingForDetails.passengerCount || selectedBookingForDetails.passengerNames) && (
                <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-base mb-3">تفاصيل الركاب</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedBookingForDetails.passengerCount && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">عدد الركاب</Label>
                        <p className="text-lg font-semibold text-blue-600">{selectedBookingForDetails.passengerCount}</p>
                      </div>
                    )}
                    {selectedBookingForDetails.passengerNames && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-600">أسماء الركاب</Label>
                        <p className="text-base whitespace-pre-wrap">{selectedBookingForDetails.passengerNames}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedBookingForDetails.notes && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-gray-600">ملاحظات</Label>
                  <p className="text-base whitespace-pre-wrap">{selectedBookingForDetails.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

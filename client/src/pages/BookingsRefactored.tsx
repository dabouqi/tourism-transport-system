"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Eye, Calendar, TrendingUp, Users, DollarSign, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { formatDateTime } from "@/lib/dateFormatter";

type DateRange = "today" | "week" | "month" | "custom";

export default function BookingsRefactored() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [bookingTab, setBookingTab] = useState<"all" | "active" | "completed">("active");

  const [formData, setFormData] = useState({
    clientId: undefined as number | undefined,
    bookingNumber: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    pickupLocation: "",
    dropoffLocation: "",
    pickupDateTime: new Date().toISOString().slice(0, 16),
    fare: "",
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

  const bookings = trpc.bookings.list.useQuery();
  const clients = trpc.clients.list.useQuery();
  const createBooking = trpc.bookings.create.useMutation();
  const updateBooking = trpc.bookings.update.useMutation();
  const deleteBooking = trpc.bookings.delete.useMutation();

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
    } else if (dateRange === "month") {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { start: firstDayOfMonth, end: firstDayOfNextMonth };
    } else {
      return {
        start: customStartDate ? new Date(customStartDate) : today,
        end: customEndDate ? new Date(customEndDate) : new Date(),
      };
    }
  };

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const { start, end } = getDateRange();

    return (bookings.data || []).filter((booking: any) => {
      const bookingDate = new Date(booking.pickupDateTime);
      const matchesDateRange = bookingDate >= start && bookingDate <= end;
      const matchesSearch = searchText === "" || 
        booking.bookingNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
        booking.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
        booking.pickupLocation?.toLowerCase().includes(searchText.toLowerCase());

      if (bookingTab === "active") {
        return matchesDateRange && matchesSearch && bookingDate > now;
      } else if (bookingTab === "completed") {
        return matchesDateRange && matchesSearch && bookingDate <= now;
      }
      return matchesDateRange && matchesSearch;
    });
  }, [bookings.data, dateRange, customStartDate, customEndDate, searchText, bookingTab]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const data = bookings.data || [];
    const now = new Date();
    
    return {
      total: data.length,
      active: data.filter((b: any) => new Date(b.pickupDateTime) > now).length,
      completed: data.filter((b: any) => new Date(b.pickupDateTime) <= now).length,
      totalRevenue: data.reduce((sum: number, b: any) => sum + (b.fare || 0), 0),
      avgFare: data.length > 0 ? data.reduce((sum: number, b: any) => sum + (b.fare || 0), 0) / data.length : 0,
    };
  }, [bookings.data]);

  const handleCreate = async () => {
    try {
      const dataToSend = {
        ...formData,
        pickupDateTime: new Date(formData.pickupDateTime),
        programEndDate: formData.programEndDate ? new Date(formData.programEndDate) : undefined,
        fare: parseFloat(formData.fare) || 0,
        programDays: parseInt(formData.programDays) || 0,
      };
      await createBooking.mutateAsync(dataToSend);
      toast.success("تم إنشاء الحجز بنجاح");
      setIsOpen(false);
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
      });
    } catch (error) {
      toast.error("فشل إنشاء الحجز");
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
              <DialogTitle>إنشاء حجز جديد</DialogTitle>
            </DialogHeader>
            {/* محتوى النموذج */}
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
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">الفترة الزمنية</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">الأسبوع الماضي</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">البحث</Label>
              <Input
                placeholder="ابحث عن رقم حجز أو اسم عميل..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
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
        </CardContent>
      </Card>

      {/* الجدول */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>الحجوزات ({filteredBookings.length})</span>
            <Tabs value={bookingTab} onValueChange={(value: any) => setBookingTab(value)}>
              <TabsList>
                <TabsTrigger value="active">النشطة</TabsTrigger>
                <TabsTrigger value="all">جميعها</TabsTrigger>
                <TabsTrigger value="completed">المكتملة</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-right">رقم الحجز</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">من</TableHead>
                  <TableHead className="text-right">إلى</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      لا توجد حجوزات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking: any) => {
                    const clientName = clients.data?.find((c: any) => c.id === booking.clientId)?.name || booking.customerName;
                    return (
                      <TableRow key={booking.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                        <TableCell>{clientName}</TableCell>
                        <TableCell className="text-sm">{booking.pickupLocation}</TableCell>
                        <TableCell className="text-sm">{booking.dropoffLocation}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(booking.pickupDateTime)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(booking.fare)}</TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {getStatusLabel(booking.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(booking.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
        </CardContent>
      </Card>
    </div>
  );
}

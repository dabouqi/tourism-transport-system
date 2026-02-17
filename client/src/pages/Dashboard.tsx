import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Calendar,
  Truck,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Users,
  BookOpen,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MonthlyFinancialSummary } from "@/components/MonthlyFinancialSummary";
import { CompactMonthlyFinancialSummary } from "@/components/CompactMonthlyFinancialSummary";
import { Calendar as CalendarComponent } from "@/components/Calendar";
import { BookingDetailsPanel } from "@/components/BookingDetailsPanel";
import { BookingFormModal } from "@/components/BookingFormModal";
import { CalendarDateActionMenu } from "@/components/CalendarDateActionMenu";
import { useState } from "react";
import React from "react";

// Sample data for charts
const revenueData = [
  { date: "1", revenue: 2400, expense: 1200 },
  { date: "2", revenue: 2210, expense: 1300 },
  { date: "3", revenue: 2290, expense: 1100 },
  { date: "4", revenue: 2000, expense: 1400 },
  { date: "5", revenue: 2181, expense: 1200 },
  { date: "6", revenue: 2500, expense: 1300 },
  { date: "7", revenue: 2100, expense: 1500 },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<Date | undefined>();
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ date: Date; hasBookings: boolean } | null>(null);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const dashboardStats = trpc.dashboard.getStats.useQuery();
  const recentAlerts = trpc.dashboard.getRecentAlerts.useQuery();
  const totalReceivables = trpc.dashboard.getTotalReceivables.useQuery(undefined, { refetchInterval: 5000 });
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery(undefined, { refetchInterval: 5000 });
  const bookingsQuery = trpc.bookings.list.useQuery();
  const monthlyRevenueQuery = trpc.dashboard.monthlyRevenue.useQuery();
  const monthlyExpensesQuery = trpc.dashboard.monthlyExpenses.useQuery();
  const futureOperationsQuery = trpc.dashboard.futureOperations.useQuery();
  const cancelBookingMutation = trpc.bookings.cancelBooking.useMutation({
    onSuccess: () => {
      bookingsQuery.refetch();
    },
  });

  const stats = dashboardStats.data || {
    todayBookings: 0,
    activeVehicles: 0,
    todayRevenue: 0,
    pendingOperations: 0,
  };

  const receivables = typeof totalReceivables.data === 'number' ? totalReceivables.data : 0;
  const currentReceivables = splitReceivables.data?.current ?? 0;
  const futureReceivables = splitReceivables.data?.future ?? 0;
  const monthlyRevenue = monthlyRevenueQuery.data ?? 0;
  const monthlyExpenses = monthlyExpensesQuery.data ?? 0;
  const futureOperations = futureOperationsQuery.data ?? [];

  const alerts = recentAlerts.data || [];

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-600 mb-0.5 truncate">{label}</p>
            <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
          </div>
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${color}`}>{Icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">

      
      <BookingFormModal
        isOpen={showBookingForm}
        onClose={() => {
          setShowBookingForm(false);
          setPrefilledDate(undefined);
          setEditingBooking(null);
        }}
        prefilledDate={prefilledDate}
        editingBooking={editingBooking}
        onSuccess={() => {
          setShowDateMenu(false);
          setEditingBooking(null);
        }}
      />
      
      {showDateMenu && selectedDate && (
        <CalendarDateActionMenu
          date={selectedDate.date.getDate()}
          month={selectedDate.date.getMonth()}
          year={selectedDate.date.getFullYear()}
          hasBookings={selectedDate.hasBookings}
          onCreateBooking={(date) => {
            setPrefilledDate(date);
            setShowBookingForm(true);
          }}
          onViewBookings={() => {
            // This would show the bookings for that date
            // For now, we'll just close the menu
            setShowDateMenu(false);
          }}
          onClose={() => setShowDateMenu(false)}
        />
      )}
      {/* Compact Monthly Summary */}
      <CompactMonthlyFinancialSummary />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم</h1>
          <p className="text-slate-600 mt-1">مرحباً بك في نظام إدارة النقل</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setLocation("/bookings")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            حجز جديد
          </Button>
          <Button
            onClick={() => setLocation("/fleet")}
            variant="outline"
            className="border-slate-300"
          >
            إضافة مركبة
          </Button>
        </div>
      </div>


      {/* Calendar and Details Section */}
      <div className="w-full">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">رزنامة الحجوزات</h2>
          <CalendarComponent 
            bookings={bookingsQuery.data || []} 
            onBookingClick={(booking) => {
              // When clicking a booking in calendar, show details panel
              setSelectedBooking(booking);
              setEditingBooking(null);
            }}
            onDateClick={(date, hasBookings) => {
              if (!hasBookings) {
                // If no bookings, open form directly
                setPrefilledDate(date);
                setShowBookingForm(true);
                setSelectedBooking(null);
              } else {
                // If has bookings, show details panel
                setSelectedDate({ date, hasBookings });
                setShowDateMenu(true);
              }
            }}
            onCancelBooking={(bookingId) => {
              cancelBookingMutation.mutate({ bookingId });
            }}
          />
        </div>
      </div>
      
      {/* Booking Details Panel as Modal Overlay */}
      {selectedBooking && (
        <BookingDetailsPanel
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onAddNewBooking={() => {
            setShowBookingForm(true);
            setPrefilledDate(undefined);
          }}
          onEdit={() => {
            setEditingBooking(selectedBooking);
            setShowBookingForm(true);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginTop: selectedBooking ? '2rem' : '0' }}>
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              اتجاهات الإيرادات والمصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="الإيرادات"
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="المصروفات"
                  dot={{ fill: "#ef4444", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">إحصائيات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-700">الحجوزات</span>
              </div>
              <span className="font-bold text-slate-900">{dashboardStats.data?.todayBookings || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-700">المركبات</span>
              </div>
              <span className="font-bold text-slate-900">{dashboardStats.data?.activeVehicles || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-700">السائقين</span>
              </div>
              <span className="font-bold text-slate-900">{dashboardStats.data?.activeVehicles || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-slate-700">الصيانة</span>
              </div>
              <span className="font-bold text-slate-900">{dashboardStats.data?.pendingOperations || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Financial Summary */}
      <MonthlyFinancialSummary />

      {/* Alerts Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            التنبيهات والإشعارات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === "critical"
                      ? "bg-red-50 border-red-500"
                      : alert.severity === "high"
                        ? "bg-orange-50 border-orange-500"
                        : alert.severity === "medium"
                          ? "bg-yellow-50 border-yellow-500"
                          : "bg-blue-50 border-blue-500"
                  }`}
                >
                  <p className="font-medium text-slate-900">{alert.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">لا توجد تنبيهات حالية</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

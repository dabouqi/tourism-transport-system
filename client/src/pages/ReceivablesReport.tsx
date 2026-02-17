import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { AlertCircle, DollarSign, Users, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/dateFormatter";
import { formatCurrency } from "@/lib/formatters";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const CHART_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

export default function ReceivablesReport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const receivablesData = trpc.receivables.getAllWithCustomers.useQuery();
  const statsData = trpc.receivables.getStats.useQuery();
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();

  const receivables = receivablesData.data || [];
  const stats = statsData.data || {
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    totalAmount: 0,
    remainingAmount: 0,
  };

  // Filter receivables
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r: any) => {
      const matchesSearch =
        !searchTerm ||
        r.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clientPhone?.includes(searchTerm) ||
        r.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.bookingNumber?.includes(searchTerm);

      const matchesStatus = !statusFilter || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [receivables, searchTerm, statusFilter]);

  // Prepare chart data
  const statusChartData = [
    { name: "مستحقة", value: stats.pending, color: "#f59e0b" },
    { name: "جزئية", value: stats.partial, color: "#3b82f6" },
    { name: "مدفوعة", value: stats.paid, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const amountChartData = [
    { name: "إجمالي المبلغ", value: stats.totalAmount },
    { name: "المبلغ المتبقي", value: stats.remainingAmount },
  ];

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
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>{Icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">تقرير الذمم</h1>
          <p className="text-slate-600 mt-1">عرض شامل لجميع الذمم المستحقة</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertCircle className="w-6 h-6 text-yellow-600" />}
          label="إجمالي الذمم"
          value={stats.total}
          color="bg-yellow-100"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
          label="المبلغ الكلي"
          value={formatCurrency(stats.totalAmount)}
          color="bg-emerald-100"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-red-600" />}
          label="المبلغ المتبقي"
          value={formatCurrency(stats.remainingAmount)}
          color="bg-red-100"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          label="العملاء"
          value={new Set(receivables.map((r: any) => r.clientId)).size}
          color="bg-blue-100"
        />
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>توزيع الحالات</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* Amount Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>توزيع المبالغ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={amountChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder="ابحث عن العميل أو رقم الحجز أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">مستحقة</option>
              <option value="partial">جزئية</option>
              <option value="paid">مدفوعة</option>
              <option value="overdue">متأخرة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
          <p className="text-sm text-slate-600">
            عدد النتائج: {filteredReceivables.length} من {receivables.length}
          </p>
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>قائمة الذمم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المبلغ الكلي</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivables.length > 0 ? (
                  filteredReceivables.map((receivable: any) => (
                    <TableRow key={receivable.id}>
                      <TableCell className="font-medium">
                        {receivable.clientName || "غير محدد"}
                      </TableCell>
                      <TableCell>{receivable.bookingNumber || "-"}</TableCell>
                      <TableCell>{receivable.clientPhone || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {receivable.clientEmail || "-"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(receivable.amount)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(receivable.remainingAmount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_COLORS[
                              receivable.status as keyof typeof STATUS_COLORS
                            ] || "bg-gray-100"
                          }`}
                        >
                          {receivable.status === "pending"
                            ? "مستحقة"
                            : receivable.status === "partial"
                              ? "جزئية"
                              : receivable.status === "paid"
                                ? "مدفوعة"
                                : receivable.status === "overdue"
                                  ? "متأخرة"
                                  : "ملغاة"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {receivable.dueDate
                          ? formatDate(new Date(receivable.dueDate))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {receivable.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-slate-500">لا توجد ذمم مطابقة</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateFormatter";
import { formatCurrency } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

export default function OverdueReceivables() {
  const [searchCustomer, setSearchCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");

  // Fetch overdue receivables
  const { data: overdueData = [], isLoading: isLoadingOverdue } = trpc.receivables.getOverdue.useQuery({
    daysOverdue: 0,
  });

  // Fetch overdue stats
  const { data: stats = { totalOverdue: 0, count: 0, averageOverdue: 0 }, isLoading: isLoadingStats } = trpc.receivables.getOverdueStats.useQuery();

  // Fetch split receivables
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = overdueData;

    if (searchCustomer) {
      filtered = filtered.filter(
        (item) =>
          item.customerName?.toLowerCase().includes(searchCustomer.toLowerCase()) ||
          item.customerPhone?.includes(searchCustomer) ||
          item.customerEmail?.toLowerCase().includes(searchCustomer.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Sort
    if (sortBy === "daysOverdue") {
      filtered.sort((a, b) => ((b as any).daysOverdue || 0) - ((a as any).daysOverdue || 0));
    } else if (sortBy === "amount") {
      filtered.sort((a, b) => Number(b.remainingAmount) - Number(a.remainingAmount));
    } else if (sortBy === "dueDate") {
      filtered.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [overdueData, searchCustomer, filterStatus, sortBy]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
                  filteredData.forEach((item) => {
                    const days = (item as any).daysOverdue || 0;
                    const range = days <= 7 ? "0-7 أيام" : days <= 30 ? "8-30 يوم" : days <= 90 ? "31-90 يوم" : "أكثر من 90 يوم";
                    grouped[range] = (grouped[range] || 0) + Number(item.remainingAmount);
                  });

    return Object.entries(grouped).map(([range, amount]) => ({
      name: range,
      amount: Number(amount),
    }));
  }, [filteredData]);

  // Prepare status distribution
  const statusData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach((item) => {
      grouped[item.status] = (grouped[item.status] || 0) + 1;
    });

    return Object.entries(grouped).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [filteredData]);

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  if (isLoadingOverdue || isLoadingStats) {
    return <div className="p-6 text-center">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الذمم المتأخرة</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع وإدارة الذمم المستحقة المتأخرة</p>
        </div>
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المبلغ المتأخر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOverdue)}</div>
            <p className="text-xs text-muted-foreground mt-1">من {stats.count} ذمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">عدد الذمم المتأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
            <p className="text-xs text-muted-foreground mt-1">ذمة مستحقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">متوسط الأيام المتأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageOverdue}</div>
            <p className="text-xs text-muted-foreground mt-1">يوم في المتوسط</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع الذمم حسب الأيام المتأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="amount" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع الحالات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">التصفية والبحث</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">البحث عن عميل</label>
              <Input
                placeholder="اسم العميل أو الهاتف أو البريد"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الحالة</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">مستحقة</SelectItem>
                  <SelectItem value="partial">جزئية</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">الترتيب</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daysOverdue">الأيام المتأخرة (الأكثر أولاً)</SelectItem>
                  <SelectItem value="amount">المبلغ (الأعلى أولاً)</SelectItem>
                  <SelectItem value="dueDate">تاريخ الاستحقاق (الأقدم أولاً)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">قائمة الذمم المتأخرة ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الأيام المتأخرة</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      لا توجد ذمم متأخرة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.customerName || "غير محدد"}</TableCell>
                      <TableCell>{item.customerPhone || "-"}</TableCell>
                      <TableCell>{item.dueDate ? formatDate(item.dueDate) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={(item as any).daysOverdue! > 90 ? "destructive" : (item as any).daysOverdue! > 30 ? "default" : "secondary"}>
                          {(item as any).daysOverdue} يوم
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(item.remainingAmount))}</TableCell>
                      <TableCell>
                        {item.status === "pending" && (
                          <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">قيد المتابعة</Badge>
                        )}
                        {item.status === "partial" && (
                          <Badge className="bg-blue-500 text-white hover:bg-blue-600">دفع جزئي</Badge>
                        )}
                        {item.status === "paid" && (
                          <Badge className="bg-green-500 text-white hover:bg-green-600">تمت التسوية</Badge>
                        )}
                        {item.status === "overdue" && (
                          <Badge className="bg-red-500 text-white hover:bg-red-600">متأخرة</Badge>
                        )}
                        {item.status === "cancelled" && (
                          <Badge className="bg-gray-500 text-white hover:bg-gray-600">ملغاة</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "pending" ? "destructive" : "secondary"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

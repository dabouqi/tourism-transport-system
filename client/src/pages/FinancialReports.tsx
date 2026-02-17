import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
} from "lucide-react";
import { useState } from "react";
import { FinancialComparison } from "@/components/FinancialComparison";

export default function FinancialReports() {
  const [dateRange, setDateRange] = useState("month");
  const transactions = trpc.transactions.list.useQuery();
  const vehicles = trpc.vehicles.list.useQuery();
  const drivers = trpc.drivers.list.useQuery();
  const bookings = trpc.bookings.list.useQuery();

  // حساب البيانات - تصفية حسب الشهر الحالي
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthTransactions = transactions.data?.filter((t) => {
    const transactionDate = new Date(t.transactionDate);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  }) || [];
  
  const totalRevenue =
    currentMonthTransactions
      .filter((t) => t.transactionType === "revenue")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0) || 0;

  const totalExpense =
    currentMonthTransactions
      .filter((t) => t.transactionType === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0) || 0;

  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // بيانات الإيرادات حسب الفئة
  const revenueByCategory = currentMonthTransactions
    .filter((t) => t.transactionType === "revenue")
    .reduce(
      (acc, t) => {
        const existing = acc.find((item) => item.category === t.category);
        if (existing) {
          existing.value += parseFloat(t.amount || "0");
        } else {
          acc.push({ category: t.category, value: parseFloat(t.amount || "0") });
        }
        return acc;
      },
      [] as Array<{ category: string; value: number }>
    ) || [];

  // بيانات المصروفات حسب الفئة
  const expenseByCategory = currentMonthTransactions
    .filter((t) => t.transactionType === "expense")
    .reduce(
      (acc, t) => {
        const existing = acc.find((item) => item.category === t.category);
        if (existing) {
          existing.value += parseFloat(t.amount || "0");
        } else {
          acc.push({ category: t.category, value: parseFloat(t.amount || "0") });
        }
        return acc;
      },
      [] as Array<{ category: string; value: number }>
    ) || [];

  // بيانات الاتجاهات الشهرية
  const monthlyData = currentMonthTransactions
    .reduce(
      (acc, t) => {
        const date = new Date(t.transactionDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const existing = acc.find((item) => item.month === monthKey);

        const amount = parseFloat(t.amount || "0");
        if (existing) {
          if (t.transactionType === "revenue") {
            existing.revenue += amount;
          } else {
            existing.expense += amount;
          }
        } else {
          acc.push({
            month: monthKey,
            revenue: t.transactionType === "revenue" ? amount : 0,
            expense: t.transactionType === "expense" ? amount : 0,
          });
        }
        return acc;
      },
      [] as Array<{ month: string; revenue: number; expense: number }>
    )
    .sort((a, b) => a.month.localeCompare(b.month)) || [];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const StatBox = ({
    icon: Icon,
    label,
    value,
    color,
    trend,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    trend?: number;
  }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {trend !== undefined && (
              <p className={`text-xs mt-2 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
              </p>
            )}
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
          <h1 className="text-3xl font-bold text-slate-900">التقارير المالية</h1>
          <p className="text-slate-600 mt-1">
            تحليل شامل للأداء المالي والإيرادات والمصروفات
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Download className="w-4 h-4" />
          تصدير التقرير
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
          label="إجمالي الإيرادات"
          value={`د.ا ${totalRevenue.toFixed(2)}`}
          color="bg-blue-100"
        />
        <StatBox
          icon={<TrendingDown className="w-6 h-6 text-red-600" />}
          label="إجمالي المصروفات"
          value={`د.ا ${totalExpense.toFixed(2)}`}
          color="bg-red-100"
        />
        <StatBox
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          label="صافي الربح"
          value={`د.ا ${netProfit.toFixed(2)}`}
          color="bg-green-100"
        />
        <StatBox
          icon={<Percent className="w-6 h-6 text-purple-600" />}
          label="هامش الربح"
          value={`${profitMargin.toFixed(1)}%`}
          color="bg-purple-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>الاتجاهات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
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
                  stroke="#10b981"
                  strokeWidth={2}
                  name="الإيرادات"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="المصروفات"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>توزيع الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueByCategory}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {revenueByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">لا توجد بيانات إيرادات</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>تفصيل المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#ef4444" name="المبلغ" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">لا توجد بيانات مصروفات</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>ملخص الفئات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">الإيرادات حسب الفئة</h3>
              <div className="space-y-3">
                {revenueByCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.category}</span>
                    <span className="font-bold text-green-600">
                      ${item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
                {revenueByCategory.length === 0 && (
                  <p className="text-slate-500 text-sm">لا توجد إيرادات</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-4">المصروفات حسب الفئة</h3>
              <div className="space-y-3">
                {expenseByCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.category}</span>
                    <span className="font-bold text-red-600">
                      ${item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
                {expenseByCategory.length === 0 && (
                  <p className="text-slate-500 text-sm">لا توجد مصروفات</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Comparison Section */}
      <div className="mt-12 pt-12 border-t">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">مقارنة البيانات المالية</h2>
        <FinancialComparison />
      </div>
    </div>
  );
}

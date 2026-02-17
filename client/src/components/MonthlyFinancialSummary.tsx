import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/formatters";

interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeByCategory: Array<{ category: string; total: number }>;
  expenseByCategory: Array<{ category: string; total: number }>;
  month: number;
  year: number;
}

export function MonthlyFinancialSummary() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data, isLoading: isQueryLoading } = trpc.dashboard.monthlyFinancialSummary.useQuery({});

  useEffect(() => {
    if (data) {
      setSummary(data as MonthlySummary);
      setIsLoading(false);
    }
  }, [data]);

  if (isLoading || isQueryLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>الملخص المالي الشهري</CardTitle>
          <CardDescription>جاري تحميل البيانات...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400">
            جاري التحميل...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const monthName = new Date(summary.year, summary.month - 1).toLocaleDateString("ar-SA", {
    month: "long",
    year: "numeric",
  });

  // Prepare data for pie chart
  const pieData = [
    { name: "الدخل", value: summary.totalIncome },
    { name: "المصروفات", value: summary.totalExpenses },
  ];

  const COLORS = ["#10b981", "#ef4444"];

  // Prepare data for category breakdown
  const categoryData = [
    ...summary.incomeByCategory.map((cat) => ({
      name: cat.category,
      type: "دخل",
      amount: cat.total,
    })),
    ...summary.expenseByCategory.map((cat) => ({
      name: cat.category,
      type: "مصروف",
      amount: cat.total,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الدخل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</div>
            <p className="text-xs text-gray-500 mt-1">{monthName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
            <p className="text-xs text-gray-500 mt-1">{monthName}</p>
          </CardContent>
        </Card>

        <Card className={summary.netProfit >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">صافي الربح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.netProfit)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{summary.netProfit >= 0 ? "ربح" : "خسارة"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع الدخل والمصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع حسب الفئات</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="amount" fill="#3b82f6" name="المبلغ" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الدخل حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.incomeByCategory.length > 0 ? (
              <div className="space-y-2">
                {summary.incomeByCategory.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">{cat.category}</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">لا يوجد دخل في هذا الشهر</p>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المصروفات حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.expenseByCategory.length > 0 ? (
              <div className="space-y-2">
                {summary.expenseByCategory.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">{cat.category}</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">لا توجد مصروفات في هذا الشهر</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

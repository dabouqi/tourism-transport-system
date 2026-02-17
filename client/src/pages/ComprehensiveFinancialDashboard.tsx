import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, TrendingUp, DollarSign, Users, Calendar } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ComprehensiveFinancialDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  });

  // Fetch all data
  const comprehensiveData = trpc.dashboard.comprehensiveOverview.useQuery();
  const dailyData = trpc.dashboard.dailySummary.useQuery();
  const yearToDateData = trpc.dashboard.yearToDateSummary.useQuery();
  const bookingAnalysis = trpc.dashboard.bookingProfitAnalysis.useQuery();
  const monthlyData = trpc.dashboard.monthlyFinancialSummary.useQuery({});
  const accountsData = trpc.dashboard.accountsSummary.useQuery();
  const monthlyProfitsData = trpc.dashboard.monthlyProfits.useQuery();
  const actualProfitData = trpc.dashboard.actualProfitByDateRange.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const isLoading =
    comprehensiveData.isLoading ||
    dailyData.isLoading ||
    yearToDateData.isLoading ||
    bookingAnalysis.isLoading ||
    monthlyData.isLoading ||
    accountsData.isLoading ||
    monthlyProfitsData.isLoading ||
    actualProfitData.isLoading;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "JOD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Prepare chart data
  const monthlyChartData = useMemo(() => {
    if (!yearToDateData.data?.monthlyBreakdown) return [];
    return yearToDateData.data.monthlyBreakdown.map((month) => ({
      month: `M${month.month}`,
      revenue: month.revenue,
      expenses: month.expenses,
      profit: month.netProfit,
    }));
  }, [yearToDateData.data]);

  const categoryData = useMemo(() => {
    if (!monthlyData.data?.incomeByCategory) return [];
    return monthlyData.data.incomeByCategory.map((cat) => ({
      name: cat.category || "غير محدد",
      value: cat.total,
    }));
  }, [monthlyData.data]);

  // KPI Card Component
  const KPICard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = "blue",
  }: {
    title: string;
    value: string;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: number;
    color?: string;
  }) => {
    const colorClasses = {
      blue: "bg-blue-50 border-blue-200",
      green: "bg-green-50 border-green-200",
      red: "bg-red-50 border-red-200",
      amber: "bg-amber-50 border-amber-200",
    };

    return (
      <Card className={`border-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
            {Icon && <div className="text-gray-500">{Icon}</div>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {trend >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
              {formatPercent(Math.abs(trend))} من الشهر الماضي
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات المالية...</p>
        </div>
      </div>
    );
  }

  const daily = dailyData.data || { revenue: 0, expenses: 0, netProfit: 0 };
  const ytd = yearToDateData.data || { revenue: 0, expenses: 0, netProfit: 0, monthlyBreakdown: [] };
  const monthly = monthlyData.data || { totalIncome: 0, totalExpenses: 0, netProfit: 0 };
  const bookings = bookingAnalysis.data || { completedCount: 0, completedProfit: 0, pendingCount: 0, expectedProfit: 0 };
  const accounts = accountsData.data || { receivables: 0, payables: 0, netPosition: 0 };

  const profitMargin = monthly.totalIncome > 0 ? (monthly.netProfit / monthly.totalIncome) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">لوحة المالية الشاملة</h1>
          <p className="text-gray-600">عرض شامل لجميع بيانات الإيرادات والمصروفات والأرباح</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={selectedPeriod === "daily" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("daily")}
            className="rounded-lg"
          >
            يومي
          </Button>
          <Button
            variant={selectedPeriod === "monthly" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("monthly")}
            className="rounded-lg"
          >
            شهري
          </Button>
          <Button
            variant={selectedPeriod === "yearly" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("yearly")}
            className="rounded-lg"
          >
            سنوي
          </Button>
        </div>

        {/* Daily Summary */}
        {selectedPeriod === "daily" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="إجمالي الدخل اليومي"
                value={formatCurrency(daily.revenue)}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                color="green"
              />
              <KPICard
                title="إجمالي المصروفات اليومية"
                value={formatCurrency(daily.expenses)}
                icon={<TrendingUp className="w-5 h-5 text-red-600" />}
                color="red"
              />
              <KPICard
                title="صافي الربح اليومي"
                value={formatCurrency(daily.netProfit)}
                icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                color={daily.netProfit >= 0 ? "blue" : "red"}
              />
              <KPICard
                title="نسبة الربح"
                value={formatPercent(daily.revenue > 0 ? (daily.netProfit / daily.revenue) * 100 : 0)}
                color="amber"
              />
            </div>
          </div>
        )}

        {/* Monthly Summary */}
        {selectedPeriod === "monthly" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="إجمالي الدخل الشهري"
                value={formatCurrency(monthly.totalIncome)}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                color="green"
              />
              <KPICard
                title="إجمالي المصروفات الشهرية"
                value={formatCurrency(monthly.totalExpenses)}
                icon={<TrendingUp className="w-5 h-5 text-red-600" />}
                color="red"
              />
              <KPICard
                title="صافي الربح الشهري"
                value={formatCurrency(monthly.netProfit)}
                icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                color={monthly.netProfit >= 0 ? "blue" : "red"}
              />
              <KPICard
                title="نسبة الربح"
                value={formatPercent(profitMargin)}
                color="amber"
              />
            </div>

            {/* Monthly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue vs Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات مقابل المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[{ name: "الشهر الحالي", revenue: monthly.totalIncome, expenses: monthly.totalExpenses }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="الإيرادات" />
                      <Bar dataKey="expenses" fill="#ef4444" name="المصروفات" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Income by Category */}
              {categoryData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>توزيع الإيرادات حسب الفئة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Yearly Summary */}
        {selectedPeriod === "yearly" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="إجمالي الدخل السنوي"
                value={formatCurrency(ytd.revenue)}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                color="green"
              />
              <KPICard
                title="إجمالي المصروفات السنوية"
                value={formatCurrency(ytd.expenses)}
                icon={<TrendingUp className="w-5 h-5 text-red-600" />}
                color="red"
              />
              <KPICard
                title="صافي الربح السنوي"
                value={formatCurrency(ytd.netProfit)}
                icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                color={ytd.netProfit >= 0 ? "blue" : "red"}
              />
              <KPICard
                title="نسبة الربح"
                value={formatPercent(ytd.revenue > 0 ? (ytd.netProfit / ytd.revenue) * 100 : 0)}
                color="amber"
              />
            </div>

            {/* Monthly Trend Chart */}
            {monthlyChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>اتجاه الإيرادات والمصروفات الشهري</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" name="الإيرادات" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="المصروفات" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="الربح" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bookings Analysis Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">تحليل الحجوزات والأرباح</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="الحجوزات المنتهية"
              value={bookings.completedCount.toString()}
              subtitle={`الأرباح: ${formatCurrency(bookings.completedProfit)}`}
              icon={<Calendar className="w-5 h-5 text-green-600" />}
              color="green"
            />
            <KPICard
              title="الحجوزات القادمة"
              value={bookings.pendingCount.toString()}
              subtitle={`الأرباح المتوقعة: ${formatCurrency(bookings.expectedProfit)}`}
              icon={<Calendar className="w-5 h-5 text-blue-600" />}
              color="blue"
            />
            <KPICard
              title="إجمالي الأرباح المحققة"
              value={formatCurrency(bookings.completedProfit)}
              color="green"
            />
            <KPICard
              title="إجمالي الأرباح المتوقعة"
              value={formatCurrency(bookings.expectedProfit)}
              color="amber"
            />
          </div>
        </div>

        {/* Accounts Summary Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ملخص الذمم والحسابات</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="المستحقات (ما لك)"
              value={formatCurrency(accounts.receivables)}
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              color="green"
            />
            <KPICard
              title="الالتزامات (ما عليك)"
              value={formatCurrency(accounts.payables)}
              icon={<DollarSign className="w-5 h-5 text-red-600" />}
              color="red"
            />
            <KPICard
              title="الموضع الصافي"
              value={formatCurrency(accounts.netPosition)}
              icon={<DollarSign className="w-5 h-5 text-blue-600" />}
              color={accounts.netPosition >= 0 ? "blue" : "red"}
            />
          </div>
        </div>

        {/* Summary Table */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>ملخص شامل</CardTitle>
              <CardDescription>ملخص جميع المؤشرات المالية الرئيسية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">المؤشر</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">يومي</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">شهري</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">سنوي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700">الإيرادات</td>
                      <td className="px-4 py-2 text-green-600">{formatCurrency(daily.revenue)}</td>
                      <td className="px-4 py-2 text-green-600">{formatCurrency(monthly.totalIncome)}</td>
                      <td className="px-4 py-2 text-green-600">{formatCurrency(ytd.revenue)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700">المصروفات</td>
                      <td className="px-4 py-2 text-red-600">{formatCurrency(daily.expenses)}</td>
                      <td className="px-4 py-2 text-red-600">{formatCurrency(monthly.totalExpenses)}</td>
                      <td className="px-4 py-2 text-red-600">{formatCurrency(ytd.expenses)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 bg-blue-50">
                      <td className="px-4 py-2 font-bold text-gray-900">صافي الربح</td>
                      <td className="px-4 py-2 font-bold text-blue-600">{formatCurrency(daily.netProfit)}</td>
                      <td className="px-4 py-2 font-bold text-blue-600">{formatCurrency(monthly.netProfit)}</td>
                      <td className="px-4 py-2 font-bold text-blue-600">{formatCurrency(ytd.netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {/* Monthly Profits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                الأرباح الشهرية
              </CardTitle>
              <CardDescription>الأرباح الفعلية لكل شهر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Date Range Filter */}
                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من التاريخ</label>
                    <input
                      type="date"
                      value={dateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى التاريخ</label>
                    <input
                      type="date"
                      value={dateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Actual Profit Summary */}
                {actualProfitData.data && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card className="bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">الإيرادات الفعلية</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(actualProfitData.data.revenue)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">المصروفات الفعلية</p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(actualProfitData.data.expenses)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">الربح الفعلي</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(actualProfitData.data.profit)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Monthly Profits Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">الشهر</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">الإيرادات</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">المصروفات</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">الربح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {monthlyProfitsData.data?.map((month: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-700">{month.month}</td>
                          <td className="px-4 py-2 text-green-600">{formatCurrency(month.revenue)}</td>
                          <td className="px-4 py-2 text-red-600">{formatCurrency(month.expenses)}</td>
                          <td className="px-4 py-2 font-bold text-blue-600">{formatCurrency(month.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Monthly Profits Chart */}
                {monthlyProfitsData.data && monthlyProfitsData.data.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyProfitsData.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="الإيرادات" />
                      <Bar dataKey="expenses" fill="#ef4444" name="المصروفات" />
                      <Bar dataKey="profit" fill="#3b82f6" name="الربح" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

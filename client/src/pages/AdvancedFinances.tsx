import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdvancedFinances() {
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "analysis">("overview");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [transactionType, setTransactionType] = useState<"all" | "revenue" | "expense">("all");

  // Queries
  const monthlyTrend = trpc.financials.getMonthlyFinancialTrend.useQuery({ year: selectedYear });
  const revenueByCategory = trpc.financials.getRevenueByCategory.useQuery(
    { startDate: new Date(dateRange.start || new Date().toISOString().split("T")[0]), endDate: new Date(dateRange.end || new Date().toISOString().split("T")[0]) },
    { enabled: !!dateRange.start && !!dateRange.end }
  );
  const expensesByCategory = trpc.financials.getExpensesByCategory.useQuery(
    { startDate: new Date(dateRange.start || new Date().toISOString().split("T")[0]), endDate: new Date(dateRange.end || new Date().toISOString().split("T")[0]) },
    { enabled: !!dateRange.start && !!dateRange.end }
  );
  const expensesByVehicle = trpc.financials.getExpensesByVehicle.useQuery(
    { startDate: new Date(dateRange.start || new Date().toISOString().split("T")[0]), endDate: new Date(dateRange.end || new Date().toISOString().split("T")[0]) },
    { enabled: !!dateRange.start && !!dateRange.end }
  );
  const expensesByDriver = trpc.financials.getExpensesByDriver.useQuery(
    { startDate: new Date(dateRange.start || new Date().toISOString().split("T")[0]), endDate: new Date(dateRange.end || new Date().toISOString().split("T")[0]) },
    { enabled: !!dateRange.start && !!dateRange.end }
  );
  const monthlySummary = trpc.financials.calculateMonthlyFinancialSummary.useQuery({ year: selectedYear, month: selectedMonth });

  // Calculate totals
  const totalRevenue = Number(monthlyTrend.data?.reduce((sum, m) => sum + (Number(m.revenue) || 0), 0) || 0);
  const totalExpenses = Number(monthlyTrend.data?.reduce((sum, m) => sum + (Number(m.expenses) || 0), 0) || 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الإيرادات والمصاريف</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">نظام شامل لتتبع وتحليل الأداء المالي</p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          تصدير التقرير
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(["overview", "transactions", "analysis"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            }`}
          >
            {tab === "overview" && "نظرة عامة"}
            {tab === "transactions" && "المعاملات"}
            {tab === "analysis" && "التحليلات"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-green-600">د.ا {Number(totalRevenue).toFixed(2)}</div>
                  <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المصاريف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-red-600">د.ا {Number(totalExpenses).toFixed(2)}</div>
                  <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">صافي الربح</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    د.ا {Number(netProfit).toFixed(2)}
                  </div>
                  <TrendingUp className={`w-8 h-8 ${netProfit >= 0 ? "text-green-500" : "text-red-500"} opacity-20`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">هامش الربح</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-blue-600">{profitMargin}%</div>
                  <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Year and Month Selection */}
          <div className="flex gap-4">
            <div>
              <Label>السنة</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الشهر</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][month - 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>اتجاهات الإيرادات والمصاريف الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrend.isLoading ? (
                <div className="h-80 flex items-center justify-center text-gray-500">جاري التحميل...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" name="الإيرادات" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="المصاريف" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>المرشحات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>من التاريخ</Label>
                  <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                </div>
                <div>
                  <Label>إلى التاريخ</Label>
                  <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
                <div>
                  <Label>النوع</Label>
                  <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="revenue">إيرادات</SelectItem>
                      <SelectItem value="expense">مصاريف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Category */}
          {transactionType !== "expense" && (
            <Card>
              <CardHeader>
                <CardTitle>الإيرادات حسب التصنيف</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByCategory.isLoading ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">جاري التحميل...</div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={revenueByCategory.data || []} dataKey="total" nameKey="categoryName" cx="50%" cy="50%" outerRadius={80} label>
                          {(revenueByCategory.data || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(revenueByCategory.data || []).map((item) => (
                        <div key={item.categoryId} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span>{item.categoryName || "بدون تصنيف"}</span>
                          <span className="font-bold text-green-600">${item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expenses by Category */}
          {transactionType !== "revenue" && (
            <Card>
              <CardHeader>
                <CardTitle>المصاريف حسب التصنيف</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategory.isLoading ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">جاري التحميل...</div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={expensesByCategory.data || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoryName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(expensesByCategory.data || []).map((item) => (
                        <div key={item.categoryId} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span>{item.categoryName || "بدون تصنيف"}</span>
                          <span className="font-bold text-red-600">${item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          {/* Expenses by Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle>المصاريف حسب المركبة</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByVehicle.isLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">جاري التحميل...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المركبة</TableHead>
                        <TableHead>إجمالي المصاريف</TableHead>
                        <TableHead>عدد المعاملات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(expensesByVehicle.data || []).map((item) => (
                        <TableRow key={item.vehicleId}>
                          <TableCell>{item.vehicleName || "بدون تحديد"}</TableCell>
                          <TableCell className="font-bold text-red-600">${item.total}</TableCell>
                          <TableCell>{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses by Driver */}
          <Card>
            <CardHeader>
              <CardTitle>المصاريف حسب السائق</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByDriver.isLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">جاري التحميل...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>السائق</TableHead>
                        <TableHead>إجمالي المصاريف</TableHead>
                        <TableHead>عدد المعاملات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(expensesByDriver.data || []).map((item) => (
                        <TableRow key={item.driverId}>
                          <TableCell>{item.driverName || "بدون تحديد"}</TableCell>
                          <TableCell className="font-bold text-red-600">${item.total}</TableCell>
                          <TableCell>{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

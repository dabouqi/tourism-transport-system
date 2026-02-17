import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/formatters";
import { Plus, X } from "lucide-react";

interface ComparisonPeriod {
  year: number;
  month: number;
}

interface FinancialData {
  period: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeByCategory: Array<{ category: string; total: number }>;
  expenseByCategory: Array<{ category: string; total: number }>;
}

export function FinancialComparison() {
  const [selectedPeriods, setSelectedPeriods] = useState<ComparisonPeriod[]>([
    { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  ]);
  const [comparisonData, setComparisonData] = useState<FinancialData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const compareQuery = trpc.dashboard.compareFinancialData.useQuery(
    { periods: selectedPeriods },
    { enabled: false }
  );

  const handleCompareClick = async () => {
    setIsLoading(true);
    try {
      const result = await compareQuery.refetch();
      if (result.data) {
        setComparisonData(result.data as FinancialData[]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPeriod = () => {
    const newPeriod = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    };
    setSelectedPeriods([...selectedPeriods, newPeriod]);
  };

  const handleRemovePeriod = (index: number) => {
    if (selectedPeriods.length > 1) {
      setSelectedPeriods(selectedPeriods.filter((_, i) => i !== index));
    }
  };

  const handlePeriodChange = (index: number, field: "year" | "month", value: number) => {
    const newPeriods = [...selectedPeriods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setSelectedPeriods(newPeriods);
  };



  // Prepare data for bar chart
  const barChartData = useMemo(() => {
    return comparisonData.map((data) => ({
      period: data.period,
      income: data.totalIncome,
      expenses: data.totalExpenses,
      profit: data.netProfit,
    }));
  }, [comparisonData]);

  // Prepare data for line chart
  const lineChartData = useMemo(() => {
    return comparisonData.map((data) => ({
      period: data.period,
      income: data.totalIncome,
      expenses: data.totalExpenses,
    }));
  }, [comparisonData]);

  // Calculate differences
  const differences = useMemo(() => {
    if (comparisonData.length < 2) return null;

    const first = comparisonData[0];
    const last = comparisonData[comparisonData.length - 1];

    return {
      incomeDiff: last.totalIncome - first.totalIncome,
      incomePercent: first.totalIncome !== 0 ? ((last.totalIncome - first.totalIncome) / first.totalIncome) * 100 : 0,
      expenseDiff: last.totalExpenses - first.totalExpenses,
      expensePercent: first.totalExpenses !== 0 ? ((last.totalExpenses - first.totalExpenses) / first.totalExpenses) * 100 : 0,
      profitDiff: last.netProfit - first.netProfit,
      profitPercent: first.netProfit !== 0 ? ((last.netProfit - first.netProfit) / first.netProfit) * 100 : 0,
    };
  }, [comparisonData]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>اختيار الفترات للمقارنة</CardTitle>
          <CardDescription>حدد الشهور والسنوات التي تريد مقارنتها</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {selectedPeriods.map((period, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">السنة</label>
                  <Select
                    value={period.year.toString()}
                    onValueChange={(value) => handlePeriodChange(index, "year", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium">الشهر</label>
                  <Select
                    value={period.month.toString()}
                    onValueChange={(value) => handlePeriodChange(index, "month", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2024, month - 1).toLocaleDateString("ar-SA", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPeriods.length > 1 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemovePeriod(index)}
                    className="mb-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddPeriod} variant="outline" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              إضافة فترة
            </Button>
            <Button onClick={handleCompareClick} disabled={isLoading} className="flex-1">
              {isLoading ? "جاري المقارنة..." : "مقارنة"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <>
          {/* Differences Summary */}
          {differences && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className={differences.incomeDiff >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">الفرق في الدخل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${differences.incomeDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(differences.incomeDiff)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {differences.incomePercent >= 0 ? "+" : ""}{differences.incomePercent.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>

              <Card className={differences.expenseDiff >= 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">الفرق في المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${differences.expenseDiff >= 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(differences.expenseDiff)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {differences.expensePercent >= 0 ? "+" : ""}{differences.expensePercent.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>

              <Card className={differences.profitDiff >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">الفرق في الربح</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${differences.profitDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(differences.profitDiff)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {differences.profitPercent >= 0 ? "+" : ""}{differences.profitPercent.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>مقارنة الدخل والمصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="الدخل" />
                    <Bar dataKey="expenses" fill="#ef4444" name="المصروفات" />
                    <Bar dataKey="profit" fill="#3b82f6" name="الربح" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>الاتجاهات المالية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="الدخل" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="المصروفات" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>جدول المقارنة التفصيلي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-semibold">الفترة</th>
                      <th className="text-right py-3 px-4 font-semibold">الدخل</th>
                      <th className="text-right py-3 px-4 font-semibold">المصروفات</th>
                      <th className="text-right py-3 px-4 font-semibold">الربح</th>
                      <th className="text-right py-3 px-4 font-semibold">هامش الربح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((data, idx) => {
                      const margin = data.totalIncome !== 0 ? (data.netProfit / data.totalIncome) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{data.period}</td>
                          <td className="py-3 px-4 text-green-600 font-medium">{formatCurrency(data.totalIncome)}</td>
                          <td className="py-3 px-4 text-red-600 font-medium">{formatCurrency(data.totalExpenses)}</td>
                          <td className="py-3 px-4 font-medium">{formatCurrency(data.netProfit)}</td>
                          <td className={`py-3 px-4 font-medium ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {margin.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Category Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الدخل حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.map((data, idx) => (
                    <div key={idx} className="border-t pt-3">
                      <h4 className="font-semibold text-sm mb-2">{data.period}</h4>
                      {data.incomeByCategory.length > 0 ? (
                        <div className="space-y-1">
                          {data.incomeByCategory.map((cat, catIdx) => (
                            <div key={catIdx} className="flex justify-between text-sm">
                              <span>{cat.category}</span>
                              <span className="font-medium text-green-600">{formatCurrency(cat.total)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">لا يوجد دخل</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المصروفات حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.map((data, idx) => (
                    <div key={idx} className="border-t pt-3">
                      <h4 className="font-semibold text-sm mb-2">{data.period}</h4>
                      {data.expenseByCategory.length > 0 ? (
                        <div className="space-y-1">
                          {data.expenseByCategory.map((cat, catIdx) => (
                            <div key={catIdx} className="flex justify-between text-sm">
                              <span>{cat.category}</span>
                              <span className="font-medium text-red-600">{formatCurrency(cat.total)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">لا توجد مصروفات</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty State */}
      {comparisonData.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">اختر الفترات واضغط على "مقارنة" لعرض النتائج</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

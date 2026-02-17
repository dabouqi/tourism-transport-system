import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/formatters";
import { ChevronUp, ChevronDown, DollarSign, AlertCircle, Users, TrendingUp } from "lucide-react";
import React from "react";

interface MonthlyData {
  profit: number;
  expenses: number;
  revenue: number;
}

export function CompactMonthlyFinancialSummary() {
  const [isCollapsed, setIsCollapsed] = useState(false);


  const monthlyRevenueQuery = trpc.dashboard.monthlyRevenue.useQuery();
  const monthlyExpensesQuery = trpc.dashboard.monthlyExpenses.useQuery();

  const monthlyRevenue = monthlyRevenueQuery.data ?? 0;
  const monthlyExpenses = monthlyExpensesQuery.data ?? 0;
  const profit = monthlyRevenue - monthlyExpenses;

  const data = { profit, expenses: monthlyExpenses, revenue: monthlyRevenue };
  const dashboardStats = trpc.dashboard.getStats.useQuery();
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();
  const futureOperationsQuery = trpc.dashboard.futureOperations.useQuery();
  
  const stats = dashboardStats.data || {
    todayBookings: 0,
    activeVehicles: 0,
    todayRevenue: 0,
    pendingOperations: 0,
  };
  
  const currentReceivables = splitReceivables.data?.current ?? 0;
  const futureReceivables = splitReceivables.data?.future ?? 0;
  const futureOperations = futureOperationsQuery.data ?? [];

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
    <div className="space-y-0">
      {/* Main Container */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {/* Header with Title and Collapse Button */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">الأرباح الشهرية</h3>
              <p className="text-sm text-slate-400 mt-1">الأرباح الفعلية لكل شهر</p>
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-700 rounded transition-colors ml-4"
              title={isCollapsed ? "إظهار" : "إخفاء"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-6 h-6 text-slate-300" />
              ) : (
                <ChevronUp className="w-6 h-6 text-slate-300" />
              )}
            </button>
          </div>


        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Profit Card */}
              <Card className="border-slate-700 bg-gradient-to-br from-blue-900/40 to-blue-800/20">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-400 mb-3">الربح الفعلي</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {formatCurrency(data.profit)}
                  </p>
                </CardContent>
              </Card>

              {/* Expenses Card */}
              <Card className="border-slate-700 bg-gradient-to-br from-red-900/40 to-red-800/20">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-400 mb-3">المصروفات الفعلية</p>
                  <p className="text-3xl font-bold text-red-400">
                    {formatCurrency(data.expenses)}
                  </p>
                </CardContent>
              </Card>

              {/* Revenue Card */}
              <Card className="border-slate-700 bg-gradient-to-br from-green-900/40 to-green-800/20">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-400 mb-3">الإيرادات الفعلية</p>
                  <p className="text-3xl font-bold text-green-400">
                    {formatCurrency(data.revenue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Cards - Always Visible */}
            <div className="border-t border-slate-700 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-1">
                <StatCard
                  icon={<DollarSign className="w-6 h-6 text-green-600" />}
                  label="إيرادات الشهر"
                  value={`د.ا ${data.revenue.toFixed(2)}`}
                  color="bg-green-100"
                />
                <StatCard
                  icon={<DollarSign className="w-6 h-6 text-red-600" />}
                  label="مصاريف الشهر"
                  value={`د.ا ${data.expenses.toFixed(2)}`}
                  color="bg-red-100"
                />
                <StatCard
                  icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
                  label="الحركات المعلقة"
                  value={futureOperations.length}
                  color="bg-orange-100"
                />
                <StatCard
                  icon={<Users className="w-6 h-6 text-purple-600" />}
                  label="الذمم الحالية"
                  value={`د.ا ${currentReceivables.toFixed(2)}`}
                  color="bg-purple-100"
                />
                <StatCard
                  icon={<Users className="w-6 h-6 text-blue-600" />}
                  label="الذمم المستقبلية"
                  value={`د.ا ${futureReceivables.toFixed(2)}`}
                  color="bg-blue-100"
                />
                <StatCard
                  icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
                  label="صافي الربح"
                  value={`د.ا ${(data.revenue - data.expenses).toFixed(2)}`}
                  color="bg-emerald-100"
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

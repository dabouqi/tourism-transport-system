import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Calendar } from "lucide-react";

export default function ExpenseCategoryDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const categoryId = parseInt(params?.id || "0");

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });

  // Fetch category details
  const { data: category, isLoading: categoryLoading } = trpc.expenseCategories.getById.useQuery(
    { id: categoryId },
    { enabled: categoryId > 0 }
  );

  // Fetch expenses for this category
  const { data: expenses = [], isLoading: expensesLoading, refetch } = trpc.expenseCategories.getExpenses.useQuery(
    {
      categoryId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    { enabled: categoryId > 0 }
  );

  // Fetch total for this category
  const { data: total = 0 } = trpc.expenseCategories.getTotal.useQuery(
    {
      categoryId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    { enabled: categoryId > 0 }
  );

  const handleDateChange = () => {
    refetch();
  };

  if (categoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setLocation("/expense-categories")}>
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة
        </Button>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            لم يتم العثور على الفئة
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setLocation("/expense-categories")}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
          style={{ backgroundColor: category.color || "#ef4444" }}
        >
          {category.icon?.charAt(0) || "📊"}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          {category.description && <p className="text-muted-foreground">{category.description}</p>}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>الملخص</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المصاريف</p>
              <p className="text-2xl font-bold">{Number(total || 0).toFixed(2)} د.ا</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عدد المعاملات</p>
              <p className="text-2xl font-bold">{expenses.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المتوسط لكل معاملة</p>
              <p className="text-2xl font-bold">
                {expenses.length > 0 ? (Number(total || 0) / expenses.length).toFixed(2) : "0.00"} د.ا
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>فلتر حسب التاريخ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">من التاريخ</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">إلى التاريخ</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleDateChange} className="w-full">
                <Calendar className="w-4 h-4 ml-2" />
                تطبيق الفلتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المصاريف</CardTitle>
          <CardDescription>
            {expenses.length === 0 ? "لا توجد مصاريف" : `${expenses.length} معاملة`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="text-center text-muted-foreground py-8">
              جاري التحميل...
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              لا توجد مصاريف في هذه الفترة الزمنية
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4">التاريخ</th>
                    <th className="text-right py-3 px-4">الوصف</th>
                    <th className="text-right py-3 px-4">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...expenses].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()).map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {new Date(expense.transactionDate).toLocaleDateString("en-US")}
                      </td>
                      <td className="py-3 px-4">{expense.description || "-"}</td>
                      <td className="py-3 px-4 font-semibold">
                        {parseFloat(expense.amount.toString()).toFixed(2)} د.ا
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatDate } from "@/lib/dateFormatter";

export default function Finances() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "revenue" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [formData, setFormData] = useState({
    transactionType: "revenue" as "revenue" | "expense",
    category: "",
    expenseCategoryId: undefined as number | undefined,
    amount: 0,
    description: "",
    clientId: undefined as number | undefined,
    transactionDate: new Date().toISOString().split("T")[0],
  });

  const transactions = trpc.transactions.list.useQuery();
  const clients = trpc.clients.list.useQuery();
  const expenseCategories = trpc.expenseCategories.list.useQuery();
  const receivables = trpc.receivables.list.useQuery();
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();
  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => { toast.success("تم تسجيل المعاملة بنجاح"); transactions.refetch(); setIsOpen(false); resetForm(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ أثناء تسجيل المعاملة"); },
  });
  const updateTransaction = trpc.transactions.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث المعاملة بنجاح"); transactions.refetch(); setIsOpen(false); resetForm(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ أثناء تحديث المعاملة"); },
  });
  const bookings = trpc.bookings.list.useQuery();
  const deleteTransaction = trpc.transactions.delete.useMutation({
    onSuccess: () => { 
      toast.success("تم حذف المعاملة بنجاح"); 
      transactions.refetch();
      bookings.refetch(); // تحديث قائمة الحجوزات أيضاً
    },
    onError: (error) => { toast.error(error.message || "حدث خطأ أثناء حذف المعاملة"); },
  });

  const resetForm = () => {
    setFormData({ transactionType: "revenue", category: "", expenseCategoryId: undefined, amount: 0, description: "", clientId: undefined, transactionDate: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    const transactionData = { transactionType: formData.transactionType as "revenue" | "expense", category: formData.category, expenseCategoryId: formData.expenseCategoryId, amount: parseFloat(formData.amount.toString()), description: formData.description, clientId: formData.clientId, transactionDate: new Date(formData.transactionDate) };
    if (editingId) { updateTransaction.mutate({ id: editingId, ...transactionData }); } else { createTransaction.mutate(transactionData); }
  };

  const handleEdit = (transaction: any) => {
    setFormData({ transactionType: transaction.transactionType, category: transaction.category, expenseCategoryId: transaction.expenseCategoryId, amount: parseFloat(transaction.amount || "0"), description: transaction.description || "", clientId: transaction.clientId, transactionDate: new Date(transaction.transactionDate).toISOString().split("T")[0] });
    setEditingId(transaction.id);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => { if (window.confirm("هل أنت متأكد من حذف هذه المعاملة؟")) { deleteTransaction.mutate({ id }); } };

  const totalRevenue = transactions.data?.filter(t => t.transactionType === "revenue").reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
  const totalExpense = transactions.data?.filter(t => t.transactionType === "expense").reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
  const netProfit = totalRevenue - totalExpense;

  const totalReceivables = useMemo(() => {
    if (!receivables.data) return 0;
    return receivables.data
      .filter((r: any) => ['pending', 'partial', 'overdue'].includes(r.status))
      .reduce((sum: number, r: any) => sum + (Number(r.remainingAmount) || 0), 0);
  }, [receivables.data]);

  // Get unique categories from transactions
  const categories = useMemo(() => {
    if (!transactions.data) return [];
    const cats = new Set(transactions.data.map((t: any) => t.category));
    return Array.from(cats).sort();
  }, [transactions.data]);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    if (!transactions.data) return [];
    return transactions.data.filter((t: any) => {
      if (filterType !== "all" && t.transactionType !== filterType) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      const transDate = new Date(t.transactionDate);
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        if (transDate < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (transDate > toDate) return false;
      }
      return true;
    }).sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions.data, filterType, filterCategory, filterDateFrom, filterDateTo]);

  const dailyData = useMemo(() => {
    if (!transactions.data) return [];
    const dailyMap: { [key: string]: { revenue: number; expense: number } } = {};
    transactions.data.forEach((t: any) => {
      const date = new Date(t.transactionDate).toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
      if (!dailyMap[date]) dailyMap[date] = { revenue: 0, expense: 0 };
      const amount = Number(t.amount) || 0;
      if (t.transactionType === "revenue") {
        dailyMap[date].revenue += amount;
      } else {
        dailyMap[date].expense += amount;
      }
    });
    return Object.entries(dailyMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(-30);
  }, [transactions.data]);

  const monthlyData = useMemo(() => {
    if (!transactions.data) return [];
    const monthlyMap: { [key: string]: { revenue: number; expense: number; date: Date } } = {};
    transactions.data.forEach((t: any) => {
      const date = new Date(t.transactionDate);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' });
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { revenue: 0, expense: 0, date };
      const amount = Number(t.amount) || 0;
      if (t.transactionType === 'revenue') {
        monthlyMap[monthKey].revenue += amount;
      } else {
        monthlyMap[monthKey].expense += amount;
      }
    });
    const sorted = Object.entries(monthlyMap).map(([monthKey, data]) => ({
      monthKey,
      month: new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      revenue: data.revenue,
      expense: data.expense,
      net: data.revenue - data.expense
    })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    
    return sorted.map((item, idx) => {
      const prevItem = idx > 0 ? sorted[idx - 1] : null;
      const growthRate = prevItem ? ((item.revenue - prevItem.revenue) / prevItem.revenue * 100) : 0;
      return { ...item, growthRate };
    });
  }, [transactions.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">المصاريف والدخل</h1>
          <p className="text-slate-600 mt-1">إدارة المعاملات المالية</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />معاملة جديدة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingId ? "تعديل المعاملة" : "إضافة معاملة جديدة"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>نوع المعاملة *</Label><Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value as "revenue" | "expense" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="revenue">دخل</SelectItem><SelectItem value="expense">مصروف</SelectItem></SelectContent></Select></div>
                <div><Label>العميل (اختياري)</Label><Select value={formData.clientId?.toString() || "none"} onValueChange={(value) => setFormData({ ...formData, clientId: value === "none" ? undefined : parseInt(value) })}><SelectTrigger><SelectValue placeholder="اختر عميل..." /></SelectTrigger><SelectContent><SelectItem value="none">بدون عميل</SelectItem>{clients.data?.map((client: any) => (<SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>))}</SelectContent></Select></div>
                <div><Label>فئة المصروف *</Label><Select value={formData.expenseCategoryId?.toString() || ""} onValueChange={(value) => { const cat = expenseCategories.data?.find((c: any) => c.id === parseInt(value)); setFormData({ ...formData, expenseCategoryId: parseInt(value), category: cat?.name || "" }); }}><SelectTrigger><SelectValue placeholder="اختر فئة..." /></SelectTrigger><SelectContent>{expenseCategories.data?.filter((c: any) => c.name).map((cat: any) => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>))}</SelectContent></Select></div>
                <div><Label>المبلغ *</Label><Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} placeholder="0.00" /></div>
                <div><Label>التاريخ</Label><Input type="date" value={formData.transactionDate} onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} /></div>
              </div>
              <div><Label>الوصف</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف المعاملة..." /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createTransaction.isPending || updateTransaction.isPending}>{createTransaction.isPending || updateTransaction.isPending ? "جاري المعالجة..." : editingId ? "تحديث المعاملة" : "إضافة المعاملة"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">إجمالي الدخل</p>
                <p className="text-2xl font-bold text-green-600">د.ا {totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-600">د.ا {totalExpense.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">صافي الربح</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>د.ا {netProfit.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">إجمالي الذمم المستحقة</p>
                <p className="text-2xl font-bold text-orange-600">د.ا {totalReceivables.toFixed(2)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
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

      {dailyData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>اتجاهات الدخل والمصروفات (آخر 30 يوم)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="الدخل" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" name="المصروفات" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {monthlyData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>ملخص الدخل والمصروفات الشهري</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشهر</TableHead>
                    <TableHead>الدخل</TableHead>
                    <TableHead>المصروفات</TableHead>
                    <TableHead>الصافي</TableHead>
                    <TableHead>نسبة النمو</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((item) => (
                    <TableRow key={item.monthKey}>
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-green-600">د.ا {item.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">د.ا {item.expense.toFixed(2)}</TableCell>
                      <TableCell className={item.net >= 0 ? "text-green-600" : "text-red-600"}>د.ا {item.net.toFixed(2)}</TableCell>
                      <TableCell className={item.growthRate >= 0 ? "text-green-600" : "text-red-600"}>{item.growthRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>قائمة المعاملات</CardTitle>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm">نوع المعاملة</Label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as "all" | "revenue" | "expense")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="revenue">دخل</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">الفئة</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر فئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">من التاريخ</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">إلى التاريخ</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.isLoading ? (<div className="text-center py-8"><p className="text-slate-500">جاري تحميل البيانات...</p></div>) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction: any) => {
                    const isReadOnly = transaction.isFromBooking;
                    return (
                      <TableRow key={transaction.id} className={`border-slate-200 ${isReadOnly ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                        <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                        <TableCell><span className={`px-3 py-1 rounded-full text-xs font-medium ${transaction.transactionType === "revenue" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{transaction.transactionType === "revenue" ? "دخل" : "مصروف"}</span></TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className={`font-medium ${transaction.transactionType === "revenue" ? "text-green-600" : "text-red-600"}`}>د.ا {parseFloat(transaction.amount || "0").toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-slate-600">{transaction.description || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            {!isReadOnly ? (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(transaction)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete(transaction.id)} disabled={deleteTransaction.isPending}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500 italic">قراءة فقط</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (<div className="text-center py-8"><p className="text-slate-500">لا توجد معاملات مطابقة للفلاتر المحددة</p></div>)}
        </CardContent>
      </Card>
    </div>
  );
}

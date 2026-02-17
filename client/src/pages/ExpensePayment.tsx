import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { formatDateTime } from "@/lib/dateFormatter";

export default function ExpensePayment() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "cash" as "cash" | "bank_transfer",
    amount: "",
    referenceNumber: "",
    notes: "",
  });

  const expenses = trpc.expenses.getByStatus.useQuery({ status: "approved" });
  const recordPayment = trpc.expenses.recordPayment.useMutation();
  const utils = trpc.useUtils();

  const filteredExpenses = useMemo(() => {
    if (!expenses.data) return [];
    return expenses.data.filter((expense: any) =>
      searchText === "" ||
      expense.driverName?.toLowerCase().includes(searchText.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [expenses.data, searchText]);

  const handleRecordPayment = async () => {
    if (!selectedExpenseId) {
      toast.error("يرجى اختيار مصروفة");
      return;
    }
    if (!paymentFormData.paymentDate) {
      toast.error("تاريخ الدفع مطلوب");
      return;
    }
    if (!paymentFormData.amount || parseFloat(paymentFormData.amount) <= 0) {
      toast.error("المبلغ مطلوب ويجب أن يكون أكبر من صفر");
      return;
    }

    try {
      await recordPayment.mutateAsync({
        expenseId: selectedExpenseId,
        paymentDate: new Date(paymentFormData.paymentDate),
        paymentMethod: paymentFormData.paymentMethod,
        amount: parseFloat(paymentFormData.amount),
        referenceNumber: paymentFormData.referenceNumber,
        notes: paymentFormData.notes,
      });

      toast.success("تم تسجيل الدفع بنجاح");
      setIsOpen(false);
      setSelectedExpenseId(null);
      setPaymentFormData({
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        amount: "",
        referenceNumber: "",
        notes: "",
      });
      utils.expenses.getByStatus.invalidate();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تسجيل الدفع");
    }
  };

  const selectedExpense = expenses.data?.find((e: any) => e.id === selectedExpenseId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">تسجيل دفع المصاريف</h1>
          <p className="text-gray-600 mt-2">تسجيل دفع مصاريف السائقين المعتمدة</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          تسجيل دفع جديد
        </Button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">المصاريف المعتمدة</p>
                <p className="text-3xl font-bold mt-2">{filteredExpenses.length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">إجمالي المبالغ المعتمدة</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(
                    filteredExpenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0)
                  )}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">عدد السائقين</p>
                <p className="text-3xl font-bold mt-2">
                  {new Set(filteredExpenses.map((e: any) => e.driverId)).size}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="ابحث عن السائق أو المصروفة..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* جدول المصاريف */}
      <Card>
        <CardHeader>
          <CardTitle>المصاريف المعتمدة المعلقة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>السائق</TableHead>
                  <TableHead>نوع المصروفة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الملاحظات</TableHead>
                  <TableHead className="text-center">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      لا توجد مصاريف معتمدة معلقة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.driverName}</TableCell>
                      <TableCell>{expense.expenseType}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(parseFloat(expense.amount) || 0)}
                      </TableCell>
                      <TableCell>{formatDateTime(expense.createdAt)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{expense.notes || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedExpenseId(expense.id);
                            setPaymentFormData({
                              paymentDate: new Date().toISOString().split('T')[0],
                              paymentMethod: "cash",
                              amount: expense.amount?.toString() || "",
                              referenceNumber: "",
                              notes: "",
                            });
                            setIsOpen(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* نموذج تسجيل الدفع */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تسجيل دفع مصروفة</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* تفاصيل المصروفة */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-base mb-3">تفاصيل المصروفة</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">السائق</Label>
                    <p className="text-base font-semibold">{selectedExpense.driverName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">نوع المصروفة</Label>
                    <p className="text-base">{selectedExpense.expenseType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">المبلغ الأصلي</Label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(parseFloat(selectedExpense.amount) || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">التاريخ</Label>
                    <p className="text-base">{formatDateTime(selectedExpense.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* نموذج الدفع */}
              <div className="border-t pt-4">
                <h3 className="font-bold text-base mb-3">تفاصيل الدفع</h3>
                <div className="space-y-4">
                  <div>
                    <Label>تاريخ الدفع</Label>
                    <Input
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>طريقة الدفع</Label>
                    <Select
                      value={paymentFormData.paymentMethod}
                      onValueChange={(value: any) =>
                        setPaymentFormData({ ...paymentFormData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقد</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>المبلغ المدفوع</Label>
                    <Input
                      type="number"
                      value={paymentFormData.amount}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                      }
                      placeholder="أدخل المبلغ"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label>رقم المرجع (اختياري)</Label>
                    <Input
                      value={paymentFormData.referenceNumber}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })
                      }
                      placeholder="رقم الشيك أو رقم التحويل"
                    />
                  </div>

                  <div>
                    <Label>ملاحظات (اختياري)</Label>
                    <Input
                      value={paymentFormData.notes}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                      }
                      placeholder="أضف ملاحظات إضافية"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleRecordPayment}
                  disabled={recordPayment.isPending}
                >
                  {recordPayment.isPending ? "جاري التسجيل..." : "تسجيل الدفع"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

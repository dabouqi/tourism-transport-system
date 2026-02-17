import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useRoute } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const formatDateTime = (date: Date | string | undefined) => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar-JO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export default function CustomerTransactions() {
  const [, params] = useRoute("/customer-transactions/:clientId");
  const clientId = params?.clientId ? parseInt(params.clientId) : null;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [deleteTransactionConfirmOpen, setDeleteTransactionConfirmOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const clientQuery = trpc.clients.getById.useQuery({ id: clientId! }, { enabled: !!clientId });
  const paymentsQuery = trpc.payments.getByClientId.useQuery({ clientId: clientId! }, { enabled: !!clientId });
  // Fetch transactions for this specific client
  const transactionsQuery = trpc.transactions.list.useQuery(
    { clientId: clientId! },
    { enabled: !!clientId }
  );
  // Fetch receivables for this client
  const receivablesQuery = trpc.receivables.getByClientId.useQuery({ clientId: clientId! }, { enabled: !!clientId });
  const deletePaymentMutation = trpc.payments.delete.useMutation();
  const deleteTransactionMutation = trpc.transactions.delete.useMutation();

  const handleDeletePayment = async (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    setSelectedTransactionId(transactionId);
    setDeleteTransactionConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedPaymentId) return;

    try {
      await deletePaymentMutation.mutateAsync({ id: selectedPaymentId });
      toast.success("تم حذف الدفعة بنجاح");
      paymentsQuery.refetch();
      setDeleteConfirmOpen(false);
      setSelectedPaymentId(null);
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف الدفعة");
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!selectedTransactionId) return;

    try {
      await deleteTransactionMutation.mutateAsync({ id: selectedTransactionId });
      toast.success("تم حذف الحركة بنجاح");
      transactionsQuery.refetch();
      setDeleteTransactionConfirmOpen(false);
      setSelectedTransactionId(null);
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف الحركة");
    }
  };

  if (!clientId) {
    return <div className="p-4">عميل غير محدد</div>;
  }

  if (clientQuery.isLoading || paymentsQuery.isLoading || transactionsQuery.isLoading || receivablesQuery.isLoading) {
    return <div className="p-4">جاري التحميل...</div>;
  }

  const client = clientQuery.data;
  const payments = paymentsQuery.data || [];
  // Show all transactions (not filtered by bookingId)
  const transactions = transactionsQuery.data || [];
  const receivables = receivablesQuery.data || [];

  // حساب الإجماليات
  const totalPayments = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalIncome = transactions
    .filter((t: any) => t.transactionType === 'revenue')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const totalExpenses = transactions
    .filter((t: any) => t.transactionType === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const totalReceivables = receivables.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const remainingBalance = totalIncome + totalReceivables - totalExpenses - totalPayments;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 ml-2" />
          رجوع
        </Button>
        <div>
          <h1 className="text-3xl font-bold">حركات حساب العميل</h1>
          <p className="text-gray-500 mt-1">{client?.name}</p>
        </div>
      </div>

      {/* ملخص الحساب */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الدخل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الدفعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalPayments.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">الرصيد المتبقي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${remainingBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الدفعات */}
      <Card>
        <CardHeader>
          <CardTitle>الدفعات</CardTitle>
          <CardDescription>جميع الدفعات المسجلة لهذا العميل</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      لا توجد دفعات
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment: any) => {
                    // تحويل المبلغ بشكل صحيح
                    const amount = typeof payment.amount === 'string' 
                      ? parseFloat(payment.amount) 
                      : Number(payment.amount);
                    return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>${amount.toFixed(2)}</TableCell>
                      <TableCell>{formatDateTime(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          مكتملة
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={deletePaymentMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* الحركات */}
      <Card>
        <CardHeader>
          <CardTitle>حركات الحساب</CardTitle>
          <CardDescription>جميع الحركات المالية لهذا العميل</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      لا توجد حركات
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction: any) => {
                    // استخدام تاريخ الحجز إذا كان موجوداً، وإلا استخدم تاريخ الحركة
                    const displayDate = transaction.bookingDate || transaction.createdAt;
                    console.log('Transaction:', { id: transaction.id, bookingDate: transaction.bookingDate, createdAt: transaction.createdAt, displayDate });
                    // تحويل التاريخ بشكل صحيح - إذا كان string بصيغة MySQL، حوّله إلى ISO format
                    let dateObj: Date;
                    if (typeof displayDate === 'string' && displayDate.includes(' ')) {
                      // صيغة MySQL: "2026-01-14 03:00:00" → تحويل إلى ISO: "2026-01-14T03:00:00Z"
                      dateObj = new Date(displayDate.replace(' ', 'T') + 'Z');
                    } else {
                      dateObj = new Date(displayDate);
                    }
                    console.log('Date conversion:', { displayDate, dateObj, formatted: formatDateTime(dateObj) });
                    return (
                    <TableRow key={transaction.id}>
                      <TableCell className={`font-medium ${transaction.transactionType === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>{transaction.transactionType === 'revenue' ? 'دخل' : 'مصروف'}</TableCell>
                      <TableCell>{transaction.category || transaction.description || '-'}</TableCell>
                      <TableCell>${Number(transaction.amount).toFixed(2)}</TableCell>
                      <TableCell>{formatDateTime(dateObj)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          مكتملة
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          disabled={deleteTransactionMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* الذمم */}
      <Card>
        <CardHeader>
          <CardTitle>الذمم المستحقة</CardTitle>
          <CardDescription>جميع الذمم المسجلة لهذا العميل</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الذمة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>المبلغ المدفوع</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      لا توجد ذمم مستحقة
                    </TableCell>
                  </TableRow>
                ) : (
                  receivables.map((receivable: any) => {
                    const amount = typeof receivable.amount === 'string' 
                      ? parseFloat(receivable.amount) 
                      : Number(receivable.amount);
                    const paidAmount = receivable.paidAmount ? (typeof receivable.paidAmount === 'string' 
                      ? parseFloat(receivable.paidAmount) 
                      : Number(receivable.paidAmount)) : 0;
                    const remainingAmount = typeof receivable.remainingAmount === 'string' 
                      ? parseFloat(receivable.remainingAmount) 
                      : Number(receivable.remainingAmount);
                    return (
                    <TableRow key={receivable.id}>
                      <TableCell className="font-medium">{receivable.id}</TableCell>
                      <TableCell>${amount.toFixed(2)}</TableCell>
                      <TableCell>${paidAmount.toFixed(2)}</TableCell>
                      <TableCell>${remainingAmount.toFixed(2)}</TableCell>
                      <TableCell>{receivable.dueDate ? formatDateTime(receivable.dueDate) : '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          receivable.status === 'paid' ? 'bg-green-100 text-green-800' :
                          receivable.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          receivable.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                          receivable.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {receivable.status === 'paid' ? 'مدفوعة' :
                           receivable.status === 'pending' ? 'معلقة' :
                           receivable.status === 'partial' ? 'جزئية' :
                           receivable.status === 'overdue' ? 'متأخرة' :
                           'ملغاة'}
                        </span>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* تأكيد حذف الدفعة */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الدفعة</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePaymentMutation.isPending}
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأكيد حذف الحركة */}
      <Dialog open={deleteTransactionConfirmOpen} onOpenChange={setDeleteTransactionConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الحركة</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذه الحركة؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTransactionConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTransaction}
              disabled={deleteTransactionMutation.isPending}
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

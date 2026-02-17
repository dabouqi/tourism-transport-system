import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, CreditCard, Edit2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { formatDate, formatDateTime } from "@/lib/dateFormatter";

export default function Receivables() {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isEditReceivableOpen, setIsEditReceivableOpen] = useState(false);
  const [selectedReceivableId, setSelectedReceivableId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "cash" as "cash" | "card" | "transfer" | "check" | "other",
    referenceNumber: "",
    notes: "",
  });

  const [editReceivableData, setEditReceivableData] = useState({
    amount: "",
    dueDate: "",
    status: "pending" as "pending" | "partial" | "paid" | "overdue" | "cancelled",
  });

  const [smartPaymentData, setSmartPaymentData] = useState({
    clientId: undefined as number | undefined,
    bookingNumber: "",
    amount: "",
    paymentMethod: "cash" as "cash" | "card" | "transfer" | "check" | "other",
    referenceNumber: "",
    notes: "",
  });

  const bookingsQuery = trpc.bookings.list.useQuery();

  // Split receivables queries
  const currentReceivablesQuery = trpc.receivablesSplit.list.useQuery({ type: 'current' });
  const futureReceivablesQuery = trpc.receivablesSplit.list.useQuery({ type: 'future' });
  const paymentsQuery = trpc.payments.list.useQuery();
  const clientsQuery = trpc.clients.list.useQuery();
  const pendingReceivablesQuery = trpc.payments.getPendingByClientId.useQuery(
    { clientId: smartPaymentData.clientId || 0 },
    { enabled: (smartPaymentData.clientId || 0) > 0 }
  );
  
  const createPaymentMutation = trpc.payments.create.useMutation();
  const updateReceivableMutation = trpc.receivables.update.useMutation();
  const deleteReceivableMutation = trpc.receivables.delete.useMutation();
  const deletePaymentMutation = trpc.payments.delete.useMutation();
  const smartPaymentMutation = trpc.payments.smartPayment.useMutation();

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReceivableId) return;

    try {
      // Get receivable from either current or future
      const currentReceivable = currentReceivablesQuery.data?.find((r: any) => r.id === selectedReceivableId);
      const futureReceivable = futureReceivablesQuery.data?.find((r: any) => r.id === selectedReceivableId);
      const receivable = currentReceivable || futureReceivable;
      
      if (!receivable) return;

      // تحويل المبلغ من string إلى number
      const amountNumber = parseFloat(paymentData.amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        toast.error("يجب إدخال مبلغ صحيح");
        return;
      }

      await createPaymentMutation.mutateAsync({
        receivableId: selectedReceivableId,
        clientId: receivable.clientId,
        amount: amountNumber,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber,
        notes: paymentData.notes,
      });

      // Update receivable status
      const remainingAmount = parseFloat(receivable.remainingAmount) - parseFloat(paymentData.amount);
      const newStatus = remainingAmount <= 0 ? "paid" : remainingAmount < parseFloat(receivable.amount) ? "partial" : "pending";

      await updateReceivableMutation.mutateAsync({
        id: selectedReceivableId,
        status: newStatus,
      });

      toast.success("تم تسجيل الدفعة بنجاح");
      setPaymentData({
        amount: "",
        paymentMethod: "cash",
        referenceNumber: "",
        notes: "",
      });
      setSelectedReceivableId(null);
      setIsPaymentOpen(false);
      currentReceivablesQuery.refetch();
      futureReceivablesQuery.refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تسجيل الدفعة");
    }
  };

  const handleEditReceivable = (receivable: any) => {
    setEditReceivableData({
      amount: receivable.remainingAmount,
      dueDate: receivable.dueDate ? new Date(receivable.dueDate).toISOString().split('T')[0] : "",
      status: receivable.status,
    });
    setSelectedReceivableId(receivable.id);
    setIsEditReceivableOpen(true);
  };

  const handleUpdateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivableId) return;

    try {
      await updateReceivableMutation.mutateAsync({
        id: selectedReceivableId,
        remainingAmount: editReceivableData.amount,
        dueDate: editReceivableData.dueDate ? new Date(editReceivableData.dueDate) : undefined,
        status: editReceivableData.status,
      });

      toast.success("تم تحديث الذمة بنجاح");
      setIsEditReceivableOpen(false);
      setSelectedReceivableId(null);
      currentReceivablesQuery.refetch();
      futureReceivablesQuery.refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث الذمة");
    }
  };

  const handleDeleteReceivable = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الذمة؟")) {
      deleteReceivableMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("تم حذف الذمة بنجاح");
            currentReceivablesQuery.refetch();
            futureReceivablesQuery.refetch();
          },
          onError: () => {
            toast.error("حدث خطأ أثناء حذف الذمة");
          },
        }
      );
    }
  };

  const handleDeletePayment = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الدفعة؟")) {
      deletePaymentMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("تم حذف الدفعة بنجاح");
            paymentsQuery.refetch();
            currentReceivablesQuery.refetch();
            futureReceivablesQuery.refetch();
          },
          onError: () => {
            toast.error("حدث خطأ أثناء حذف الدفعة");
          },
        }
      );
    }
  };

  const handleSmartPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!smartPaymentData.clientId && !smartPaymentData.bookingNumber) || !smartPaymentData.amount || smartPaymentData.amount === "0") {
      toast.error("الرجاء ملء رقم الحجز أو اسم العميل والمبلغ");
      return;
    }

    try {
      const amountNumber = parseFloat(smartPaymentData.amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        toast.error("يجب إدخال مبلغ صحيح");
        return;
      }

      await smartPaymentMutation.mutateAsync({
        clientId: smartPaymentData.clientId || undefined,
        bookingNumber: smartPaymentData.bookingNumber || undefined,
        amount: amountNumber,
        paymentMethod: smartPaymentData.paymentMethod,
        referenceNumber: smartPaymentData.referenceNumber || undefined,
        notes: smartPaymentData.notes || undefined,
      } as any);

      toast.success("تم تسجيل الدفعة بنجاح");
      setSmartPaymentData({
        clientId: undefined,
        bookingNumber: "",
        amount: "",
        paymentMethod: "cash",
        referenceNumber: "",
        notes: "",
      });
      pendingReceivablesQuery.refetch();
      currentReceivablesQuery.refetch();
      futureReceivablesQuery.refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تسجيل الدفعة");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "مستحقة";
      case "partial":
        return "مدفوعة جزئياً";
      case "paid":
        return "مدفوعة";
      case "overdue":
        return "متأخرة";
      case "cancelled":
        return "ملغاة";
      default:
        return status;
    }
  };

  const getClientName = (clientId: number) => {
    const client = clientsQuery.data?.find((c: any) => c.id === clientId);
    return client?.name || `العميل #${clientId}`;
  };

  // Calculate totals for current and future
  const currentTotal = currentReceivablesQuery.data?.reduce((sum: number, r: any) => sum + parseFloat(r.remainingAmount || 0), 0) || 0;
  const futureTotal = futureReceivablesQuery.data?.reduce((sum: number, r: any) => sum + parseFloat(r.remainingAmount || 0), 0) || 0;
  const totalReceivables = currentTotal + futureTotal;
  const totalPaid = paymentsQuery.data?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;

  const isLoading = currentReceivablesQuery.isLoading || futureReceivablesQuery.isLoading;

  if (isLoading) {
    return <div className="p-4">جاري التحميل...</div>;
  }

  // Helper component for receivables table
  const ReceivablesTable = ({ receivables, type }: { receivables: any[], type: 'current' | 'future' }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العميل</TableHead>
            <TableHead>الحجز</TableHead>
            <TableHead>المبلغ الأصلي</TableHead>
            <TableHead>المبلغ المدفوع</TableHead>
            <TableHead>المبلغ المتبقي</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الاستحقاق</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receivables?.map((receivable: any) => (
            <TableRow key={receivable.id}>
              <TableCell className="font-medium">{getClientName(receivable.clientId)}</TableCell>
              <TableCell>{receivable.bookingNumber || "-"}</TableCell>
              <TableCell>{formatCurrency(receivable.amount)}</TableCell>
              <TableCell className="font-medium text-green-600">
                {formatCurrency(parseFloat(receivable.amount) - parseFloat(receivable.remainingAmount))}
              </TableCell>
              <TableCell className="font-medium text-red-600">
                {formatCurrency(receivable.remainingAmount)}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receivable.status)}`}>
                  {getStatusLabel(receivable.status)}
                </span>
              </TableCell>
              <TableCell>
                {receivable.dueDate ? formatDate(receivable.dueDate) : "-"}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex gap-2">
                  {/* زر الدفعة */}
                  <Dialog open={isPaymentOpen && selectedReceivableId === receivable.id} onOpenChange={setIsPaymentOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setSelectedReceivableId(receivable.id)}
                        disabled={receivable.status === "paid" || receivable.status === "cancelled"}
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>تسجيل دفعة</DialogTitle>
                        <DialogDescription>
                          تسجيل دفعة للذمة رقم {receivable.id} - المبلغ المتبقي: {formatCurrency(receivable.remainingAmount)}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="amount">المبلغ *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            placeholder="أدخل المبلغ"
                            max={receivable.remainingAmount}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="paymentMethod">طريقة الدفع *</Label>
                          <Select
                            value={paymentData.paymentMethod}
                            onValueChange={(value: any) => setPaymentData({ ...paymentData, paymentMethod: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">نقدي</SelectItem>
                              <SelectItem value="card">بطاقة</SelectItem>
                              <SelectItem value="transfer">تحويل بنكي</SelectItem>
                              <SelectItem value="check">شيك</SelectItem>
                              <SelectItem value="other">أخرى</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="referenceNumber">رقم المرجع</Label>
                          <Input
                            id="referenceNumber"
                            value={paymentData.referenceNumber}
                            onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                            placeholder="رقم الشيك أو التحويل"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes">ملاحظات</Label>
                          <Input
                            id="notes"
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                            placeholder="ملاحظات إضافية"
                          />
                        </div>

                        <Button type="submit" className="w-full">
                          تسجيل الدفعة
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  
                  {/* زر الحذف */}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteReceivable(receivable.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">الذمم والدفعات</h1>
          <p className="text-gray-500 mt-1">إدارة الذمم المستحقة والدفعات</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">الذمم الحالية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(currentTotal)}</div>
            <p className="text-xs text-gray-500 mt-1">{currentReceivablesQuery.data?.length || 0} ذمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">الذمم المستقبلية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(futureTotal)}</div>
            <p className="text-xs text-gray-500 mt-1">{futureReceivablesQuery.data?.length || 0} ذمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الذمم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
            <p className="text-xs text-gray-500 mt-1">{(currentReceivablesQuery.data?.length || 0) + (futureReceivablesQuery.data?.length || 0)} ذمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الدفعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-gray-500 mt-1">{paymentsQuery.data?.length || 0} دفعة</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">الذمم الحالية</TabsTrigger>
          <TabsTrigger value="future">الذمم المستقبلية</TabsTrigger>
          <TabsTrigger value="payments">الدفعات المسجلة</TabsTrigger>
        </TabsList>

        {/* Current Receivables Tab */}
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>الذمم الحالية</CardTitle>
              <CardDescription>الحجوزات التي تاريخ ووقت بدايتها قد مضى (مستحقة الآن)</CardDescription>
            </CardHeader>
            <CardContent>
              {currentReceivablesQuery.data && currentReceivablesQuery.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">لا توجد ذمم حالية مسجلة</div>
              ) : (
                <>
                  <ReceivablesTable receivables={currentReceivablesQuery.data} type="current" />
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <div className="text-lg font-bold">
                      إجمالي الذمم الحالية: <span className="text-purple-600">{formatCurrency(currentTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Future Receivables Tab */}
        <TabsContent value="future">
          <Card>
            <CardHeader>
              <CardTitle>الذمم المستقبلية</CardTitle>
              <CardDescription>الحجوزات التي تاريخ ووقت بدايتها لم يأتِ بعد (ستصبح مستحقة لاحقاً)</CardDescription>
            </CardHeader>
            <CardContent>
              {futureReceivablesQuery.data && futureReceivablesQuery.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">لا توجد ذمم مستقبلية مسجلة</div>
              ) : (
                <>
                  <ReceivablesTable receivables={futureReceivablesQuery.data} type="future" />
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <div className="text-lg font-bold">
                      إجمالي الذمم المستقبلية: <span className="text-blue-600">{formatCurrency(futureTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>الدفعات المسجلة</CardTitle>
              <CardDescription>جميع الدفعات المسجلة على الذمم</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsQuery.data && paymentsQuery.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">لا توجد دفعات مسجلة</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>العميل</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>طريقة الدفع</TableHead>
                          <TableHead>رقم المرجع</TableHead>
                          <TableHead className="text-center">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsQuery.data?.map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                            <TableCell>{getClientName(payment.clientId)}</TableCell>
                            <TableCell className="font-medium text-green-600">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>{payment.referenceNumber || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeletePayment(payment.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <div className="text-lg font-bold">
                      إجمالي الدفعات: <span className="text-green-600">{formatCurrency(totalPaid)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

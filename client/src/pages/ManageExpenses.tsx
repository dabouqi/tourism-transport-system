'use client';

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Edit2, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

export default function ManageExpenses() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [approvingExpense, setApprovingExpense] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Form states for add/edit
  const [formData, setFormData] = useState({
    driverId: "",
    amount: "",
    expenseType: "fuel",
    description: "",
    bookingId: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "cash" as "cash" | "salary_deduction" | "bank_transfer",
    amount: "",
    referenceNumber: "",
    notes: "",
  });

  // Queries
  const { data: pendingExpenses, isLoading: pendingLoading, refetch: refetchPending } = trpc.expenses.getByStatus.useQuery({ status: "pending" });
  const { data: approvedExpenses, isLoading: approvedLoading, refetch: refetchApproved } = trpc.expenses.getByStatus.useQuery({ status: "approved" });
  const { data: paidExpenses, isLoading: paidLoading, refetch: refetchPaid } = trpc.expenses.getByStatus.useQuery({ status: "paid" });
  const { data: allDrivers } = trpc.drivers.list.useQuery(undefined, {
    onSuccess: (data) => setDrivers(data),
  });

  // Mutations
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      console.log("تم إضافة المصروفة بنجاح");
      setShowAddModal(false);
      setFormData({ driverId: "", amount: "", expenseType: "fuel", description: "", bookingId: "" });
      refetchPending();
    },
    onError: (error) => {
      console.error("خطأ:", error.message);
    },
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      console.log("تم تحديث المصروفة بنجاح");
      setShowEditModal(false);
      setEditingExpense(null);
      setFormData({ driverId: "", amount: "", expenseType: "fuel", description: "", bookingId: "" });
      refetchPending();
      refetchApproved();
      refetchPaid();
    },
    onError: (error) => {
      console.error("خطأ:", error.message);
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      console.log("تم حذف المصروفة بنجاح");
      refetchPending();
      refetchApproved();
      refetchPaid();
    },
    onError: (error) => {
      console.error("خطأ:", error.message);
    },
  });

  const approveMutation = trpc.expenses.approve.useMutation({
    onSuccess: () => {
      console.log("تم الموافقة على المصروفة بنجاح");
      refetchPending();
    },
    onError: (error) => {
      console.error("خطأ:", error.message);
    },
  });

  const recordPaymentMutation = trpc.expenses.recordPayment.useMutation({
    onSuccess: () => {
      console.log("تم تسجيل الدفع بنجاح");
      setShowPaymentModal(false);
      setApprovingExpense(null);
      setPaymentFormData({
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        amount: "",
        referenceNumber: "",
        notes: "",
      });
      refetchPending();
    },
    onError: (error) => {
      console.error("خطأ:", error.message);
    },
  });

  const handleAddExpense = () => {
    if (!formData.driverId || !formData.amount) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    createMutation.mutate({
      driverId: formData.driverId,
      amount: parseFloat(formData.amount),
      expenseType: formData.expenseType as any,
      description: formData.description || undefined,
      bookingId: formData.bookingId || undefined,
    });
  };

  const handleUpdateExpense = () => {
    if (!formData.driverId || !formData.amount) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    updateMutation.mutate({
      expenseId: editingExpense.id,
      amount: parseFloat(formData.amount),
      expenseType: formData.expenseType as any,
      description: formData.description || undefined,
      bookingId: formData.bookingId || undefined,
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المصروفة؟")) {
      deleteMutation.mutate({ expenseId });
    }
  };

  const handleEditClick = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      driverId: expense.driverId,
      amount: expense.amount.toString(),
      expenseType: expense.expenseType,
      description: expense.description || "",
      bookingId: expense.bookingId || "",
    });
    setShowEditModal(true);
  };

  const handleAddClick = () => {
    setFormData({ driverId: "", amount: "", expenseType: "fuel", description: "", bookingId: "" });
    setShowAddModal(true);
  };

  const handleApproveExpense = (expenseId: string) => {
    const expense = pendingExpenses?.find(e => e.id === expenseId);
    if (expense) {
      setApprovingExpense(expense);
      setPaymentFormData({
        ...paymentFormData,
        amount: expense.amount.toString(),
      });
      setShowPaymentModal(true);
    }
  };

  const handleRecordPayment = () => {
    if (!approvingExpense || !paymentFormData.amount) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }
    recordPaymentMutation.mutate({
      expenseId: approvingExpense.id,
      paymentDate: new Date(paymentFormData.paymentDate),
      paymentMethod: paymentFormData.paymentMethod,
      amount: parseFloat(paymentFormData.amount),
      referenceNumber: paymentFormData.referenceNumber,
      notes: paymentFormData.notes,
    });
  };

  const getDriverName = (driverId: string) => {
    return drivers.find((d) => d.id === driverId)?.name || driverId;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة المصاريف</h1>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus size={20} />
          إضافة مصروفة جديدة
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
          <TabsTrigger value="approved">موافق عليه</TabsTrigger>
          <TabsTrigger value="paid">مدفوع</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
        </TabsList>

        {/* قيد الانتظار - مع البيانات */}
        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : pendingExpenses && pendingExpenses.length > 0 ? (
            <div className="grid gap-4">
              {pendingExpenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{getDriverName(expense.driverId)}</h3>
                          <Badge variant="outline">{expense.expenseType}</Badge>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{expense.amount} د.ا</p>
                        {expense.description && <p className="text-gray-600">{expense.description}</p>}
                        {expense.bookingId && <p className="text-sm text-gray-500">رقم الحجز: {expense.bookingId}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveExpense(expense.id)}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          disabled={approveMutation.isPending}
                        >
                          موافق عليه
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(expense)}
                          className="gap-1"
                        >
                          <Edit2 size={16} />
                          تعديل
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="gap-1"
                        >
                          <Trash2 size={16} />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>لا توجد مصاريف قيد الانتظار</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* موافق عليه */}
        <TabsContent value="approved" className="space-y-4">
          {approvedLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : approvedExpenses && approvedExpenses.length > 0 ? (
            <div className="grid gap-4">
              {approvedExpenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{getDriverName(expense.driverId)}</h3>
                          <Badge variant="outline">{expense.expenseType}</Badge>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{expense.amount} د.ا</p>
                        {expense.description && <p className="text-gray-600">{expense.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(expense)}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>لا توجد مصاريف موافق عليها</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* مدفوع */}
        <TabsContent value="paid" className="space-y-4">
          {paidLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : paidExpenses && paidExpenses.length > 0 ? (
            <div className="grid gap-4">
              {paidExpenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{getDriverName(expense.driverId)}</h3>
                          <Badge variant="outline">{expense.expenseType}</Badge>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{expense.amount} د.ا</p>
                        {expense.description && <p className="text-gray-600">{expense.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(expense)}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>لا توجد مصاريف مدفوعة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* مرفوض - فارغ */}
        <TabsContent value="rejected">
          <Card className="bg-gray-50">
            <CardContent className="pt-6 text-center text-gray-500">
              <p>لا توجد بيانات</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مصروفة جديدة</DialogTitle>
            <DialogDescription>أدخل تفاصيل المصروفة الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="driver-select">السائق</Label>
              <Select value={formData.driverId} onValueChange={(value) => setFormData({ ...formData, driverId: value })}>
                <SelectTrigger id="driver-select">
                  <SelectValue placeholder="اختر السائق" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount-input">المبلغ (د.ا)</Label>
              <Input
                id="amount-input"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="type-select">نوع المصروفة</Label>
              <Select value={formData.expenseType} onValueChange={(value) => setFormData({ ...formData, expenseType: value })}>
                <SelectTrigger id="type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">وقود</SelectItem>
                  <SelectItem value="parking">مواقف</SelectItem>
                  <SelectItem value="toll">رسوم</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description-input">الوصف (اختياري)</Label>
              <Textarea
                id="description-input"
                placeholder="أدخل وصف المصروفة"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="booking-input">رقم الحجز (اختياري)</Label>
              <Input
                id="booking-input"
                placeholder="أدخل رقم الحجز"
                value={formData.bookingId}
                onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddExpense} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المصروفة</DialogTitle>
            <DialogDescription>عدّل تفاصيل المصروفة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-driver-select">السائق</Label>
              <Select value={formData.driverId} onValueChange={(value) => setFormData({ ...formData, driverId: value })}>
                <SelectTrigger id="edit-driver-select">
                  <SelectValue placeholder="اختر السائق" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-amount-input">المبلغ (د.ا)</Label>
              <Input
                id="edit-amount-input"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-type-select">نوع المصروفة</Label>
              <Select value={formData.expenseType} onValueChange={(value) => setFormData({ ...formData, expenseType: value })}>
                <SelectTrigger id="edit-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">وقود</SelectItem>
                  <SelectItem value="parking">مواقف</SelectItem>
                  <SelectItem value="toll">رسوم</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-description-input">الوصف (اختياري)</Label>
              <Textarea
                id="edit-description-input"
                placeholder="أدخل وصف المصروفة"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-booking-input">رقم الحجز (اختياري)</Label>
              <Input
                id="edit-booking-input"
                placeholder="أدخل رقم الحجز"
                value={formData.bookingId}
                onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateExpense} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل الدفع</DialogTitle>
            <DialogDescription>أدخل تفاصيل الدفع للمصروفة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-date">تاريخ الدفع</Label>
              <input
                id="payment-date"
                type="date"
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Label htmlFor="payment-method">طريقة الدفع</Label>
              <Select value={paymentFormData.paymentMethod} onValueChange={(value) => setPaymentFormData({ ...paymentFormData, paymentMethod: value as any })}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="salary_deduction">خصم من الراتب</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-amount">المبلغ</Label>
              <input
                id="payment-amount"
                type="number"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="reference-number">رقم الإيصال (اختياري)</Label>
              <input
                id="reference-number"
                type="text"
                value={paymentFormData.referenceNumber}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <textarea
                id="notes"
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending}>
              {recordPaymentMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              تسجيل الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

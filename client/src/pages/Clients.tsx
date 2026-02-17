import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    type: "individual" as "individual" | "company",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    contactPerson: "",
    notes: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    clientId: "",
    amount: "",
    paymentMethod: "cash" as "cash" | "transfer" | "check" | "card",
    referenceNumber: "",
    notes: "",
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const clientsQuery = trpc.clients.list.useQuery();
  const createMutation = trpc.clients.create.useMutation();
  const updateMutation = trpc.clients.update.useMutation();
  const deleteMutation = trpc.clients.delete.useMutation();
  const createPaymentMutation = trpc.payments.createDirectPayment.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("تم تحديث العميل بنجاح");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("تم إضافة العميل بنجاح");
      }

      setFormData({
        name: "",
        type: "individual",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        contactPerson: "",
        notes: "",
      });
      setEditingId(null);
      setIsOpen(false);
      clientsQuery.refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ العميل");
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentFormData.clientId) {
      toast.error("يرجى اختيار العميل");
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        clientId: parseInt(paymentFormData.clientId),
        amount: paymentFormData.amount,
        paymentMethod: paymentFormData.paymentMethod,
        referenceNumber: paymentFormData.referenceNumber || undefined,
        notes: paymentFormData.notes || undefined,
        paymentDate: paymentFormData.paymentDate ? new Date(paymentFormData.paymentDate) : new Date(),
      });

      toast.success("تم تسجيل الدفعة بنجاح");
      setPaymentFormData({
        clientId: "",
        amount: "",
        paymentMethod: "cash",
        referenceNumber: "",
        notes: "",
        paymentDate: new Date().toISOString().split('T')[0],
      });
      setIsPaymentOpen(false);
      clientsQuery.refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تسجيل الدفعة");
    }
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name,
      type: client.type,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      taxId: client.taxId || "",
      contactPerson: client.contactPerson || "",
      notes: client.notes || "",
    });
    setEditingId(client.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا العميل؟")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("تم حذف العميل بنجاح");
      clientsQuery.refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف العميل");
    }
  };

  const toggleSelectClient = (id: number) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedClients(newSelected);
  };

  const toggleSelectAll = () => {
    if (clientsQuery.data) {
      if (selectedClients.size === clientsQuery.data.length) {
        setSelectedClients(new Set());
      } else {
        setSelectedClients(new Set(clientsQuery.data.map(c => c.id)));
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedClients.size === 0) {
      toast.error("يرجى اختيار عملاء للحذف");
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف ${selectedClients.size} عميل؟`)) {
      selectedClients.forEach(id => {
        deleteMutation.mutate({ id });
      });
      setSelectedClients(new Set());
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        name: "",
        type: "individual",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        contactPerson: "",
        notes: "",
      });
      setEditingId(null);
    }
    setIsOpen(open);
  };

  const handlePaymentDialogClose = (open: boolean) => {
    if (!open) {
      setPaymentFormData({
        clientId: "",
        amount: "",
        paymentMethod: "cash",
        referenceNumber: "",
        notes: "",
        paymentDate: new Date().toISOString().split('T')[0],
      });
    }
    setIsPaymentOpen(open);
  };

  if (clientsQuery.isLoading) {
    return <div className="p-4">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">العملاء والشركات</h1>
          <p className="text-gray-500 mt-1">إدارة العملاء والشركات والذمم</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPaymentOpen} onOpenChange={handlePaymentDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                إضافة دفعة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة دفعة جديدة</DialogTitle>
                <DialogDescription>
                  سجل دفعة جديدة من أحد العملاء
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="client-select">اختر العميل *</Label>
                  <Select 
                    value={paymentFormData.clientId} 
                    onValueChange={(value) => setPaymentFormData({ ...paymentFormData, clientId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsQuery.data?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-amount">المبلغ *</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    placeholder="أدخل المبلغ"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="payment-method">طريقة الدفع *</Label>
                  <Select 
                    value={paymentFormData.paymentMethod} 
                    onValueChange={(value: any) => setPaymentFormData({ ...paymentFormData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="card">بطاقة ائتمان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-date">تاريخ الدفع *</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentFormData.paymentDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reference-number">رقم المرجع</Label>
                  <Input
                    id="reference-number"
                    value={paymentFormData.referenceNumber}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                    placeholder="رقم الشيك أو التحويل"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-notes">ملاحظات</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => handlePaymentDialogClose(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={createPaymentMutation.isPending}>
                    تسجيل الدفعة
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "تعديل العميل" : "إضافة عميل جديد"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "قم بتعديل بيانات العميل" : "أضف عميل أو شركة جديدة"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم العميل/الشركة *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل الاسم"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">نوع العميل *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">شخص فردي</SelectItem>
                      <SelectItem value="company">شركة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+962791234567"
                  />
                </div>

                <div>
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="العنوان الكامل"
                  />
                </div>

                {formData.type === "company" && (
                  <>
                    <div>
                      <Label htmlFor="taxId">الرقم الضريبي</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        placeholder="الرقم الضريبي"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactPerson">جهة التواصل</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="اسم جهة التواصل"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أي ملاحظات إضافية"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "حفظ التعديلات" : "إضافة العميل"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {clientsQuery.data && clientsQuery.data.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={clientsQuery.data.length > 0 && selectedClients.size === clientsQuery.data.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-clients"
            />
            <label htmlFor="select-all-clients" className="text-sm font-medium cursor-pointer">
              تحديد الجميع ({selectedClients.size}/{clientsQuery.data.length})
            </label>
          </div>
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedClients.size === 0 || deleteMutation.isPending}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            مسح المختار ({selectedClients.size})
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>قائمة العملاء</CardTitle>
          <CardDescription>جميع العملاء والشركات المسجلة في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>مجموع الحجوزات</TableHead>
                  <TableHead>مجموع الدفعات</TableHead>
                  <TableHead className="text-red-600 font-bold">المبلغ الصافي</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsQuery.data?.map((client: any) => {
                  const totalBalance = parseFloat(client.totalBalance || "0");
                  const totalPaid = parseFloat(client.totalPaid || "0");
                  const netDue = totalBalance - totalPaid;

                  return (
                    <TableRow key={client.id} className={selectedClients.has(client.id) ? "bg-blue-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => toggleSelectClient(client.id)}
                          id={`client-${client.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {client.type === "individual" ? "شخص فردي" : "شركة"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {totalBalance > 0 ? `${totalBalance.toFixed(2)} د.ا` : "-"}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {totalPaid.toFixed(2)} د.ا
                      </TableCell>
                      <TableCell className={`font-bold ${netDue > 0 ? 'text-red-600' : netDue < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {netDue !== 0 ? `${netDue.toFixed(2)} د.ا` : "-"}
                      </TableCell>
                      <TableCell>{client.phone || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            client.status === "active"
                              ? "bg-green-100 text-green-800"
                              : client.status === "inactive"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {client.status === "active" ? "نشط" : client.status === "inactive" ? "غير نشط" : "معلق"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/customer-transactions/${client.id}`)}
                            title="عرض المعاملات"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(client)}
                            disabled={updateMutation.isPending}
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

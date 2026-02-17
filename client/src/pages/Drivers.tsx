import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/dateFormatter";

export default function Drivers() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    licenseNumber: "",
    licenseExpiry: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "available",
    salary: 0,
    notes: "",
  });

  const drivers = trpc.drivers.list.useQuery();
  const createDriver = trpc.drivers.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة السائق بنجاح"); drivers.refetch(); setIsOpen(false); resetForm(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ أثناء إضافة السائق"); },
  });
  const updateDriver = trpc.drivers.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث السائق بنجاح"); drivers.refetch(); setIsOpen(false); resetForm(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ أثناء تحديث السائق"); },
  });
  const deleteDriver = trpc.drivers.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف السائق بنجاح"); drivers.refetch(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ أثناء حذف السائق"); },
  });

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", licenseNumber: "", licenseExpiry: "", joinDate: new Date().toISOString().split("T")[0], status: "available", salary: 0, notes: "" });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.licenseNumber || !formData.licenseExpiry) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    const driverData = { name: formData.name, phone: formData.phone, email: formData.email, licenseNumber: formData.licenseNumber, licenseExpiry: new Date(formData.licenseExpiry), joinDate: new Date(formData.joinDate), status: formData.status as "available" | "on_trip" | "on_leave", salary: parseFloat(formData.salary.toString()), notes: formData.notes };
    if (editingId) { updateDriver.mutate({ id: editingId, ...driverData }); } else { createDriver.mutate(driverData); }
  };

  const handleEdit = (driver: any) => {
    setFormData({ name: driver.name, phone: driver.phone, email: driver.email || "", licenseNumber: driver.licenseNumber, licenseExpiry: new Date(driver.licenseExpiry).toISOString().split("T")[0], joinDate: new Date(driver.joinDate).toISOString().split("T")[0], status: driver.status, salary: parseFloat(driver.salary || "0"), notes: driver.notes || "" });
    setEditingId(driver.id);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => { if (window.confirm("هل أنت متأكد من حذف هذا السائق؟")) { deleteDriver.mutate({ id }); } };
  const handleView = (driver: any) => { setViewingId(driver.id); };

  const toggleSelectDriver = (id: number) => {
    const newSelected = new Set(selectedDrivers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDrivers(newSelected);
  };

  const toggleSelectAll = () => {
    if (drivers.data) {
      if (selectedDrivers.size === drivers.data.length) {
        setSelectedDrivers(new Set());
      } else {
        setSelectedDrivers(new Set(drivers.data.map(d => d.id)));
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDrivers.size === 0) {
      toast.error("يرجى اختيار سائقين للحذف");
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف ${selectedDrivers.size} سائق؟`)) {
      selectedDrivers.forEach(id => {
        deleteDriver.mutate({ id });
      });
      setSelectedDrivers(new Set());
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      available: { bg: "bg-green-100", text: "text-green-800", label: "متاح" },
      on_trip: { bg: "bg-blue-100", text: "text-blue-800", label: "في رحلة" },
      on_leave: { bg: "bg-yellow-100", text: "text-yellow-800", label: "إجازة" },
    };
    const statusInfo = statusMap[status] || statusMap.available;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>{statusInfo.label}</span>;
  };

  const viewingDriver = drivers.data?.find((d) => d.id === viewingId);
  const driverExpenses = trpc.expenses.getByDriver.useQuery(
    { driverId: viewingId?.toString() || "" },
    { enabled: viewingId !== null }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">إدارة السائقين</h1>
          <p className="text-slate-600 mt-1">إدارة بيانات وحالة السائقين</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />سائق جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingId ? "تعديل السائق" : "إضافة سائق جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>الاسم *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أحمد محمد" /></div>
                <div><Label>رقم الهاتف *</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0501234567" /></div>
                <div><Label>البريد الإلكتروني</Label><Input type="text" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@email.com" /></div>
                <div><Label>رقم الرخصة *</Label><Input value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} placeholder="1234567890" disabled={editingId !== null} /></div>
                <div><Label>انتهاء صلاحية الرخصة *</Label><Input type="date" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} /></div>
                <div><Label>تاريخ الانضمام</Label><Input type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} /></div>
                <div><Label>الراتب الشهري</Label><Input type="number" step="0.01" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })} placeholder="0.00" /></div>
                <div><Label>الحالة</Label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">متاح</SelectItem><SelectItem value="on_trip">في رحلة</SelectItem><SelectItem value="on_leave">إجازة</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="أي ملاحظات إضافية..." /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createDriver.isPending || updateDriver.isPending}>{createDriver.isPending || updateDriver.isPending ? "جاري المعالجة..." : editingId ? "تحديث السائق" : "إضافة السائق"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {viewingDriver && (
        <Dialog open={viewingId !== null} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>تفاصيل السائق</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-600">الاسم</p><p className="font-semibold">{viewingDriver.name}</p></div>
                <div><p className="text-sm text-slate-600">الهاتف</p><p className="font-semibold">{viewingDriver.phone}</p></div>
                <div><p className="text-sm text-slate-600">البريد الإلكتروني</p><p className="font-semibold">{viewingDriver.email || "-"}</p></div>
                <div><p className="text-sm text-slate-600">رقم الرخصة</p><p className="font-semibold">{viewingDriver.licenseNumber}</p></div>
                <div><p className="text-sm text-slate-600">انتهاء الرخصة</p><p className="font-semibold">{new Date(viewingDriver.licenseExpiry).toLocaleDateString('ar-JO')}</p></div>
                <div><p className="text-sm text-slate-600">تاريخ الانضمام</p><p className="font-semibold">{new Date(viewingDriver.joinDate).toLocaleDateString('ar-JO')}</p></div>
                <div><p className="text-sm text-slate-600">الراتب الشهري</p><p className="font-semibold">${parseFloat(viewingDriver.salary || "0").toFixed(2)}</p></div>
                <div><p className="text-sm text-slate-600">الحالة</p><div className="mt-1">{getStatusBadge(viewingDriver.status)}</div></div>
              </div>
              {viewingDriver.notes && (<div><p className="text-sm text-slate-600">الملاحظات</p><p className="font-semibold">{viewingDriver.notes}</p></div>)}
              
              {/* Driver Expenses Section */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">المصاريف</h3>
                {driverExpenses.isLoading ? (
                  <p className="text-slate-500">جاري تحميل المصاريف...</p>
                ) : driverExpenses.data && driverExpenses.data.length > 0 ? (
                  <div className="space-y-3">
                    {/* Cash Expenses - Company owes driver */}
                    {driverExpenses.data.filter(e => e.paymentMethod === "cash").length > 0 && (
                      <div className="bg-green-50 p-4 rounded border border-green-200">
                        <p className="text-sm font-semibold text-green-900 mb-2">الشركة تدين للسائق (مصاريف نقدية)</p>
                        <div className="space-y-2">
                          {driverExpenses.data.filter(e => e.paymentMethod === "cash").map(expense => (
                            <div key={expense.id} className="flex justify-between text-sm">
                              <span>{expense.expenseType} - {new Date(expense.paymentDate || expense.createdAt).toLocaleDateString('ar-JO')}</span>
                              <span className="font-semibold">د.ا {parseFloat(expense.amount || "0").toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-green-200 flex justify-between font-semibold text-green-900">
                          <span>الإجمالي:</span>
                          <span>د.ا {driverExpenses.data.filter(e => e.paymentMethod === "cash").reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Salary Deduction Expenses - Driver owes company */}
                    {driverExpenses.data.filter(e => e.paymentMethod === "salary_deduction").length > 0 && (
                      <div className="bg-red-50 p-4 rounded border border-red-200">
                        <p className="text-sm font-semibold text-red-900 mb-2">السائق يدين للشركة (خصم من الراتب)</p>
                        <div className="space-y-2">
                          {driverExpenses.data.filter(e => e.paymentMethod === "salary_deduction").map(expense => (
                            <div key={expense.id} className="flex justify-between text-sm">
                              <span>{expense.expenseType} - {new Date(expense.paymentDate || expense.createdAt).toLocaleDateString('ar-JO')}</span>
                              <span className="font-semibold">د.ا {parseFloat(expense.amount || "0").toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-red-200 flex justify-between font-semibold text-red-900">
                          <span>الإجمالي:</span>
                          <span>د.ا {driverExpenses.data.filter(e => e.paymentMethod === "salary_deduction").reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">لا توجد مصاريف مسجلة</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {drivers.data && drivers.data.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={drivers.data.length > 0 && selectedDrivers.size === drivers.data.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-drivers"
            />
            <label htmlFor="select-all-drivers" className="text-sm font-medium cursor-pointer">
              تحديد الجميع ({selectedDrivers.size}/{drivers.data.length})
            </label>
          </div>
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedDrivers.size === 0 || deleteDriver.isPending}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            مسح المختار ({selectedDrivers.size})
          </Button>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>قائمة السائقين</CardTitle></CardHeader>
        <CardContent>
          {drivers.isLoading ? (<div className="text-center py-8"><p className="text-slate-500">جاري تحميل البيانات...</p></div>) : drivers.data && drivers.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>رقم الرخصة</TableHead>
                    <TableHead>انتهاء الرخصة</TableHead>
                    <TableHead>الراتب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.data.map((driver) => (
                    <TableRow key={driver.id} className={`border-slate-200 hover:bg-slate-50 ${selectedDrivers.has(driver.id) ? "bg-blue-50" : ""}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDrivers.has(driver.id)}
                          onCheckedChange={() => toggleSelectDriver(driver.id)}
                          id={`driver-${driver.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{driver.name}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.licenseNumber}</TableCell>
                      <TableCell>{driver.licenseExpiry ? formatDate(new Date(driver.licenseExpiry)) : "-"}</TableCell>
                      <TableCell className="font-medium">${parseFloat(driver.salary || "0").toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleView(driver)}><Eye className="w-4 h-4 text-slate-600" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(driver)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete(driver.id)} disabled={deleteDriver.isPending}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (<div className="text-center py-8"><p className="text-slate-500">لا يوجد سائقون حالياً</p></div>)}
        </CardContent>
      </Card>
    </div>
  );
}

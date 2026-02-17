import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Printer, Mail, Download, Trash2, Edit, MoreHorizontal, Filter, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDateTime, formatDate } from "@/lib/dateFormatter";

const Invoices = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    clientId: "",
    receivableId: "",
    bookingId: "",
    issueDate: "",
    dueDate: "",
    totalAmount: "",
    paidAmount: "",
    remainingAmount: "",
    status: "draft",
    paymentMethod: "",
    notes: "",
  });

  // Fetch data
  const { data: invoices = [], isLoading, refetch } = trpc.invoices.getAll.useQuery() as any;
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: receivables = [] } = trpc.receivables.list.useQuery();
  const { data: bookings = [] } = trpc.bookings.list.useQuery();
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();

  // Mutations
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الفاتورة بنجاح");
      setIsOpen(false);
      refetch();
      setFormData({
        invoiceNumber: "",
        clientId: "",
        receivableId: "",
        bookingId: "",
        issueDate: "",
        dueDate: "",
        totalAmount: "",
        paidAmount: "",
        remainingAmount: "",
        status: "draft",
        paymentMethod: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الفاتورة بنجاح");
      setIsEditOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفاتورة بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // Filter and search
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice: any) => {
      const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clients
          .find((c: any) => c.id === invoice.clientId)
          ?.name.toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [invoices, filterStatus, searchTerm, clients]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      total: filteredInvoices.reduce((sum: number, inv: any) => sum + parseFloat((inv.totalAmount || 0).toString()), 0),
      paid: filteredInvoices.reduce((sum: number, inv: any) => sum + parseFloat((inv.paidAmount || 0).toString()), 0),
      remaining: filteredInvoices.reduce(
        (sum: number, inv: any) => sum + parseFloat((inv.remainingAmount || 0).toString()),
        0
      ),
    };
  }, [filteredInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoiceNumber || !formData.clientId || !formData.totalAmount) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const invoiceData = {
      invoiceNumber: formData.invoiceNumber,
      clientId: parseInt(formData.clientId),
      receivableId: parseInt(formData.receivableId),
      bookingId: parseInt(formData.bookingId),
      issueDate: new Date(formData.issueDate),
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      totalAmount: parseFloat(formData.totalAmount),
      paidAmount: parseFloat(formData.paidAmount || "0"),
      remainingAmount: parseFloat(formData.remainingAmount || formData.totalAmount),
      status: formData.status as any,
      paymentMethod: (formData.paymentMethod || null) as any,
      notes: formData.notes || null,
    };

    createMutation.mutate(invoiceData);
  };

  const handleEdit = (invoice: any) => {
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId.toString(),
      receivableId: invoice.receivableId.toString(),
      bookingId: invoice.bookingId.toString(),
      issueDate: new Date(invoice.issueDate).toISOString().split("T")[0],
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
      totalAmount: invoice.totalAmount.toString(),
      paidAmount: invoice.paidAmount.toString(),
      remainingAmount: invoice.remainingAmount.toString(),
      status: invoice.status,
      paymentMethod: invoice.paymentMethod || "",
      notes: invoice.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePrint = (invoice: any) => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      const client = clients.find((c: any) => (c as any).id === invoice.clientId);
      const content = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>فاتورة #${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            .table th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; text-align: left; }
            .footer { margin-top: 40px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>فاتورة</h1>
            <p>رقم الفاتورة: ${invoice.invoiceNumber}</p>
          </div>
          <div class="invoice-details">
            <p><strong>العميل:</strong> ${client?.name || "N/A"}</p>
            <p><strong>البريد الإلكتروني:</strong> ${client?.email || "N/A"}</p>
            <p><strong>تاريخ الإصدار:</strong> ${new Date(invoice.issueDate).toLocaleDateString("ar-SA")}</p>
            <p><strong>تاريخ الاستحقاق:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("ar-SA") : "N/A"}</p>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>البيان</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>المبلغ الإجمالي</td>
                <td>${parseFloat(invoice.totalAmount).toFixed(2)}</td>
              </tr>
              <tr>
                <td>المبلغ المدفوع</td>
                <td>${parseFloat(invoice.paidAmount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>المبلغ المتبقي</td>
                <td>${parseFloat(invoice.remainingAmount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>شكراً لك على تعاملك معنا</p>
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSendEmail = (invoice: any) => {
    const client = clients.find((c: any) => (c as any).id === invoice.clientId);
    if (!client?.email) {
      toast.error("لا يوجد بريد إلكتروني للعميل");
      return;
    }
    toast.success(`تم إرسال الفاتورة إلى ${client.email}`);
    // TODO: Implement actual email sending
  };

  const handleDownloadPDF = (_invoice: any) => {
    toast.success("تم تحميل الفاتورة بصيغة PDF");
    // TODO: Implement actual PDF download
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      viewed: "bg-purple-100 text-purple-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-300 text-gray-900",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "مسودة",
      sent: "مرسلة",
      viewed: "مشاهدة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغاة",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: any) => {
    return `${parseFloat(value || 0).toFixed(2)} ر.س`;
  };

  if (isLoading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">الفواتير</h1>
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          فاتورة جديدة
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المبلغ الإجمالي</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المبلغ المدفوع</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المبلغ المتبقي</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.remaining)}</p>
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="ابحث برقم الفاتورة أو اسم العميل"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status-filter">الحالة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">مرسلة</SelectItem>
                  <SelectItem value="viewed">مشاهدة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>تاريخ الإصدار</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المبلغ المدفوع</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      لا توجد فواتير
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {clients.find((c: any) => c.id === invoice.clientId)?.name || "N/A"}
                      </TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(invoice.paidAmount)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(invoice.remainingAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                              <Edit className="h-4 w-4 mr-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(invoice)}>
                              <Printer className="h-4 w-4 mr-2" />
                              طباعة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
                              <Mail className="h-4 w-4 mr-2" />
                              إرسال بريد
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                              <Download className="h-4 w-4 mr-2" />
                              تحميل PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>فاتورة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">رقم الفاتورة</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="مثال: INV-001"
                />
              </div>
              <div>
                <Label htmlFor="clientId">العميل</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                  <SelectTrigger id="clientId">
                    <SelectValue placeholder="اختر عميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="receivableId">الذمة</Label>
                <Select value={formData.receivableId} onValueChange={(value) => setFormData({ ...formData, receivableId: value })}>
                  <SelectTrigger id="receivableId">
                    <SelectValue placeholder="اختر ذمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {receivables.map((rec: any) => (
                      <SelectItem key={rec.id} value={rec.id.toString()}>
                        {formatCurrency(rec.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bookingId">الحجز</Label>
                <Select value={formData.bookingId} onValueChange={(value) => setFormData({ ...formData, bookingId: value })}>
                  <SelectTrigger id="bookingId">
                    <SelectValue placeholder="اختر حجز" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((booking: any) => (
                      <SelectItem key={booking.id} value={booking.id.toString()}>
                        {booking.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issueDate">تاريخ الإصدار</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">تاريخ الاستحقاق</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="totalAmount">المبلغ الإجمالي</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="remainingAmount">المبلغ المتبقي</Label>
                <Input
                  id="remainingAmount"
                  type="number"
                  step="0.01"
                  value={formData.remainingAmount}
                  onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="status">الحالة</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="sent">مرسلة</SelectItem>
                    <SelectItem value="viewed">مشاهدة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="overdue">متأخرة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="اختر طريقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقد</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="transfer">تحويل</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أضف ملاحظات إضافية"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الفاتورة</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: Implement update
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-invoiceNumber">رقم الفاتورة</Label>
                <Input
                  id="edit-invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">الحالة</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="sent">مرسلة</SelectItem>
                    <SelectItem value="viewed">مشاهدة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="overdue">متأخرة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-paidAmount">المبلغ المدفوع</Label>
                <Input
                  id="edit-paidAmount"
                  type="number"
                  step="0.01"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-remainingAmount">المبلغ المتبقي</Label>
                <Input
                  id="edit-remainingAmount"
                  type="number"
                  step="0.01"
                  value={formData.remainingAmount}
                  onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;

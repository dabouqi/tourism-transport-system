import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";

const PARTNERS = [
  { code: "talixo", name: "Talixo Passenger", color: "bg-blue-100 text-blue-800" },
  { code: "get_transfer", name: "Get Transfer", color: "bg-green-100 text-green-800" },
  { code: "transfeero", name: "Transfeero", color: "bg-purple-100 text-purple-800" },
];

export default function ExternalPartners() {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    commissionPercentage: 0,
  });

  const partners = trpc.partners.getAll.useQuery();
  const revenueByPartner = trpc.partners.getRevenueByPartner.useQuery(
    { startDate: new Date(dateRange.start || new Date().toISOString().split("T")[0]), endDate: new Date(dateRange.end || new Date().toISOString().split("T")[0]) },
    { enabled: !!dateRange.start && !!dateRange.end }
  );
  const totalRevenue = trpc.partners.getTotalRevenueWithPartners.useQuery(
    { startDate: new Date(dateRange.start || new Date().toISOString().split("T")[0]), endDate: new Date(dateRange.end || new Date().toISOString().split("T")[0]) },
    { enabled: !!dateRange.start && !!dateRange.end }
  );

  const createPartner = trpc.partners.getAll.useQuery();

  const resetForm = () => {
    setFormData({ name: "", code: "", commissionPercentage: 0 });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    toast.info("سيتم إضافة الشركة قريباً");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الشركات الخارجية</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة حسابات الشركات الخارجية والإيرادات</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة شركة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة شركة خارجية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم الشركة</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: Talixo" />
              </div>
              <div>
                <Label>الكود</Label>
                <Select value={formData.code} onValueChange={(value) => setFormData({ ...formData, code: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNERS.map((partner) => (
                      <SelectItem key={partner.code} value={partner.code}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نسبة العمولة (%)</Label>
                <Input type="number" value={formData.commissionPercentage} onChange={(e) => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) })} placeholder="0" />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                إضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>المرشحات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>من التاريخ</Label>
              <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            </div>
            <div>
              <Label>إلى التاريخ</Label>
              <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {totalRevenue.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">الإيرادات الداخلية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">${totalRevenue.data.internalRevenue.toFixed(2)}</div>
                <DollarSign className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">إيرادات الشركات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">${totalRevenue.data.partnerRevenue.toFixed(2)}</div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">الإجمالي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-purple-600">${totalRevenue.data.totalRevenue.toFixed(2)}</div>
                <DollarSign className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>الشركات المسجلة</CardTitle>
        </CardHeader>
        <CardContent>
          {partners.isLoading ? (
            <div className="text-center text-gray-500">جاري التحميل...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشركة</TableHead>
                    <TableHead>الكود</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>رصيد الحساب</TableHead>
                    <TableHead>إجمالي الأرباح</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(partners.data || []).map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-sm ${PARTNERS.find((p) => p.code === partner.code)?.color}`}>
                          {partner.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-sm ${partner.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {partner.status === "active" ? "نشط" : "غير نشط"}
                        </span>
                      </TableCell>
                      <TableCell>${partner.accountBalance}</TableCell>
                      <TableCell className="font-bold text-green-600">${partner.totalEarnings}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Edit2 className="w-4 h-4" />
                          تعديل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Partner */}
      {revenueByPartner.data && (
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات حسب الشركة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(revenueByPartner.data || []).map((item) => (
                <div key={item.partnerId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{item.partnerName || "بدون تحديد"}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${PARTNERS.find((p) => p.code === item.partnerCode)?.color}`}>
                      {item.partnerCode}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">الإجمالي</p>
                      <p className="text-xl font-bold text-green-600">${item.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">العمولة</p>
                      <p className="text-xl font-bold text-red-600">${item.totalCommission}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">الصافي</p>
                      <p className="text-xl font-bold text-blue-600">${item.totalNetAmount}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">عدد المعاملات: {item.transactionCount}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

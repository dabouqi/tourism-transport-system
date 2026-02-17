import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Wrench, Calendar, DollarSign, AlertCircle, Download, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/dateFormatter";
import * as XLSX from "xlsx";

export default function Maintenance() {
  const [searchVehicle, setSearchVehicle] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("scheduledDate");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    maintenanceType: "",
    description: "",
    scheduledDate: "",
    cost: "",
  });

  // Fetch maintenance records
  const { data: maintenanceData = [], isLoading, refetch } = trpc.maintenance.list.useQuery();

  // Fetch vehicles for dropdown
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();

  // Create maintenance mutation
  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      setFormData({
        vehicleId: "",
        maintenanceType: "",
        description: "",
        scheduledDate: "",
        cost: "",
      });
    },
  });

  // Delete maintenance mutation
  const deleteMutation = trpc.maintenance.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Handle download as Excel
  const handleDownload = () => {
    const data = filteredData.map((item) => ({
      "رقم المركبة": item.vehicleId,
      "نوع الصيانة": item.maintenanceType,
      "الوصف": item.description,
      "تاريخ الجدولة": item.scheduledDate ? formatDate(item.scheduledDate) : "-",
      "تاريخ الإنجاز": item.completedDate ? formatDate(item.completedDate) : "-",
      "التكلفة (د.ا)": item.cost ? Number(item.cost).toFixed(2) : "-",
      "الحالة": item.status,
      "الملاحظات": item.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الصيانات");
    XLSX.writeFile(wb, `الصيانات_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = maintenanceData;

    if (searchVehicle) {
      filtered = filtered.filter(
        (item) =>
          item.vehicleId?.toString().includes(searchVehicle) ||
          item.maintenanceType?.toLowerCase().includes(searchVehicle.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchVehicle.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Sort
    if (sortBy === "scheduledDate") {
      filtered.sort((a, b) => {
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === "cost") {
      filtered.sort((a, b) => Number(b.cost || 0) - Number(a.cost || 0));
    } else if (sortBy === "status") {
      const statusOrder: Record<string, number> = {
        scheduled: 1,
        in_progress: 2,
        completed: 3,
        cancelled: 4,
      };
      filtered.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
    }

    return filtered;
  }, [maintenanceData, searchVehicle, filterStatus, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = maintenanceData.length;
    const scheduled = maintenanceData.filter((m) => m.status === "scheduled").length;
    const inProgress = maintenanceData.filter((m) => m.status === "in_progress").length;
    const completed = maintenanceData.filter((m) => m.status === "completed").length;
    const totalCost = maintenanceData.reduce((sum, m) => sum + Number(m.cost || 0), 0);

    return { total, scheduled, inProgress, completed, totalCost };
  }, [maintenanceData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-500 text-white">مجدولة</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500 text-white">قيد التنفيذ</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">مكتملة</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500 text-white">ملغاة</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicleId || !formData.maintenanceType || !formData.description || !formData.scheduledDate) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      await createMutation.mutateAsync({
        vehicleId: parseInt(formData.vehicleId),
        maintenanceType: formData.maintenanceType,
        description: formData.description,
        scheduledDate: new Date(formData.scheduledDate),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الصيانة</h1>
          <p className="text-sm text-muted-foreground mt-1">جدولة ومتابعة صيانة المركبات</p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          صيانة جديدة
        </Button>
      </div>

      {/* Create Maintenance Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة صيانة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">المركبة *</label>
              <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر المركبة" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.licensePlate} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">نوع الصيانة *</label>
              <Input
                placeholder="مثال: صيانة دورية، تغيير الزيت"
                value={formData.maintenanceType}
                onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الوصف *</label>
              <Input
                placeholder="وصف تفصيلي للصيانة"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">تاريخ الجدولة *</label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">التكلفة (اختياري)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="mt-1"
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الصيانات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">صيانة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">مجدولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground mt-1">قادمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">قيد التنفيذ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">جاري</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">مكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">منجزة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي التكلفة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">د.ا {stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">مصروفات</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">التصفية والبحث</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">البحث عن صيانة</label>
              <Input
                placeholder="رقم المركبة أو نوع الصيانة"
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الحالة</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="scheduled">مجدولة</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">الترتيب</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduledDate">تاريخ الجدولة (الأقدم أولاً)</SelectItem>
                  <SelectItem value="cost">التكلفة (الأعلى أولاً)</SelectItem>
                  <SelectItem value="status">الحالة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">قائمة الصيانات ({filteredData.length})</CardTitle>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            تنزيل Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المركبة</TableHead>
                  <TableHead>نوع الصيانة</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>تاريخ الجدولة</TableHead>
                  <TableHead>تاريخ الإنجاز</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الملاحظات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Wrench className="w-8 h-8 text-muted-foreground/50" />
                        لا توجد صيانات
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">#{item.vehicleId}</TableCell>
                      <TableCell>{item.maintenanceType || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {item.scheduledDate ? formatDate(item.scheduledDate) : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.completedDate ? formatDate(item.completedDate) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          {item.cost ? `د.ا ${Number(item.cost).toFixed(2)}` : "-"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.notes || "-"}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذه الصيانة والمصاريف المرتبطة بها؟")) {
                              deleteMutation.mutate({ id: item.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="حذف الصيانة والمصاريف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

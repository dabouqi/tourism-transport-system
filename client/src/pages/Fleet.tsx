import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function Fleet() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedVehicles, setSelectedVehicles] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "",
    model: "",
    year: new Date().getFullYear(),
    capacity: 4,
    fuelLevel: 100,
    status: "available",
    notes: "",
  });

  const vehicles = trpc.vehicles.list.useQuery();
  
  const createVehicle = trpc.vehicles.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المركبة بنجاح");
      vehicles.refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المركبة");
    },
  });

  const updateVehicle = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المركبة بنجاح");
      vehicles.refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المركبة");
    },
  });

  const deleteVehicle = trpc.vehicles.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المركبة بنجاح");
      vehicles.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المركبة");
    },
  });

  const resetForm = () => {
    setFormData({
      licensePlate: "",
      vehicleType: "",
      model: "",
      year: new Date().getFullYear(),
      capacity: 4,
      fuelLevel: 100,
      status: "available",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.licensePlate ||
      !formData.vehicleType ||
      !formData.model ||
      !formData.year
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const vehicleData = {
      licensePlate: formData.licensePlate,
      vehicleType: formData.vehicleType,
      model: formData.model,
      year: parseInt(formData.year.toString()),
      capacity: parseInt(formData.capacity.toString()),
      fuelLevel: parseFloat(formData.fuelLevel.toString()),
      status: formData.status as "available" | "in_trip" | "maintenance" | "inactive",
      notes: formData.notes,
    };

    if (editingId) {
      updateVehicle.mutate({
        id: editingId,
        ...vehicleData,
      });
    } else {
      createVehicle.mutate(vehicleData);
    }
  };

  const handleEdit = (vehicle: any) => {
    setFormData({
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      fuelLevel: parseFloat(vehicle.fuelLevel || "0"),
      status: vehicle.status,
      notes: vehicle.notes || "",
    });
    setEditingId(vehicle.id);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذه المركبة؟")) {
      deleteVehicle.mutate({ id });
    }
  };

  const handleView = (vehicle: any) => {
    setViewingId(vehicle.id);
  };

  const toggleSelectVehicle = (id: number) => {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVehicles(newSelected);
  };

  const toggleSelectAll = () => {
    if (vehicles.data) {
      if (selectedVehicles.size === vehicles.data.length) {
        setSelectedVehicles(new Set());
      } else {
        setSelectedVehicles(new Set(vehicles.data.map(v => v.id)));
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedVehicles.size === 0) {
      toast.error("يرجى اختيار مركبات للحذف");
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف ${selectedVehicles.size} مركبة؟`)) {
      selectedVehicles.forEach(id => {
        deleteVehicle.mutate({ id });
      });
      setSelectedVehicles(new Set());
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      available: { bg: "bg-green-100", text: "text-green-800", label: "متاحة" },
      in_trip: { bg: "bg-blue-100", text: "text-blue-800", label: "في رحلة" },
      maintenance: { bg: "bg-yellow-100", text: "text-yellow-800", label: "صيانة" },
      inactive: { bg: "bg-gray-100", text: "text-gray-800", label: "معطلة" },
    };
    const statusInfo = statusMap[status] || statusMap.available;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.label}
      </span>
    );
  };

  const viewingVehicle = vehicles.data?.find((v) => v.id === viewingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">إدارة الأسطول</h1>
          <p className="text-slate-600 mt-1">
            إدارة المركبات والصيانة والوقود
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" />
              مركبة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "تعديل المركبة" : "إضافة مركبة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>لوحة الترخيص *</Label>
                  <Input
                    value={formData.licensePlate}
                    onChange={(e) =>
                      setFormData({ ...formData, licensePlate: e.target.value })
                    }
                    placeholder="ABC-1234"
                    disabled={editingId !== null}
                  />
                </div>
                <div>
                  <Label>نوع المركبة *</Label>
                  <Input
                    value={formData.vehicleType}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleType: e.target.value })
                    }
                    placeholder="سيارة سيدان"
                  />
                </div>
                <div>
                  <Label>الموديل *</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="تويوتا كامري"
                  />
                </div>
                <div>
                  <Label>سنة الصنع *</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    placeholder="2023"
                  />
                </div>
                <div>
                  <Label>السعة (عدد الركاب)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>مستوى الوقود (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.fuelLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fuelLevel: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>الحالة</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">متاحة</SelectItem>
                      <SelectItem value="in_trip">في رحلة</SelectItem>
                      <SelectItem value="maintenance">صيانة</SelectItem>
                      <SelectItem value="inactive">معطلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createVehicle.isPending || updateVehicle.isPending}
                >
                  {createVehicle.isPending || updateVehicle.isPending
                    ? "جاري المعالجة..."
                    : editingId
                    ? "تحديث المركبة"
                    : "إضافة المركبة"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Dialog */}
      {viewingVehicle && (
        <Dialog open={viewingId !== null} onOpenChange={(open) => {
          if (!open) setViewingId(null);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل المركبة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">لوحة الترخيص</p>
                  <p className="font-semibold">{viewingVehicle.licensePlate}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">نوع المركبة</p>
                  <p className="font-semibold">{viewingVehicle.vehicleType}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">الموديل</p>
                  <p className="font-semibold">{viewingVehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">سنة الصنع</p>
                  <p className="font-semibold">{viewingVehicle.year}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">السعة</p>
                  <p className="font-semibold">{viewingVehicle.capacity} ركاب</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">مستوى الوقود</p>
                  <p className="font-semibold">{parseFloat(viewingVehicle.fuelLevel || "0").toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">الحالة</p>
                  <div className="mt-1">{getStatusBadge(viewingVehicle.status)}</div>
                </div>
              </div>
              {viewingVehicle.notes && (
                <div>
                  <p className="text-sm text-slate-600">الملاحظات</p>
                  <p className="font-semibold">{viewingVehicle.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Selection Bar */}
      {vehicles.data && vehicles.data.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={vehicles.data.length > 0 && selectedVehicles.size === vehicles.data.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-vehicles"
            />
            <label htmlFor="select-all-vehicles" className="text-sm font-medium cursor-pointer">
              تحديد الجميع ({selectedVehicles.size}/{vehicles.data.length})
            </label>
          </div>
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedVehicles.size === 0 || deleteVehicle.isPending}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            مسح المختار ({selectedVehicles.size})
          </Button>
        </div>
      )}

      {/* Vehicles Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>قائمة المركبات</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.isLoading ? (
            <div className="text-center py-8">
              <p className="text-slate-500">جاري تحميل البيانات...</p>
            </div>
          ) : vehicles.data && vehicles.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>لوحة الترخيص</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الموديل</TableHead>
                    <TableHead>السنة</TableHead>
                    <TableHead>السعة</TableHead>
                    <TableHead>الوقود</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.data.map((vehicle) => (
                    <TableRow key={vehicle.id} className={`border-slate-200 hover:bg-slate-50 ${selectedVehicles.has(vehicle.id) ? "bg-blue-50" : ""}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedVehicles.has(vehicle.id)}
                          onCheckedChange={() => toggleSelectVehicle(vehicle.id)}
                          id={`vehicle-${vehicle.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {vehicle.licensePlate}
                      </TableCell>
                      <TableCell>{vehicle.vehicleType}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>{vehicle.capacity}</TableCell>
                      <TableCell>{parseFloat(vehicle.fuelLevel || "0").toFixed(1)}%</TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleView(vehicle)}
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(vehicle)}
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDelete(vehicle.id)}
                            disabled={deleteVehicle.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">لا توجد مركبات حالياً</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/lib/dateFormatter";

export default function Alerts() {
  const alerts = trpc.alerts.list.useQuery();
  const [selectedAlerts, setSelectedAlerts] = useState<Set<number>>(new Set());
  
  const markAsRead = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => { toast.success("تم تحديث التنبيه"); alerts.refetch(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ"); },
  });
  const deleteAlert = trpc.alerts.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف التنبيه"); alerts.refetch(); },
    onError: (error) => { toast.error(error.message || "حدث خطأ"); },
  });

  const getSeverityColor = (severity: string) => {
    const severityMap: Record<string, string> = {
      critical: "border-l-red-500 bg-red-50",
      high: "border-l-orange-500 bg-orange-50",
      medium: "border-l-yellow-500 bg-yellow-50",
      low: "border-l-blue-500 bg-blue-50",
    };
    return severityMap[severity] || severityMap.medium;
  };

  const getSeverityLabel = (severity: string) => {
    const severityMap: Record<string, string> = {
      critical: "حرج",
      high: "مرتفع",
      medium: "متوسط",
      low: "منخفض",
    };
    return severityMap[severity] || severity;
  };

  const getAlertTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      maintenance_due: "صيانة مستحقة",
      no_driver_assigned: "لا يوجد سائق معين",
      low_fuel: "وقود منخفض",
      booking_created: "حجز جديد",
      urgent_maintenance: "صيانة طارئة",
    };
    return typeMap[type] || type;
  };

  const handleMarkAsRead = (id: number) => {
    markAsRead.mutate({ id, isRead: true });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التنبيه؟")) {
      deleteAlert.mutate({ id });
    }
  };

  const toggleSelectAlert = (id: number) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAlerts(newSelected);
  };

  const toggleSelectAll = () => {
    if (alerts.data) {
      if (selectedAlerts.size === alerts.data.length) {
        setSelectedAlerts(new Set());
      } else {
        setSelectedAlerts(new Set(alerts.data.map(a => a.id)));
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAlerts.size === 0) {
      toast.error("يرجى اختيار تنبيهات للحذف");
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف ${selectedAlerts.size} تنبيه؟`)) {
      selectedAlerts.forEach(id => {
        deleteAlert.mutate({ id });
      });
      setSelectedAlerts(new Set());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">التنبيهات والإشعارات</h1>
        <p className="text-slate-600 mt-1">مراقبة جميع التنبيهات والإشعارات المهمة</p>
      </div>

      {alerts.data && alerts.data.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={alerts.data.length > 0 && selectedAlerts.size === alerts.data.length}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              تحديد الجميع ({selectedAlerts.size}/{alerts.data.length})
            </label>
          </div>
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedAlerts.size === 0 || deleteAlert.isPending}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            مسح المختار ({selectedAlerts.size})
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {alerts.isLoading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">جاري تحميل التنبيهات...</p>
            </CardContent>
          </Card>
        ) : alerts.data && alerts.data.length > 0 ? (
          alerts.data.map((alert) => (
            <Card key={alert.id} className={`border-l-4 border-0 shadow-sm hover:shadow-md transition-shadow ${getSeverityColor(alert.severity)} ${selectedAlerts.has(alert.id) ? "ring-2 ring-blue-500" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      <Checkbox
                        checked={selectedAlerts.has(alert.id)}
                        onCheckedChange={() => toggleSelectAlert(alert.id)}
                        id={`alert-${alert.id}`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700">{getAlertTypeLabel(alert.alertType)}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{getSeverityLabel(alert.severity)}</span>
                        {alert.isRead && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">مقروء</span>}
                      </div>
                      <p className="text-slate-600 text-sm">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatDateTime(alert.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!alert.isRead && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleMarkAsRead(alert.id)} disabled={markAsRead.isPending} title="تحديد كمقروء">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete(alert.id)} disabled={deleteAlert.isPending} title="حذف">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">لا توجد تنبيهات حالياً</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

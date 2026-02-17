import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Download, Upload, CheckCircle2, XCircle } from "lucide-react";

export default function DataManagement() {
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportQuery = trpc.backup.export.useQuery(undefined, { enabled: false });
  const importMutation = trpc.backup.import.useMutation();

  const handleExport = async () => {
    setExportStatus("loading");
    try {
      const result = await exportQuery.refetch();
      if (result.data && result.data.success && result.data.data) {
        // Create a blob and download
        const dataStr = JSON.stringify(result.data.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportStatus("success");
        setMessage("تم تصدير البيانات بنجاح!");
        setTimeout(() => setExportStatus("idle"), 3000);
      }
    } catch (error) {
      setExportStatus("error");
      setMessage(`خطأ في التصدير: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      setTimeout(() => setExportStatus("idle"), 5000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus("loading");
    try {
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      const result = await importMutation.mutateAsync(backupData);
      if (result.success) {
        setImportStatus("success");
        setMessage(result.message);
        setTimeout(() => setImportStatus("idle"), 3000);
      } else {
        setImportStatus("error");
        setMessage(result.message);
        setTimeout(() => setImportStatus("idle"), 5000);
      }
    } catch (error) {
      setImportStatus("error");
      setMessage(`خطأ في الاستيراد: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      setTimeout(() => setImportStatus("idle"), 5000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">إدارة البيانات</h1>
        <p className="text-muted-foreground mb-8">
          قم بتصدير واستيراد بيانات النظام (الحجوزات، الحركات، المصاريف)
        </p>

        {message && (
          <Alert className={`mb-6 ${exportStatus === "error" || importStatus === "error" ? "border-red-500" : "border-green-500"}`}>
            <div className="flex items-center gap-2">
              {exportStatus === "error" || importStatus === "error" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <AlertDescription>{message}</AlertDescription>
            </div>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Export Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                تصدير البيانات
              </CardTitle>
              <CardDescription>
                قم بتحميل نسخة من جميع البيانات (الحجوزات، الحركات، المصاريف) على جهازك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExport}
                disabled={exportStatus === "loading"}
                className="w-full"
                size="lg"
              >
                {exportStatus === "loading" ? "جاري التصدير..." : "تحميل البيانات"}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                سيتم حفظ البيانات في ملف JSON على جهازك
              </p>
            </CardContent>
          </Card>

          {/* Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                استيراد البيانات
              </CardTitle>
              <CardDescription>
                قم برفع ملف نسخة احتياطية لاستعادة البيانات السابقة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={handleImportClick}
                disabled={importStatus === "loading"}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {importStatus === "loading" ? "جاري الاستيراد..." : "اختر ملف النسخة الاحتياطية"}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                يجب أن يكون الملف بصيغة JSON تم تصديره من هذا النظام
              </p>
            </CardContent>
          </Card>

          {/* Warning Alert */}
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>تحذير:</strong> عند استيراد البيانات، سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات المستوردة.
              تأكد من وجود نسخة احتياطية قبل المتابعة.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

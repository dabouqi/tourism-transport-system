import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SubmitExpense() {
  const { user } = useAuth();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const [formData, setFormData] = useState({
    driverId: user?.openId || "",
    amount: "",
    expenseType: "fuel",
    description: "",
    bookingId: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      setStatus("success");
      setMessage("تم تقديم المصروفة بنجاح! سيتم مراجعتها قريباً.");
      setFormData({
        driverId: user?.openId || "",
        amount: "",
        expenseType: "fuel",
        description: "",
        bookingId: "",
      });
      setTimeout(() => setStatus("idle"), 3000);
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message || "حدث خطأ في تقديم المصروفة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setStatus("error");
      setMessage("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (!formData.driverId) {
      setStatus("error");
      setMessage("يجب اختيار السائق أولاً");
      return;
    }

    setStatus("loading");
    createExpense.mutate({
      driverId: formData.driverId,
      amount: parseFloat(formData.amount),
      expenseType: formData.expenseType as any,
      description: formData.description || undefined,
      bookingId: formData.bookingId || undefined,
    });
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>تقديم مصروفة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === "success" && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}

            {status === "error" && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="driver">اسم السائق</Label>
              <Select
                value={formData.driverId}
                onValueChange={(value) => setFormData({ ...formData, driverId: value })}
                disabled={status === "loading"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر السائق" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name || driver.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ (د.ا)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="أدخل المبلغ"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={status === "loading"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseType">نوع المصروفة</Label>
              <Select
                value={formData.expenseType}
                onValueChange={(value) => setFormData({ ...formData, expenseType: value })}
                disabled={status === "loading"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">بنزين</SelectItem>
                  <SelectItem value="parking">مواقف</SelectItem>
                  <SelectItem value="toll">رسوم طرق</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                placeholder="أضف وصفاً للمصروفة"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={status === "loading"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingId">رقم الحجز (اختياري)</Label>
              <Input
                id="bookingId"
                placeholder="أدخل رقم الحجز إن وجد"
                value={formData.bookingId}
                onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                disabled={status === "loading"}
              />
            </div>

            <Button
              type="submit"
              disabled={status === "loading"}
              className="w-full"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                "تقديم المصروفة"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

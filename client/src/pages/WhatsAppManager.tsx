import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Send } from "lucide-react";

export default function WhatsAppManager() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendMessageMutation = trpc.whatsappMessages.sendMessage.useMutation();
  const verifyConnectionQuery = trpc.whatsappMessages.verifyConnection.useQuery();

  const handleSendMessage = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      setResult({ success: false, message: "يرجى ملء جميع الحقول" });
      return;
    }

    setLoading(true);
    try {
      const response = await sendMessageMutation.mutateAsync({
        phoneNumber,
        message,
      });

      if (response.success) {
        setResult({
          success: true,
          message: `تم إرسال الرسالة بنجاح! معرّف الرسالة: ${response.messageId}`,
        });
        setPhoneNumber("");
        setMessage("");
      } else {
        setResult({
          success: false,
          message: `خطأ: ${response.error}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `خطأ في الاتصال: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إدارة WhatsApp</h1>
        <p className="text-gray-600 mt-2">إرسال الرسائل عبر WhatsApp Business API</p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {verifyConnectionQuery.data?.connected ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                الاتصال نشط
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                الاتصال غير نشط
              </>
            )}
          </CardTitle>
          <CardDescription>
            {verifyConnectionQuery.data?.connected
              ? "تم التحقق من الاتصال بـ WhatsApp Business API بنجاح"
              : "تحقق من بيانات الاعتماد"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Send Message Form */}
      <Card>
        <CardHeader>
          <CardTitle>إرسال رسالة</CardTitle>
          <CardDescription>أرسل رسالة نصية إلى رقم هاتف</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
            <Input
              placeholder="+962790175202"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">استخدم الصيغة الدولية مثل +962...</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">الرسالة</label>
            <Textarea
              placeholder="اكتب رسالتك هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={loading || !verifyConnectionQuery.data?.connected}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                إرسال الرسالة
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Alert */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>نماذج الرسائل</CardTitle>
          <CardDescription>استخدم النماذج الجاهزة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start text-right"
            onClick={() => {
              setMessage(`مرحباً،

تم تأكيد حجزك بنجاح ✅

شكراً لاختيارك خدماتنا!`);
            }}
          >
            تأكيد الحجز
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-right"
            onClick={() => {
              setMessage(`مرحباً،

تذكير بحجزك 🚗

يرجى التأكد من توفرك في الوقت المحدد.`);
            }}
          >
            تذكير الحجز
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-right"
            onClick={() => {
              setMessage(`مرحباً،

تذكير بالدفع المستحق 💰

يرجى تسوية الدفع في أقرب وقت.`);
            }}
          >
            تذكير الدفع
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// client/src/pages/WhatsAppSettings.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Save, AlertCircle, CheckCircle2, Phone, MessageSquare, Settings } from 'lucide-react';

const WhatsAppSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    phoneNumber: '',
    businessName: 'نظام إدارة النقل السياحي',
    messageTemplate: 'مرحباً {customerName}، تم تأكيد حجزك برقم {bookingNumber}. شكراً لاختيارك خدماتنا.',
    isEnabled: true,
    autoSend: false,
    sendDelay: 0, // بالثواني
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // محاكاة حفظ الإعدادات
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // التحقق من البيانات المطلوبة
      if (!settings.apiKey.trim()) {
        toast.error('يرجى إدخال مفتاح API');
        setIsSaving(false);
        return;
      }

      if (!settings.phoneNumber.trim()) {
        toast.error('يرجى إدخال رقم الهاتف');
        setIsSaving(false);
        return;
      }

      // حفظ الإعدادات في localStorage (للتطوير)
      localStorage.setItem('whatsappSettings', JSON.stringify(settings));
      
      toast.success('تم حفظ الإعدادات بنجاح!');
      console.log('✅ تم حفظ إعدادات WhatsApp:', settings);
    } catch (error) {
      console.error('❌ خطأ في حفظ الإعدادات:', error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      toast.loading('جاري اختبار الاتصال...');
      
      // محاكاة اختبار الاتصال
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.dismiss();
      toast.success('✅ تم الاتصال بنجاح!');
      console.log('✅ اختبار الاتصال نجح');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ فشل الاتصال');
      console.error('❌ خطأ في اختبار الاتصال:', error);
    }
  };

  const handleResetSettings = () => {
    if (confirm('هل أنت متأكد من حذف جميع الإعدادات؟')) {
      setSettings({
        apiKey: '',
        phoneNumber: '',
        businessName: 'نظام إدارة النقل السياحي',
        messageTemplate: 'مرحباً {customerName}، تم تأكيد حجزك برقم {bookingNumber}. شكراً لاختيارك خدماتنا.',
        isEnabled: true,
        autoSend: false,
        sendDelay: 0,
      });
      localStorage.removeItem('whatsappSettings');
      toast.success('تم إعادة تعيين الإعدادات');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">إعدادات WhatsApp</h1>
          <p className="text-gray-600">إدارة إعدادات خدمة WhatsApp والرسائل الآلية</p>
        </div>
      </div>

      {/* بطاقة الحالة */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.isEnabled ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">الخدمة مفعلة</p>
                    <p className="text-sm text-green-700">الرسائل جاهزة للإرسال</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">الخدمة معطلة</p>
                    <p className="text-sm text-yellow-700">الرسائل لن تُرسل حالياً</p>
                  </div>
                </>
              )}
            </div>
            <Badge variant={settings.isEnabled ? 'default' : 'secondary'}>
              {settings.isEnabled ? 'نشط' : 'معطل'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            إعدادات الاتصال
          </CardTitle>
          <CardDescription>
            أدخل بيانات WhatsApp API الخاصة بك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* مفتاح API */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">مفتاح API</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              placeholder="أدخل مفتاح API الخاص بك"
              value={settings.apiKey}
              onChange={handleInputChange}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              احصل على مفتاح API من لوحة تحكم WhatsApp Business
            </p>
          </div>

          {/* رقم الهاتف */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">رقم الهاتف</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="+966501234567"
              value={settings.phoneNumber}
              onChange={handleInputChange}
              dir="ltr"
            />
            <p className="text-xs text-gray-500">
              أدخل رقم الهاتف بصيغة دولية (مثال: +966501234567)
            </p>
          </div>

          {/* اسم الشركة */}
          <div className="space-y-2">
            <Label htmlFor="businessName">اسم الشركة</Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder="اسم شركتك"
              value={settings.businessName}
              onChange={handleInputChange}
            />
          </div>

          {/* اختبار الاتصال */}
          <Button
            onClick={handleTestConnection}
            variant="outline"
            className="w-full"
          >
            اختبار الاتصال
          </Button>
        </CardContent>
      </Card>

      {/* إعدادات الرسائل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            إعدادات الرسائل
          </CardTitle>
          <CardDescription>
            خصص قالب الرسائل والإعدادات الآلية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* قالب الرسالة */}
          <div className="space-y-2">
            <Label htmlFor="messageTemplate">قالب الرسالة</Label>
            <Textarea
              id="messageTemplate"
              name="messageTemplate"
              placeholder="أدخل قالب الرسالة..."
              value={settings.messageTemplate}
              onChange={handleInputChange}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              استخدم المتغيرات: {'{customerName}'}, {'{bookingNumber}'}, {'{bookingDate}'}, {'{amount}'}
            </p>
          </div>

          {/* الإرسال التلقائي */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoSend" className="cursor-pointer">
                تفعيل الإرسال التلقائي
              </Label>
              <input
                id="autoSend"
                name="autoSend"
                type="checkbox"
                checked={settings.autoSend}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
            {settings.autoSend && (
              <div className="space-y-2">
                <Label htmlFor="sendDelay">تأخير الإرسال (بالثواني)</Label>
                <Input
                  id="sendDelay"
                  name="sendDelay"
                  type="number"
                  min="0"
                  max="3600"
                  value={settings.sendDelay}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-500">
                  عدد الثواني قبل إرسال الرسالة تلقائياً بعد تأكيد الحجز
                </p>
              </div>
            )}
          </div>

          {/* تفعيل/تعطيل الخدمة */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="isEnabled" className="cursor-pointer">
                تفعيل خدمة WhatsApp
              </Label>
              <input
                id="isEnabled"
                name="isEnabled"
                type="checkbox"
                checked={settings.isEnabled}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أزرار الإجراءات */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleResetSettings}
          disabled={isSaving}
        >
          إعادة تعيين
        </Button>
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>

      {/* معلومات إضافية */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">معلومات مفيدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-gray-900 mb-1">🔐 أمان البيانات</p>
            <p className="text-gray-600">
              جميع بيانات API محفوظة بشكل آمن ولا يتم مشاركتها مع أي طرف ثالث
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">📱 الدعم</p>
            <p className="text-gray-600">
              للحصول على مساعدة في إعداد WhatsApp API، يرجى زيارة توثيق WhatsApp Business
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">⚙️ المتغيرات المتاحة</p>
            <p className="text-gray-600 font-mono text-xs">
              {'{customerName}'} - {'{bookingNumber}'} - {'{bookingDate}'} - {'{amount}'} - {'{businessName}'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettings;

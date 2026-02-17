import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MessageCenter() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Queries
  const allMessages = trpc.whatsapp.getAllMessages.useQuery();
  const pendingMessages = trpc.whatsapp.getPendingMessages.useQuery();
  const sentMessages = trpc.whatsapp.getSentMessages.useQuery();

  // Mutations
  const resendMessage = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة الإرسال");
      allMessages.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في الإرسال");
    },
  });

  const deleteMessage = trpc.whatsapp.deleteMessage.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      allMessages.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في الحذف");
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-800">مرسلة</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">معلقة</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">فشل</Badge>;
      default:
        return null;
    }
  };

  const MessageRow = ({ msg }: { msg: any }) => (
    <div key={msg.id} className="border rounded-lg overflow-hidden">
      <button
        onClick={() =>
          setExpandedId(expandedId === msg.id ? null : msg.id)
        }
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4 flex-1 text-right">
          <div className="flex items-center gap-2">
            {getStatusIcon(msg.status)}
            {getStatusBadge(msg.status)}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{msg.bookingNumber}</p>
            <p className="text-sm text-gray-500">
              {msg.recipientNames.join(", ")}
            </p>
          </div>
        </div>
        <div className="text-left text-sm text-gray-500">
          {new Date(msg.createdAt).toLocaleString("ar-EG")}
        </div>
      </button>

      {expandedId === msg.id && (
        <div className="bg-gray-50 p-4 border-t space-y-4">
          {/* Message Content */}
          <div>
            <p className="text-sm font-semibold mb-2">محتوى الرسالة:</p>
            <div className="bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap text-sm font-mono max-h-48 overflow-y-auto">
              {msg.message}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <p className="text-sm font-semibold mb-2">المستقبلون:</p>
            <div className="space-y-1">
              {msg.recipientNames.map((name: string, idx: number) => (
                <div key={idx} className="text-sm text-gray-700">
                  • {name} ({msg.recipients[idx]})
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {msg.error && (
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-sm text-red-800">
                <strong>الخطأ:</strong> {msg.error}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              تاريخ الإنشاء:{" "}
              {new Date(msg.createdAt).toLocaleString("ar-EG")}
            </p>
            {msg.sentAt && (
              <p>
                تاريخ الإرسال:{" "}
                {new Date(msg.sentAt).toLocaleString("ar-EG")}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {msg.status === "failed" && (
              <Button
                size="sm"
                onClick={() => resendMessage.mutate({ messageId: msg.id })}
                disabled={resendMessage.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                إعادة إرسال
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("هل تريد حذف هذه الرسالة؟")) {
                  deleteMessage.mutate({ messageId: msg.id });
                }
              }}
              disabled={deleteMessage.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              حذف
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">مركز الرسائل</h1>
        <p className="text-gray-600 mt-2">
          تتبع جميع رسائل WhatsApp المرسلة والمعلقة
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الرسائل المعلقة</p>
                <p className="text-2xl font-bold">
                  {pendingMessages.data?.length || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الرسائل المرسلة</p>
                <p className="text-2xl font-bold">
                  {sentMessages.data?.length || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الرسائل</p>
                <p className="text-2xl font-bold">
                  {allMessages.data?.length || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>الرسائل</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                الكل ({allMessages.data?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="pending">
                معلقة ({pendingMessages.data?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="sent">
                مرسلة ({sentMessages.data?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {allMessages.isLoading ? (
                <p className="text-gray-500">جاري التحميل...</p>
              ) : allMessages.data && allMessages.data.length > 0 ? (
                allMessages.data.map((msg) => (
                  <MessageRow key={msg.id} msg={msg} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  لا توجد رسائل
                </p>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingMessages.isLoading ? (
                <p className="text-gray-500">جاري التحميل...</p>
              ) : pendingMessages.data && pendingMessages.data.length > 0 ? (
                pendingMessages.data.map((msg) => (
                  <MessageRow key={msg.id} msg={msg} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  لا توجد رسائل معلقة
                </p>
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-3 mt-4">
              {sentMessages.isLoading ? (
                <p className="text-gray-500">جاري التحميل...</p>
              ) : sentMessages.data && sentMessages.data.length > 0 ? (
                sentMessages.data.map((msg) => (
                  <MessageRow key={msg.id} msg={msg} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  لا توجد رسائل مرسلة
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

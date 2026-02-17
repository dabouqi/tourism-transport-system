'use client';

import React, { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, RefreshCw, Edit2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface PendingWhatsAppMessage {
  id: number;
  messageId: string;
  bookingId: string;
  bookingNumber: string;
  message: string;
  recipients: string;
  recipientNames: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PendingMessages: React.FC = () => {
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // استرجاع الرسائل المعلقة
  const {
    data: messagesResponse,
    isLoading: isFetching,
    error: fetchError,
    refetch
  } = trpc.whatsapp.getPendingMessages.useQuery(undefined, {
    refetchInterval: 5000, // تحديث كل 5 ثواني
    onSuccess: (data) => {
      console.log('✅ [PendingMessages] تم استرجاع الرسائل:', data);
    },
    onError: (error: any) => {
      console.error('❌ [PendingMessages] خطأ في استرجاع الرسائل:', error);
      toast.error('فشل في تحميل الرسائل المعلقة');
    }
  });

  // Mutation لإرسال رسالة
  const sendMessageMutation = trpc.whatsapp.sendWhatsAppMessage.useMutation({
    onSuccess: () => {
      toast.success('تم إرسال الرسالة بنجاح');
      refetch();
    },
    onError: (error: any) => {
      console.error('❌ [PendingMessages] خطأ في إرسال الرسالة:', error);
      toast.error('فشل في إرسال الرسالة');
    }
  });

  // Mutation لتحديث نص الرسالة
  const updateMessageMutation = trpc.whatsapp.updateMessageText.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ الرسالة بنجاح');
      setIsEditDialogOpen(false);
      setEditingMessageId(null);
      setEditingText('');
      refetch();
    },
    onError: (error: any) => {
      console.error('❌ [PendingMessages] خطأ في تحديث الرسالة:', error);
      toast.error('فشل في حفظ الرسالة');
    }
  });

  // Mutation لحذف رسالة
  const deleteMessageMutation = trpc.whatsapp.deletePendingMessage.useMutation({
    onSuccess: () => {
      toast.success('تم حذف الرسالة بنجاح');
      refetch();
    },
    onError: (error: any) => {
      console.error('❌ [PendingMessages] خطأ في حذف الرسالة:', error);
      toast.error('فشل في حذف الرسالة');
    }
  });

  useEffect(() => {
    console.log('🔵 [PendingMessages] المكون تم تحميله');
    console.log('🔵 [PendingMessages] حالة التحميل:', isFetching);
    console.log('🔵 [PendingMessages] البيانات:', messagesResponse);
  }, [isFetching, messagesResponse]);

  // فتح نافذة التعديل
  const handleOpenEditDialog = (message: PendingWhatsAppMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.message);
    setIsEditDialogOpen(true);
  };

  // حفظ التعديل وإرسال الرسالة
  const handleSaveAndSend = async () => {
    if (!editingMessageId) return;

    setIsLoading(true);
    try {
      // حفظ النص المعدل أولاً
      await updateMessageMutation.mutateAsync({
        id: editingMessageId,
        message: editingText
      });

      // ثم إرسال الرسالة
      await sendMessageMutation.mutateAsync({ id: editingMessageId });

      setSelectedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingMessageId);
        return newSet;
      });
    } catch (error) {
      console.error('خطأ في حفظ وإرسال الرسالة:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // حفظ التعديل فقط
  const handleSaveOnly = async () => {
    if (!editingMessageId) return;

    setIsLoading(true);
    try {
      await updateMessageMutation.mutateAsync({
        id: editingMessageId,
        message: editingText
      });
    } catch (error) {
      console.error('خطأ في حفظ الرسالة:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رسالة واحدة
  const handleSendMessage = async (messageId: number) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({ id: messageId });
      setSelectedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رسائل متعددة
  const handleSendSelected = async () => {
    if (selectedMessages.size === 0) {
      toast.error('الرجاء اختيار رسالة واحدة على الأقل');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const messageId of selectedMessages) {
      try {
        await sendMessageMutation.mutateAsync({ id: messageId });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setIsLoading(false);
    setSelectedMessages(new Set());
    toast.success(`تم إرسال ${successCount} رسالة بنجاح${failCount > 0 ? ` وفشل ${failCount}` : ''}`);
  };

  // حذف رسالة واحدة
  const handleDeleteMessage = async (messageId: number) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      try {
        await deleteMessageMutation.mutateAsync({ id: messageId });
        setSelectedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } catch (error) {
        console.error('خطأ في حذف الرسالة:', error);
      }
    }
  };

  // حذف رسائل متعددة
  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) {
      toast.error('الرجاء اختيار رسالة واحدة على الأقل');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف ${selectedMessages.size} رسالة؟`)) {
      setIsLoading(true);
      let successCount = 0;

      for (const messageId of selectedMessages) {
        try {
          await deleteMessageMutation.mutateAsync({ id: messageId });
          successCount++;
        } catch (error) {
          console.error('خطأ في حذف الرسالة:', error);
        }
      }

      setIsLoading(false);
      setSelectedMessages(new Set());
      toast.success(`تم حذف ${successCount} رسالة بنجاح`);
    }
  };

  // تحديد/إلغاء تحديد جميع الرسائل
  const handleSelectAll = () => {
    if (messagesResponse?.data) {
      if (selectedMessages.size === messagesResponse.data.length) {
        setSelectedMessages(new Set());
      } else {
        setSelectedMessages(new Set(messagesResponse.data.map(m => m.id)));
      }
    }
  };

  // تحديد/إلغاء تحديد رسالة واحدة
  const handleToggleMessage = (messageId: number) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const messages = messagesResponse?.data || [];
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    pending: 'معلق',
    sent: 'مرسل',
    failed: 'فاشل'
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>رسائل WhatsApp المعلقة</CardTitle>
              <CardDescription>
                إدارة الرسائل المعلقة والمرسلة والفاشلة - يمكنك تعديل الرسالة وحفظها وإرسالها
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* شريط الأدوات */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  messages.length > 0 &&
                  selectedMessages.size === messages.length
                }
                onCheckedChange={handleSelectAll}
                disabled={messages.length === 0}
              />
              <span className="text-sm text-gray-600">
                {selectedMessages.size > 0
                  ? `تم تحديد ${selectedMessages.size} من ${messages.length}`
                  : `إجمالي: ${messages.length} رسالة`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendSelected}
                disabled={selectedMessages.size === 0 || isLoading}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4" />
                إرسال المحدد
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={selectedMessages.size === 0 || isLoading}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Trash2 className="h-4 w-4" />
                حذف المحدد
              </Button>
            </div>
          </div>

          {/* قائمة الرسائل */}
          {isFetching && messages.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد رسائل معلقة
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message: PendingWhatsAppMessage) => (
                <div
                  key={message.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedMessages.has(message.id)}
                    onCheckedChange={() => handleToggleMessage(message.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">
                        {message.bookingNumber}
                      </span>
                      <Badge className={statusColors[message.status]}>
                        {statusLabels[message.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 break-words line-clamp-2">
                      {message.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.createdAt).toLocaleString('ar-JO')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {message.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditDialog(message)}
                          disabled={isLoading}
                          title="تعديل الرسالة"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendMessage(message.id)}
                          disabled={isLoading}
                          title="إرسال الرسالة"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMessage(message.id)}
                      disabled={isLoading}
                      title="حذف الرسالة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة تعديل الرسالة */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل رسالة WhatsApp</DialogTitle>
            <DialogDescription>
              عدّل نص الرسالة ثم احفظها وأرسلها أو احفظها فقط
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="نص الرسالة"
              className="min-h-[200px] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingMessageId(null);
                  setEditingText('');
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                إلغاء
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveOnly}
                disabled={isLoading || !editingText.trim()}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                حفظ فقط
              </Button>
              <Button
                onClick={handleSaveAndSend}
                disabled={isLoading || !editingText.trim()}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Send className="h-4 w-4 mr-2" />
                حفظ وإرسال
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingMessages;

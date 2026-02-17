// server/routers-whatsapp-v2.ts
import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  createPendingMessage,
  getPendingMessages,
  updateMessageStatus,
  deletePendingMessage,
  getMessageById,
  getMessagesByBookingId,
  getAllMessages,
  getSentMessages,
  getFailedMessages
} from './db-whatsapp';

/**
 * tRPC Router لإدارة رسائل WhatsApp
 */
export const whatsappRouter = router({
  /**
   * إجراء استرجاع جميع الرسائل المعلقة
   */
  getPendingMessages: publicProcedure
    .query(async () => {
      console.log('🔵 [tRPC:getPendingMessages] تم استدعاء الإجراء');
      
      try {
        const messages = await getPendingMessages();
        
        console.log('✅ [tRPC:getPendingMessages] تم استرجاع الرسائل:', {
          count: messages.length,
          sample: messages.length > 0 ? {
            id: messages[0].id,
            bookingId: messages[0].bookingId,
          } : null
        });
        
        return {
          success: true,
          data: messages,
          count: messages.length
        };
        
      } catch (error) {
        console.error('❌ [tRPC:getPendingMessages] خطأ:', error);
        
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء استرجاع جميع الرسائل
   */
  getAllMessages: publicProcedure
    .query(async () => {
      console.log('🔵 [tRPC:getAllMessages] تم استدعاء الإجراء');
      
      try {
        const messages = await getAllMessages();
        
        console.log('✅ [tRPC:getAllMessages] تم استرجاع الرسائل:', {
          count: messages.length
        });
        
        return {
          success: true,
          data: messages,
          count: messages.length
        };
        
      } catch (error) {
        console.error('❌ [tRPC:getAllMessages] خطأ:', error);
        
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء استرجاع الرسائل المرسلة
   */
  getSentMessages: publicProcedure
    .query(async () => {
      console.log('🔵 [tRPC:getSentMessages] تم استدعاء الإجراء');
      
      try {
        const messages = await getSentMessages();
        
        console.log('✅ [tRPC:getSentMessages] تم استرجاع الرسائل:', {
          count: messages.length
        });
        
        return {
          success: true,
          data: messages,
          count: messages.length
        };
        
      } catch (error) {
        console.error('❌ [tRPC:getSentMessages] خطأ:', error);
        
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء استرجاع الرسائل الفاشلة
   */
  getFailedMessages: publicProcedure
    .query(async () => {
      console.log('🔵 [tRPC:getFailedMessages] تم استدعاء الإجراء');
      
      try {
        const messages = await getFailedMessages();
        
        console.log('✅ [tRPC:getFailedMessages] تم استرجاع الرسائل:', {
          count: messages.length
        });
        
        return {
          success: true,
          data: messages,
          count: messages.length
        };
        
      } catch (error) {
        console.error('❌ [tRPC:getFailedMessages] خطأ:', error);
        
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء إنشاء رسالة معلقة جديدة
   */
  createPendingMessage: publicProcedure
    .input(z.object({
      bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
      bookingNumber: z.string().min(1, 'رقم الحجز مطلوب'),
      message: z.string().min(1, 'نص الرسالة مطلوب'),
      recipients: z.array(z.string()).optional(),
      recipientNames: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      console.log('🔵 [tRPC:createPendingMessage] تم استدعاء الإجراء:', input);
      
      try {
        const message = await createPendingMessage(input);
        
        console.log('✅ [tRPC:createPendingMessage] تم إنشاء الرسالة:', message);
        
        return {
          success: true,
          data: message,
          message: 'تم إنشاء الرسالة المعلقة بنجاح'
        };
        
      } catch (error) {
        console.error('❌ [tRPC:createPendingMessage] خطأ:', error);
        
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء تحديث حالة الرسالة
   */
  updateMessageStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'sent', 'failed']),
      error: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      console.log('🔵 [tRPC:updateMessageStatus] تم استدعاء الإجراء:', input);
      
      try {
        const success = await updateMessageStatus(input.id, input.status, input.error);
        
        console.log('✅ [tRPC:updateMessageStatus] تم تحديث حالة الرسالة بنجاح');
        
        return {
          success: true,
          message: 'تم تحديث حالة الرسالة بنجاح'
        };
        
      } catch (error) {
        console.error('❌ [tRPC:updateMessageStatus] خطأ:', error);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء حذف رسالة معلقة
   */
  deletePendingMessage: publicProcedure
    .input(z.object({
      id: z.number()
    }))
    .mutation(async ({ input }) => {
      console.log('🔵 [tRPC:deletePendingMessage] تم استدعاء الإجراء:', input);
      
      try {
        const success = await deletePendingMessage(input.id);
        
        console.log('✅ [tRPC:deletePendingMessage] تم حذف الرسالة بنجاح');
        
        return {
          success: true,
          message: 'تم حذف الرسالة بنجاح'
        };
        
      } catch (error) {
        console.error('❌ [tRPC:deletePendingMessage] خطأ:', error);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء استرجاع رسالة بواسطة ID
   */
  getMessageById: publicProcedure
    .input(z.object({
      id: z.number()
    }))
    .query(async ({ input }) => {
      console.log('🔵 [tRPC:getMessageById] تم استدعاء الإجراء:', input);
      
      try {
        const message = await getMessageById(input.id);
        
        if (!message) {
          console.log('⚠️ [tRPC:getMessageById] لم يتم العثور على الرسالة');
          return {
            success: false,
            data: null,
            error: 'الرسالة غير موجودة'
          };
        }
        
        console.log('✅ [tRPC:getMessageById] تم استرجاع الرسالة بنجاح');
        
        return {
          success: true,
          data: message
        };
        
      } catch (error) {
        console.error('❌ [tRPC:getMessageById] خطأ:', error);
        
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء استرجاع رسائل حجز معين
   */
  getMessagesByBookingId: publicProcedure
    .input(z.object({
      bookingId: z.string().min(1, 'معرف الحجز مطلوب')
    }))
    .query(async ({ input }) => {
      console.log('🔵 [tRPC:getMessagesByBookingId] تم استدعاء الإجراء:', input);
      
      try {
        const messages = await getMessagesByBookingId(input.bookingId);
        
        console.log('✅ [tRPC:getMessagesByBookingId] تم استرجاع الرسائل:', {
          count: messages.length
        });
        
        return {
          success: true,
          data: messages,
          count: messages.length
        };
        
      } catch (error) {
        console.error('❌ [tRPC:getMessagesByBookingId] خطأ:', error);
        
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء تحديث نص الرسالة
   */
  updateMessageText: publicProcedure
    .input(z.object({
      id: z.number(),
      message: z.string().min(1, 'نص الرسالة مطلوب')
    }))
    .mutation(async ({ input }) => {
      console.log('🔵 [tRPC:updateMessageText] تم استدعاء الإجراء:', input);
      
      try {
        // استرجاع الرسالة الحالية
        const currentMessage = await getMessageById(input.id);
        
        if (!currentMessage) {
          throw new Error('الرسالة غير موجودة');
        }
        
        // تحديث الرسالة في قاعدة البيانات
        const { getDb } = await import('./db');
        const { whatsappMessages } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const database = await getDb();
        if (database) {
          await database.update(whatsappMessages)
            .set({ message: input.message })
            .where(eq(whatsappMessages.id, input.id));
        }
        
        console.log('✅ [tRPC:updateMessageText] تم تحديث نص الرسالة بنجاح');
        
        return {
          success: true,
          message: 'تم تحديث نص الرسالة بنجاح'
        };
        
      } catch (error) {
        console.error('❌ [tRPC:updateMessageText] خطأ:', error);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    }),

  /**
   * إجراء إرسال رسالة WhatsApp
   * (يحتاج إلى تكامل مع WhatsApp API)
   */
  sendWhatsAppMessage: publicProcedure
    .input(z.object({
      id: z.number()
    }))
    .mutation(async ({ input }) => {
      console.log('🔵 [tRPC:sendWhatsAppMessage] تم استدعاء الإجراء:', input);
      
      try {
        // استرجاع الرسالة
        const message = await getMessageById(input.id);
        
        if (!message) {
          throw new Error('الرسالة غير موجودة');
        }
        
        console.log('🔵 [tRPC:sendWhatsAppMessage] إرسال رسالة WhatsApp:', {
          bookingNumber: message.bookingNumber,
          text: message.message.substring(0, 50) + '...'
        });
        
        // TODO: هنا يجب تكامل WhatsApp API الفعلي
        // مثال: await whatsappAPI.sendMessage(recipients, message.message);
        
        // محاكاة الإرسال الناجح
        await updateMessageStatus(input.id, 'sent');
        
        console.log('✅ [tRPC:sendWhatsAppMessage] تم إرسال الرسالة بنجاح');
        
        return {
          success: true,
          message: 'تم إرسال رسالة WhatsApp بنجاح'
        };
        
      } catch (error) {
        console.error('❌ [tRPC:sendWhatsAppMessage] خطأ:', error);
        
        // تحديث حالة الرسالة إلى فاشلة
        try {
          await updateMessageStatus(
            input.id,
            'failed',
            error instanceof Error ? error.message : 'خطأ في الإرسال'
          );
        } catch (updateError) {
          console.error('❌ [tRPC:sendWhatsAppMessage] فشل في تحديث الحالة:', updateError);
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
      }
    })
});

export const whatsappRouterV2 = whatsappRouter;

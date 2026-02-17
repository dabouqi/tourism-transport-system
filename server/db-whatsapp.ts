import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';
import { whatsappMessages } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * واجهة رسالة WhatsApp المعلقة
 */
export interface PendingWhatsAppMessage {
  id: number;
  messageId: string;
  bookingId: string;
  bookingNumber: string;
  message: string;
  recipients: string; // JSON array
  recipientNames: string; // JSON array
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * دالة إنشاء رسالة معلقة جديدة
 * تُستدعى عند إضافة ✓ على الحجز
 */
export async function createPendingMessage(data: {
  bookingId: string;
  bookingNumber: string;
  message: string;
  recipients?: string[]; // Phone numbers
  recipientNames?: string[]; // Names
}): Promise<PendingWhatsAppMessage> {
  console.log('🔵 [createPendingMessage] بدء إنشاء رسالة معلقة:', {
    bookingId: data.bookingId,
    bookingNumber: data.bookingNumber,
    messageLength: data.message.length
  });

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('قاعدة البيانات غير متاحة');
    }
    console.log('✅ [createPendingMessage] تم الاتصال بقاعدة البيانات');

    const messageId = uuidv4();
    const recipients = data.recipients || [];
    const recipientNames = data.recipientNames || [];

    const result = await db.insert(whatsappMessages).values({
      messageId,
      bookingId: data.bookingId,
      bookingNumber: data.bookingNumber,
      message: data.message,
      recipients: JSON.stringify(recipients),
      recipientNames: JSON.stringify(recipientNames),
      status: 'pending',
    });

    console.log('✅ [createPendingMessage] تم إنشاء الرسالة بنجاح:', messageId);

    const message = await db.select().from(whatsappMessages).where(eq(whatsappMessages.messageId, messageId)).limit(1);
    
    if (!message || message.length === 0) {
      throw new Error('فشل استرجاع الرسالة المنشأة');
    }

    return message[0] as PendingWhatsAppMessage;
  } catch (error) {
    console.error('❌ [createPendingMessage] خطأ:', error);
    throw error;
  }
}

/**
 * دالة استرجاع جميع الرسائل المعلقة
 */
export async function getPendingMessages(): Promise<PendingWhatsAppMessage[]> {
  console.log('🔵 [getPendingMessages] بدء استرجاع الرسائل المعلقة');

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [getPendingMessages] قاعدة البيانات غير متاحة');
      return [];
    }
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.status, 'pending'))
      .orderBy((t) => t.createdAt);

    console.log(`✅ [getPendingMessages] تم استرجاع ${messages.length} رسالة معلقة`);
    return messages as PendingWhatsAppMessage[];
  } catch (error) {
    console.error('❌ [getPendingMessages] خطأ:', error);
    return [];
  }
}

/**
 * دالة استرجاع رسالة بواسطة ID
 */
export async function getMessageById(id: number): Promise<PendingWhatsAppMessage | null> {
  console.log('🔵 [getMessageById] بدء استرجاع الرسالة:', id);

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [getMessageById] قاعدة البيانات غير متاحة');
      return null;
    }
    const message = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.id, id))
      .limit(1);

    if (!message || message.length === 0) {
      console.log('⚠️ [getMessageById] لم يتم العثور على الرسالة');
      return null;
    }

    console.log('✅ [getMessageById] تم استرجاع الرسالة بنجاح');
    return message[0] as PendingWhatsAppMessage;
  } catch (error) {
    console.error('❌ [getMessageById] خطأ:', error);
    return null;
  }
}

/**
 * دالة استرجاع رسائل حجز معين
 */
export async function getMessagesByBookingId(bookingId: string): Promise<PendingWhatsAppMessage[]> {
  console.log('🔵 [getMessagesByBookingId] بدء استرجاع رسائل الحجز:', bookingId);

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [getMessagesByBookingId] قاعدة البيانات غير متاحة');
      return [];
    }
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.bookingId, bookingId))
      .orderBy((t) => t.createdAt);

    console.log(`✅ [getMessagesByBookingId] تم استرجاع ${messages.length} رسالة`);
    return messages as PendingWhatsAppMessage[];
  } catch (error) {
    console.error('❌ [getMessagesByBookingId] خطأ:', error);
    return [];
  }
}

/**
 * دالة تحديث حالة الرسالة
 */
export async function updateMessageStatus(
  id: number,
  status: 'pending' | 'sent' | 'failed',
  errorMessage?: string
): Promise<boolean> {
  console.log('🔵 [updateMessageStatus] بدء تحديث حالة الرسالة:', { id, status });

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [updateMessageStatus] قاعدة البيانات غير متاحة');
      return false;
    }
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    }

    if (status === 'failed' && errorMessage) {
      updateData.error = errorMessage;
    }

    await db.update(whatsappMessages).set(updateData).where(eq(whatsappMessages.id, id));

    console.log('✅ [updateMessageStatus] تم تحديث حالة الرسالة بنجاح');
    return true;
  } catch (error) {
    console.error('❌ [updateMessageStatus] خطأ:', error);
    return false;
  }
}

/**
 * دالة حذف رسالة معلقة
 */
export async function deletePendingMessage(id: number): Promise<boolean> {
  console.log('🔵 [deletePendingMessage] بدء حذف الرسالة:', id);

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [deletePendingMessage] قاعدة البيانات غير متاحة');
      return false;
    }
    await db.delete(whatsappMessages).where(eq(whatsappMessages.id, id));

    console.log('✅ [deletePendingMessage] تم حذف الرسالة بنجاح');
    return true;
  } catch (error) {
    console.error('❌ [deletePendingMessage] خطأ:', error);
    return false;
  }
}

/**
 * دالة استرجاع جميع الرسائل (معلقة ومرسلة وفاشلة)
 */
export async function getAllMessages(): Promise<PendingWhatsAppMessage[]> {
  console.log('🔵 [getAllMessages] بدء استرجاع جميع الرسائل');

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [getAllMessages] قاعدة البيانات غير متاحة');
      return [];
    }
    const messages = await db
      .select()
      .from(whatsappMessages)
      .orderBy((t) => t.createdAt);

    console.log(`✅ [getAllMessages] تم استرجاع ${messages.length} رسالة`);
    return messages as PendingWhatsAppMessage[];
  } catch (error) {
    console.error('❌ [getAllMessages] خطأ:', error);
    return [];
  }
}

/**
 * دالة استرجاع الرسائل المرسلة
 */
export async function getSentMessages(): Promise<PendingWhatsAppMessage[]> {
  console.log('🔵 [getSentMessages] بدء استرجاع الرسائل المرسلة');

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [getSentMessages] قاعدة البيانات غير متاحة');
      return [];
    }
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.status, 'sent'))
      .orderBy((t) => t.createdAt);

    console.log(`✅ [getSentMessages] تم استرجاع ${messages.length} رسالة مرسلة`);
    return messages as PendingWhatsAppMessage[];
  } catch (error) {
    console.error('❌ [getSentMessages] خطأ:', error);
    return [];
  }
}

/**
 * دالة استرجاع الرسائل الفاشلة
 */
export async function getFailedMessages(): Promise<PendingWhatsAppMessage[]> {
  console.log('🔵 [getFailedMessages] بدء استرجاع الرسائل الفاشلة');

  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [getFailedMessages] قاعدة البيانات غير متاحة');
      return [];
    }
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.status, 'failed'))
      .orderBy((t) => t.createdAt);

    console.log(`✅ [getFailedMessages] تم استرجاع ${messages.length} رسالة فاشلة`);
    return messages as PendingWhatsAppMessage[];
  } catch (error) {
    console.error('❌ [getFailedMessages] خطأ:', error);
    return [];
  }
}

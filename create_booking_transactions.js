import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function createBookingTransactions() {
  let connection;
  
  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tourism_transport'
    });
    
    console.log('✅ تم الاتصال بنجاح\n');
    
    // جلب جميع الحجوزات غير الملغاة
    console.log('📊 جلب الحجوزات من قاعدة البيانات...');
    const [bookings] = await connection.execute(
      `SELECT id, bookingNumber, customerName, fare, pickupDateTime, status, clientId
       FROM bookings 
       WHERE status != 'cancelled'
       ORDER BY pickupDateTime`
    );
    
    console.log(`✅ تم جلب ${bookings.length} حجز\n`);
    
    // حذف معاملات الحجوزات القديمة
    console.log('🗑️  حذف معاملات الحجوزات القديمة...');
    await connection.execute(
      'DELETE FROM transactions WHERE isFromBooking = 1'
    );
    console.log('✅ تم حذف المعاملات القديمة\n');
    
    console.log('📤 إنشاء معاملات دخل لجميع الحجوزات...\n');
    
    let createdCount = 0;
    let totalRevenue = 0;
    
    for (const booking of bookings) {
      const description = `Booking: ${booking.bookingNumber} - ${booking.customerName}`;
      
      await connection.execute(
        `INSERT INTO transactions 
        (transactionType, category, amount, description, bookingId, clientId, transactionDate, isFromBooking, createdAt, updatedAt) 
        VALUES ('revenue', 'booking', ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          booking.fare,
          description,
          booking.id,
          booking.clientId,
          booking.pickupDateTime
        ]
      );
      
      createdCount++;
      totalRevenue += parseFloat(booking.fare);
      
      console.log(`✅ ${booking.pickupDateTime.toISOString().split('T')[0]} - ${booking.bookingNumber}: ${booking.fare} د.ا`);
    }
    
    console.log(`\n✅ تم إنشاء ${createdCount} معاملة دخل بنجاح`);
    console.log(`💰 إجمالي الدخل من الحجوزات: ${totalRevenue.toFixed(2)} د.ا`);
    
    // التحقق النهائي
    const [finalCheck] = await connection.execute(
      `SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE transactionType = 'revenue' AND isFromBooking = 1`
    );
    
    console.log(`\n📊 الإحصائيات النهائية:`);
    console.log(`   - عدد معاملات الدخل من الحجوزات: ${finalCheck[0].count}`);
    console.log(`   - إجمالي الدخل: ${finalCheck[0].total} د.ا`);
    
    // إحصائيات شاملة
    const [allTransactions] = await connection.execute(
      `SELECT 
        transactionType,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      GROUP BY transactionType`
    );
    
    console.log(`\n📊 إحصائيات جميع المعاملات:`);
    for (const row of allTransactions) {
      const type = row.transactionType === 'revenue' ? 'دخل' : 'مصاريف';
      console.log(`   - ${type}: ${row.count} معاملة، المجموع: ${row.total} د.ا`);
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 تم إغلاق الاتصال بقاعدة البيانات');
    }
  }
}

createBookingTransactions().catch(console.error);

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function migrateToTransactions() {
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
    
    // جلب جميع البيانات من other_transactions
    console.log('📊 جلب البيانات من other_transactions...');
    const [otherTransactions] = await connection.execute(
      'SELECT * FROM other_transactions ORDER BY transactionDate'
    );
    
    console.log(`✅ تم جلب ${otherTransactions.length} معاملة\n`);
    
    // التحقق من عدم وجود بيانات مكررة في transactions
    const [existingTransactions] = await connection.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE isFromBooking = 0'
    );
    
    if (existingTransactions[0].count > 0) {
      console.log(`⚠️  يوجد بالفعل ${existingTransactions[0].count} معاملة في جدول transactions`);
      console.log('هل تريد حذفها والبدء من جديد؟');
      console.log('سأقوم بحذف المعاملات القديمة والبدء من جديد...\n');
      
      await connection.execute(
        'DELETE FROM transactions WHERE isFromBooking = 0'
      );
      console.log('✅ تم حذف المعاملات القديمة\n');
    }
    
    console.log('📤 نقل البيانات إلى جدول transactions...\n');
    
    let migratedCount = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    
    for (const transaction of otherTransactions) {
      const transactionType = transaction.transactionType === 'income' ? 'revenue' : 'expense';
      
      await connection.execute(
        `INSERT INTO transactions 
        (transactionType, category, amount, description, transactionDate, isFromBooking, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [
          transactionType,
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.transactionDate
        ]
      );
      
      migratedCount++;
      
      if (transactionType === 'revenue') {
        incomeCount++;
        console.log(`✅ دخل: ${transaction.transactionDate.toISOString().split('T')[0]} - ${transaction.type}: ${transaction.amount} د.ا`);
      } else {
        expenseCount++;
        console.log(`✅ مصروف: ${transaction.transactionDate.toISOString().split('T')[0]} - ${transaction.type}: ${transaction.amount} د.ا`);
      }
    }
    
    console.log(`\n✅ تم نقل ${migratedCount} معاملة بنجاح`);
    console.log(`   - دخل: ${incomeCount} معاملة`);
    console.log(`   - مصاريف: ${expenseCount} معاملة`);
    
    // حذف البيانات من other_transactions
    console.log('\n🗑️  حذف البيانات من other_transactions...');
    await connection.execute('DELETE FROM other_transactions');
    console.log('✅ تم حذف البيانات من other_transactions\n');
    
    // التحقق النهائي
    const [finalCheck] = await connection.execute(
      `SELECT 
        transactionType,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE isFromBooking = 0
      GROUP BY transactionType`
    );
    
    console.log('📊 الإحصائيات النهائية في جدول transactions:');
    for (const row of finalCheck) {
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

migrateToTransactions().catch(console.error);

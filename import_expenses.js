import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const expenses = [
  {
    date: "2026-02-15",
    type: "expense",
    category: "البنزين",
    amount: 40.20,
    description: "البنزين"
  },
  {
    date: "2026-02-13",
    type: "expense",
    category: "البنزين",
    amount: 41.20,
    description: "البنزين"
  },
  {
    date: "2026-02-12",
    type: "expense",
    category: "البنزين",
    amount: 30.00,
    description: "-"
  },
  {
    date: "2026-02-11",
    type: "expense",
    category: "بدل مواقف",
    amount: 20.00,
    description: "بدل مواقف"
  },
  {
    date: "2026-02-11",
    type: "expense",
    category: "البنزين",
    amount: 40.00,
    description: "دفعة بنزين لامروان"
  },
  {
    date: "2026-02-11",
    type: "expense",
    category: "بدل مواقف",
    amount: 2.25,
    description: "-"
  },
  {
    date: "2026-02-11",
    type: "expense",
    category: "غيار زيت للفان",
    amount: 32.00,
    description: "44811 رقم عداد السياره"
  },
  {
    date: "2026-02-10",
    type: "expense",
    category: "البنزين",
    amount: 40.00,
    description: "-"
  },
  {
    date: "2026-02-09",
    type: "expense",
    category: "بدل مواقف",
    amount: 20.00,
    description: "-"
  },
  {
    date: "2026-02-09",
    type: "expense",
    category: "طباعة ورق",
    amount: 13.50,
    description: "-"
  },
  {
    date: "2026-02-01",
    type: "expense",
    category: "البنزين",
    amount: 39.25,
    description: "البنزين"
  }
];

async function importExpenses() {
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
    
    // التحقق من عدم وجود مصاريف مسبقاً
    const [existingExpenses] = await connection.execute(
      'SELECT COUNT(*) as count FROM other_transactions WHERE transactionType = ?',
      ['expense']
    );
    
    if (existingExpenses[0].count > 0) {
      console.log(`⚠️  يوجد بالفعل ${existingExpenses[0].count} مصاريف في قاعدة البيانات`);
      console.log('❌ لن يتم الاستيراد لتجنب التكرار');
      return;
    }
    
    console.log('📊 استيراد المصاريف...\n');
    
    let importedCount = 0;
    let totalAmount = 0;
    
    for (const expense of expenses) {
      await connection.execute(
        `INSERT INTO other_transactions 
        (transactionType, type, amount, description, transactionDate, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          expense.type,
          expense.category,
          expense.amount,
          expense.description,
          expense.date
        ]
      );
      
      importedCount++;
      totalAmount += expense.amount;
      
      console.log(`✅ ${expense.date} - ${expense.category}: ${expense.amount} د.ا - ${expense.description}`);
    }
    
    console.log(`\n✅ تم استيراد ${importedCount} مصروف بنجاح`);
    console.log(`💰 إجمالي المصاريف: ${totalAmount.toFixed(2)} د.ا`);
    
    // التحقق من الإجمالي
    const [result] = await connection.execute(
      'SELECT COUNT(*) as count, SUM(amount) as total FROM other_transactions WHERE transactionType = ?',
      ['expense']
    );
    
    console.log(`\n📊 إحصائيات قاعدة البيانات:`);
    console.log(`   - عدد المصاريف: ${result[0].count}`);
    console.log(`   - إجمالي المصاريف: ${result[0].total} د.ا`);
    
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

importExpenses().catch(console.error);

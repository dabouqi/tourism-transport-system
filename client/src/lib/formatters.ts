/**
 * تنسيق العملات والأرقام
 * الدينار الأردني (JOD)
 */

/**
 * تنسيق المبلغ بالدينار الأردني
 * @example formatCurrency(150) => "150.00 د.ا"
 * @example formatCurrency(-50) => "-50.00 د.ا"
 */
export function formatCurrency(
  amount: number | null | undefined,
  options?: {
    showSign?: boolean; // عرض + أو - قبل المبلغ
    decimals?: number;  // عدد الخانات العشرية (افتراضي: 2)
  }
): string {
  if (amount === null || amount === undefined) return '0.00 د.ا';
  
  const decimals = options?.decimals ?? 2;
  const showSign = options?.showSign ?? false;
  
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toFixed(decimals);
  
  let result = '';
  
  if (amount < 0) {
    result = `-${formatted} د.ا`;
  } else if (amount > 0 && showSign) {
    result = `+${formatted} د.ا`;
  } else {
    result = `${formatted} د.ا`;
  }
  
  return result;
}

/**
 * تنسيق المبلغ مع فواصل الآلاف
 * @example formatCurrencyWithCommas(1500.50) => "1,500.50 د.ا"
 */
export function formatCurrencyWithCommas(
  amount: number | null | undefined,
  options?: {
    showSign?: boolean;
    decimals?: number;
  }
): string {
  if (amount === null || amount === undefined) return '0.00 د.ا';
  
  const decimals = options?.decimals ?? 2;
  const showSign = options?.showSign ?? false;
  
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = parts[1] ? `${integerPart}.${parts[1]}` : integerPart;
  
  let result = '';
  
  if (amount < 0) {
    result = `-${formatted} د.ا`;
  } else if (amount > 0 && showSign) {
    result = `+${formatted} د.ا`;
  } else {
    result = `${formatted} د.ا`;
  }
  
  return result;
}

/**
 * تنسيق الأرقام فقط (بدون عملة)
 * @example formatNumber(1500.5) => "1,500.50"
 */
export function formatNumber(
  num: number | null | undefined,
  decimals: number = 2
): string {
  if (num === null || num === undefined) return '0';
  
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * تنسيق النسبة المئوية
 * @example formatPercentage(0.25) => "25%"
 * @example formatPercentage(25, true) => "25%"
 */
export function formatPercentage(
  value: number | null | undefined,
  isAlreadyPercentage: boolean = false
): string {
  if (value === null || value === undefined) return '0%';
  
  const percentage = isAlreadyPercentage ? value : value * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * تنسيق حجم الملف
 * @example formatFileSize(1024) => "1.00 KB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// تصدير افتراضي للتوافق
export default {
  currency: formatCurrency,
  currencyWithCommas: formatCurrencyWithCommas,
  number: formatNumber,
  percentage: formatPercentage,
  fileSize: formatFileSize
};

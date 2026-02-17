/**
 * تنسيق التواريخ بالصيغة الإنجليزية
 * Format: YYYY-MM-DD HH:MM AM/PM
 */

/**
 * تنسيق التاريخ الكامل مع الوقت
 * @example "2026-01-20 02:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 يصبح 12
  const hoursStr = String(hours).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * تنسيق التاريخ فقط بدون وقت
 * @example "2026-01-20"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * تنسيق الوقت فقط
 * @example "02:30 PM"
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  
  return `${hoursStr}:${minutes} ${ampm}`;
}

/**
 * تنسيق نسبي (منذ 5 دقائق، منذ ساعتين، إلخ)
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return formatDate(date);
}

/**
 * تحويل التاريخ إلى صيغة datetime-local للاستخدام في input type="datetime-local"
 * @example "2026-01-20T14:30"
 */
export function toDatetimeLocal(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// دوال إضافية للتوافق مع الكود القديم
export const formatters = {
  dateTime: formatDateTime,
  date: formatDate,
  time: formatTime,
  relative: formatRelativeTime,
  toDatetimeLocal: toDatetimeLocal
};

export default formatters;

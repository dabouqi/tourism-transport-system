import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  BookOpen,
  Users,
  FileText,
  DollarSign,
  Truck,
  Wrench,
  BarChart3,
  MapPin,
  AlertCircle,
  Archive,
  TrendingUp,
  Database,
  Receipt,
  MessageCircle,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from './ui/sidebar';
import { useIsMobile } from '@/hooks/useMobile';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface MenuCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
}

const menuCategories: MenuCategory[] = [
  {
    id: 'bookings',
    label: 'الحجوزات',
    icon: <BookOpen className="h-4 w-4" />,
    items: [
      { icon: <BookOpen className="h-4 w-4" />, label: 'الحجوزات', path: '/bookings' },
      { icon: <TrendingUp className="h-4 w-4" />, label: 'تقارير الحجوزات المنتهية', path: '/completed-bookings-report' },
      { icon: <Archive className="h-4 w-4" />, label: 'أرشيف الحجوزات', path: '/bookings-archive' },
      { icon: <AlertCircle className="h-4 w-4" />, label: 'الحجوزات الملغاة', path: '/cancelled-orders' },
    ],
  },
  {
    id: 'clients',
    label: 'العملاء والحسابات',
    icon: <Users className="h-4 w-4" />,
    items: [
      { icon: <Users className="h-4 w-4" />, label: 'العملاء', path: '/clients' },
      { icon: <FileText className="h-4 w-4" />, label: 'حركة حساب العميل', path: '/client-account-statement' },
    ],
  },
  {
    id: 'analytics',
    label: 'التحليلات والتقارير',
    icon: <BarChart3 className="h-4 w-4" />,
    items: [
      { icon: <BarChart3 className="h-4 w-4" />, label: 'لوحة المالية الشاملة', path: '/comprehensive-financial-dashboard' },
      { icon: <DollarSign className="h-4 w-4" />, label: 'المصاريف والدخل', path: '/finances' },
      { icon: <BarChart3 className="h-4 w-4" />, label: 'التحليلات المالية', path: '/advanced-finances' },
      { icon: <BarChart3 className="h-4 w-4" />, label: 'التقارير', path: '/reports' },
      { icon: <FileText className="h-4 w-4" />, label: 'فئات المصاريف', path: '/expense-categories' },
    ],
  },
  {
    id: 'finance',
    label: 'المالية والفواتير',
    icon: <DollarSign className="h-4 w-4" />,
    items: [
      { icon: <Receipt className="h-4 w-4" />, label: 'الفواتير', path: '/invoices' },
      { icon: <DollarSign className="h-4 w-4" />, label: 'الذمم والدفعات', path: '/receivables' },
      { icon: <FileText className="h-4 w-4" />, label: 'تقرير الذمم', path: '/receivables-report' },
      { icon: <AlertCircle className="h-4 w-4" />, label: 'الذمم المتأخرة', path: '/overdue-receivables' },
    ],
  },
  {
    id: 'fleet',
    label: 'الأسطول والسائقين',
    icon: <Truck className="h-4 w-4" />,
    items: [
      { icon: <Truck className="h-4 w-4" />, label: 'الأسطول', path: '/fleet' },
      { icon: <Users className="h-4 w-4" />, label: 'السائقين', path: '/drivers' },
      { icon: <Wrench className="h-4 w-4" />, label: 'الصيانة', path: '/maintenance' },
    ],
  },
  {
    id: 'admin',
    label: 'الإدارة والخدمات',
    icon: <Database className="h-4 w-4" />,
    items: [
      { icon: <DollarSign className="h-4 w-4" />, label: 'الشركات الخارجية', path: '/external-partners' },
      { icon: <MapPin className="h-4 w-4" />, label: 'التتبع', path: '/tracking' },
      { icon: <AlertCircle className="h-4 w-4" />, label: 'التنبيهات', path: '/alerts' },
      { icon: <Database className="h-4 w-4" />, label: 'إدارة البيانات', path: '/data-management' },
      { icon: <MessageCircle className="h-4 w-4" />, label: 'إدارة WhatsApp', path: '/whatsapp-manager' },
      { icon: <MessageCircle className="h-4 w-4" />, label: 'إعدادات WhatsApp', path: '/whatsapp-settings' },
      { icon: <MessageCircle className="h-4 w-4" />, label: 'الرسالل المعلقة', path: '/pending-messages' },
      { icon: <MessageCircle className="h-4 w-4" />, label: 'مركز الرسالل', path: '/message-center' },
    ],
  },
  {
    id: 'expenses',
    label: 'المصاريف والسلفات',
    items: [
      { icon: <DollarSign className="h-4 w-4" />, label: 'المصاريف والدخل', path: '/expenses-income' },
      { icon: <DollarSign className="h-4 w-4" />, label: 'تقديم مصروفة', path: '/submit-expense' },
      { icon: <DollarSign className="h-4 w-4" />, label: 'إدارة المصاريف', path: '/manage-expenses' },
      { icon: <DollarSign className="h-4 w-4" />, label: 'تسجيل دفع المصاريف', path: '/expense-payment' },
    ],
  },
];

interface AccordionNavigationProps {
  isCollapsed?: boolean;
}

export const AccordionNavigation: React.FC<AccordionNavigationProps> = ({ isCollapsed = false }) => {
  const [, setLocation] = useLocation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('bookings');
  const [location] = useLocation();
  const { state: sidebarState } = useSidebar();
  const isMobile = useIsMobile();
  const isSidebarOpen = sidebarState === 'expanded';

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="space-y-1">
      {menuCategories.map((category) => {
        const isExpanded = expandedCategory === category.id;
        const hasActiveItem = category.items.some((item) => item.path === location);

        return (
          <div key={category.id}>
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={`w-full flex items-center justify-between h-10 px-3 rounded-lg transition-all font-medium text-sm ${
                isExpanded || hasActiveItem
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`${isExpanded || hasActiveItem ? 'text-blue-600' : 'text-slate-600'}`}>
                  {category.icon}
                </span>
                {!isCollapsed && <span className="truncate">{category.label}</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  className={`h-4 w-4 transition-transform shrink-0 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Subcategories */}
            {isExpanded && (
              <div className="mt-1 ml-2 space-y-1 border-r-2 border-slate-200 pr-2 bg-orange-900 rounded-lg p-2">
                {category.items.map((item, index) => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setLocation(item.path);
                        // Auto-close sidebar on mobile after selecting a menu item
                        if (isMobile && isSidebarOpen) {
                          // Trigger sidebar close by simulating a click on the toggle button
                          const toggleButton = document.querySelector('[aria-label="تبديل التنقل"]');
                          if (toggleButton) {
                            (toggleButton as HTMLButtonElement).click();
                          }
                        }
                      }}
                      className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg transition-all text-sm ${
                        isActive
                          ? 'bg-orange-700 text-white hover:bg-orange-600'
                          : 'text-orange-100 hover:bg-orange-800'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-orange-200'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

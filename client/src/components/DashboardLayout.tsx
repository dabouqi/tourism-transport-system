import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  BookOpen,
  Truck,
  AlertCircle,
  BarChart3,
  MapPin,
  Wrench,
  DollarSign,
  FileText,
  Archive,
  TrendingUp,
  Database,
  Receipt,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { AccordionNavigation } from "./AccordionNavigation";
// import EnvironmentSwitcher from "./EnvironmentSwitcher"; // Removed

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/dashboard" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  // For local development, always show dashboard (useAuth returns mock user)
  if (!user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-slate-200">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
                aria-label="تبديل التنقل"
              >
                <PanelLeft className="h-4 w-4 text-slate-600" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Truck className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-bold tracking-tight truncate text-slate-900">
                    نظام الإدارة
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-4">
              {/* Dashboard Link */}
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => {
                        setLocation(item.path);
                        // Auto-close sidebar on mobile after selecting dashboard
                        if (isMobile && !isCollapsed) {
                          toggleSidebar();
                        }
                      }}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal mb-2 ${
                        isActive
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${
                          isActive ? "text-blue-600" : "text-slate-600"
                        }`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {/* Accordion Navigation */}
              <div className="mt-2 border-t border-slate-200 pt-2">
                <AccordionNavigation isCollapsed={isCollapsed} />
              </div>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-slate-200 space-y-3">
            {/* <EnvironmentSwitcher compact={true} showDetails={false} /> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <Avatar className="h-9 w-9 border-2 border-slate-200 shrink-0 bg-gradient-to-br from-blue-400 to-cyan-400">
                    <AvatarFallback className="text-xs font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-slate-900">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1.5">
                      {(user?.role as any) === "admin"
                        ? "مسؤول النظام"
                        : (user?.role as any) === "operations_manager"
                          ? "مدير العمليات"
                          : "موظف الحجوزات"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-300/50 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-slate-200 h-14 items-center justify-between bg-white/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 px-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-slate-900 font-medium">
                  {activeMenuItem?.label ?? "القائمة"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 bg-gradient-to-br from-slate-50 to-white">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}

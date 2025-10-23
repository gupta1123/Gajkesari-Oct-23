'use client';

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  Users, 
  Settings,
  LogOut,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Tag,
  ThumbsUp,
  ClipboardList,
  BarChart,
  User,
  Phone,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  Building,
  ShoppingCart,
  UserCheck,
  FileSearch,
  TrendingUp,
  Target,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import Topbar from "@/components/topbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import DailyPricingChecker from "@/components/DailyPricingChecker";
import MobileBottomNav from "@/components/mobile-bottom-nav";

interface DashboardLayoutProps {
  children: ReactNode;
  heading?: string;
  subheading?: string;
}

// Define sidebar categories and items
const allSidebarCategories = [
  {
    name: "Customers",
    icon: Users,
    items: [
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Enquiries", href: "/dashboard/enquiries", icon: Phone },
      { name: "Complaints", href: "/dashboard/complaints", icon: ThumbsUp },
    ]
  },
  {
    name: "Sales",
    icon: Building,
    items: [
      { name: "Visits", href: "/dashboard/visits", icon: Calendar },
      { name: "Requirements", href: "/dashboard/requirements", icon: ClipboardList },
      { name: "Pricing", href: "/dashboard/pricing", icon: Tag },
    ]
  },
  {
    name: "Employees",
    icon: UserCheck,
    items: [
      { name: "Employees", href: "/dashboard/employees", icon: User },
      { name: "Attendance", href: "/dashboard/attendance", icon: CheckCircle },
      { name: "Expenses", href: "/dashboard/expenses", icon: DollarSign },
    ]
  },
  {
    name: "Reports",
    icon: TrendingUp,
    items: [
      { name: "Approvals", href: "/dashboard/approvals", icon: FileText },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart },
    ]
  }
];

// Manager allowed pages
const managerAllowedPages = [
  "/dashboard/customers",
  "/dashboard/enquiries", 
  "/dashboard/complaints",
  "/dashboard/visits",
  "/dashboard/requirements",
  "/dashboard/pricing",
  "/dashboard/approvals"
];

// Function to filter sidebar categories based on user role
const getFilteredSidebarCategories = (userRole: string | null, currentUser: Record<string, unknown> | null) => {
  const isManager = userRole === 'MANAGER' || (currentUser?.authorities as Array<Record<string, unknown>>)?.some((auth) => auth.authority === 'ROLE_MANAGER');
  
  if (isManager) {
    // For managers, filter categories to only show allowed pages
    return allSidebarCategories.map(category => ({
      ...category,
      items: category.items.filter(item => managerAllowedPages.includes(item.href))
    })).filter(category => category.items.length > 0); // Remove empty categories
  }
  
  // For admin and other roles, show all categories
  return allSidebarCategories;
};

export default function DashboardLayout({ 
  children, 
  heading,
  subheading
}: DashboardLayoutProps) {
  const { userRole, currentUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Get filtered sidebar categories based on user role
  const sidebarCategories = getFilteredSidebarCategories(userRole, currentUser as Record<string, unknown> | null);
  
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    sidebarCategories.forEach(category => {
      initialState[category.name] = true;
    });
    return initialState;
  });

  // Determine display role
  const getDisplayRole = () => {
    if (userRole === 'MANAGER' || currentUser?.authorities?.some(auth => auth.authority === 'ROLE_MANAGER')) {
      return 'Manager';
    }
    if (userRole === 'ADMIN' || currentUser?.authorities?.some(auth => auth.authority === 'ROLE_ADMIN')) {
      return 'Admin';
    }
    if (userRole === 'FIELD OFFICER' || currentUser?.authorities?.some(auth => auth.authority === 'ROLE_FIELD OFFICER')) {
      return 'Field Officer';
    }
    return 'User';
  };

  // Check if user is manager
  const isManager = userRole === 'MANAGER' || (currentUser?.authorities as Array<Record<string, unknown>>)?.some((auth) => auth.authority === 'ROLE_MANAGER');

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login even if logout API fails
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen w-full grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
      {/* Daily Pricing Checker - Global Modal */}
      <DailyPricingChecker />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav sidebarCategories={sidebarCategories} isManager={isManager || false} />
      {/* Mobile sidebar trigger - hidden since we use bottom nav */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 hidden md:hidden absolute top-4 left-4 z-50"
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col w-64 z-50">
          <nav className="grid gap-2 text-base font-medium pt-4 px-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold px-3 py-2"
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="h-5 w-5" />
              <span className="font-bold">Gajkesari</span>
            </Link>
          </nav>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="grid gap-1 px-2">
              {/* Dashboard link */}
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              
              {/* Settings link - only show for non-managers */}
              {!isManager && (
                <Link
                  href="/dashboard/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                    pathname.startsWith("/dashboard/settings")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </Link>
              )}
              
              {sidebarCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isOpen = openCategories[category.name];
                
                return (
                  <div key={category.name} className="flex flex-col">
                    <Button
                      variant="ghost"
                      className="justify-between px-3 py-2 h-auto"
                      onClick={() => toggleCategory(category.name)}
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {isOpen && (
                      <div className="pl-4 py-1 space-y-1">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                                isActive(item.href)
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <ItemIcon className="h-4 w-4" />
                              <span className="text-sm">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto pt-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-3 py-2 h-auto">
                  <CircleUser className="h-4 w-4" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-xs">{currentUser?.username || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{getDisplayRole()}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isManager && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden border-r bg-background md:block sticky top-0 h-screen">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-10 items-center border-b px-4 lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Home className="h-5 w-5" />
              <span className="font-bold">Gajkesari</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="grid gap-1 px-2">
              {/* Dashboard link (no category) */}
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              
              {/* Settings link - only show for non-managers */}
              {!isManager && (
                <Link
                  href="/dashboard/settings"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                    pathname.startsWith("/dashboard/settings")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </Link>
              )}
              
              {/* Categories */}
              {sidebarCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isOpen = openCategories[category.name];
                
                return (
                  <div key={category.name} className="flex flex-col">
                    <Button
                      variant="ghost"
                      className="justify-between px-3 py-2 h-auto"
                      onClick={() => toggleCategory(category.name)}
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {isOpen && (
                      <div className="pl-4 py-1 space-y-1">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                                isActive(item.href)
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <ItemIcon className="h-4 w-4" />
                              <span className="text-sm">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-2 h-auto">
                  <CircleUser className="h-4 w-4" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-xs">{currentUser?.username || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{getDisplayRole()}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isManager && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col">
        {/* Topbar */}
        <Topbar heading={heading} subheading={subheading} />
        
        {/* Page content */}
        <main className="flex flex-1 flex-col gap-4 p-3 lg:gap-6 lg:p-4 pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
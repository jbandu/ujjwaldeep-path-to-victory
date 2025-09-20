import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  Library, 
  User, 
  LogOut,
  Trophy,
  Calendar,
  Printer,
  Shield
} from 'lucide-react';
import { checkIsAdmin } from '@/lib/admin/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/app/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & Analytics'
  },
  {
    title: 'Test Builder',
    url: '/app/builder',
    icon: Wrench,
    description: 'Create Custom Tests'
  },
  {
    title: 'Library',
    url: '/app/library',
    icon: Library,
    description: 'Past Papers & Resources'
  },
  {
    title: 'Exam Day',
    url: '/app/exam-day',
    icon: Calendar,
    description: 'Preparation Hub'
  },
  {
    title: 'Leaderboard',
    url: '/app/leaderboard',
    icon: Trophy,
    description: 'Rankings & Competition'
  },
  {
    title: 'Profile',
    url: '/app/profile',
    icon: User,
    description: 'Settings & Progress'
  },
];

const adminMenuItems = [
  {
    title: 'Admin Dashboard',
    url: '/admin',
    icon: Shield,
    description: 'Admin Panel'
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const [isAdmin, setIsAdmin] = useState(false);
  
  const collapsed = state === 'collapsed';

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      const { isAdmin } = await checkIsAdmin(user.id);
      setIsAdmin(isAdmin);
    };

    checkAdminStatus();
  }, [user]);

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground';

  return (
    <Sidebar className={collapsed ? 'w-16' : 'w-64'} collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Logo className="h-8 w-auto" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground truncate">
                UjjwalDeep
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                Exam Success Platform
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">
                            {item.title}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink 
                        to={item.url} 
                        end 
                        className={getNavCls}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && (
                          <div className="min-w-0 flex-1">
                            <span className="block text-sm font-medium truncate">
                              {item.title}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {item.description}
                            </span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="space-y-3">
          {!collapsed && user && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={signOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  FileText, 
  Upload, 
  Eye,
  LogOut,
  Home
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Questions', href: '/admin/questions', icon: FileText },
    { name: 'AI Tasks', href: '/admin/ai-tasks', icon: Settings },
    { name: 'Import', href: '/admin/import', icon: Upload },
    { name: 'Review', href: '/admin/review', icon: Eye },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || (href !== '/admin' && location.pathname.startsWith(href));
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <h1 className="text-2xl font-heading font-bold text-foreground">UjjwalDeep</h1>
            <Badge className="bg-admin-accent text-admin-accent-foreground">Admin</Badge>
          </div>
          
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-admin-accent text-admin-accent-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
            <div className="w-8 h-8 bg-admin-accent rounded-full flex items-center justify-center text-admin-accent-foreground text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="flex-1"
            >
              <Link to="/app/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="flex-1"
            >
              <Link to="/app">
                <Users className="h-4 w-4 mr-2" />
                App
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
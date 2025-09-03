import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { usePremium } from '@/hooks/usePremium';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDemoMode } from '@/hooks/useDemoMode';

const AppLayout: React.FC = () => {
  const { isPremium } = usePremium();
  const { demoMode, setDemoMode } = useDemoMode();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="h-full px-4 flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              
              <div className="flex-1 flex items-center gap-4">
                <h1 className="text-sm font-medium text-muted-foreground">
                  UjjwalDeep App
                </h1>
                
                {demoMode && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    DEMO
                  </Badge>
                )}
              </div>
                {!isPremium && (
                  <Link to="/pricing"><Button size="sm">Go Premium</Button></Link>
                )}

              <div className="flex items-center space-x-2">
                <Label htmlFor="demo-mode" className="text-sm font-medium">
                  Demo Mode
                </Label>
                <Switch
                  id="demo-mode"
                  checked={demoMode}
                  onCheckedChange={setDemoMode}
                />
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
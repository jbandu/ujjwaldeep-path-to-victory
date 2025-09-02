import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useDemoMode, isDemoEnabled } from '@/hooks/useDemoMode'
import { Settings, Database, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export default function AdminSettings() {
  const { demoMode, setDemoMode } = useDemoMode()
  const { toast } = useToast()
  const envDemoMode = isDemoEnabled()

  const handlePurgeDemo = async () => {
    try {
      // This would purge demo content if any exists
      // For now, just show a message since we don't have demo tables
      toast({
        title: "No demo content found",
        description: "No demo artifacts to purge.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to purge demo content.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        {demoMode && (
          <Badge variant="secondary" className="ml-2">
            DEMO MODE
          </Badge>
        )}
      </div>

      <div className="grid gap-6">
        {/* Demo Mode Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Demo Mode Configuration</span>
            </CardTitle>
            <CardDescription>
              Control whether the application uses demo data or live Supabase data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Environment Demo Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Set via VITE_DEMO_MODE environment variable
                </p>
              </div>
              <Badge variant={envDemoMode ? "destructive" : "secondary"}>
                {envDemoMode ? "ON" : "OFF"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="runtime-demo">Runtime Demo Override</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily override demo mode for testing (stored in localStorage)
                </p>
              </div>
              <Switch
                id="runtime-demo"
                checked={demoMode}
                onCheckedChange={(checked) => {
                  setDemoMode(checked)
                  toast({
                    title: checked ? "Demo mode enabled" : "Demo mode disabled",
                    description: checked 
                      ? "App will prefer demo data when real data is unavailable"
                      : "App will only use live Supabase data",
                  })
                }}
              />
            </div>

            {demoMode && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Demo mode is active. The app will show demo data when real data is unavailable.
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Current Behavior</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {demoMode ? "Demo mode ON" : "Demo mode OFF"} - {demoMode ? "Shows demo data as fallback" : "Only live Supabase data"}</li>
                <li>• All app routes prioritize live Supabase data first</li>
                <li>• Marketing pages may show curated snippets in demo mode</li>
                <li>• Empty states display when no data is available</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Demo Content Management */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Content Management</CardTitle>
            <CardDescription>
              Manage demo data and artifacts in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Purge Demo Content</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove any demo artifacts or test data from the database
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handlePurgeDemo}
                  className="text-destructive hover:text-destructive"
                >
                  Purge Demo Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current system configuration and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment:</span>
                <span>{import.meta.env.MODE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supabase Project:</span>
                <span>{import.meta.env.VITE_SUPABASE_PROJECT_ID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Demo Mode (Env):</span>
                <Badge variant={envDemoMode ? "destructive" : "secondary"} className="text-xs">
                  {envDemoMode ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Demo Mode (Runtime):</span>
                <Badge variant={demoMode ? "destructive" : "secondary"} className="text-xs">
                  {demoMode ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
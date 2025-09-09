import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentSession, getCurrentUser, getUserProfile } from '@/utils/auth';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  status: 'success' | 'error' | 'warning';
  title: string;
  description: string;
  data?: any;
  error?: any;
}

const AuthDebug: React.FC = () => {
  const { user, session, loading, isAuthenticated } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    const results: DiagnosticResult[] = [];

    // 1. Check current session
    try {
      const { session: currentSession, error } = await getCurrentSession();
      results.push({
        status: currentSession ? 'success' : 'error',
        title: 'Supabase Session',
        description: currentSession ? 'Valid session found' : 'No active session',
        data: currentSession ? {
          user_id: currentSession.user?.id,
          email: currentSession.user?.email,
          expires_at: new Date(currentSession.expires_at! * 1000).toISOString(),
          provider: currentSession.user?.app_metadata?.provider
        } : null,
        error
      });
    } catch (error) {
      results.push({
        status: 'error',
        title: 'Supabase Session',
        description: 'Failed to get session',
        error
      });
    }

    // 2. Check current user
    try {
      const { user: currentUser, error } = await getCurrentUser();
      results.push({
        status: currentUser ? 'success' : 'error',
        title: 'Supabase User',
        description: currentUser ? 'User authenticated' : 'No authenticated user',
        data: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          created_at: currentUser.created_at,
          last_sign_in_at: currentUser.last_sign_in_at,
          providers: currentUser.identities?.map(i => i.provider)
        } : null,
        error
      });
    } catch (error) {
      results.push({
        status: 'error',
        title: 'Supabase User',
        description: 'Failed to get user',
        error
      });
    }

    // 3. Check user profile
    if (user?.id) {
      try {
        const { profile, error } = await getUserProfile(user.id);
        results.push({
          status: profile ? 'success' : 'warning',
          title: 'User Profile',
          description: profile ? 'Profile found' : 'No profile found (need onboarding)',
          data: profile,
          error
        });
      } catch (error) {
        results.push({
          status: 'error',
          title: 'User Profile',
          description: 'Failed to fetch profile',
          error
        });
      }

      // 4. Test direct Supabase profiles query (RLS test)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        results.push({
          status: error ? 'error' : (data ? 'success' : 'warning'),
          title: 'Direct Profiles Query (RLS Test)',
          description: error ? 'RLS or query error' : (data ? 'RLS allows access' : 'No profile row'),
          data,
          error
        });
      } catch (error) {
        results.push({
          status: 'error',
          title: 'Direct Profiles Query (RLS Test)',
          description: 'Query failed',
          error
        });
      }

      // 5. Test premium status
      try {
        const { data, error } = await supabase.rpc('is_premium', { p_user: user.id });
        results.push({
          status: error ? 'error' : 'success',
          title: 'Premium Status Check',
          description: error ? 'Failed to check premium status' : `Premium: ${data}`,
          data: { is_premium: data },
          error
        });
      } catch (error) {
        results.push({
          status: 'error',
          title: 'Premium Status Check',
          description: 'RPC call failed',
          error
        });
      }
    }

    // 6. Test Edge Function connectivity
    try {
      const { data, error } = await supabase.functions.invoke('auth0-provision', {
        body: { test: true }
      });
      results.push({
        status: error ? 'warning' : 'success',
        title: 'Edge Function Test (auth0-provision)',
        description: error ? 'Edge function error (expected for test call)' : 'Edge function accessible',
        data,
        error
      });
    } catch (error) {
      results.push({
        status: 'warning',
        title: 'Edge Function Test (auth0-provision)',
        description: 'Edge function test failed (may be expected)',
        error
      });
    }

    setDiagnostics(results);
    setIsRunningDiagnostics(false);
  };

  useEffect(() => {
    if (!loading) {
      runDiagnostics();
    }
  }, [loading, user]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading authentication state...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Authentication Diagnostics</h1>
        <p className="text-muted-foreground mt-2">
          Debug authentication flow and Supabase integration
        </p>
      </div>

      {/* Quick Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isAuthenticated ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">Authenticated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {user?.id ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">User ID</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {session?.access_token ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">Access Token</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {diagnostics.filter(d => d.status === 'error').length === 0 ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">No Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Auth Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication State</CardTitle>
          <CardDescription>Current authentication information from useAuth hook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
            <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
            <div><strong>User ID:</strong> {user?.id || 'None'}</div>
            <div><strong>Email:</strong> {user?.email || 'None'}</div>
            <div><strong>Session Expires:</strong> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'None'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Diagnostic Results</CardTitle>
            <CardDescription>Detailed authentication and database connectivity tests</CardDescription>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunningDiagnostics}
            size="sm"
          >
            {isRunningDiagnostics ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Running...
              </>
            ) : (
              'Refresh Diagnostics'
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diagnostics.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getStatusIcon(result.status)}
                    <h4 className="font-semibold ml-2">{result.title}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{result.description}</p>
                
                {result.data && (
                  <div className="mt-2">
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium">View Data</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
                
                {result.error && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error:</strong> {result.error.message || JSON.stringify(result.error)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>No Session/User:</strong> Check if you're logged in. Try signing out and back in.
            </div>
            <div>
              <strong>Profile Missing:</strong> Complete the onboarding flow to create your profile.
            </div>
            <div>
              <strong>RLS Errors:</strong> Check Row Level Security policies on the profiles table.
            </div>
            <div>
              <strong>500 Errors:</strong> Usually indicate server-side issues or missing data.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebug;
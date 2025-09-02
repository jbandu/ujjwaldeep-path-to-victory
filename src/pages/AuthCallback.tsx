import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback with hash and search params
        const { data, error } = await supabase.auth.getSession();
        
        // Also try to get user from URL hash if session is empty
        if (!data.session) {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) {
            console.error('Auth error:', authError);
            toast({
              title: "Authentication Error", 
              description: authError.message,
              variant: "destructive",
            });
            navigate('/auth');
            return;
          }
        }
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        if (data.session?.user) {
          // Check if user has a complete profile
          try {
            const { data: profile, error: profileError } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('user_id', data.session.user.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              // PGRST116 is "not found" error, which is expected for new users
              console.error('Profile fetch error:', profileError);
            }

            if (profile && profile.full_name) {
              // User has completed profile, redirect to app
              navigate('/app');
            } else {
              // New user or incomplete profile, redirect to onboarding
              navigate('/onboarding');
            }
          } catch (profileError) {
            console.error('Error checking profile:', profileError);
            // Default to onboarding if we can't check profile
            navigate('/onboarding');
          }
        } else {
          // No session, redirect to auth
          navigate('/auth');
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred during authentication.",
          variant: "destructive",
        });
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, toast, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we set up your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
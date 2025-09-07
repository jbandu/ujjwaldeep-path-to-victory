import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { signInWithGoogle, signInWithOtp, authRedirect } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'magic' | 'reset'>('signin');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema)
  });

  useEffect(() => {
    if (isAuthenticated) {
      // Check if user has profile
      checkUserProfile();
    }
  }, [isAuthenticated]);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
      }

      if (profile && profile.full_name) {
        navigate('/app');
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Unexpected error checking profile:', error);
      navigate('/onboarding');
    }
  };

  const onPasswordAuth = async (data: AuthFormData) => {
    setIsLoading(true);
    if (!data.password) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    try {
      let authResult;
      if (authMode === 'signin') {
        authResult = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
      } else {
        const next = searchParams.get('next') || '/app';
        authResult = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: authRedirect(next),
          },
        });
      }

      if (authResult.error) {
        toast({
          title: "Error",
          description: authResult.error.message,
          variant: "destructive",
        });
      } else if (authMode === 'signup' && !authResult.data.session) {
        setUserEmail(data.email);
        setSuccessMessage(`We've sent a confirmation link to ${data.email}`);
        setShowSuccess(true);
        toast({
          title: "Check your email",
          description: "Please confirm your email address to complete signup.",
        });
      } else {
        toast({
          title: "Success",
          description: authMode === 'signin' ? "Signed in successfully!" : "Account created successfully!",
        });

        // Ensure user is redirected after successful authentication
        if (authResult.data.session) {
          await checkUserProfile();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSendMagicLink = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      const next = searchParams.get('next') || '/app';
      const { error } = await signInWithOtp(data.email, next);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUserEmail(data.email);
        setSuccessMessage(`We've sent a magic link to ${data.email}`);
        setShowSuccess(true);
        toast({
          title: "Magic link sent!",
          description: "Check your email for the login link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUserEmail(data.email);
        setSuccessMessage(`We've sent a password reset link to ${data.email}`);
        setShowSuccess(true);
        toast({
          title: "Password reset email sent",
          description: "Check your email for the reset link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const next = searchParams.get('next') || '/app';
      const { error } = await signInWithGoogle(next);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetToAuthForm = () => {
    setShowSuccess(false);
    setUserEmail('');
    setSuccessMessage('');
    setAuthMode('signin');
    reset();
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-warm">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo className="h-12 w-auto" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Check your email
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {successMessage}
              </CardDescription>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground mb-4">
                Click the link in your email to continue. You can close this tab.
              </p>
            </div>
            
            <Button
              variant="ghost"
              onClick={resetToAuthForm}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try a different email
            </Button>
            
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-warm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo className="h-12 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {authMode === 'signin'
                ? 'Sign In'
                : authMode === 'signup'
                  ? 'Create Account'
                  : authMode === 'magic'
                    ? 'Magic Link'
                    : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {authMode === 'signin'
                ? 'Sign in to your account'
                : authMode === 'signup'
                  ? 'Create a new account'
                  : authMode === 'magic'
                    ? 'Send yourself a magic link'
                    : 'Enter your email to receive a reset link'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auth Mode Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={authMode === 'signin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAuthMode('signin')}
              className="flex-1"
            >
              Sign In
            </Button>
            <Button
              variant={authMode === 'signup' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAuthMode('signup')}
              className="flex-1"
            >
              Sign Up
            </Button>
            <Button
              variant={authMode === 'magic' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAuthMode('magic')}
              className="flex-1"
            >
              Magic Link
            </Button>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit(authMode === 'magic' ? onSendMagicLink : authMode === 'reset' ? onResetPassword : onPasswordAuth)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            
            {authMode !== 'magic' && authMode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register('password')}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            )}

            {authMode === 'signin' && (
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  className="px-0"
                  onClick={() => setAuthMode('reset')}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              variant="default"
            >
              {isLoading
                ? 'Loading...'
                : authMode === 'magic'
                  ? 'Send Magic Link'
                  : authMode === 'signin'
                    ? 'Sign In'
                    : authMode === 'signup'
                      ? 'Sign Up'
                      : 'Send Reset Link'}
              </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          {/* Google OAuth Button */}
          <Button 
            onClick={onGoogleSignIn}
            variant="outline" 
            className="w-full"
            disabled={isLoading}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
          
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
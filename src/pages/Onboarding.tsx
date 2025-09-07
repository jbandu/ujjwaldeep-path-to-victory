import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';

const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  board: z.string().min(1, 'Please select your board'),
  medium: z.string().min(1, 'Please select your medium'),
  class_level: z.string().min(1, 'Please select your class level'),
  state: z.string().min(1, 'Please enter your state'),
  district: z.string().min(1, 'Please enter your district'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const Onboarding: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema)
  });

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be signed in to complete onboarding.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    try {
      // Create profile
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...data,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        toast({
          title: "Error",
          description: profileError.message,
          variant: "destructive",
        });
        return;
      }

      // Create premium subscription for beta users
      const { error: subscriptionError } = await (supabase as any)
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          provider_subscription_id: "beta_sub_" + Date.now(),
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          autopay: true
        });

      if (subscriptionError) {
        console.error('Subscription creation error:', subscriptionError);
        // Don't block onboarding if subscription fails
      }

      toast({
        title: "Welcome to UjjwalDeep!",
        description: "Your profile has been set up successfully with premium access.",
      });
      navigate('/app');
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while setting up your profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-warm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo className="h-12 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              Complete Your Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Help us personalize your exam preparation journey
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="Enter your full name"
                  {...register('full_name')}
                  disabled={isLoading}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="board">Board *</Label>
                <Select onValueChange={(value) => setValue('board', value)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                    <SelectItem value="State">State Board</SelectItem>
                    <SelectItem value="ICSE">ICSE</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.board && (
                  <p className="text-sm text-destructive">{errors.board.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medium">Medium *</Label>
                <Select onValueChange={(value) => setValue('medium', value)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your medium" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.medium && (
                  <p className="text-sm text-destructive">{errors.medium.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_level">Class Level *</Label>
                <Select onValueChange={(value) => setValue('class_level', value)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XI">Class XI</SelectItem>
                    <SelectItem value="XII">Class XII</SelectItem>
                    <SelectItem value="Dropper">Dropper</SelectItem>
                  </SelectContent>
                </Select>
                {errors.class_level && (
                  <p className="text-sm text-destructive">{errors.class_level.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="Enter your state"
                  {...register('state')}
                  disabled={isLoading}
                />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District *</Label>
                <Input
                  id="district"
                  placeholder="Enter your district"
                  {...register('district')}
                  disabled={isLoading}
                />
                {errors.district && (
                  <p className="text-sm text-destructive">{errors.district.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut({ scope: 'global' });
                  } catch (e) {
                    console.error('Sign out error:', e);
                  } finally {
                    navigate('/auth');
                  }
                }}
                disabled={isLoading}
                className="sm:w-auto"
              >
                Back to Sign In
              </Button>
              
              <Button 
                type="submit" 
                className="flex-1 sm:w-auto" 
                disabled={isLoading}
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
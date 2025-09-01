import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Settings, 
  Trophy, 
  Target, 
  Calendar,
  Mail,
  Clock,
  TrendingUp,
  Award,
  Save,
  Edit
} from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  board: z.string().min(1, 'Please select your board'),
  medium: z.string().min(1, 'Please select your medium'),
  class_level: z.string().min(1, 'Please select your class level'),
  state: z.string().min(1, 'Please enter your state'),
  district: z.string().min(1, 'Please enter your district'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        // Populate form with existing data
        reset({
          full_name: data.full_name || '',
          board: data.board || '',
          medium: data.medium || '',
          class_level: data.class_level || '',
          state: data.state || '',
          district: data.district || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...data,
          updated_at: new Date().toISOString()
        });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        setIsEditing(false);
        fetchProfile(); // Refresh profile data
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and track your progress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>{profile?.full_name || user?.email?.split('@')[0] || 'User'}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined</span>
              <span>Jan 2024</span>
            </div>
            {profile?.class_level && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Class</span>
                <Badge variant="outline">{profile.class_level}</Badge>
              </div>
            )}
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats & Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile Details</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    {isEditing ? 'Update your personal details' : 'Your personal details'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                              <SelectValue placeholder={profile?.board || "Select your board"} />
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
                              <SelectValue placeholder={profile?.medium || "Select your medium"} />
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
                              <SelectValue placeholder={profile?.class_level || "Select your class"} />
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

                      <div className="flex gap-4">
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                        >
                          {isLoading ? 'Saving...' : 'Save Changes'}
                          <Save className="h-4 w-4 ml-2" />
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {profile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                            <p className="text-foreground">{profile.full_name || 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                            <p className="text-foreground">{profile.board || 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Medium</Label>
                            <p className="text-foreground">{profile.medium || 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Class Level</Label>
                            <p className="text-foreground">{profile.class_level || 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">State</Label>
                            <p className="text-foreground">{profile.state || 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">District</Label>
                            <p className="text-foreground">{profile.district || 'Not set'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No profile information available. Click "Edit Profile" to add your details.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-primary">7</div>
                    <p className="text-sm text-muted-foreground">Day Streak</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">23</div>
                    <p className="text-sm text-muted-foreground">Tests Done</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">78%</div>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">42h</div>
                    <p className="text-sm text-muted-foreground">Study Time</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Charts */}
              <Card>
                <CardHeader>
                  <CardTitle>Subject Mastery</CardTitle>
                  <CardDescription>Your progress across different subjects</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { subject: 'Biology', progress: 85, tests: 12, avgScore: 82 },
                    { subject: 'Chemistry', progress: 70, tests: 8, avgScore: 75 },
                    { subject: 'Physics', progress: 60, tests: 6, avgScore: 68 },
                  ].map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{subject.subject}</span>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{subject.tests} tests</span>
                          <span>{subject.avgScore}% avg</span>
                        </div>
                      </div>
                      <Progress value={subject.progress} className="h-2" />
                      <div className="text-right text-sm text-muted-foreground">
                        {subject.progress}% complete
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Badges & Achievements</CardTitle>
                  <CardDescription>Your learning milestones and accomplishments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { name: 'First Steps', description: 'Completed first test', earned: true, date: 'Jan 15' },
                      { name: 'Week Warrior', description: '7-day streak', earned: true, date: 'Jan 22' },
                      { name: 'Century Club', description: '100 questions', earned: true, date: 'Jan 28' },
                      { name: 'Perfect Score', description: '100% in test', earned: false, date: null },
                      { name: 'Speed Demon', description: 'Fast completion', earned: true, date: 'Feb 2' },
                      { name: 'Marathon Runner', description: '1000 questions', earned: false, date: null },
                    ].map((badge, index) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border text-center ${
                          badge.earned 
                            ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20' 
                            : 'bg-muted/30 border-muted opacity-60'
                        }`}
                      >
                        <Award className={`h-8 w-8 mx-auto mb-2 ${badge.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground mb-1">{badge.description}</p>
                        {badge.earned && badge.date && (
                          <p className="text-xs text-primary">Earned {badge.date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
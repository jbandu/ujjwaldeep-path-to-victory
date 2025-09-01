import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp, 
  Flame, 
  Award,
  Zap,
  Play,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import GamificationWidget from '@/components/GamificationWidget';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const getUserName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Student';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {loading ? '...' : getUserName()}! 👋
            </h1>
            <p className="text-muted-foreground">
              Ready to continue your exam preparation journey?
            </p>
          </div>
        </div>
        
        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-all duration-200 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
            onClick={() => navigate('/app/builder')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Start Builder</h3>
                  <p className="text-sm text-muted-foreground">Create new test</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => navigate('/app/library')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Continue Last Test</h3>
                  <p className="text-sm text-muted-foreground">Resume Biology</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => navigate('/app/leaderboard')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold">View Leaderboard</h3>
                  <p className="text-sm text-muted-foreground">See rankings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Daily Streak</h3>
                  <p className="text-sm text-primary font-medium">7 days 🔥</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">7 days</div>
            <p className="text-xs text-muted-foreground">Keep it up! 🔥</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">+3 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">+5% improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42h</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gamification Widget */}
        <div className="lg:col-span-1">
          <GamificationWidget />
        </div>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest test performances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { subject: 'Physics', score: 85, date: '2 hours ago' },
              { subject: 'Chemistry', score: 72, date: '1 day ago' },
              { subject: 'Biology', score: 91, date: '2 days ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{activity.subject} Test</p>
                  <p className="text-sm text-muted-foreground">{activity.date}</p>
                </div>
                <Badge 
                  variant={activity.score >= 80 ? 'default' : activity.score >= 60 ? 'secondary' : 'destructive'}
                >
                  {activity.score}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Progress Tracking */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Subject Progress</CardTitle>
            <CardDescription>Track your mastery across subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { subject: 'Biology', progress: 85, color: 'bg-green-500' },
              { subject: 'Chemistry', progress: 70, color: 'bg-blue-500' },
              { subject: 'Physics', progress: 60, color: 'bg-purple-500' },
            ].map((subject, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{subject.subject}</span>
                  <span className="text-muted-foreground">{subject.progress}%</span>
                </div>
                <Progress value={subject.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Recent Achievements
          </CardTitle>
          <CardDescription>Badges and milestones you've unlocked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Week Warrior', description: '7-day streak', earned: true },
              { name: 'Century Club', description: '100 questions', earned: true },
              { name: 'Perfect Score', description: '100% in test', earned: false },
              { name: 'Speed Demon', description: 'Fast completion', earned: true },
            ].map((badge, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border text-center ${
                  badge.earned 
                    ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20' 
                    : 'bg-muted/30 border-muted opacity-60'
                }`}
              >
                <Trophy className={`h-8 w-8 mx-auto mb-2 ${badge.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                <h4 className="font-medium text-sm">{badge.name}</h4>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
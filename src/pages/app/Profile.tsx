import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Settings, 
  Trophy, 
  Target, 
  Calendar,
  Mail,
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();

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
            <CardTitle>{user?.email?.split('@')[0] || 'User'}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined</span>
              <span>Jan 2024</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Target Exam</span>
              <Badge variant="outline">NEET 2024</Badge>
            </div>
            <Button className="w-full" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Stats & Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="stats" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

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

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified about your progress and achievements
                    </p>
                    <Button variant="outline" size="sm">
                      Configure Notifications
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Study Preferences</h4>
                    <p className="text-sm text-muted-foreground">
                      Set your target exam and study schedule
                    </p>
                    <Button variant="outline" size="sm">
                      Update Preferences
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Privacy Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Control your data and privacy options
                    </p>
                    <Button variant="outline" size="sm">
                      Privacy Settings
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
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
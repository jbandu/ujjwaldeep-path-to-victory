import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Crown, Users, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';

interface LeaderboardEntry {
  rank: number;
  points: number;
  display_name: string;
  day?: string;
}

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const session = useSession();
  const [dailyLeaderboard, setDailyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetchDailyLeaderboard();
  }, [session]);

  const fetchDailyLeaderboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('leaderboard-daily', {
        body: { limit: 50 }
      });

      if (error) throw error;

      setDailyLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank <= 3) return "default";
    if (rank <= 10) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold font-heading">Leaderboard</h1>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-heading">Leaderboard</h1>
            <p className="text-muted-foreground">
              See how you rank against other students
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" disabled className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" disabled className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Monthly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyLeaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No rankings available yet today. Be the first to earn points!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyLeaderboard.map((entry) => (
                    <div 
                      key={`${entry.rank}-${entry.display_name}`}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        entry.rank <= 3 
                          ? 'bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20' 
                          : 'bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 min-w-[60px]">
                          {getRankIcon(entry.rank)}
                          <Badge variant={getRankBadgeColor(entry.rank)} className="min-w-[30px] justify-center">
                            #{entry.rank}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">{entry.display_name}</p>
                          {entry.rank <= 3 && (
                            <p className="text-xs text-muted-foreground">
                              {entry.rank === 1 && "🥇 Champion"}
                              {entry.rank === 2 && "🥈 Runner-up"}  
                              {entry.rank === 3 && "🥉 Third Place"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{entry.points}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Weekly leaderboard coming soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Monthly leaderboard coming soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
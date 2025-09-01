import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame, Trophy, Zap, Crown, Star, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GamificationData {
  streak_days: number;
  points: number;
  badges: string[];
}

interface LeaderboardEntry {
  rank: number;
  points: number;
  display_name: string;
}

const BADGE_THRESHOLDS = {
  'Starter': 0,
  'Achiever': 100,
  'Expert': 500,
  'Master': 1000,
  'Legend': 2500
};

const GamificationWidget: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gamificationData, setGamificationData] = useState<GamificationData>({
    streak_days: 0,
    points: 0,
    badges: []
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isQuickTestOpen, setIsQuickTestOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGamificationData();
      fetchLeaderboard();
    }
  }, [user]);

  const fetchGamificationData = async () => {
    try {
      const { data, error } = await supabase
        .from('gamification')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setGamificationData({
          streak_days: data.streak_days || 0,
          points: data.points || 0,
          badges: data.badges || []
        });
      }
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('leaderboard-daily', {
        body: { limit: 5 }
      });

      if (error) throw error;

      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleKeepStreak = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gamification-ping');

      if (error) throw error;

      setGamificationData(prev => ({
        ...prev,
        streak_days: data.streak_days,
        points: data.points
      }));

      toast({
        title: "Streak Updated! 🔥",
        description: `+${data.points_added} points earned!`,
      });

      // Refresh leaderboard
      fetchLeaderboard();
      
      // Open quick test modal
      setIsQuickTestOpen(true);
    } catch (error) {
      console.error('Error updating streak:', error);
      toast({
        title: "Error",
        description: "Failed to update streak. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getNextBadge = () => {
    const currentPoints = gamificationData.points;
    const badges = Object.entries(BADGE_THRESHOLDS).sort((a, b) => a[1] - b[1]);
    
    for (const [badge, threshold] of badges) {
      if (currentPoints < threshold) {
        return { name: badge, pointsNeeded: threshold - currentPoints };
      }
    }
    
    return { name: 'Legend', pointsNeeded: 0 };
  };

  const getCurrentBadge = () => {
    const currentPoints = gamificationData.points;
    const badges = Object.entries(BADGE_THRESHOLDS).sort((a, b) => b[1] - a[1]);
    
    for (const [badge, threshold] of badges) {
      if (currentPoints >= threshold) {
        return badge;
      }
    }
    
    return 'Starter';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextBadge = getNextBadge();
  const currentBadge = getCurrentBadge();

  return (
    <>
      <Card className="bg-gradient-card border-border/50 hover:shadow-warm transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-heading">
            <Zap className="h-5 w-5 text-primary" />
            Gamification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Streak and Points */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="font-semibold">{gamificationData.streak_days} day streak</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-accent" />
              <span className="font-medium">{gamificationData.points} pts</span>
            </div>
          </div>

          {/* Current Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm">Current:</span>
            </div>
            <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground">
              {currentBadge}
            </Badge>
          </div>

          {/* Next Badge */}
          {nextBadge.pointsNeeded > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Next:</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {nextBadge.name} (-{nextBadge.pointsNeeded})
              </span>
            </div>
          )}

          {/* Keep Streak Button */}
          <Button 
            onClick={handleKeepStreak}
            className="w-full bg-gradient-primary hover:opacity-90 font-medium"
            size="sm"
          >
            Keep the Streak 🔥
          </Button>

          {/* Leaderboard Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Today's Top 5</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-6 px-2"
                onClick={() => window.location.href = '/app/leaderboard'}
              >
                View All
              </Button>
            </div>
            <div className="space-y-1">
              {leaderboard.slice(0, 5).map((entry) => (
                <div 
                  key={entry.rank} 
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">#{entry.rank}</span>
                    <span className="truncate">{entry.display_name}</span>
                  </span>
                  <span className="font-medium text-primary">{entry.points}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No rankings yet today
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test Modal */}
      <Dialog open={isQuickTestOpen} onOpenChange={setIsQuickTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Test (Coming Soon)
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <Trophy className="h-12 w-12 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                5-question quick test feature is coming soon!
              </p>
            </div>
            <Button 
              onClick={() => setIsQuickTestOpen(false)}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GamificationWidget;

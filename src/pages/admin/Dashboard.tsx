import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Plus, 
  Upload, 
  AlertCircle,
  BookOpen,
  Target,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalQuestions: number;
  physicsByCount: number;
  chemistryByCount: number;
  biologyByCount: number;
  missingAnswers: number;
  recentAdditions: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalQuestions: 0,
    physicsByCount: 0,
    chemistryByCount: 0,
    biologyByCount: 0,
    missingAnswers: 0,
    recentAdditions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total questions
        const { count: totalQuestions } = await (supabase as any)
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Questions by subject
        const { data: subjectCounts } = await (supabase as any)
          .from('questions')
          .select('subject')
          .eq('status', 'active');

        const physicsByCount = subjectCounts?.filter((q: any) => q.subject?.toLowerCase() === 'physics').length || 0;
        const chemistryByCount = subjectCounts?.filter((q: any) => q.subject?.toLowerCase() === 'chemistry').length || 0;
        const biologyByCount = subjectCounts?.filter((q: any) => q.subject?.toLowerCase() === 'biology').length || 0;

        // Missing answers
        const { count: missingAnswers } = await (supabase as any)
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .is('correct_index', null);

        // Recent additions (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: recentAdditions } = await (supabase as any)
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('created_at', sevenDaysAgo.toISOString());

        setStats({
          totalQuestions: totalQuestions || 0,
          physicsByCount,
          chemistryByCount,
          biologyByCount,
          missingAnswers: missingAnswers || 0,
          recentAdditions: recentAdditions || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Questions',
      value: stats.totalQuestions,
      icon: FileText,
      description: 'Active questions in database',
      color: 'bg-blue-500',
    },
    {
      title: 'Physics',
      value: stats.physicsByCount,
      icon: Target,
      description: 'Physics questions',
      color: 'bg-green-500',
    },
    {
      title: 'Chemistry',
      value: stats.chemistryByCount,
      icon: BookOpen,
      description: 'Chemistry questions',
      color: 'bg-purple-500',
    },
    {
      title: 'Biology',
      value: stats.biologyByCount,
      icon: TrendingUp,
      description: 'Biology questions',
      color: 'bg-orange-500',
    },
    {
      title: 'Missing Answers',
      value: stats.missingAnswers,
      icon: AlertCircle,
      description: 'Questions without correct_index',
      color: 'bg-red-500',
    },
    {
      title: 'Added (7 days)',
      value: stats.recentAdditions,
      icon: Plus,
      description: 'Recently added questions',
      color: 'bg-admin-accent',
    },
  ];

  const quickActions = [
    {
      title: 'Add Question',
      description: 'Create a new NEET question',
      href: '/admin/questions/new',
      icon: Plus,
      color: 'bg-admin-accent hover:bg-admin-accent/90',
    },
    {
      title: 'Bulk Import',
      description: 'Import questions from CSV',
      href: '/admin/import',
      icon: Upload,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Review Missing Answers',
      description: 'Set correct answers for questions',
      href: '/admin/review',
      icon: AlertCircle,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage NEET questions and monitor system performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.color.replace('bg-', 'bg-opacity-20 text-')}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.title} className="group hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <Button 
                    asChild 
                    className={`w-full ${action.color} text-white`}
                  >
                    <Link to={action.href} className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-sm opacity-90">{action.description}</div>
                      </div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
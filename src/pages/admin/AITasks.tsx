import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, RefreshCw, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AITask {
  id: string;
  task_type: string;
  question_id: number;
  locale?: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  result?: any;
  error?: string;
  created_at: string;
  updated_at?: string;
}

const AITasks: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [stats, setStats] = useState({
    queued: 0,
    processing: 0,
    done: 0,
    error: 0
  });

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTasks(data || []);
      
      // Calculate stats
      const newStats = (data || []).reduce((acc, task) => {
        acc[task.status as keyof typeof acc]++;
        return acc;
      }, { queued: 0, processing: 0, done: 0, error: 0 });
      
      setStats(newStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runWorker = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-worker');
      
      if (error) throw error;

      toast({
        title: "Worker Completed",
        description: `Processed ${data.processed} tasks`,
      });
      
      // Refresh tasks after worker runs
      await fetchTasks();
    } catch (error: any) {
      toast({
        title: "Worker Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const bulkEnqueue = async (taskType: 'explain' | 'difficulty' | 'tags' | 'bloom' | 'translate' | 'qc', filters: any) => {
    try {
      let query = supabase.from('questions').select('id');
      
      // Apply filters based on task type
      if (taskType === 'explain') {
        query = query.or('explanation.is.null,explanation->>text.is.null');
      } else if (taskType === 'difficulty') {
        query = query.is('difficulty_ai', null);
      } else if (taskType === 'translate') {
        // Questions without Hindi localization
        const { data: localizedIds } = await supabase
          .from('question_localizations')
          .select('question_id')
          .eq('language', 'hi');
        
        const excludeIds = (localizedIds || []).map(l => l.question_id);
        if (excludeIds.length > 0) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }
      }
      
      query = query.eq('status', 'active').limit(20);
      
      const { data: questions, error: qError } = await query;
      if (qError) throw qError;

      // Enqueue tasks for each question
      const promises = (questions || []).map(q => 
        supabase.rpc('ai_enqueue', {
          p_task_type: taskType,
          p_question_id: q.id,
          p_locale: taskType === 'translate' ? 'hi' : null,
          p_payload: {}
        })
      );

      await Promise.all(promises);
      
      toast({
        title: "Tasks Enqueued",
        description: `Added ${questions?.length || 0} ${taskType} tasks`,
      });
      
      await fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      queued: 'default',
      processing: 'secondary',
      done: 'default',
      error: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getTaskTypeDisplay = (taskType: string) => {
    const displays: Record<string, string> = {
      explain: 'Generate Explanation',
      difficulty: 'Calibrate Difficulty',
      tags: 'Suggest Tags',
      bloom: 'Bloom Classification',
      translate: 'Translate',
      qc: 'Quality Check',
      summary: 'Generate Summary'
    };
    return displays[taskType] || taskType;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Tasks</h1>
          <p className="text-muted-foreground">Manage AI-powered question enhancement</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTasks} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runWorker} disabled={working}>
            {working ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Worker
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.queued}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Task Queue</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Latest AI processing tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No tasks found</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{getTaskTypeDisplay(task.task_type)}</span>
                          {getStatusBadge(task.status)}
                          {task.locale && (
                            <Badge variant="outline">{task.locale}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Question ID: {task.question_id} • Created: {new Date(task.created_at).toLocaleString()}
                        </p>
                        {task.error && (
                          <p className="text-sm text-red-600 mt-1">Error: {task.error}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generate Explanations</CardTitle>
                <CardDescription>Add explanations to questions missing them</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => bulkEnqueue('explain', {})}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Enqueue Explain Tasks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Calibrate Difficulty</CardTitle>
                <CardDescription>AI-powered difficulty assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => bulkEnqueue('difficulty', {})}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Enqueue Difficulty Tasks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hindi Translation</CardTitle>
                <CardDescription>Translate questions to Hindi</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => bulkEnqueue('translate', { language: 'hi' })}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Enqueue Translation Tasks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Suggest Tags</CardTitle>
                <CardDescription>Auto-generate relevant tags</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => bulkEnqueue('tags', {})}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Enqueue Tag Tasks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quality Check</CardTitle>
                <CardDescription>AI-powered quality assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => bulkEnqueue('qc', {})}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Enqueue QC Tasks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bloom Classification</CardTitle>
                <CardDescription>Classify by Bloom's taxonomy</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => bulkEnqueue('bloom', {})}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Enqueue Bloom Tasks
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITasks;
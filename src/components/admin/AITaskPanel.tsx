import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Wand2, Target, Tags, BookOpen, Languages, CheckCircle, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AITaskPanelProps {
  questionId: number;
  onTaskComplete?: () => void;
}

interface AITask {
  id: string;
  task_type: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  result?: any;
  error?: string;
  created_at: string;
  locale?: string;
}

const AITaskPanel: React.FC<AITaskPanelProps> = ({ questionId, onTaskComplete }) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_tasks')
        .select('*')
        .eq('question_id', questionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
    }
  };

  const enqueueTask = async (taskType: 'explain' | 'difficulty' | 'tags' | 'bloom' | 'translate' | 'qc', locale?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('ai_enqueue', {
        p_task_type: taskType,
        p_question_id: questionId,
        p_locale: locale || null,
        p_payload: {}
      });

      if (error) throw error;

      toast({
        title: "Task Enqueued",
        description: `${getTaskDisplayName(taskType)} task has been queued`,
      });

      await fetchTasks();
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
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('ai-worker');
      
      if (error) throw error;

      toast({
        title: "AI Worker Running",
        description: `Processing ${data.processed || 0} tasks`,
      });

      // Refresh tasks after a short delay
      setTimeout(() => {
        fetchTasks();
        onTaskComplete?.();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Worker Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTaskDisplayName = (taskType: string, locale?: string) => {
    const names: Record<string, string> = {
      explain: 'Generate Explanation',
      difficulty: 'Calibrate Difficulty',
      tags: 'Suggest Tags',
      bloom: 'Bloom Classification',
      translate: locale === 'hi' ? 'Translate to Hindi' : 
                locale === 'te' ? 'Translate to Telugu' :
                locale === 'ta' ? 'Translate to Tamil' : 'Translate',
      qc: 'Quality Check'
    };
    return names[taskType] || taskType;
  };

  const getTaskIcon = (taskType: string) => {
    const icons: Record<string, any> = {
      explain: Wand2,
      difficulty: Target,
      tags: Tags,
      bloom: BookOpen,
      translate: Languages,
      qc: CheckCircle
    };
    const Icon = icons[taskType] || Wand2;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      queued: 'default',
      processing: 'secondary',
      done: 'default',
      error: 'destructive'
    };
    const colors: Record<string, string> = {
      queued: 'text-blue-600',
      processing: 'text-yellow-600',
      done: 'text-green-600',
      error: 'text-red-600'
    };
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  useEffect(() => {
    fetchTasks();
  }, [questionId]);

  const taskTypes: Array<{ type: 'explain' | 'difficulty' | 'tags' | 'bloom' | 'qc', label: string }> = [
    { type: 'explain', label: 'Generate Explanation' },
    { type: 'difficulty', label: 'Calibrate Difficulty' },
    { type: 'tags', label: 'Suggest Tags' },
    { type: 'bloom', label: 'Bloom Classification' },
    { type: 'qc', label: 'Quality Check' }
  ];

  const translationLanguages = [
    { code: 'hi', name: 'Hindi', label: 'हिंदी' },
    { code: 'te', name: 'Telugu', label: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', label: 'தமிழ்' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-admin-accent" />
          AI Enhancement Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {taskTypes.map(({ type, label }) => (
            <Button
              key={type}
              onClick={() => enqueueTask(type)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="justify-start text-xs"
            >
              {getTaskIcon(type)}
              <span className="ml-1 truncate">{label}</span>
            </Button>
          ))}
          
          {/* Translation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={loading}
                variant="outline"
                size="sm"
                className="justify-start text-xs col-span-2"
              >
                <Languages className="h-4 w-4" />
                <span className="ml-1 truncate">Translate Question</span>
                <ChevronDown className="h-3 w-3 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-50 w-48 bg-background border border-border shadow-lg">
              {translationLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => enqueueTask('translate', lang.code)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  Translate to {lang.name} ({lang.label})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Run Worker Button */}
        <Button
          onClick={runWorker}
          disabled={loading}
          className="w-full bg-admin-accent hover:bg-admin-accent/90"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Process AI Tasks
        </Button>

        {/* Recent Tasks */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Tasks</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    {getTaskIcon(task.task_type)}
                    <span>{getTaskDisplayName(task.task_type, task.locale)}</span>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AITaskPanel;
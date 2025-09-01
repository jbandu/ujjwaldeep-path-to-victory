import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Trophy, 
  Target, 
  Clock, 
  BarChart3, 
  Share2, 
  ChevronDown,
  CheckCircle,
  XCircle,
  Book,
  TrendingUp,
  Copy,
  Wrench
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AttemptData {
  id: string;
  score: number;
  started_at: string;
  submitted_at: string;
  test_id: string;
}

interface QuestionResult {
  question_id: number;
  selected_index: number;
  correct: boolean;
  time_ms: number;
  question: {
    stem: string;
    options: string[];
    correct_index: number;
    explanation: any;
    subject: string;
    chapter: string;
    topic: string;
  };
}

interface SubjectBreakdown {
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
}

const Results: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (attemptId && user) {
      fetchResultsData();
    }
  }, [attemptId, user]);

  const fetchResultsData = async () => {
    try {
      // Fetch attempt data
      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', user?.id)
        .single();

      if (attemptError) throw attemptError;
      if (!attempt) throw new Error('Attempt not found');

      setAttemptData(attempt);

      // Fetch question results with question details
      const { data: results, error: resultsError } = await supabase
        .from('items_attempted')
        .select(`
          question_id,
          selected_index,
          correct,
          time_ms,
          questions!inner (
            stem,
            options,
            correct_index,
            explanation,
            subject,
            chapter,
            topic
          )
        `)
        .eq('attempt_id', attemptId);

      if (resultsError) throw resultsError;

      const formattedResults = results.map(item => ({
        question_id: item.question_id,
        selected_index: item.selected_index,
        correct: item.correct,
        time_ms: item.time_ms,
        question: Array.isArray(item.questions) ? item.questions[0] : item.questions
      }));

      setQuestionResults(formattedResults);

      // Calculate subject breakdown
      const breakdown = calculateSubjectBreakdown(formattedResults);
      setSubjectBreakdown(breakdown);

    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to load results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSubjectBreakdown = (results: QuestionResult[]): SubjectBreakdown[] => {
    const subjectMap = new Map<string, { total: number; correct: number }>();

    results.forEach(result => {
      const subject = result.question.subject;
      const current = subjectMap.get(subject) || { total: 0, correct: 0 };
      
      subjectMap.set(subject, {
        total: current.total + 1,
        correct: current.correct + (result.correct ? 1 : 0)
      });
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      total: data.total,
      correct: data.correct,
      accuracy: (data.correct / data.total) * 100
    }));
  };

  const calculateStats = () => {
    if (!questionResults.length || !attemptData) return null;

    const totalQuestions = questionResults.length;
    const correctAnswers = questionResults.filter(r => r.correct).length;
    const accuracy = (correctAnswers / totalQuestions) * 100;
    
    const totalTime = questionResults.reduce((sum, r) => sum + r.time_ms, 0);
    const avgTimePerQuestion = totalTime / totalQuestions / 1000; // Convert to seconds

    const testDuration = attemptData.submitted_at && attemptData.started_at 
      ? (new Date(attemptData.submitted_at).getTime() - new Date(attemptData.started_at).getTime()) / 1000 / 60
      : 0;

    return {
      score: attemptData.score || 0,
      accuracy,
      avgTimePerQuestion,
      totalQuestions,
      correctAnswers,
      testDuration
    };
  };

  const toggleQuestion = (questionId: number) => {
    const newOpen = new Set(openQuestions);
    if (newOpen.has(questionId)) {
      newOpen.delete(questionId);
    } else {
      newOpen.add(questionId);
    }
    setOpenQuestions(newOpen);
  };

  const handleShareScore = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Score Shared! 📋",
      description: "Link copied to clipboard",
    });
  };

  const handlePracticeWeakTopics = () => {
    // Get weak subjects (less than 70% accuracy)
    const weakSubjects = subjectBreakdown
      .filter(subject => subject.accuracy < 70)
      .map(subject => subject.subject);

    if (weakSubjects.length === 0) {
      toast({
        title: "Great Job! 🎉",
        description: "No weak topics found. Keep up the excellent work!",
      });
      return;
    }

    // Navigate to builder with weak topics as URL params
    const params = new URLSearchParams();
    weakSubjects.forEach(subject => params.append('subjects', subject));
    navigate(`/app/builder?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const incorrectQuestions = questionResults.filter(r => !r.correct);

  if (!stats) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No results data available</p>
          </CardContent>
        </Card>
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
            <h1 className="text-3xl font-bold font-heading">Test Results</h1>
            <p className="text-muted-foreground">
              {stats.correctAnswers} of {stats.totalQuestions} questions correct
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.score}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.score >= 80 ? 'Excellent! 🎉' : stats.score >= 60 ? 'Good job! 👍' : 'Keep practicing! 📚'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{stats.correctAnswers}/{stats.totalQuestions} correct</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTimePerQuestion.toFixed(0)}s</div>
            <p className="text-xs text-muted-foreground">per question</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testDuration.toFixed(0)}m</div>
            <p className="text-xs text-muted-foreground">total time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Subject Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectBreakdown.map((subject) => (
              <div key={subject.subject} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{subject.subject}</span>
                  <span className="text-muted-foreground">
                    {subject.correct}/{subject.total} ({subject.accuracy.toFixed(0)}%)
                  </span>
                </div>
                <Progress 
                  value={subject.accuracy} 
                  className="h-2"
                />
                {subject.accuracy < 70 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Needs improvement
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handlePracticeWeakTopics}
                className="flex items-center gap-2 bg-gradient-primary hover:opacity-90"
              >
                <Wrench className="h-4 w-4" />
                Practice Weak Topics
              </Button>
              
              <Button 
                onClick={handleShareScore}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share Score
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/app/library')}
                variant="secondary"
                size="sm"
              >
                <Book className="h-4 w-4 mr-2" />
                Take Another Test
              </Button>
              
              <Button 
                onClick={() => navigate('/app/dashboard')}
                variant="ghost"
                size="sm"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incorrect Questions */}
      {incorrectQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Review Incorrect Answers ({incorrectQuestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {incorrectQuestions.map((result, index) => (
              <Collapsible key={result.question_id}>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleQuestion(result.question_id)}
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-[30px] justify-center">
                        {index + 1}
                      </Badge>
                      <div className="text-left">
                        <p className="font-medium truncate max-w-[400px]">
                          {result.question.stem}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.question.subject} • {result.question.chapter}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      openQuestions.has(result.question_id) ? 'rotate-180' : ''
                    }`} />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    {/* Question Options */}
                    <div className="space-y-2">
                      {result.question.options.map((option: string, optionIndex: number) => (
                        <div 
                          key={optionIndex}
                          className={`p-3 rounded border text-sm ${
                            optionIndex === result.question.correct_index
                              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                              : optionIndex === result.selected_index
                              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {optionIndex === result.question.correct_index && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {optionIndex === result.selected_index && optionIndex !== result.question.correct_index && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span>{option}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    {result.question.explanation && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Explanation:</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          {typeof result.question.explanation === 'string' 
                            ? result.question.explanation 
                            : result.question.explanation.text || 'No explanation available'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Results;
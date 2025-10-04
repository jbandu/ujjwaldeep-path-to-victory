import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MathRenderer } from '@/components/MathRenderer';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Clock, 
  Grid3X3,
  Send,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface Question {
  id: number;
  subject: string;
  chapter: string;
  stem: string;
  options: string[];
  difficulty: number;
}

interface AttemptData {
  id: string;
  test_id: string;
  started_at: string;
  duration_sec: number;
  questions: Question[];
  total_questions: number;
}

interface QuestionState {
  answered: boolean;
  flagged: boolean;
  selectedIndex?: number;
  timeSpent: number;
}

const TestPlayer: React.FC = () => {
  // Remove premium check for beta testing - all users can access tests

  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Map<number, QuestionState>>(new Map());
  const [showPalette, setShowPalette] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load attempt data
  useEffect(() => {
    const loadAttempt = async () => {
      if (!attemptId) return;

      try {
        // Use supabase.functions.invoke for better integration
        const { data, error } = await supabase.functions.invoke('get-attempt', {
          body: { attemptId },
        });

        if (error) {
          if (error.message && error.message.includes('already submitted')) {
            navigate(`/app/results/${attemptId}`);
            return;
          }
          throw new Error(error.message || 'Failed to load attempt');
        }
        
        setAttempt(data);
        setTimeRemaining(data.time_remaining);
        
        // Initialize question states with existing responses
        const states = new Map<number, QuestionState>();
        data.questions.forEach((q: Question) => {
          const existingResponse = data.existing_responses?.[q.id];
          states.set(q.id, {
            answered: existingResponse !== undefined,
            flagged: false, // Could be loaded from a separate flagged state if needed
            selectedIndex: existingResponse,
            timeSpent: 0
          });
        });
        setQuestionStates(states);
      } catch (error: any) {
        console.error('Failed to load attempt:', error);
        toast({
          title: "Failed to Load Test",
          description: error.message || "Could not load the test. Please try again.",
          variant: "destructive"
        });
        navigate('/app');
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId, navigate, toast]);

  // Submit attempt
  const handleSubmit = useCallback(async () => {
    if (!attemptId || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      // Call POST /api/attempts/[id]/submit endpoint
      const response = await fetch(`https://orxjqiegmocarwdedkpu.supabase.co/functions/v1/submit-attempt/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit attempt');
      }

      toast({
        title: "Test Submitted Successfully! 🎉",
        description: `Your score: ${data.correct_answers}/${data.total_questions} (${data.score.toFixed(1)}%)`
      });

      navigate(`/app/results/${attemptId}`);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, isSubmitting, navigate, toast]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !attempt) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, attempt, handleSubmit]);

  // Auto-save response
  const saveResponse = useCallback(async (questionId: number, selectedIndex: number) => {
    if (!attemptId) return;

    try {
      // Call POST /api/attempts/[id]/response endpoint
      const response = await fetch(`https://orxjqiegmocarwdedkpu.supabase.co/functions/v1/save-response/attempts/${attemptId}/response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          selectedIndex,
          timeSpent: questionStates.get(questionId)?.timeSpent || 0
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to save response:', data.error);
      }
    } catch (error) {
      console.error('Failed to save response:', error);
    }
  }, [attemptId, questionStates]);

  // Handle answer selection
  const handleAnswerSelect = (optionIndex: number) => {
    if (!attempt) return;
    
    const question = attempt.questions[currentQuestionIndex];
    const currentState = questionStates.get(question.id) || {
      answered: false,
      flagged: false,
      timeSpent: 0
    };

    const newState = {
      ...currentState,
      answered: true,
      selectedIndex: optionIndex
    };

    setQuestionStates(prev => new Map(prev.set(question.id, newState)));
    saveResponse(question.id, optionIndex);
  };

  // Toggle flag
  const toggleFlag = () => {
    if (!attempt) return;
    
    const question = attempt.questions[currentQuestionIndex];
    const currentState = questionStates.get(question.id) || {
      answered: false,
      flagged: false,
      timeSpent: 0
    };

    const newState = {
      ...currentState,
      flagged: !currentState.flagged
    };

    setQuestionStates(prev => new Map(prev.set(question.id, newState)));
  };

  // Navigation functions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (attempt?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
      setShowPalette(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (attempt?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Test Not Found</h2>
            <p className="text-muted-foreground mb-4">The test could not be loaded.</p>
            <Button onClick={() => navigate('/app')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const currentState = questionStates.get(currentQuestion.id);
  const answeredCount = Array.from(questionStates.values()).filter(state => state.answered).length;
  const flaggedCount = Array.from(questionStates.values()).filter(state => state.flagged).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {currentQuestionIndex + 1} / {attempt.questions.length}
              </span>
            </Button>
            
            <Badge variant="outline" className="hidden sm:flex">
              {currentQuestion.subject} • {currentQuestion.chapter}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              timeRemaining < 300 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
            }`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Question {currentQuestionIndex + 1}</Badge>
                  <Badge variant="outline">{currentQuestion.subject}</Badge>
                  {currentState?.flagged && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Flag className="h-3 w-3" />
                      Flagged
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg leading-relaxed">
                  <MathRenderer content={currentQuestion.stem} />
                </CardTitle>
              </div>
              
              <Button
                variant={currentState?.flagged ? "destructive" : "outline"}
                size="sm"
                onClick={toggleFlag}
                className="ml-4"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentState?.selectedIndex === index;
              const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                    }`}>
                      {optionLabel}
                    </div>
                    <span className="flex-1">
                      <MathRenderer content={option} isOption />
                    </span>
                    {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Test
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={nextQuestion}
            disabled={currentQuestionIndex === attempt.questions.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Question Palette Modal */}
      <Dialog open={showPalette} onOpenChange={setShowPalette}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Palette</DialogTitle>
            <DialogDescription>
              Navigate to any question. Green: Answered, Red: Flagged, Gray: Not attempted
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
            {attempt.questions.map((question, index) => {
              const state = questionStates.get(question.id);
              let bgClass = 'bg-muted hover:bg-muted/80';
              
              if (state?.answered && state?.flagged) {
                bgClass = 'bg-orange-100 border-orange-500 text-orange-700';
              } else if (state?.answered) {
                bgClass = 'bg-green-100 border-green-500 text-green-700';
              } else if (state?.flagged) {
                bgClass = 'bg-red-100 border-red-500 text-red-700';
              }
              
              return (
                <Button
                  key={index}
                  variant={index === currentQuestionIndex ? "default" : "outline"}
                  className={`h-12 w-12 ${bgClass}`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
              Answered ({answeredCount})
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div>
              Flagged ({flaggedCount})
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted border rounded"></div>
              Not Attempted ({attempt.questions.length - answeredCount})
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Summary Modal */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Submit Test?
            </DialogTitle>
            <DialogDescription>
              Once submitted, you cannot make any changes. Please review your answers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-medium">{attempt.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-medium text-green-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Flagged:</span>
                <span className="font-medium text-red-600">{flaggedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Not Attempted:</span>
                <span className="font-medium text-muted-foreground">
                  {attempt.questions.length - answeredCount}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Time Remaining:</span>
                <span className="font-medium">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              Continue Test
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-primary"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestPlayer;
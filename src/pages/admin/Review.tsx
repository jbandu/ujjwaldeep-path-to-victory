import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  SkipForward,
  Save,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';
import { Question } from '@/types/questions';

const Review: React.FC = () => {
  const { toast } = useToast();
  const session = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchMissingAnswerQuestions();
    
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case '1':
          setSelectedAnswer(0);
          break;
        case '2':
          setSelectedAnswer(1);
          break;
        case '3':
          setSelectedAnswer(2);
          break;
        case '4':
          setSelectedAnswer(3);
          break;
        case 'n':
        case 'N':
          handleNext();
          break;
        case 's':
        case 'S':
          handleSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, session]);

  const fetchMissingAnswerQuestions = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .eq('status', 'active')
        .is('correct_index', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setQuestions(data || []);
      if (data && data.length > 0) {
        setSelectedAnswer(data[0].correct_index);
        setSelectedDifficulty(data[0].difficulty || 3);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions for review",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || selectedAnswer === null) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('questions')
        .update({
          correct_index: selectedAnswer,
          difficulty: selectedDifficulty || currentQuestion.difficulty,
        })
        .eq('id', currentQuestion.id);

      if (error) throw error;

      // Update local state
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex] = {
        ...currentQuestion,
        correct_index: selectedAnswer,
        difficulty: selectedDifficulty || currentQuestion.difficulty,
      };
      setQuestions(updatedQuestions);

      toast({
        title: "Saved",
        description: "Answer saved successfully"
      });

      handleNext();
    } catch (error) {
      console.error('Error saving answer:', error);
      toast({
        title: "Error",
        description: "Failed to save answer",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedAnswer(questions[nextIndex].correct_index);
      setSelectedDifficulty(questions[nextIndex].difficulty || 3);
    } else {
      toast({
        title: "Complete",
        description: "You've reviewed all available questions!",
        variant: "default"
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setSelectedAnswer(questions[prevIndex].correct_index);
      setSelectedDifficulty(questions[prevIndex].difficulty || 3);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-admin-success mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">All Caught Up!</h2>
        <p className="text-muted-foreground">
          No questions need answer review at the moment.
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Review Missing Answers
          </h1>
          <p className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length} • {questions.length - currentIndex - 1} remaining
          </p>
        </div>
        <Badge className="bg-admin-accent text-admin-accent-foreground">
          Quick Review Mode
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Question */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Question #{currentQuestion.id}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{currentQuestion.subject}</Badge>
                  <Badge variant="outline">{currentQuestion.chapter}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">Question:</h3>
                <p className="text-sm leading-relaxed">{currentQuestion.stem}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Select the correct answer:</h4>
                <RadioGroup 
                  value={selectedAnswer?.toString() || ''} 
                  onValueChange={(value) => setSelectedAnswer(parseInt(value))}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} className="mt-1" />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium mr-3">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="border-t pt-4">
                <Label htmlFor="difficulty" className="text-sm font-medium mb-2 block">
                  Difficulty Level (Optional)
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      variant={selectedDifficulty === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDifficulty(level)}
                      className={selectedDifficulty === level ? "bg-admin-accent text-admin-accent-foreground" : ""}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Shortcuts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSave} 
                disabled={selectedAnswer === null || saving}
                className="w-full bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Next'}
              </Button>
              
              <Button 
                onClick={handleSkip} 
                variant="outline" 
                className="w-full"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Question
              </Button>

              <div className="flex gap-2">
                <Button 
                  onClick={handlePrevious} 
                  variant="outline" 
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleNext} 
                  variant="outline" 
                  disabled={currentIndex === questions.length - 1}
                  className="flex-1"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Select A, B, C, D:</span>
                <Badge variant="outline" className="font-mono">1, 2, 3, 4</Badge>
              </div>
              <div className="flex justify-between">
                <span>Save & Next:</span>
                <Badge variant="outline" className="font-mono">N</Badge>
              </div>
              <div className="flex justify-between">
                <span>Skip:</span>
                <Badge variant="outline" className="font-mono">S</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Review;
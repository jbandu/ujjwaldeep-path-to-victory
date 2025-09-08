// src/pages/app/Builder.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useDemoMode } from '@/hooks/useDemoMode'
import { supabase } from '@/integrations/supabase/client'
import {
  fetchSubjects,
  fetchChapters,
  getAvailableQuestionCount,
  type QuestionFilters,
} from '@/lib/data/questions'
import {
  BookOpen,
  Target,
  Clock,
  Settings,
  Play,
  CheckCircle,
  ArrowRight,
  Zap,
} from 'lucide-react'

interface TestConfig {
  subjects: string[]
  chapters: string[]
  difficulty: number[] // using slider [value], we’ll read value[0]
  questionCount: number
  duration: number // minutes in UI; will convert to seconds for API
}

const Builder: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { demoMode } = useDemoMode()

  const [isLoading, setIsLoading] = useState(false)
  const [testCreated, setTestCreated] = useState(false)
  const [createdTestId, setCreatedTestId] = useState<string>('')

  const [subjects, setSubjects] = useState<string[]>([])
  const [availableChapters, setAvailableChapters] = useState<string[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [availableCount, setAvailableCount] = useState<number | null>(null)

  const [config, setConfig] = useState<TestConfig>({
    subjects: [],
    chapters: [],
    difficulty: [3],
    questionCount: 25,
    duration: 60, // minutes
  })

  // Load subjects on mount or when demo mode changes
  useEffect(() => {
    loadSubjects()
  }, [demoMode])

  // Load chapters when subjects change
  useEffect(() => {
    if (config.subjects.length > 0) {
      loadChapters()
    } else {
      setAvailableChapters([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.subjects, demoMode])

  // Update available question count when filters change
  useEffect(() => {
    updateAvailableCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.subjects, config.chapters, config.difficulty, demoMode])

  async function ensureAuthed(): Promise<boolean> {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to create a test.',
        variant: 'destructive',
      })
      navigate('/auth?next=/app/builder', { replace: true })
      return false
    }
    return true
  }

  const loadSubjects = async () => {
    setLoadingSubjects(true)
    try {
      const subjectsList = await fetchSubjects()
      setSubjects(subjectsList)
    } catch (error) {
      console.error('Error loading subjects:', error)
      toast({
        title: 'Failed to load subjects',
        description: 'Please try refreshing the page.',
        variant: 'destructive',
      })
    } finally {
      setLoadingSubjects(false)
    }
  }

  const loadChapters = async () => {
    setLoadingChapters(true)
    try {
      const chaptersList = await fetchChapters(config.subjects)
      setAvailableChapters(chaptersList)
    } catch (error) {
      console.error('Error loading chapters:', error)
      toast({
        title: 'Failed to load chapters',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoadingChapters(false)
    }
  }

  const updateAvailableCount = async () => {
    if (config.subjects.length === 0) {
      setAvailableCount(null)
      return
    }
    try {
      const filters: Omit<QuestionFilters, 'limit'> = {
        subjects: config.subjects,
        chapters: config.chapters.length > 0 ? config.chapters : undefined,
        difficulty: [config.difficulty[0], config.difficulty[0]],
      }
      const count = await getAvailableQuestionCount(filters)
      setAvailableCount(count)
    } catch (error) {
      console.error('Error getting question count:', error)
      setAvailableCount(null)
    }
  }

  const handleSubjectChange = (subject: string, checked: boolean) => {
    setConfig((prev) => {
      const nextSubjects = checked
        ? [...prev.subjects, subject]
        : prev.subjects.filter((s) => s !== subject)

      // If deselecting subjects, drop chapters that no longer exist
      const nextChapters = prev.chapters.filter((ch) => availableChapters.includes(ch))

      return {
        ...prev,
        subjects: nextSubjects,
        chapters: checked ? prev.chapters : nextChapters,
      }
    })
  }

  const handleChapterChange = (chapter: string) => {
    setConfig((prev) => ({
      ...prev,
      chapters: prev.chapters.includes(chapter)
        ? prev.chapters.filter((c) => c !== chapter)
        : [...prev.chapters, chapter],
    }))
  }

  const createTest = async () => {
    if (config.subjects.length === 0) {
      toast({
        title: 'Select Subjects',
        description: 'Please select at least one subject to continue.',
        variant: 'destructive',
      })
      return
    }

    if (!(await ensureAuthed())) return

    setIsLoading(true)
    try {
      // Build payload expected by the Edge Function
      const payload = {
        mode: 'custom' as const, // or 'chapter' | 'difficulty_mix' | 'pyp'
        duration_sec: Math.max(1, config.duration) * 60, // convert minutes → seconds
        visibility: 'private' as const,
        config: {
          subjects: config.subjects,
          chapters: config.chapters,
          difficulty: config.difficulty[0],
          questionCount: config.questionCount,
        },
        // Optional: if your scoring uses +4 for each correct
        // total_marks: config.questionCount * 4,
      }

const { data, error } = await supabase.functions.invoke('create-test', {
  body: {
    mode: 'custom',
    duration_sec: (config.duration ?? 60) * 60,
    visibility: 'private',
    total_marks: 720,
    config: {
      subjects: config.subjects,
      chapters: config.chapters,
      difficulty: config.difficulty,
      questionCount: config.questionCount,
    },
  },
})


      if (error) throw error

      // Tolerate a few possible server shapes
      const newId: string | undefined =
        data?.test?.id ?? data?.id ?? data?.test_id ?? data?.testId

      if (!newId) {
        throw new Error('No test id returned by create-test')
      }

      setCreatedTestId(newId)
      setTestCreated(true)

      toast({
        title: 'Test Created Successfully! 🎉',
        description: `Your custom test with ${config.questionCount} questions is ready.`,
      })
    } catch (error: any) {
      console.error('Test creation error:', error)
      toast({
        title: 'Creation Failed',
        description: error?.message || 'Failed to create test. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startTest = async () => {
    if (!(await ensureAuthed())) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('start-attempt', {
        body: { testId: createdTestId },
      })
      if (error) throw error

      const attemptId: string | undefined = data?.attempt?.id ?? data?.id ?? data?.attempt_id
      if (!attemptId) throw new Error('No attempt id returned by start-attempt')

      navigate(`/app/test/${attemptId}`)
    } catch (error: any) {
      console.error('Start attempt error:', error)
      toast({
        title: 'Failed to Start',
        description: error?.message || 'Could not start the test. Please try again.',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTestCreated(false)
    setCreatedTestId('')
    setConfig({
      subjects: [],
      chapters: [],
      difficulty: [3],
      questionCount: 25,
      duration: 60,
    })
  }

  if (testCreated) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <Card className="max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-bounce-in">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Test Ready! 🚀</h2>
              <p className="text-muted-foreground">
                Your custom test has been created with {config.questionCount} questions from{' '}
                {config.subjects.join(', ')} for {config.duration} minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={startTest}
                disabled={isLoading}
                className="flex-1 bg-gradient-primary hover:shadow-warm transition-all duration-300"
              >
                {isLoading ? 'Starting...' : 'Start Test Now'}
                <Play className="w-4 h-4 ml-2" />
              </Button>

              <Button
                onClick={() => navigate(`/app/tests/${createdTestId}/print`)}
                variant="outline"
                className="flex-1"
              >
                Print Mode
                <BookOpen className="w-4 h-4 ml-2" />
              </Button>

              <Button onClick={resetForm} variant="outline" className="flex-1">
                Create Another
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Test Builder ⚡</h1>
        <p className="text-muted-foreground">Create a personalized test tailored to your study needs</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-primary/20 shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Customize Your Test</CardTitle>
            <CardDescription>Select subjects, difficulty, and duration for your practice session</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Subjects Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Subjects *
              </Label>
              {loadingSubjects ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {subjects.map((subject) => (
                    <div
                      key={subject}
                      className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={subject}
                        checked={config.subjects.includes(subject)}
                        onCheckedChange={(checked) => handleSubjectChange(subject, !!checked)}
                      />
                      <Label htmlFor={subject} className="text-sm font-medium cursor-pointer flex-1">
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chapters Selection */}
            {config.subjects.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Chapters (Optional)</Label>
                {loadingChapters ? (
                  <Skeleton className="h-32 w-full" />
                ) : availableChapters.length > 0 ? (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableChapters.map((chapter) => (
                        <div
                          key={chapter}
                          className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded transition-colors"
                        >
                          <Checkbox
                            id={chapter}
                            checked={config.chapters.includes(chapter)}
                            onCheckedChange={() => handleChapterChange(chapter)}
                          />
                          <Label htmlFor={chapter} className="text-sm cursor-pointer flex-1">
                            {chapter}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No chapters found for the selected subjects.</p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Difficulty Slider */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Difficulty Level
              </Label>
              <div className="space-y-3">
                <Slider
                  value={config.difficulty}
                  onValueChange={(value) => setConfig((prev) => ({ ...prev, difficulty: value }))}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Easy</span>
                  <span className="font-medium text-primary">Level {config.difficulty[0]}</span>
                  <span>Expert</span>
                </div>
              </div>
            </div>

            {/* Question Count */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Number of Questions</Label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50].map((count) => (
                  <Button
                    key={count}
                    variant={config.questionCount === count ? 'default' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, questionCount: count }))}
                    className="w-full"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Duration
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((duration) => (
                  <Button
                    key={duration}
                    variant={config.duration === duration ? 'default' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, duration }))}
                    className="w-full"
                  >
                    {duration}m
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Test Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Test Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{config.subjects.length || 0} subjects</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{config.questionCount} questions</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{config.duration} minutes</Badge>
                </div>
              </div>

              {/* Available Questions Count */}
              {availableCount !== null && config.subjects.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {availableCount} questions available with current filters
                    {availableCount < config.questionCount && (
                      <span className="text-amber-600 dark:text-amber-400"> (fewer than requested)</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Create Button */}
            <Button
              onClick={createTest}
              disabled={isLoading || config.subjects.length === 0}
              className="w-full bg-gradient-primary hover:shadow-warm transition-all duration-300 disabled:opacity-50"
              size="lg"
            >
              {isLoading ? 'Creating Test...' : 'Create Test'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Builder

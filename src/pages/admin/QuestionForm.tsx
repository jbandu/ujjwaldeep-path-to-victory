import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Copy, 
  Eye,
  X,
  Plus,
  Shuffle,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Question } from '@/types/questions';

interface QuestionFormData {
  subject: string;
  chapter: string;
  topic: string;
  stem: string;
  options: string[];
  correct_index: number | null;
  explanation: string;
  difficulty: number;
  language: string;
  source: string;
  status: string;
  tags: string[];
}

const QuestionForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjects] = useState(['Physics', 'Chemistry', 'Biology']);
  const [chapters, setChapters] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [formData, setFormData] = useState<QuestionFormData>({
    subject: '',
    chapter: '',
    topic: '',
    stem: '',
    options: ['', '', '', ''],
    correct_index: null,
    explanation: '',
    difficulty: 3,
    language: 'English',
    source: 'Original',
    status: 'active',
    tags: [],
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchQuestion();
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (formData.subject) {
      fetchChapters();
    }
  }, [formData.subject]);

  const fetchQuestion = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        subject: data.subject || '',
        chapter: data.chapter || '',
        topic: data.topic || '',
        stem: data.stem || '',
        options: Array.isArray(data.options) ? data.options : ['', '', '', ''],
        correct_index: data.correct_index,
        explanation: data.explanation?.text || '',
        difficulty: data.difficulty || 3,
        language: data.language || 'English',
        source: data.source || 'Original',
        status: data.status || 'active',
        tags: data.tags || [],
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      toast({
        title: "Error",
        description: "Failed to load question",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data } = await (supabase as any).rpc('get_distinct_chapters', {
        subjects: [formData.subject]
      });
      setChapters(data?.map((row: any) => row.chapter) || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const handleSave = async (action: 'save' | 'save_new' | 'save_view') => {
    if (!formData.stem.trim()) {
      toast({
        title: "Validation Error",
        description: "Question stem is required",
        variant: "destructive"
      });
      return;
    }

    if (formData.options.some(opt => !opt.trim())) {
      toast({
        title: "Validation Error", 
        description: "All options must be filled",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const questionData = {
        subject: formData.subject,
        chapter: formData.chapter || 'Other',
        topic: formData.topic || null,
        stem: formData.stem.trim(),
        options: formData.options,
        correct_index: formData.correct_index,
        explanation: formData.explanation ? { text: formData.explanation } : null,
        difficulty: formData.difficulty,
        language: formData.language,
        source: formData.source,
        status: formData.status,
        tags: formData.tags,
      };

      if (isEdit) {
        const { error } = await (supabase as any)
          .from('questions')
          .update(questionData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Question updated successfully"
        });
      } else {
        const { data, error } = await (supabase as any)
          .from('questions')
          .insert([{ ...questionData, created_by: (await supabase.auth.getUser()).data.user?.id }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success", 
          description: "Question created successfully"
        });

        if (action === 'save_view') {
          navigate(`/admin/questions/${data.id}`);
          return;
        } else if (action === 'save_new') {
          // Reset form for new question
          setFormData({
            ...formData,
            stem: '',
            options: ['', '', '', ''],
            correct_index: null,
            explanation: '',
            topic: '',
            tags: [],
          });
          return;
        }
      }

      if (action === 'save') {
        navigate('/admin/questions');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const shuffleOptions = () => {
    const shuffled = [...formData.options];
    const correctAnswer = formData.correct_index !== null ? shuffled[formData.correct_index] : null;
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Update correct index to match new position
    const newCorrectIndex = correctAnswer ? shuffled.indexOf(correctAnswer) : null;
    
    setFormData({
      ...formData,
      options: shuffled,
      correct_index: newCorrectIndex
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/questions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Questions
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {isEdit ? 'Edit Question' : 'Create Question'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? `Editing question #${id}` : 'Add a new NEET question'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={shuffleOptions}>
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle Options
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value, chapter: ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="chapter">Chapter *</Label>
                  <Select value={formData.chapter} onValueChange={(value) => setFormData({...formData, chapter: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map(chapter => (
                        <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  placeholder="Specific topic within chapter"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Question Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stem">Question Stem *</Label>
                <Textarea
                  id="stem"
                  value={formData.stem}
                  onChange={(e) => setFormData({...formData, stem: e.target.value})}
                  placeholder="Enter the question statement..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Options *</Label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = e.target.value;
                          setFormData({...formData, options: newOptions});
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Correct Answer</Label>
                <RadioGroup 
                  value={formData.correct_index?.toString() || ''} 
                  onValueChange={(value) => setFormData({...formData, correct_index: value ? parseInt(value) : null})}
                  className="flex gap-4 mt-2"
                >
                  {formData.options.map((_, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        {String.fromCharCode(65 + index)}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="" id="unknown" />
                    <Label htmlFor="unknown" className="cursor-pointer text-muted-foreground">
                      Unknown
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  placeholder="Explain why this answer is correct..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={formData.difficulty.toString()} onValueChange={(value) => setFormData({...formData, difficulty: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Easy</SelectItem>
                      <SelectItem value="2">2 - Medium</SelectItem>
                      <SelectItem value="3">3 - Normal</SelectItem>
                      <SelectItem value="4">4 - Hard</SelectItem>
                      <SelectItem value="5">5 - Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    placeholder="Question source"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            {isEdit ? (
              <>
                <Button 
                  onClick={() => handleSave('save')} 
                  disabled={saving}
                  className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => handleSave('save_view')} disabled={saving}>
                  <Copy className="h-4 w-4 mr-2" />
                  Save as Copy
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => handleSave('save')} 
                  disabled={saving}
                  className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => handleSave('save_new')} disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Save & New
                </Button>
                <Button variant="outline" onClick={() => handleSave('save_view')} disabled={saving}>
                  <Eye className="h-4 w-4 mr-2" />
                  Save & View
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {formData.stem ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium mb-2">Question:</h3>
                    <p className="text-sm">{formData.stem}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Options:</h4>
                    {formData.options.map((option, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center gap-2 p-2 rounded border ${
                          formData.correct_index === index 
                            ? 'border-admin-success bg-admin-success/10' 
                            : 'border-border'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-sm">{option || `Option ${String.fromCharCode(65 + index)}`}</span>
                        {formData.correct_index === index && (
                          <Badge className="ml-auto bg-admin-success text-white text-xs">Correct</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {formData.explanation && (
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <h4 className="font-medium mb-1 text-blue-900">Explanation:</h4>
                      <p className="text-sm text-blue-800">{formData.explanation}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {formData.subject && <Badge variant="outline">{formData.subject}</Badge>}
                    {formData.chapter && <Badge variant="outline">{formData.chapter}</Badge>}
                    {formData.topic && <Badge variant="outline">{formData.topic}</Badge>}
                    <Badge variant="outline">Difficulty: {formData.difficulty}</Badge>
                    <Badge variant="outline">{formData.language}</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Eye className="h-8 w-8 mx-auto mb-2" />
                  <p>Question preview will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;
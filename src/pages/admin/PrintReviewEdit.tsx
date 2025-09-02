import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getPrintUpload, updatePrintUpload } from '@/lib/data/print';
import { getTest } from '@/lib/data/tests';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';

const PrintReviewEdit = () => {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [upload, setUpload] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (uploadId) {
      loadData();
    }
  }, [uploadId]);

  const loadData = async () => {
    try {
      const uploadData = await getPrintUpload(uploadId!);
      if (!uploadData) {
        toast({
          title: "Error",
          description: "Upload not found",
          variant: "destructive"
        });
        navigate('/admin/print/review');
        return;
      }

      const testData = await getTest(uploadData.test_id);
      setUpload(uploadData);
      setTest(testData);

      // Initialize answers from detected data
      if (uploadData.detected?.answers) {
        const answerMap: {[key: number]: number} = {};
        uploadData.detected.answers.forEach((ans: any) => {
          answerMap[ans.q] = ans.sel;
        });
        setAnswers(answerMap);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load upload data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionNumber: number, selectedIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionNumber]: selectedIndex
    }));
  };

  const saveAndGrade = async () => {
    if (!upload || !test) return;

    setSaving(true);
    try {
      // Convert answers to the expected format
      const formattedAnswers = Object.entries(answers).map(([q, sel]) => ({
        q: parseInt(q),
        sel: sel,
        conf: 1.0 // Manual correction = high confidence
      }));

      // Update the upload with corrected answers
      await updatePrintUpload(upload.id, {
        detected: {
          answers: formattedAnswers,
          warnings: [],
          pages: upload.detected?.pages || 1
        },
        status: 'processing' // Will be processed again with corrected data
      });

      // Trigger reprocessing
      const { error } = await supabase.functions.invoke('process-print-omr', {
        body: { upload_id: upload.id, force_reprocess: true }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Corrections saved and reprocessing started",
      });

      navigate('/admin/print/review');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save corrections",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!upload || !test) {
    return <div className="text-center p-8">Upload or test not found</div>;
  }

  const questions = test.config?.questions || [];
  const totalQuestions = questions.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/print/review')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Upload #{upload.id.slice(-8)}</h1>
            <p className="text-muted-foreground">Manually correct OMR detection results</p>
          </div>
        </div>
        <Button onClick={saveAndGrade} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : 'Save & Grade'}
        </Button>
      </div>

      {/* Upload Info */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span><br/>
            <Badge variant="secondary">{upload.status.replace('_', ' ')}</Badge>
          </div>
          <div>
            <span className="font-medium">Total Questions:</span><br/>
            <span className="text-muted-foreground">{totalQuestions}</span>
          </div>
          <div>
            <span className="font-medium">Detected Answers:</span><br/>
            <span className="text-muted-foreground">{Object.keys(answers).length}</span>
          </div>
          <div>
            <span className="font-medium">Uploaded:</span><br/>
            <span className="text-muted-foreground">
              {new Date(upload.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {upload.detected?.warnings?.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Detection Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {upload.detected.warnings.map((warning: string, index: number) => (
                <li key={index} className="text-sm text-orange-600">• {warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Answer Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Answer Corrections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((questionNum) => (
              <div key={questionNum} className="space-y-2">
                <Label className="font-medium">Question {questionNum}</Label>
                <RadioGroup
                  value={answers[questionNum]?.toString() || ''}
                  onValueChange={(value) => handleAnswerChange(questionNum, parseInt(value))}
                >
                  <div className="flex gap-4">
                    {['A', 'B', 'C', 'D'].map((option, index) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={index.toString()} id={`q${questionNum}-${option}`} />
                        <Label htmlFor={`q${questionNum}-${option}`}>{option}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {answers[questionNum] === undefined && (
                  <p className="text-xs text-orange-600">No answer detected</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/admin/print/review')}>
          Cancel
        </Button>
        <Button onClick={saveAndGrade} disabled={saving}>
          {saving ? 'Processing...' : 'Save Corrections & Grade'}
        </Button>
      </div>
    </div>
  );
};

export default PrintReviewEdit;
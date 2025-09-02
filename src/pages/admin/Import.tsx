import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

const Import: React.FC = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    subjectBreakdown: {} as Record<string, number>,
    missingFields: [] as string[],
  });

  const steps: ImportStep[] = [
    {
      id: 1,
      title: 'Upload CSV',
      description: 'Upload your CSV file with question data',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending',
    },
    {
      id: 2,
      title: 'Data Check',
      description: 'Review data validation and statistics',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
    },
    {
      id: 3,
      title: 'Transform & Import',
      description: 'Transform data and import to database',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending',
    },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;

    setUploading(true);
    try {
      // Simulate upload to staging_questions table
      // In real implementation, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock statistics
      setImportStats({
        totalRows: 150,
        validRows: 145,
        invalidRows: 5,
        subjectBreakdown: {
          Physics: 50,
          Chemistry: 45,
          Biology: 50,
        },
        missingFields: ['correct_index', 'explanation'],
      });

      setCurrentStep(2);
      toast({
        title: "Upload Successful",
        description: "CSV file uploaded to staging area"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload CSV file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleTransform = async () => {
    try {
      // Simulate transformation and import
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setCurrentStep(3);
      toast({
        title: "Import Successful",
        description: "Questions imported successfully to database"
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import questions",
        variant: "destructive"
      });
    }
  };

  const getStepIcon = (step: ImportStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-admin-success" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'active':
        return <div className="h-5 w-5 rounded-full border-2 border-admin-accent bg-admin-accent/20" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Bulk Import Questions
        </h1>
        <p className="text-muted-foreground">
          Import NEET questions from CSV files in three simple steps
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  {getStepIcon(step)}
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step.status === 'completed' ? 'bg-admin-success' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 border-2 border-dashed border-muted rounded-lg">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload your CSV file</h3>
                <p className="text-muted-foreground mb-4">
                  File should contain columns: subject, chapter, topic, stem, optionA-D, correctIndex, explanationText, difficulty, tags, language, source, status
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="max-w-xs"
                  />
                  {csvFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Subject: Physics, Chemistry, or Biology</li>
                <li>• Chapter: Chapter name (will default to 'Other' if empty)</li>
                <li>• OptionA-D: Four options for the question</li>
                <li>• CorrectIndex: 0-3 for A-D, or leave empty for unknown</li>
                <li>• Difficulty: 1-5 scale</li>
                <li>• Tags: Comma-separated list</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleUpload} 
                disabled={!csvFile || uploading}
                className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload to Staging
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Data Check */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Data Validation Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{importStats.totalRows}</div>
                  <div className="text-sm text-blue-600">Total Rows</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{importStats.validRows}</div>
                  <div className="text-sm text-green-600">Valid Rows</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{importStats.invalidRows}</div>
                  <div className="text-sm text-red-600">Invalid Rows</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Subject Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(importStats.subjectBreakdown).map(([subject, count]) => (
                      <div key={subject} className="flex justify-between items-center">
                        <Badge variant="outline">{subject}</Badge>
                        <span className="text-sm font-medium">{count} questions</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Common Issues</h4>
                  <div className="space-y-2">
                    {importStats.missingFields.map((field) => (
                      <div key={field} className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>Missing {field} in some questions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Preview CSV
              </Button>
            </div>
            <Button 
              onClick={handleTransform}
              className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground"
            >
              Transform & Import
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-admin-success mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Import Completed Successfully!</h3>
            <p className="text-muted-foreground mb-6">
              {importStats.validRows} questions have been imported to the database.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild variant="outline">
                <a href="/admin/questions?sort=created_at:desc">
                  <Eye className="h-4 w-4 mr-2" />
                  View Imported Questions
                </a>
              </Button>
              <Button 
                onClick={() => {
                  setCurrentStep(1);
                  setCsvFile(null);
                  setImportStats({
                    totalRows: 0,
                    validRows: 0,
                    invalidRows: 0,
                    subjectBreakdown: {},
                    missingFields: [],
                  });
                }}
                className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import More Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Import;
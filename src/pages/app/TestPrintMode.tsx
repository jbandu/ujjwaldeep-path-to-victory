import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getPrintPackage } from '@/lib/data/print';
import { getTest } from '@/lib/data/tests';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, FileText, Clock } from 'lucide-react';

const TestPrintMode = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [test, setTest] = useState<any>(null);
  const [printPackage, setPrintPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (testId) {
      loadData();
    }
  }, [testId]);

  const loadData = async () => {
    try {
      const [testData, packageData] = await Promise.all([
        getTest(testId!),
        getPrintPackage(testId!)
      ]);
      
      setTest(testData);
      setPrintPackage(packageData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDFs = async () => {
    if (!testId) return;
    
    // Check if test has questions before attempting generation
    const questionCount = test.config?.questions?.length || 0;
    if (questionCount === 0) {
      toast({
        title: "Cannot Generate PDFs",
        description: "This test has no questions configured. Please add questions first.",
        variant: "destructive"
      });
      return;
    }
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-print-pdfs', {
        body: { test_id: testId }
      });

      if (error) throw error;

      setPrintPackage(data);
      toast({
        title: "Success",
        description: "Print PDFs generated successfully"
      });
    } catch (error: any) {
      const errorMessage = error?.message?.includes('no questions') 
        ? "This test has no questions configured. Please add questions first."
        : "Failed to generate PDFs";
        
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async (type: 'paper' | 'omr') => {
    if (!printPackage) return;

    try {
      const filePath = type === 'paper' ? printPackage.paper_pdf_url : printPackage.omr_pdf_url;
      
      // Get signed URL from Supabase storage
      const { data, error } = await supabase.storage
        .from('print-artifacts')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Storage error:', error);
        throw error;
      }
      
      // Download the file using fetch to handle CORS properly
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type === 'paper' ? 'question-paper' : 'omr-sheet'}-${testId?.slice(-8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download Started",
        description: `${type === 'paper' ? 'Question paper' : 'OMR sheet'} download started`
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!test) {
    return <div className="text-center p-8">Test not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Print Mode</h1>
          <p className="text-muted-foreground">Generate PDFs for offline testing</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app')}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Test Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Duration: {Math.floor(test.duration_sec / 60)} minutes</span>
          </div>
          <div>Questions: {test.config?.questions?.length || 0}</div>
          <div>Mode: {test.mode}</div>
        </CardContent>
      </Card>

      {!printPackage ? (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-4">No Print Package Available</h3>
            {(test.config?.questions?.length || 0) === 0 ? (
              <div className="space-y-4">
                <p className="text-destructive mb-4">
                  ⚠️ This test has no questions configured. Please add questions before generating PDFs.
                </p>
                <Button 
                  disabled
                  className="w-full max-w-sm"
                  variant="outline"
                >
                  Cannot Generate PDFs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-6">
                  Generate PDF files for this test to enable offline testing
                </p>
                <Button 
                  onClick={generatePDFs} 
                  disabled={generating}
                  className="w-full max-w-sm"
                >
                  {generating ? 'Generating...' : 'Generate Print PDFs'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Question Paper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                NEET-style question paper with QR code for identification
              </p>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => downloadPDF('paper')}
              >
                Download Question Paper (PDF)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                OMR Answer Sheet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bubble sheet for marking answers with scanning capabilities
              </p>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => downloadPDF('omr')}
              >
                Download OMR Sheet (PDF)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {printPackage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Completed OMR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              After completing the test, upload photos or scans of the filled OMR sheet for automatic grading
            </p>
            <Button 
              onClick={() => navigate(`/app/tests/${testId}/upload-print`)}
              className="w-full"
            >
              Upload OMR Sheet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestPrintMode;
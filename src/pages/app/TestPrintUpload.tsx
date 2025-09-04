import React, { useState, useCallback } from 'react';
import PaywallModal from '@/components/PaywallModal';
import { usePremium } from '@/hooks/usePremium';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const TestPrintUpload = () => {
  const { isPremium, loading: premiumLoading, refetch: refetchPremium } = usePremium();
  if (!premiumLoading && !isPremium) {
    return (
      <PaywallModal 
        open 
        onClose={() => {
          refetchPremium();
        }}
      />
    );
  }

  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const uploadFiles = async () => {
    if (!files.length || !testId) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('test_id', testId);
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('upload-print-omr', {
        body: formData,
      });

      if (response.error) throw response.error;

      const { upload_id } = response.data;
      setUploadId(upload_id);
      setUploadStatus('processing');
      setUploadProgress(100);

      toast({
        title: "Upload Successful",
        description: "Your OMR sheet is being processed. This may take a few moments.",
      });

      // Poll for processing status
      pollProcessingStatus(upload_id);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  const pollProcessingStatus = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('print_uploads')
        .select('status, error, attempt_id')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data.status === 'graded' && data.attempt_id) {
        setUploadStatus('completed');
        toast({
          title: "Processing Complete",
          description: "Your test has been graded! Redirecting to results...",
        });
        setTimeout(() => {
          navigate(`/app/results/${data.attempt_id}`);
        }, 2000);
      } else if (data.status === 'error') {
        setUploadStatus('error');
        toast({
          title: "Processing Failed",
          description: data.error || "Failed to process OMR sheet",
          variant: "destructive",
        });
      } else if (data.status === 'needs_review') {
        setUploadStatus('completed');
        toast({
          title: "Manual Review Required",
          description: "Your submission needs manual review. You'll be notified when complete.",
        });
      } else {
        // Still processing, poll again
        setTimeout(() => pollProcessingStatus(id), 3000);
      }
    } catch (error) {
      console.error('Status polling failed:', error);
      setUploadStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return <Clock className="h-6 w-6 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-destructive" />;
      default:
        return <Upload className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading files...';
      case 'processing':
        return 'Processing OMR sheet with AI...';
      case 'completed':
        return 'Complete! Redirecting to results...';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return 'Upload your completed OMR sheet';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upload OMR Sheet</h1>
          <p className="text-muted-foreground">Upload your completed answer sheet for automatic grading</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/app/tests/${testId}/print`)}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Upload Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Supported Formats</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• PDF files (scanned documents)</li>
              <li>• JPEG/PNG images (photos of answer sheets)</li>
              <li>• Multiple pages/files supported</li>
              <li>• Maximum 10MB per file</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Photo Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure good lighting and avoid shadows</li>
              <li>• Keep the sheet flat and straight</li>
              <li>• Make sure all bubbles are clearly visible</li>
              <li>• Include the QR code in the photo</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {uploadStatus === 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg">Drop files here...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg">Drag & drop your OMR files here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Selected Files ({files.length})</h4>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
                <Button onClick={uploadFiles} className="w-full mt-4">
                  Upload and Process
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadStatus !== 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {getStatusIcon()}
              <div>
                <h3 className="font-medium">{getStatusMessage()}</h3>
                {uploadStatus === 'processing' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    This usually takes 30-60 seconds
                  </p>
                )}
              </div>
              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <Progress value={uploadProgress} className="w-full" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestPrintUpload;
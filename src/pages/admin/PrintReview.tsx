import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getPrintUploads, updatePrintUpload } from '@/lib/data/print';
import { FileText, Eye, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrintReview = () => {
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('needs_review');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUploads();
  }, [filter]);

  const loadUploads = async () => {
    try {
      const data = await getPrintUploads(undefined, undefined, filter || undefined);
      setUploads(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load print uploads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
      case 'processing':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'graded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'needs_review':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'graded':
        return 'default';
      case 'needs_review':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatUploadUrls = (urls: any) => {
    if (Array.isArray(urls)) return urls.length;
    if (typeof urls === 'object' && urls !== null) return Object.keys(urls).length;
    return 0;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Print Upload Review</h1>
          <p className="text-muted-foreground">Review and process OMR uploads</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {['needs_review', 'error', 'processing', 'graded', ''].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status || 'All'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Uploads List */}
      <div className="space-y-4">
        {uploads.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No uploads found</h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'needs_review' 
                  ? 'No uploads require manual review at this time.' 
                  : 'No uploads match the current filter.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          uploads.map((upload) => (
            <Card key={upload.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(upload.status)}
                    Upload #{upload.id.slice(-8)}
                  </CardTitle>
                  <Badge variant={getStatusVariant(upload.status)}>
                    {upload.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Test ID:</span><br/>
                    <span className="text-muted-foreground">{upload.test_id.slice(-8)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Files:</span><br/>
                    <span className="text-muted-foreground">{formatUploadUrls(upload.upload_urls)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Uploaded:</span><br/>
                    <span className="text-muted-foreground">
                      {new Date(upload.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">User:</span><br/>
                    <span className="text-muted-foreground">{upload.user_id.slice(-8)}</span>
                  </div>
                </div>

                {upload.detected && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Detection Results</h4>
                    <div className="text-sm space-y-1">
                      <div>Answers detected: {upload.detected.answers?.length || 0}</div>
                      {upload.detected.warnings?.length > 0 && (
                        <div className="text-orange-600">
                          Warnings: {upload.detected.warnings.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {upload.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <span className="font-medium text-destructive">Error:</span>
                    <p className="text-sm text-destructive mt-1">{upload.error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {upload.status === 'needs_review' && (
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/admin/print/review/${upload.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review & Edit
                    </Button>
                  )}
                  {upload.attempt_id && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/results/${upload.attempt_id}`)}
                    >
                      View Results
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PrintReview;
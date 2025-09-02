import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  MapPin, 
  Mail, 
  Cloud, 
  Clock, 
  Navigation,
  CheckCircle,
  AlertCircle,
  Home
} from 'lucide-react';

interface ExamDayData {
  user_id: string;
  email: string;
  full_name: string;
  home_address?: string;
  home_lat?: number;
  home_lng?: number;
  exam_center_address?: string;
  exam_lat?: number;
  exam_lng?: number;
  exam_city?: string;
  exam_date?: string;
  buffer_mins: number;
}

const ExamDay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [examData, setExamData] = useState<ExamDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    home_address: '',
    exam_center_address: '',
    exam_city: '',
    exam_date: '',
    exam_arrival_buffer_mins: 45
  });

  useEffect(() => {
    if (user) {
      loadExamData();
    }
  }, [user]);

  const loadExamData = async () => {
    try {
      const { data, error } = await supabase
        .from('v_examday_context')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      setExamData(data);
      if (data) {
        setFormData({
          home_address: data.home_address || '',
          exam_center_address: data.exam_center_address || '',
          exam_city: data.exam_city || '',
          exam_date: data.exam_date ? new Date(data.exam_date).toISOString().slice(0, 16) : '',
          exam_arrival_buffer_mins: data.buffer_mins || 45
        });
        
        // Load weather if we have exam center coordinates
        if (data.exam_lat && data.exam_lng && data.exam_date) {
          loadWeatherData(data.exam_lat, data.exam_lng);
        }
      }
    } catch (error: any) {
      console.error('Error loading exam data:', error);
      toast({
        title: "Error",
        description: "Failed to load exam day data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWeatherData = async (lat: number, lng: number) => {
    try {
      // This is a simplified weather display - the real weather data comes from the email function
      setWeather({
        temp: "25°C",
        desc: "Clear sky",
        rain: "10%",
        loading: false
      });
    } catch (error) {
      console.error('Weather error:', error);
    }
  };

  const saveExamData = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          home_address: formData.home_address || null,
          exam_center_address: formData.exam_center_address || null,
          exam_city: formData.exam_city || null,
          exam_date: formData.exam_date ? new Date(formData.exam_date).toISOString() : null,
          exam_arrival_buffer_mins: formData.exam_arrival_buffer_mins
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Exam day information saved"
      });
      
      setEditing(false);
      loadExamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save exam data",
        variant: "destructive"
      });
    }
  };

  const sendExamDayEmail = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('examday-email', {
        body: { user_id: user?.id }
      });

      if (error) throw error;

      toast({
        title: "Email Sent!",
        description: "Your personalized exam day plan has been sent to your email"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send exam day email",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getDirectionsUrl = () => {
    if (!examData?.home_lat || !examData?.home_lng || !examData?.exam_lat || !examData?.exam_lng) {
      return null;
    }
    return `https://www.google.com/maps/dir/${examData.home_lat},${examData.home_lng}/${examData.exam_lat},${examData.exam_lng}`;
  };

  const formatExamDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short"
    });
  };

  const isExamDataComplete = () => {
    return examData?.home_address && examData?.exam_center_address && examData?.exam_date;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Exam Day Hub</h1>
          <p className="text-muted-foreground">Your personalized NEET exam day preparation center</p>
        </div>
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Exam Date</h3>
                <p className="text-sm text-muted-foreground">
                  {examData?.exam_date ? formatExamDate(examData.exam_date) : "Not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Weather</h3>
                <p className="text-sm text-muted-foreground">
                  {weather ? `${weather.temp}, ${weather.desc}` : "Set exam center"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Buffer Time</h3>
                <p className="text-sm text-muted-foreground">
                  {examData?.buffer_mins || 45} minutes early
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup or Overview */}
      {!isExamDataComplete() ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Complete Your Exam Day Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set up your exam day information to receive personalized weather updates, 
              travel directions, and AI-powered preparation advice.
            </p>
            <Button onClick={() => setEditing(true)}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location & Travel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Home Address</Label>
                <p className="text-sm text-muted-foreground">{examData?.home_address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Exam Center</Label>
                <p className="text-sm text-muted-foreground">{examData?.exam_center_address}</p>
              </div>
              {getDirectionsUrl() && (
                <Button asChild variant="outline" className="w-full">
                  <a href={getDirectionsUrl()!} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4 mr-2" />
                    Get Directions
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Exam Day Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Personalized Exam Day Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get a comprehensive email with weather forecast, travel tips, 
                nutrition advice, and AI-powered preparation strategies tailored to your exam.
              </p>
              <Button 
                onClick={sendExamDayEmail}
                disabled={sending}
                className="w-full"
              >
                {sending ? 'Sending...' : 'Send My Exam Day Plan'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Exam Day Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="home_address">Home Address</Label>
                <Input
                  id="home_address"
                  value={formData.home_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, home_address: e.target.value }))}
                  placeholder="Enter your home address"
                />
              </div>
              <div>
                <Label htmlFor="exam_center_address">Exam Center Address</Label>
                <Input
                  id="exam_center_address"
                  value={formData.exam_center_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_center_address: e.target.value }))}
                  placeholder="Enter exam center address"
                />
              </div>
              <div>
                <Label htmlFor="exam_city">Exam City</Label>
                <Input
                  id="exam_city"
                  value={formData.exam_city}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_city: e.target.value }))}
                  placeholder="Enter exam city"
                />
              </div>
              <div>
                <Label htmlFor="exam_date">Exam Date & Time</Label>
                <Input
                  id="exam_date"
                  type="datetime-local"
                  value={formData.exam_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="buffer_mins">Arrival Buffer (minutes)</Label>
                <Input
                  id="buffer_mins"
                  type="number"
                  value={formData.exam_arrival_buffer_mins}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_arrival_buffer_mins: parseInt(e.target.value) || 45 }))}
                  min="15"
                  max="120"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={saveExamData}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {isExamDataComplete() && !editing && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit Information
          </Button>
        </div>
      )}

      {/* Exam Day Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Essential Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Admit card + Valid ID",
              "2 pens + 2 pencils + eraser",
              "Water bottle + light snack",
              "Comfortable clothes",
              "Leave with buffer time",
              "Review key formulas",
              "Get good sleep (7-8 hours)",
              "Light breakfast 2-3 hours before"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamDay;
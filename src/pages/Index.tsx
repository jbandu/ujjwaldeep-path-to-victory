import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HeroSection from '@/components/HeroSection';
import FeatureSection from '@/components/FeatureSection';
import GameficationSection from '@/components/GameficationSection';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Bug } from 'lucide-react';

const Index: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to app
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Debug Panel for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border-b border-yellow-200 p-2">
          <div className="container mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span>Development Mode</span>
              <Badge variant="outline">Auth: {isAuthenticated ? 'Yes' : 'No'}</Badge>
            </div>
            <Link to="/auth/debug">
              <Button variant="outline" size="sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Auth Debug
              </Button>
            </Link>
          </div>
        </div>
      )}
      <HeroSection />
      
      {/* Enter App CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Exam Preparation?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already using UjjwalDeep to ace their exams.
            Start your journey today with our comprehensive test platform.
          </p>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link to={isAuthenticated ? "/app" : "/auth"}>
               <Button size="lg" className="min-w-[200px]">
                 {isAuthenticated ? "Enter App" : "Get Started"}
               </Button>
             </Link>
             <Link to="/auth">
               <Button size="lg" variant="outline" className="min-w-[200px]">
                 Sign Up Free
               </Button>
             </Link>
           </div>
        </div>
      </section>
      
      <GameficationSection />
      <FeatureSection />
      <Footer />
    </div>
  );
};

export default Index;

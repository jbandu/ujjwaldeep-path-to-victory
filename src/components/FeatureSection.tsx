import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const FeatureSection: React.FC = () => {
  const features = [
    {
      title: "Affordable for Everyone",
      description: "Starting at just ₹1,999/year - making quality exam prep accessible across India",
      highlight: "₹1,999/year"
    },
    {
      title: "Works on Any Device",
      description: "Optimized for low bandwidth, works perfectly on basic smartphones",
      highlight: "Low Bandwidth"
    },
    {
      title: "Exam-Agnostic Platform",
      description: "From NEET to JEE, UPSC to Banking - one platform for all your exam needs",
      highlight: "All Exams"
    },
    {
      title: "Instant AI Feedback",
      description: "Get personalized explanations and study plans powered by advanced AI",
      highlight: "AI Powered"
    }
  ];

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-heading">
            Democratizing Exam Success
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for students in Tier 2/3 cities, designed to work everywhere
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="bg-gradient-card border-border/50 hover:shadow-warm transition-all duration-300 hover:scale-105 animate-slide-in-left group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle className="h-6 w-6 text-primary group-hover:animate-bounce-in" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2 font-heading">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                      {feature.description}
                    </p>
                    <span className="inline-block px-3 py-1 bg-gradient-primary text-primary-foreground text-xs font-semibold rounded-full">
                      {feature.highlight}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
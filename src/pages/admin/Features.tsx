import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Users, 
  Settings, 
  Trophy, 
  FileText, 
  Upload, 
  Brain, 
  Shield, 
  Calendar,
  Printer,
  BarChart3,
  Zap,
  CheckCircle,
  Clock,
  Target,
  MapPin
} from 'lucide-react';

const Features = () => {
  const features = [
    {
      category: "Question Management",
      icon: BookOpen,
      color: "bg-blue-500",
      items: [
        {
          name: "Question CRUD Operations",
          description: "Create, read, update, and delete questions with full subject/chapter organization",
          status: "completed",
          components: ["AdminQuestions", "AdminQuestionForm"]
        },
        {
          name: "Bulk Import",
          description: "Import questions from CSV/Excel files with data validation",
          status: "completed",
          components: ["AdminImport"]
        },
        {
          name: "Question Localization",
          description: "Multi-language support for questions with translation management",
          status: "completed",
          components: ["question_localizations table"]
        },
        {
          name: "Question Staging",
          description: "Staging area for reviewing questions before making them active",
          status: "completed",
          components: ["staging_questions table"]
        }
      ]
    },
    {
      category: "AI-Powered Features",
      icon: Brain,
      color: "bg-purple-500",
      items: [
        {
          name: "AI Task Queue",
          description: "Automated question analysis, explanation generation, and difficulty assessment",
          status: "completed",
          components: ["ai_tasks table", "AdminAITasks", "ai-worker function"]
        },
        {
          name: "Automated Explanations",
          description: "AI-generated explanations for questions using OpenAI",
          status: "completed",
          components: ["AI explain task type"]
        },
        {
          name: "Difficulty Assessment",
          description: "AI-powered difficulty rating for questions",
          status: "completed",
          components: ["AI difficulty task type"]
        },
        {
          name: "Question Tagging",
          description: "Automatic tag generation for better categorization",
          status: "completed",
          components: ["AI tags task type"]
        }
      ]
    },
    {
      category: "Test Builder & Management",
      icon: Settings,
      color: "bg-green-500",
      items: [
        {
          name: "Custom Test Builder",
          description: "Interactive test creation with subject/chapter/difficulty filters",
          status: "completed", 
          components: ["Builder", "create-test function"]
        },
        {
          name: "Test Library",
          description: "User's personal test collection with filtering and search",
          status: "completed",
          components: ["Library", "tests table"]
        },
        {
          name: "Print Mode PDFs",
          description: "Generate printable question papers and OMR sheets",
          status: "completed",
          components: ["TestPrintMode", "QuestionPaper", "OMRSheet", "generate-print-pdfs"]
        },
        {
          name: "OMR Processing",
          description: "Upload and automatically grade OMR answer sheets",
          status: "completed",
          components: ["TestPrintUpload", "process-print-omr", "upload-print-omr"]
        }
      ]
    },
    {
      category: "Test Taking Experience",
      icon: FileText,
      color: "bg-orange-500",
      items: [
        {
          name: "Interactive Test Player",
          description: "Full-featured test interface with timer, navigation, and review",
          status: "completed",
          components: ["TestPlayer", "start-attempt", "save-response", "submit-attempt"]
        },
        {
          name: "Attempt Management",
          description: "Track user attempts with detailed scoring and analytics",
          status: "completed",
          components: ["attempts table", "items_attempted table"]
        },
        {
          name: "Results & Analytics",
          description: "Comprehensive results display with subject-wise performance",
          status: "completed",
          components: ["Results", "get-attempt function"]
        }
      ]
    },
    {
      category: "Gamification & Engagement",
      icon: Trophy,
      color: "bg-yellow-500",
      items: [
        {
          name: "Points & Badges System",
          description: "Reward system for consistent practice and achievements",
          status: "completed",
          components: ["gamification table", "GamificationWidget"]
        },
        {
          name: "Daily Leaderboard",
          description: "Competitive leaderboards with daily rankings",
          status: "completed",
          components: ["leaderboard_daily table", "Leaderboard", "leaderboard-daily function"]
        },
        {
          name: "Streak Tracking",
          description: "Daily practice streak monitoring and rewards",
          status: "completed",
          components: ["gamification-ping function"]
        }
      ]
    },
    {
      category: "User Management & Profiles",
      icon: Users,
      color: "bg-indigo-500",
      items: [
        {
          name: "User Authentication",
          description: "Secure authentication with Supabase Auth",
          status: "completed",
          components: ["Auth", "useAuth hook"]
        },
        {
          name: "User Profiles",
          description: "Comprehensive user profiles with exam details and preferences",
          status: "completed",
          components: ["Profile", "profiles table"]
        },
        {
          name: "Onboarding Flow",
          description: "Guided setup for new users",
          status: "completed",
          components: ["Onboarding"]
        },
        {
          name: "Admin Role Management",
          description: "Role-based access control with admin privileges",
          status: "completed",
          components: ["AdminProtectedRoute", "is_admin() function"]
        }
      ]
    },
    {
      category: "Exam Day Features",
      icon: Calendar,
      color: "bg-red-500",
      items: [
        {
          name: "Exam Day Planning",
          description: "Weather, traffic, and route planning for exam day",
          status: "completed",
          components: ["ExamDay", "examday-email function"]
        },
        {
          name: "Location Services",
          description: "GPS-based distance calculation and route optimization",
          status: "completed",
          components: ["Mapbox integration", "OpenWeather API"]
        },
        {
          name: "Email Notifications",
          description: "Automated exam day preparation emails",
          status: "completed",
          components: ["examday-email function", "Resend integration"]
        }
      ]
    },
    {
      category: "Admin & Analytics",
      icon: BarChart3,
      color: "bg-teal-500",
      items: [
        {
          name: "Admin Dashboard",
          description: "Comprehensive admin overview with key metrics",
          status: "completed",
          components: ["AdminDashboard"]
        },
        {
          name: "Print Upload Review",
          description: "Admin interface for reviewing OMR upload processing",
          status: "completed",
          components: ["PrintReview", "PrintReviewEdit"]
        },
        {
          name: "System Settings",
          description: "Configuration management for admin users",
          status: "completed",
          components: ["AdminSettings"]
        }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'planned':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><Target className="w-3 h-3 mr-1" />Planned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const totalFeatures = features.reduce((sum, category) => sum + category.items.length, 0);
  const completedFeatures = features.reduce((sum, category) => 
    sum + category.items.filter(item => item.status === 'completed').length, 0
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Application Features Overview</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive overview of all implemented features and capabilities
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedFeatures}</p>
                <p className="text-xs text-muted-foreground">Completed Features</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalFeatures}</p>
                <p className="text-xs text-muted-foreground">Total Features</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{features.length}</p>
                <p className="text-xs text-muted-foreground">Feature Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round((completedFeatures / totalFeatures) * 100)}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Categories */}
      <div className="space-y-6">
        {features.map((category, categoryIndex) => {
          const Icon = category.icon;
          const completedInCategory = category.items.filter(item => item.status === 'completed').length;
          
          return (
            <Card key={categoryIndex} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${category.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{category.category}</CardTitle>
                    <CardDescription>
                      {completedInCategory}/{category.items.length} features completed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.items.map((feature, featureIndex) => (
                  <div key={featureIndex} className="border-l-2 border-muted pl-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-base">{feature.name}</h4>
                      {getStatusBadge(feature.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {feature.components.map((component, compIndex) => (
                        <Badge key={compIndex} variant="outline" className="text-xs">
                          {component}
                        </Badge>
                      ))}
                    </div>
                    {featureIndex < category.items.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Technical Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Technical Stack & Infrastructure</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Frontend</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">React 18</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">Tailwind CSS</Badge>
                <Badge variant="outline">Vite</Badge>
                <Badge variant="outline">React Router</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Backend & Database</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Supabase</Badge>
                <Badge variant="outline">PostgreSQL</Badge>
                <Badge variant="outline">Row Level Security</Badge>
                <Badge variant="outline">Edge Functions</Badge>
                <Badge variant="outline">Deno Runtime</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">External APIs</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">OpenAI GPT-4</Badge>
                <Badge variant="outline">Mapbox</Badge>
                <Badge variant="outline">OpenWeather</Badge>
                <Badge variant="outline">Resend Email</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Features;
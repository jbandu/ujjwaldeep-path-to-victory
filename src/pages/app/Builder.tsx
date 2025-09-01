import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Clock, Target, BookOpen } from 'lucide-react';

const Builder: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Test Builder</h1>
        <p className="text-muted-foreground">
          Create custom tests tailored to your study needs
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-card transition-all duration-300 border-primary/20 hover:border-primary/40">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Quick Test</CardTitle>
            <CardDescription>
              Start with a ready-made test template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="default">
              Create Quick Test
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-card transition-all duration-300">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Custom Test</CardTitle>
            <CardDescription>
              Build a test with specific parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Customize Test
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-card transition-all duration-300">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Topic Focus</CardTitle>
            <CardDescription>
              Target specific chapters or topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Focus Mode
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Templates</CardTitle>
          <CardDescription>Pre-built test configurations based on exam patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'NEET Mock Test',
                questions: 180,
                duration: 180,
                subjects: ['Physics', 'Chemistry', 'Biology'],
                difficulty: 'Mixed'
              },
              {
                title: 'Physics Deep Dive',
                questions: 45,
                duration: 60,
                subjects: ['Physics'],
                difficulty: 'Hard'
              },
              {
                title: 'Quick Review',
                questions: 30,
                duration: 30,
                subjects: ['Biology', 'Chemistry'],
                difficulty: 'Easy'
              },
              {
                title: 'Previous Year Paper',
                questions: 180,
                duration: 180,
                subjects: ['Physics', 'Chemistry', 'Biology'],
                difficulty: 'Mixed'
              },
            ].map((template, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{template.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {template.questions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {template.duration} mins
                      </span>
                    </div>
                  </div>
                  <Badge variant={template.difficulty === 'Hard' ? 'destructive' : template.difficulty === 'Easy' ? 'secondary' : 'default'}>
                    {template.difficulty}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.subjects.map((subject, subIndex) => (
                    <Badge key={subIndex} variant="outline" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                </div>
                
                <Button size="sm" className="w-full" variant="outline">
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tests</CardTitle>
          <CardDescription>Tests you've created recently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: 'Custom Chemistry Test',
                created: '2 hours ago',
                questions: 50,
                status: 'Draft'
              },
              {
                name: 'Biology Practice Set',
                created: '1 day ago',
                questions: 30,
                status: 'Completed'
              },
              {
                name: 'Physics Mixed Bag',
                created: '3 days ago',
                questions: 40,
                status: 'Completed'
              },
            ].map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{test.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {test.questions} questions • {test.created}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={test.status === 'Draft' ? 'secondary' : 'default'}>
                    {test.status}
                  </Badge>
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Builder;
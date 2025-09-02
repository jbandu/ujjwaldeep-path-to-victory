import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen, Download, Eye, Calendar, Printer } from 'lucide-react';

const Library: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Library</h1>
        <p className="text-muted-foreground">
          Access past year papers, study materials, and resources
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for papers, topics, or subjects..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="papers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="papers">Past Papers</TabsTrigger>
          <TabsTrigger value="materials">Study Materials</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="papers" className="space-y-6">
          {/* Past Year Papers */}
          <Card>
            <CardHeader>
              <CardTitle>NEET Past Year Papers</CardTitle>
              <CardDescription>
                Complete collection of previous year question papers (2019-2024)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { year: '2024', date: 'May 5, 2024', status: 'Latest', questions: 180 },
                  { year: '2023', date: 'May 7, 2023', status: 'Complete', questions: 180 },
                  { year: '2022', date: 'July 17, 2022', status: 'Complete', questions: 180 },
                  { year: '2021', date: 'September 12, 2021', status: 'Complete', questions: 180 },
                  { year: '2020', date: 'September 13, 2020', status: 'Complete', questions: 180 },
                  { year: '2019', date: 'May 5, 2019', status: 'Complete', questions: 180 },
                ].map((paper, index) => (
                  <Card key={index} className="hover:shadow-card transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">NEET {paper.year}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {paper.date}
                          </CardDescription>
                        </div>
                        <Badge variant={paper.status === 'Latest' ? 'default' : 'secondary'}>
                          {paper.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">
                        {paper.questions} Questions • All Subjects
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subject-wise Papers */}
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Collections</CardTitle>
              <CardDescription>
                Organized by subjects for focused practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { subject: 'Physics', papers: 24, icon: '⚛️' },
                  { subject: 'Chemistry', papers: 28, icon: '🧪' },
                  { subject: 'Biology', papers: 32, icon: '🧬' },
                ].map((collection, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-card transition-all duration-300">
                    <CardContent className="pt-6 text-center">
                      <div className="text-3xl mb-3">{collection.icon}</div>
                      <h3 className="font-semibold text-lg">{collection.subject}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {collection.papers} practice sets available
                      </p>
                      <Button variant="outline" className="w-full">
                        Browse {collection.subject}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Study Materials</CardTitle>
              <CardDescription>
                Curated resources to enhance your preparation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: 'NCERT Solutions - Biology',
                    type: 'PDF',
                    size: '12.5 MB',
                    downloads: 1250,
                    description: 'Complete solutions for NCERT Biology textbooks'
                  },
                  {
                    title: 'Physics Formula Sheet',
                    type: 'PDF',
                    size: '2.1 MB',
                    downloads: 890,
                    description: 'Quick reference for all important physics formulas'
                  },
                  {
                    title: 'Chemistry Reaction Mechanisms',
                    type: 'PDF',
                    size: '8.7 MB',
                    downloads: 670,
                    description: 'Detailed organic chemistry reaction mechanisms'
                  },
                ].map((material, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{material.title}</h4>
                        <p className="text-sm text-muted-foreground">{material.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{material.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {material.size} • {material.downloads} downloads
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bookmarked Items</CardTitle>
              <CardDescription>
                Resources you've saved for quick access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookmarks yet</p>
                <p className="text-sm">Start bookmarking papers and materials you find useful</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Library;
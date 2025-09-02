import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Copy,
  Archive,
  Trash,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/questions';

interface QuestionsFilters {
  subject: string;
  chapter: string;
  difficulty: string;
  status: string;
  hasAnswer: string;
  language: string;
}

const Questions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<QuestionsFilters>({
    subject: '',
    chapter: '',
    difficulty: '',
    status: 'active',
    hasAnswer: '',
    language: '',
  });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchSubjects();
    fetchQuestions();
  }, [currentPage, filters]);

  useEffect(() => {
    if (filters.subject) {
      fetchChapters();
    } else {
      setChapters([]);
    }
  }, [filters.subject]);

  const fetchSubjects = async () => {
    try {
      const { data } = await (supabase as any).rpc('get_distinct_subjects');
      setSubjects(data?.map((row: any) => row.subject) || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data } = await (supabase as any).rpc('get_distinct_chapters', {
        subjects: [filters.subject]
      });
      setChapters(data?.map((row: any) => row.chapter) || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('questions')
        .select('id, subject, chapter, stem, difficulty, status, created_at, correct_index', { count: 'exact' });

      // Apply filters
      if (filters.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters.chapter) {
        query = query.eq('chapter', filters.chapter);
      }
      if (filters.difficulty) {
        query = query.eq('difficulty', parseInt(filters.difficulty));
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.hasAnswer === 'yes') {
        query = query.not('correct_index', 'is', null);
      } else if (filters.hasAnswer === 'no') {
        query = query.is('correct_index', null);
      }
      if (filters.language) {
        query = query.eq('language', filters.language);
      }

      // Apply search
      if (searchTerm) {
        query = query.ilike('stem', `%${searchTerm}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      setQuestions(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof QuestionsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getDifficultyBadge = (difficulty?: number) => {
    if (!difficulty) return null;
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[difficulty as keyof typeof colors] || ''}>
        {difficulty}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Questions</h1>
          <p className="text-muted-foreground">
            Manage NEET questions ({totalCount.toLocaleString()} total)
          </p>
        </div>
        <Button asChild className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground">
          <Link to="/admin/questions/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by question stem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchQuestions} variant="outline">
              Search
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Select value={filters.subject} onValueChange={(value) => handleFilterChange('subject', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.chapter} onValueChange={(value) => handleFilterChange('chapter', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Chapters</SelectItem>
                {chapters.map(chapter => (
                  <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.difficulty} onValueChange={(value) => handleFilterChange('difficulty', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="1">1 - Easy</SelectItem>
                <SelectItem value="2">2 - Medium</SelectItem>
                <SelectItem value="3">3 - Normal</SelectItem>
                <SelectItem value="4">4 - Hard</SelectItem>
                <SelectItem value="5">5 - Expert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.hasAnswer} onValueChange={(value) => handleFilterChange('hasAnswer', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Has Answer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="yes">With Answer</SelectItem>
                <SelectItem value="no">Missing Answer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.language} onValueChange={(value) => handleFilterChange('language', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Hindi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-accent"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Question Stem</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-mono text-sm">{question.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.subject}</Badge>
                    </TableCell>
                    <TableCell className="max-w-32 truncate">{question.chapter}</TableCell>
                    <TableCell className="max-w-96 truncate" title={question.stem}>
                      {question.stem}
                    </TableCell>
                    <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                    <TableCell>
                      {question.correct_index !== null ? (
                        <Badge className="bg-admin-success text-white">
                          {['A', 'B', 'C', 'D'][question.correct_index]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-admin-warning">
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={question.status === 'active' ? 'bg-admin-success text-white' : 'bg-muted text-muted-foreground'}
                      >
                        {question.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(question.created_at!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/admin/questions/${question.id}`}>
                            <Edit className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-admin-warning">
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Questions;
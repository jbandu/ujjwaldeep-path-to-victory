import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Builder from "./pages/app/Builder";
import Library from "./pages/app/Library";
import Profile from "./pages/app/Profile";
import TestPlayer from "./pages/app/TestPlayer";
import TestPrintMode from "./pages/app/TestPrintMode";
import TestPrintUpload from "./pages/app/TestPrintUpload";
import ExamDay from "./pages/app/ExamDay";
import Leaderboard from "./pages/app/Leaderboard";
import Results from "./pages/app/Results";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfileProtectedRoute from "./components/ProfileProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminQuestions from "./pages/admin/Questions";
import AdminQuestionForm from "./pages/admin/QuestionForm";
import AdminAITasks from "./pages/admin/AITasks";
import AdminImport from "./pages/admin/Import";
import AdminReview from "./pages/admin/Review";
import AdminSettings from "./pages/admin/Settings";
import AdminFeatures from "./pages/admin/Features";
import PrintReview from "./pages/admin/PrintReview";
import PrintReviewEdit from "./pages/admin/PrintReviewEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          
          {/* Standalone Test Player */}
          <Route path="/app/test/:attemptId" element={
            <ProfileProtectedRoute>
              <TestPlayer />
            </ProfileProtectedRoute>
          } />
          
          {/* Print Mode */}
          <Route path="/app/tests/:testId/print" element={
            <ProfileProtectedRoute>
              <TestPrintMode />
            </ProfileProtectedRoute>
          } />
          
          {/* Print Upload */}
          <Route path="/app/tests/:testId/upload-print" element={
            <ProfileProtectedRoute>
              <TestPrintUpload />
            </ProfileProtectedRoute>
          } />
          
          {/* Standalone Results Page */}
          <Route path="/app/results/:attemptId" element={
            <ProfileProtectedRoute>
              <Results />
            </ProfileProtectedRoute>
          } />
          
          {/* Protected App Routes */}
          <Route path="/app" element={
            <ProfileProtectedRoute>
              <AppLayout />
            </ProfileProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="builder" element={<Builder />} />
            <Route path="library" element={<Library />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="exam-day" element={<ExamDay />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="questions/new" element={<AdminQuestionForm />} />
            <Route path="questions/:id" element={<AdminQuestionForm />} />
            <Route path="ai-tasks" element={<AdminAITasks />} />
            <Route path="import" element={<AdminImport />} />
            <Route path="review" element={<AdminReview />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="features" element={<AdminFeatures />} />
            <Route path="print/review" element={<PrintReview />} />
            <Route path="print/review/:uploadId" element={<PrintReviewEdit />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  </QueryClientProvider>
);

export default App;

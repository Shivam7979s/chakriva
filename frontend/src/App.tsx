import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/ui/layout/AppShell';
import { PublicLayout } from '@/components/ui/layout/PublicLayout';
import { AuthLayout } from '@/components/ui/layout/AuthLayout';
import { AppLayout } from '@/components/ui/layout/AppLayout';
import { FoundationView } from '@/routes/FoundationView';
import { LandingView } from '@/routes/LandingView';
import { CodeSpaceView } from '@/routes/CodeSpaceView';
import { NoteSpaceView } from '@/routes/NoteSpaceView';
import { ArchitectureView } from '@/routes/ArchitectureView';
import { RoadmapsView } from '@/routes/RoadmapsView';
import { ProblemsView } from '@/routes/ProblemsView';
import { CoursesView } from '@/routes/CoursesView';
import { LeaderboardView } from '@/routes/LeaderboardView';
import { ProfileSettingsView } from '@/routes/ProfileSettingsView';
import { ProfileView } from '@/routes/ProfileView';
import { ProblemWorkspace } from '@/components/workspace/ProblemWorkspace';
import { StandaloneIdeView } from '@/routes/StandaloneIdeView';
import { LoginView } from '@/routes/LoginView';
import { RegisterView } from '@/routes/RegisterView';
import { ForgotPasswordView } from '@/routes/ForgotPasswordView';
import { DashboardView } from '@/routes/DashboardView';
import { DiagnosticView } from '@/routes/DiagnosticView';
import { SprintPlanView } from '@/routes/SprintPlanView';
import { StudyPlanView } from '@/routes/StudyPlanView';
import { RevisionView } from '@/routes/RevisionView';
import { SheetsView } from '@/routes/SheetsView';
import { SheetDetailView } from '@/features/sheets/components/SheetDetailView';
import { ChakrivaAiView } from '@/routes/ChakrivaAiView';
import { ContestsView } from '@/routes/ContestsView';
import { ContestDetailView } from '@/features/contests/components/ContestDetailView';
import { ProgressView } from '@/routes/ProgressView';
import { LearnView } from '@/routes/LearnView';
import { TrackSyllabusView } from '@/features/learn/components/TrackSyllabusView';
import { LessonWorkspaceView } from '@/features/learn/components/LessonWorkspaceView';
import { WorkspaceSubView } from '@/routes/WorkspaceSubView';
import { NotFoundView } from '@/routes/NotFoundView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { ProblemAuthoringView } from '@/routes/ProblemAuthoringView';
import { AuraLandingView } from '@/routes/AuraLandingView';
import { ChakrivaLandingView } from '@/routes/ChakrivaLandingView';

const LegacySheetDetailRedirect: React.FC = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  return <Navigate to={sheetId ? `/app/sheets/${sheetId}` : '/app/sheets'} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Chakriva Platform Landing View */}
          <Route path="/" element={<ChakrivaLandingView />} />
          <Route path="/chakriva" element={<ChakrivaLandingView />} />
          <Route path="/aura" element={<AuraLandingView />} />
          <Route path="/verniq" element={<LandingView />} />
          <Route
            path="/foundation"
            element={
              <PublicLayout>
                <FoundationView />
              </PublicLayout>
            }
          />
          <Route
            path="/architecture"
            element={
              <PublicLayout>
                <ArchitectureView />
              </PublicLayout>
            }
          />
          <Route
            path="/roadmaps"
            element={<RoadmapsView />}
          />
          <Route
            path="/roadmaps/:slug"
            element={<RoadmapsView />}
          />
          <Route
            path="/problems"
            element={
              <PublicLayout>
                <ProblemsView />
              </PublicLayout>
            }
          />
          <Route
            path="/problems/:slug"
            element={
              <PublicLayout>
                <ProblemWorkspace />
              </PublicLayout>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PublicLayout>
                <LeaderboardView />
              </PublicLayout>
            }
          />
          <Route
            path="/courses"
            element={
              <PublicLayout>
                <CoursesView />
              </PublicLayout>
            }
          />
          <Route
            path="/ide"
            element={
              <PublicLayout>
                <StandaloneIdeView />
              </PublicLayout>
            }
          />
          <Route
            path="/authoring"
            element={
              <PublicLayout>
                <ProblemAuthoringView />
              </PublicLayout>
            }
          />

          {/* Authentication Routes */}
          <Route
            path="/login"
            element={
              <AuthLayout>
                <LoginView />
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <RegisterView />
              </AuthLayout>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthLayout>
                <ForgotPasswordView />
              </AuthLayout>
            }
          />

          {/* Direct Route Shortcuts & Backward-Compatible Redirects */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navigate to="/app/home" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Navigate to="/app/home" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Navigate to="/app/profile" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan"
            element={
              <ProtectedRoute>
                <Navigate to="/app/plan" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diagnostic"
            element={
              <ProtectedRoute>
                <Navigate to="/app/diagnostic" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study-plan"
            element={
              <ProtectedRoute>
                <Navigate to="/app/study-plan" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/revision"
            element={
              <ProtectedRoute>
                <Navigate to="/app/revision" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Navigate to="/app/settings" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/ide"
            element={
              <ProtectedRoute>
                <Navigate to="/ide" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/codespace"
            element={
              <ProtectedRoute>
                <Navigate to="/app/codespace" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notespace"
            element={
              <ProtectedRoute>
                <Navigate to="/app/notespace" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contests"
            element={
              <ProtectedRoute>
                <Navigate to="/app/contests" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chakriva-ai"
            element={
              <ProtectedRoute>
                <Navigate to="/app/chakriva" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <Navigate to="/app/chakriva" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sheets"
            element={
              <ProtectedRoute>
                <Navigate to="/app/sheets" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sheets/:sheetId"
            element={
              <ProtectedRoute>
                <LegacySheetDetailRedirect />
              </ProtectedRoute>
            }
          />

          {/* =======================================================
              PRIMARY 9 AUTHENTICATED CHAKRIVA HUBS
             ======================================================= */}

          {/* 1. HOME: "What should I do right now?" */}
          <Route
            path="/app/home"
            element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            }
          />

          {/* 2. ROADMAP: "What should I do next and why?" */}
          <Route
            path="/app/roadmap"
            element={
              <ProtectedRoute>
                <RoadmapsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/roadmap/:slug"
            element={
              <ProtectedRoute>
                <RoadmapsView />
              </ProtectedRoute>
            }
          />

          {/* 3. LEARN: "Teach me." */}
          <Route
            path="/app/learn"
            element={
              <ProtectedRoute>
                <LearnView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/learn/:trackSlug"
            element={
              <ProtectedRoute>
                <TrackSyllabusView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/learn/:trackSlug/:lessonSlug"
            element={
              <ProtectedRoute>
                <LessonWorkspaceView />
              </ProtectedRoute>
            }
          />

          {/* 4. PRACTICE: "Let me solve." */}
          <Route
            path="/app/practice"
            element={
              <ProtectedRoute>
                <ProblemsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/practice/:slug"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <ProblemWorkspace />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* 5. SHEETS: "Give me curated preparation." */}
          <Route
            path="/app/sheets"
            element={
              <ProtectedRoute>
                <SheetsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/sheets/:sheetId"
            element={
              <ProtectedRoute>
                <SheetDetailView />
              </ProtectedRoute>
            }
          />

          {/* 6. CHAKRIVA: "Understand me." */}
          <Route
            path="/app/chakriva"
            element={
              <ProtectedRoute>
                <ChakrivaAiView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/ai-mentor"
            element={
              <ProtectedRoute>
                <Navigate to="/app/chakriva" replace />
              </ProtectedRoute>
            }
          />

          {/* 7. CODESPACE: "Let me build." */}
          <Route
            path="/app/codespace"
            element={
              <ProtectedRoute>
                <AppLayout breadcrumbs={[{ label: 'CHAKRIVA', href: '/app/home' }, { label: 'CodeSpace' }]}>
                  <CodeSpaceView />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* 8. CONTESTS: "Challenge me." */}
          <Route
            path="/app/contests"
            element={
              <ProtectedRoute>
                <ContestsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/contests/:contestId"
            element={
              <ProtectedRoute>
                <ContestDetailView />
              </ProtectedRoute>
            }
          />

          {/* 9. PROGRESS: "Show me how I'm improving." */}
          <Route
            path="/app/progress"
            element={
              <ProtectedRoute>
                <ProgressView />
              </ProtectedRoute>
            }
          />

          {/* =======================================================
              SECONDARY AUTHENTICATED PAGES (Preserved & Reachable)
             ======================================================= */}
          <Route
            path="/app/analytics"
            element={
              <ProtectedRoute>
                <DashboardView initialTab="analytics" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/diagnostic"
            element={
              <ProtectedRoute>
                <DiagnosticView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/revision"
            element={
              <ProtectedRoute>
                <RevisionView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/notespace"
            element={
              <ProtectedRoute>
                <AppLayout breadcrumbs={[{ label: 'CHAKRIVA', href: '/app/home' }, { label: 'CodeSpace', href: '/app/codespace' }, { label: 'NoteSpace' }]}>
                  <NoteSpaceView />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/plan"
            element={
              <ProtectedRoute>
                <SprintPlanView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/sprint-plan"
            element={
              <ProtectedRoute>
                <SprintPlanView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/study-plan"
            element={
              <ProtectedRoute>
                <StudyPlanView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute>
                <ProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/settings"
            element={
              <ProtectedRoute>
                <ProfileSettingsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/authoring"
            element={
              <ProtectedRoute>
                <ProblemAuthoringView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/projects"
            element={
              <ProtectedRoute>
                <WorkspaceSubView
                  title="Production Systems Projects"
                  moduleName="Systems Labs"
                  phaseTarget="Phase 4"
                  description="End-to-end fullstack and distributed systems capstone portfolio projects."
                  emptyTitle="Capstone Projects Locked"
                  emptyDescription="Project specifications and verification suites will unlock in Phase 4."
                />
              </ProtectedRoute>
            }
          />

          {/* Admin Route */}
          <Route
            path="/app/admin"
            element={
              <AdminRoute>
                <WorkspaceSubView
                  title="Operational Administration"
                  moduleName="Admin Control Plane"
                  phaseTarget="Phase 1"
                  description="Administrative telemetry, role elevation, and system health monitoring."
                  emptyTitle="Platform Telemetry Nominal"
                  emptyDescription="No critical administrative alerts active."
                />
              </AdminRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route
            path="*"
            element={
              <PublicLayout>
                <NotFoundView />
              </PublicLayout>
            }
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AppShell } from '@/components/ui/layout/AppShell';
import { PublicLayout } from '@/components/ui/layout/PublicLayout';
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
import { WorkspaceSubView } from '@/routes/WorkspaceSubView';
import { NotFoundView } from '@/routes/NotFoundView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { ProblemAuthoringView } from '@/routes/ProblemAuthoringView';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell>
        <Analytics />
        <Routes>
          {/* Public Landing View */}
          <Route path="/" element={<LandingView />} />
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
            element={
              <PublicLayout>
                <RoadmapsView />
              </PublicLayout>
            }
          />
          <Route
            path="/roadmaps/:slug"
            element={
              <PublicLayout>
                <RoadmapsView />
              </PublicLayout>
            }
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
          <Route
            path="/app/authoring"
            element={
              <ProtectedRoute>
                <ProblemAuthoringView />
              </ProtectedRoute>
            }
          />

          {/* Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicLayout>
                <LoginView />
              </PublicLayout>
            }
          />
          <Route
            path="/register"
            element={
              <PublicLayout>
                <RegisterView />
              </PublicLayout>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicLayout>
                <ForgotPasswordView />
              </PublicLayout>
            }
          />

          {/* Direct Protected Shortcuts with returnTo support */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navigate to="/app/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileView />
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

          {/* Authenticated Student Workspace Routes */}
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/analytics"
            element={
              <ProtectedRoute>
                <DashboardView initialTab="analytics" />
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
            path="/app/learn"
            element={
              <ProtectedRoute>
                <WorkspaceSubView
                  title="Learn & Roadmaps"
                  moduleName="Curriculum"
                  phaseTarget="Phase 2"
                  description="Personalized learning path and interactive syllabus graph."
                  emptyTitle="Curriculum Sync In Progress"
                  emptyDescription="Curriculum graph will load active modules when Phase 2 schema is deployed."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/practice"
            element={
              <ProtectedRoute>
                <WorkspaceSubView
                  title="Practice Environment"
                  moduleName="Judge Sandbox"
                  phaseTarget="Phase 3"
                  description="Isolated WebWorker Monaco editor with remote container judge execution."
                  emptyTitle="Code Judge Standby"
                  emptyDescription="Isolated execution sandbox container will be linked during Phase 3."
                />
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
            path="/app/codespace"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CodeSpaceView />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/notespace"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NoteSpaceView />
                </AppLayout>
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
            path="/app/contests"
            element={
              <ProtectedRoute>
                <WorkspaceSubView
                  title="Engineering Contests"
                  moduleName="Real-Time Contests"
                  phaseTarget="Phase 4"
                  description="Live competitive programming rounds with anti-cheat telemetry."
                  emptyTitle="No Live Contests"
                  emptyDescription="Next scheduled algorithmic round will be announced in Phase 4."
                />
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
          <Route
            path="/app/ai-mentor"
            element={
              <ProtectedRoute>
                <WorkspaceSubView
                  title="Socratic AI Mentor"
                  moduleName="AI Service"
                  phaseTarget="Phase 5"
                  description="FastAPI + pgvector RAG mentor delivering targeted conceptual hints without giving code away."
                  emptyTitle="AI Service Standby"
                  emptyDescription="FastAPI microservice endpoints will be connected during Phase 5."
                />
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

          {/* Admin Clearance Route */}
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

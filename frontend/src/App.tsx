import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/ui/layout/AppShell';
import { PublicLayout } from '@/components/ui/layout/PublicLayout';
import { AuthLayout } from '@/components/ui/layout/AuthLayout';
import { AppLayout } from '@/components/ui/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { ChakrivaLandingView } from '@/routes/ChakrivaLandingView';

// Route-level code splitting for Core Web Vitals and lightning PageSpeed
const FoundationView = lazy(() => import('@/routes/FoundationView').then((m) => ({ default: m.FoundationView })));
const LandingView = lazy(() => import('@/routes/LandingView').then((m) => ({ default: m.LandingView })));
const AuraLandingView = lazy(() => import('@/routes/AuraLandingView').then((m) => ({ default: m.AuraLandingView })));
const CodeSpaceView = lazy(() => import('@/routes/CodeSpaceView').then((m) => ({ default: m.CodeSpaceView })));
const NoteSpaceView = lazy(() => import('@/routes/NoteSpaceView').then((m) => ({ default: m.NoteSpaceView })));
const ArchitectureView = lazy(() => import('@/routes/ArchitectureView').then((m) => ({ default: m.ArchitectureView })));
const RoadmapsView = lazy(() => import('@/routes/RoadmapsView').then((m) => ({ default: m.RoadmapsView })));
const ProblemsView = lazy(() => import('@/routes/ProblemsView').then((m) => ({ default: m.ProblemsView })));
const ProblemWorkspace = lazy(() => import('@/components/workspace/ProblemWorkspace').then((m) => ({ default: m.ProblemWorkspace })));
const CoursesView = lazy(() => import('@/routes/CoursesView').then((m) => ({ default: m.CoursesView })));
const LeaderboardView = lazy(() => import('@/routes/LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const ProfileSettingsView = lazy(() => import('@/routes/ProfileSettingsView').then((m) => ({ default: m.ProfileSettingsView })));
const ProfileView = lazy(() => import('@/routes/ProfileView').then((m) => ({ default: m.ProfileView })));
const StandaloneIdeView = lazy(() => import('@/routes/StandaloneIdeView').then((m) => ({ default: m.StandaloneIdeView })));
const LoginView = lazy(() => import('@/routes/LoginView').then((m) => ({ default: m.LoginView })));
const RegisterView = lazy(() => import('@/routes/RegisterView').then((m) => ({ default: m.RegisterView })));
const ForgotPasswordView = lazy(() => import('@/routes/ForgotPasswordView').then((m) => ({ default: m.ForgotPasswordView })));
const DashboardView = lazy(() => import('@/routes/DashboardView').then((m) => ({ default: m.DashboardView })));
const DiagnosticView = lazy(() => import('@/routes/DiagnosticView').then((m) => ({ default: m.DiagnosticView })));
const SprintPlanView = lazy(() => import('@/routes/SprintPlanView').then((m) => ({ default: m.SprintPlanView })));
const StudyPlanView = lazy(() => import('@/routes/StudyPlanView').then((m) => ({ default: m.StudyPlanView })));
const RevisionView = lazy(() => import('@/routes/RevisionView').then((m) => ({ default: m.RevisionView })));
const SheetsView = lazy(() => import('@/routes/SheetsView').then((m) => ({ default: m.SheetsView })));
const SheetDetailView = lazy(() => import('@/features/sheets/components/SheetDetailView').then((m) => ({ default: m.SheetDetailView })));
const ChakrivaAiView = lazy(() => import('@/routes/ChakrivaAiView').then((m) => ({ default: m.ChakrivaAiView })));
const ContestsView = lazy(() => import('@/routes/ContestsView').then((m) => ({ default: m.ContestsView })));
const ContestDetailView = lazy(() => import('@/features/contests/components/ContestDetailView').then((m) => ({ default: m.ContestDetailView })));
const ProgressView = lazy(() => import('@/routes/ProgressView').then((m) => ({ default: m.ProgressView })));
const LearnView = lazy(() => import('@/routes/LearnView').then((m) => ({ default: m.LearnView })));
const TrackSyllabusView = lazy(() => import('@/features/learn/components/TrackSyllabusView').then((m) => ({ default: m.TrackSyllabusView })));
const LessonWorkspaceView = lazy(() => import('@/features/learn/components/LessonWorkspaceView').then((m) => ({ default: m.LessonWorkspaceView })));
const WorkspaceSubView = lazy(() => import('@/routes/WorkspaceSubView').then((m) => ({ default: m.WorkspaceSubView })));
const ProblemAuthoringView = lazy(() => import('@/routes/ProblemAuthoringView').then((m) => ({ default: m.ProblemAuthoringView })));
const AboutView = lazy(() => import('@/routes/AboutView').then((m) => ({ default: m.AboutView })));
const PrivacyPolicyView = lazy(() => import('@/routes/PrivacyPolicyView').then((m) => ({ default: m.PrivacyPolicyView })));
const TermsOfServiceView = lazy(() => import('@/routes/TermsOfServiceView').then((m) => ({ default: m.TermsOfServiceView })));
const CookiePolicyView = lazy(() => import('@/routes/CookiePolicyView').then((m) => ({ default: m.CookiePolicyView })));
const RefundPolicyView = lazy(() => import('@/routes/RefundPolicyView').then((m) => ({ default: m.RefundPolicyView })));
const NotFoundView = lazy(() => import('@/routes/NotFoundView').then((m) => ({ default: m.NotFoundView })));

const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-[#08090B] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
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
            path="/about"
            element={
              <PublicLayout>
                <AboutView />
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

          {/* Platform Legal & Regulatory Disclosures (DPDP Act, IT Act, Payment Gateway KYC) */}
          <Route
            path="/privacy"
            element={
              <PublicLayout>
                <PrivacyPolicyView />
              </PublicLayout>
            }
          />
          <Route
            path="/terms"
            element={
              <PublicLayout>
                <TermsOfServiceView />
              </PublicLayout>
            }
          />
          <Route
            path="/cookies"
            element={
              <PublicLayout>
                <CookiePolicyView />
              </PublicLayout>
            }
          />
          <Route
            path="/refunds"
            element={
              <PublicLayout>
                <RefundPolicyView />
              </PublicLayout>
            }
          />
          <Route path="/cancellation-refund" element={<Navigate to="/refunds" replace />} />
          <Route path="/legal" element={<Navigate to="/privacy" replace />} />
          <Route path="/legal/privacy" element={<Navigate to="/privacy" replace />} />
          <Route path="/legal/terms" element={<Navigate to="/terms" replace />} />
          <Route path="/legal/cookies" element={<Navigate to="/cookies" replace />} />
          <Route path="/legal/refunds" element={<Navigate to="/refunds" replace />} />

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
          {/* Public Curated Sheets & Programmatic SEO Hubs */}
          <Route
            path="/sheets"
            element={<SheetsView />}
          />
          <Route
            path="/sheets/:sheetId"
            element={<SheetDetailView />}
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
      </Suspense>
    </AppShell>
  </BrowserRouter>
);
};

export default App;

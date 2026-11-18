import { Suspense, lazy } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { BrandLogo } from './components/BrandLogo';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const LearnerDashboard = lazy(() =>
  import('./pages/LearnerDashboard').then((m) => ({ default: m.LearnerDashboard }))
);
const CourseLearningPage = lazy(() =>
  import('./pages/CourseLearningPage').then((m) => ({ default: m.CourseLearningPage }))
);
const InstructorDashboard = lazy(() =>
  import('./pages/InstructorDashboard').then((m) => ({ default: m.InstructorDashboard }))
);
const CurriculumRestructuringPage = lazy(() =>
  import('./pages/CurriculumRestructuringPage').then((m) => ({
    default: m.CurriculumRestructuringPage,
  }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const GameZonePage = lazy(() =>
  import('./pages/GameZonePage').then((m) => ({ default: m.GameZonePage }))
);
const Explore3DPage = lazy(() =>
  import('./pages/Explore3DPage').then((m) => ({ default: m.Explore3DPage }))
);

function RouteLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
      <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />
          <div className="flex-1">
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/learner" element={<LearnerDashboard />} />
                <Route path="/learn/:courseId" element={<CourseLearningPage />} />
                <Route path="/instructor" element={<InstructorDashboard />} />
                <Route
                  path="/instructor/course/:courseId/graph"
                  element={<CurriculumRestructuringPage />}
                />
                <Route path="/games" element={<GameZonePage />} />
                <Route path="/explore" element={<Explore3DPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
          <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-slate-800">
                  <BrandLogo size={22} />
                  <span>Smart-Tech</span>
                </span>
                <p className="text-slate-500">
                  Prerequisite-Aware Learning Platform · English · ಕನ್ನಡ · हिन्दी
                </p>
              </div>
              <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-5">
                <Link to="/" className="hover:text-indigo-700 transition-colors">
                  Overview
                </Link>
                <Link to="/learn/1" className="hover:text-indigo-700 transition-colors">
                  Courses
                </Link>
                <Link to="/games" className="hover:text-indigo-700 transition-colors">
                  Game Zone
                </Link>
                <Link to="/explore" className="hover:text-indigo-700 transition-colors">
                  3D Explore
                </Link>
                <Link to="/auth" className="hover:text-indigo-700 transition-colors">
                  Sign In
                </Link>
                <a
                  href="mailto:support@smarttech.edu"
                  className="hover:text-indigo-700 transition-colors"
                >
                  support@smarttech.edu
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

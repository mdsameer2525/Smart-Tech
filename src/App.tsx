import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BrandLogo } from './components/BrandLogo';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { CourseLearningPage } from './pages/CourseLearningPage';
import { CurriculumRestructuringPage } from './pages/CurriculumRestructuringPage';
import { InstructorDashboard } from './pages/InstructorDashboard';
import { LandingPage } from './pages/LandingPage';
import { LearnerDashboard } from './pages/LearnerDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />
          <div className="flex-1">
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 font-display font-semibold text-slate-700">
                <BrandLogo size={20} />
                <span>Smart-Tech</span>
              </span>
              <span>Prerequisite-Aware Learning Platform · English · ಕನ್ನಡ · हिन्दी</span>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

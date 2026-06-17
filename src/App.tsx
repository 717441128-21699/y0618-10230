import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "@/pages/Login";
import ProjectList from "@/pages/ProjectList";
import CreateProject from "@/pages/CreateProject";
import ProjectOverview from "@/pages/ProjectOverview";
import TemplateSettings from "@/pages/TemplateSettings";
import Layout from "@/components/Layout";
import { useAuthStore } from "@/store/useAuthStore";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function ConsultantRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== "consultant") {
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/projects" replace /> : <Login />}
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/projects" : "/login"} replace />}
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectList />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/create"
          element={
            <PrivateRoute>
              <Layout>
                <CreateProject />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectOverview />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ConsultantRoute>
              <Layout>
                <TemplateSettings />
              </Layout>
            </ConsultantRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

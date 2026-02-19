import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

// Layout components
import { AuthLayout } from "@/components/layouts/auth-layout";
import { AppLayout } from "@/components/layouts/app-layout";
import { ClientLayout } from "@/components/layouts/client-layout";

// Auth pages
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ClientLogin } from "@/components/auth/ClientLogin";
import { ClientProtectedRoute } from "@/components/auth/ClientProtectedRoute";

// Client pages
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { ClientQuotations } from "@/pages/client/ClientQuotations";
import ClientProjects from "@/pages/client/ClientProjects";
import ClientProjectChecklistsPage from "@/pages/client/project-checklists";
import { ClientChatPage } from "@/pages/client/ClientChat";

// App pages
import { DashboardPage } from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import { OrganizationsPage } from "@/pages/organizations";
import { ProjectsPage } from "@/pages/projects";
import { QuotationsPage } from "@/pages/quotations";
import { ServicesPage } from "@/pages/services";
import ChecklistTemplatesPage from "@/pages/checklist-templates";
import { ReportsPage } from "@/pages/reports";
import { UsersPage } from "@/pages/users";
import { RolesPage } from "@/pages/roles";
import { CMSPage } from "@/pages/cms";
import MeetingsPage from "@/pages/meetings";
import { ChatPage } from "@/pages/chat";
import { checkPermission } from "../utils/permissions";

// Project checklist pages
import { ProjectChecklistsPage } from "@/pages/project-checklists";

// Project tasks pages
import { ProjectTasksPage } from "@/pages/project-tasks";

// Project details page
import { ProjectDetailsPage } from "@/pages/project-details";

// Task management
import { TasksPage } from "@/pages/tasks";

// Protected route wrapper
function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
}: {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requireAll?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredPermissions.length > 0) {
    const hasPermission = checkPermission(
      user.permissions || [],
      requiredPermissions,
      requireAll
    );

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Client routes */}
      <Route path="/client/login" element={<ClientLogin />} />

      <Route
        path="/client/*"
        element={
          <ClientProtectedRoute>
            <ClientLayout>
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/client/dashboard" replace />}
                />
                <Route path="dashboard" element={<ClientDashboard />} />
                <Route path="quotations" element={<ClientQuotations />} />
                <Route path="projects" element={<ClientProjects />} />
                <Route path="projects/:projectId/checklists" element={<ClientProjectChecklistsPage />} />
                <Route path="chat" element={<ClientChatPage />} />
                <Route
                  path="meetings"
                  element={
                    <div className="p-6 text-center">
                      Client Meetings - Coming Soon
                    </div>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <div className="p-6 text-center">
                      Client Reports - Coming Soon
                    </div>
                  }
                />
                <Route
                  path="support"
                  element={
                    <div className="p-6 text-center">
                      Client Support - Coming Soon
                    </div>
                  }
                />
                <Route
                  path="*"
                  element={<Navigate to="/client/dashboard" replace />}
                />
              </Routes>
            </ClientLayout>
          </ClientProtectedRoute>
        }
      />

      {/* Public routes */}
      <Route
        path="/auth/*"
        element={
          <PublicRoute>
            <AuthLayout>
              <Routes>
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route
                  path="*"
                  element={<Navigate to="/auth/login" replace />}
                />
              </Routes>
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Legacy login route - redirect to admin */}
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />

      {/* Unauthorized page */}
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
              {/* Top Accent */}
              <div className="absolute inset-x-0 top-0 h-2 bg-primary-600" />

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-3xl">
                  🔐
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
                Access Restricted
              </h1>

              {/* Description */}
              <p className="text-gray-600 mb-4">
                You do not have permission to view this section of the
                application. Access is restricted based on your assigned role
                and security policies.
              </p>

              {/* GreenNex Policy Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm text-green-800">
                <p className="font-semibold mb-1">
                  GreenNex Environment Policy
                </p>
                <p>
                  Unauthorized access to protected areas of the GreenNex
                  environment is monitored and restricted to ensure data
                  integrity, security, and compliance with organizational
                  standards.
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
              >
                Go Back
              </button>

              {/* Footer */}
              <p className="mt-6 text-xs text-gray-400">
                Error Code: 403 — Unauthorized Request
              </p>
            </div>
          </div>
        }
      />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requiredPermissions={["users:read"]}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute requiredPermissions={["roles:read"]}>
                      <RolesPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/organizations"
                  element={
                    <ProtectedRoute
                      requiredPermissions={["organizations:read"]}
                    >
                      <OrganizationsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/leads"
                  element={
                    <ProtectedRoute requiredPermissions={["leads:read"]}>
                      <LeadsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute requiredPermissions={["projects:read"]}>
                      <ProjectsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/quotations"
                  element={
                    <ProtectedRoute requiredPermissions={["quotations:read"]}>
                      <QuotationsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/services"
                  element={
                    <ProtectedRoute requiredPermissions={["services:read"]}>
                      <ServicesPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/checklist-templates"
                  element={
                    <ProtectedRoute requiredPermissions={["checklists:read"]}>
                      <ChecklistTemplatesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Project Details Routes */}
                <Route
                  path="/projects/:projectId/details"
                  element={
                    <ProtectedRoute requiredPermissions={["projects:read"]}>
                      <ProjectDetailsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Project Checklists Routes */}
                <Route
                  path="/projects/:projectId/checklists"
                  element={
                    <ProtectedRoute requiredPermissions={["checklists:read"]}>
                      <ProjectChecklistsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Project Tasks Routes */}
                <Route
                  path="/projects/:projectId/tasks"
                  element={
                    <ProtectedRoute requiredPermissions={["tasks:read"]}>
                      <ProjectTasksPage />
                    </ProtectedRoute>
                  }
                />

                {/* Task Management Routes */}
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute requiredPermissions={["tasks:read"]}>
                      <TasksPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute requiredPermissions={["reports:read"]}>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/meeting"
                  element={
                    <ProtectedRoute requiredPermissions={["meetings:read"]}>
                      <MeetingsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/cms/*"
                  element={
                    <ProtectedRoute requiredPermissions={["cms:read"]}>
                      <CMSPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute
                      requiredPermissions={["chat-module:access"]}
                    >
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all route */}
                <Route
                  path="*"
                  element={
                    <div className="min-h-96 flex items-center justify-center bg-gray-50 px-4">
                      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
                        {/* Accent Bar */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-primary-600" />

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                          <div className="h-14 w-14 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-2xl font-bold">
                            404
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                          Page Not Found
                        </h2>

                        {/* Description */}
                        <p className="text-slate-600 mb-6">
                          The page you’re trying to access doesn’t exist or may
                          have been moved.
                        </p>

                        {/* Action */}
                        <button
                          onClick={() => window.history.back()}
                          className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
                        >
                          Go Back
                        </button>

                        {/* Footer */}
                        <p className="mt-6 text-xs text-slate-400">
                          Error Code: 404
                        </p>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

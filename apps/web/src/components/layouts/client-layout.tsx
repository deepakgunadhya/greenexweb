import { Link, useLocation, useNavigate } from "react-router-dom";
import { useClientAuth } from "@/hooks/useClientAuth";
import { useState } from "react";

// Client navigation items - completely different from admin
const clientNavigation = [
  {
    name: "Dashboard",
    href: "/client/dashboard",
    icon: "🏠",
    description: "Overview of your projects and activities"
  },
  {
    name: "My Projects",
    href: "/client/projects",
    icon: "📋",
    description: "View your project status and reports"
  },
  {
    name: "Quotations",
    href: "/client/quotations",
    icon: "💰",
    description: "View and respond to quotations"
  },
  {
    name: "Meetings",
    href: "/client/meetings",
    icon: "📅",
    description: "Your scheduled meetings with Greenex team"
  },
  {
    name: "Reports & Documents",
    href: "/client/reports",
    icon: "📊",
    description: "Download reports and project documents"
  },
  {
    name: "Chat",
    href: "/client/chat",
    icon: "💬",
    description: "Message your Greenex team"
  },
  {
    name: "Support",
    href: "/client/support",
    icon: "🛟",
    description: "Get help and contact support"
  },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, getDisplayName, getOrganizationName } = useClientAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/client/login');
  };

  const currentPage = clientNavigation.find(
    item => item.href === location.pathname || 
    (item.href !== '/client/dashboard' && location.pathname.startsWith(item.href))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:z-0 lg:flex lg:w-72 lg:flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <h1 className="text-xl font-bold text-primary-600">Greenex</h1>
            </div>
            <button
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Client info banner */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 text-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">Welcome back,</p>
                <p className="text-base font-semibold">{getDisplayName()}</p>
                <p className="text-xs text-primary-100">{getOrganizationName()}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Client Portal
            </p>
            {clientNavigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/client/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 shadow-sm border border-primary-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className={`text-xs mt-0.5 ${
                      isActive ? 'text-primary-600' : 'text-slate-500'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer with logout */}
          <div className="border-t border-slate-200 p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Client Portal v1.0
            </p>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />
          <div className="flex flex-1 items-center">
            <h1 className="text-lg font-semibold leading-6 text-slate-900">
              {currentPage?.name || "Dashboard"}
            </h1>
          </div>
        </div>

        {/* Page header - Desktop */}
        <div className="hidden lg:block bg-white border-b border-slate-200">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {currentPage?.name || "Dashboard"}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {currentPage?.description || "Welcome to your client portal"}
                </p>
              </div>
              <div className="text-sm text-slate-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <span>© 2024 Greenex Environmental Solutions</span>
              </div>
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <a href="#" className="text-sm text-slate-500 hover:text-slate-700">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-slate-500 hover:text-slate-700">
                  Terms of Service
                </a>
                <a href="#" className="text-sm text-slate-500 hover:text-slate-700">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
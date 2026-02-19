import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { PermissionGate } from "../../components/auth/permission-gate";

// Define navigation items with their required permissions
const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    // No permissions required for dashboard (accessible to all authenticated users)
  },
  {
    name: "Leads",
    href: "/leads",
    icon: "🎯",
    permissions: ["leads:read"],
  },
  {
    name: "Organizations",
    href: "/organizations",
    icon: "🏢",
    permissions: ["organizations:read"],
  },
  {
    name: "Projects",
    href: "/projects",
    icon: "📋",
    permissions: ["projects:read"],
  },
  {
    name: "Quotations",
    href: "/quotations",
    icon: "💰",
    permissions: ["quotations:read"],
  },
  {
    name: "Services",
    href: "/services", 
    icon: "🛠️",
    permissions: ["services:read"],
  },
  {
    name: "Checklist Templates",
    href: "/checklist-templates",
    icon: "📋",
    permissions: ["checklists:read"],
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: "✅",
    permissions: ["tasks:read"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: "📈",
    permissions: ["reports:read"],
  },
  {
    name: "CMS",
    href: "/cms",
    icon: "📝",
    permissions: ["cms:read"],
  },
  {
    name: "Users",
    href: "/users",
    icon: "👥",
    permissions: ["users:read"],
  },
  {
    name: "Roles",
    href: "/roles",
    icon: "🔐",
    permissions: ["roles:read"],
  },
  {
    name: "Meetings",
    href: "/meeting",
    icon: "📅",
    permissions: ["meetings:read"],
  },
  {
    name: "Chat",
    href: "/chat",
    icon: "💬",
    permissions: ["chat-module:access"],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex-shrink-0 flex flex-col h-screen">
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🌱</span>
            <h1 className="text-xl font-bold text-primary-600">Greenex</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Environmental Platform</p>
        </div>

        <nav className="px-6 flex-1 overflow-y-auto">
          <ul className="space-y-2 pb-4">
            {navigation.map((item) => {
              // If the item has no permissions, it's visible to all authenticated users
              const navItem = !item.permissions ? (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={location.pathname === item.href}
                />
              ) : (
                // If the item has permissions, wrap it with PermissionGate
                <PermissionGate
                  key={item.name}
                  requiredPermissions={item.permissions}
                >
                  <NavItem
                    item={item}
                    isActive={location.pathname === item.href}
                  />
                </PermissionGate>
              );

              return navItem;
            })}
          </ul>
        </nav>

        {/* User info at bottom */}
        <div className="p-6 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-3 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {(() => {
                  const currentNav = navigation.find(
                    (item) =>
                      item.href === location.pathname ||
                      (item.href === "/cms" &&
                        location.pathname.startsWith("/cms"))
                  );
                  return currentNav?.name || "Dashboard";
                })()}
              </h2>
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {/* Add any header actions here */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// Extracted NavItem component for better readability
function NavItem({
  item,
  isActive,
}: {
  item: { name: string; href: string; icon: string };
  isActive: boolean;
}) {
  return (
    <li>
      <Link
        to={item.href}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary-100 text-primary-700 border border-primary-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <span>{item.icon}</span>
        <span>{item.name}</span>
      </Link>
    </li>
  );
}

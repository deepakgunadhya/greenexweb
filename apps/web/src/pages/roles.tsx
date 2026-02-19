import { useEffect, useState, useMemo } from "react";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/dialogs";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "@/components/pagination/Pagination";

interface Permission {
  id: string;
  code: string;
  description: string;
  module: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  permissions: Permission[];
  userCount?: number;
  isDefault?: boolean;
}

interface CreateRoleForm {
  name: string;
  description: string;
  permissions: string[];
}

// Define atomic permissions per SRS requirements - matching backend format
const AVAILABLE_PERMISSIONS: Permission[] = [
  // User management
  {
    id: "users:read",
    code: "users:read",
    description: "View users",
    module: "Users",
  },
  {
    id: "users:create",
    code: "users:create",
    description: "Create users",
    module: "Users",
  },
  {
    id: "users:update",
    code: "users:update",
    description: "Update users",
    module: "Users",
  },
  {
    id: "users:delete",
    code: "users:delete",
    description: "Delete users",
    module: "Users",
  },

  // Role management
  {
    id: "roles:read",
    code: "roles:read",
    description: "View roles",
    module: "Roles",
  },
  {
    id: "roles:create",
    code: "roles:create",
    description: "Create roles",
    module: "Roles",
  },
  {
    id: "roles:update",
    code: "roles:update",
    description: "Update roles",
    module: "Roles",
  },
  {
    id: "roles:delete",
    code: "roles:delete",
    description: "Delete roles",
    module: "Roles",
  },

  // Organization & CRM
  {
    id: "organizations:read",
    code: "organizations:read",
    description: "View organizations",
    module: "Organizations",
  },
  {
    id: "organizations:create",
    code: "organizations:create",
    description: "Create organizations",
    module: "Organizations",
  },
  {
    id: "organizations:update",
    code: "organizations:update",
    description: "Update organizations",
    module: "Organizations",
  },
  {
    id: "organizations:delete",
    code: "organizations:delete",
    description: "Delete organizations",
    module: "Organizations",
  },
  {
    id: "leads:read",
    code: "leads:read",
    description: "View leads",
    module: "CRM",
  },
  {
    id: "leads:create",
    code: "leads:create",
    description: "Create leads",
    module: "CRM",
  },
  {
    id: "leads:update",
    code: "leads:update",
    description: "Update leads",
    module: "CRM",
  },
  {
    id: "leads:delete",
    code: "leads:delete",
    description: "Delete leads",
    module: "CRM",
  },

  // Services & Projects
  {
    id: "services:read",
    code: "services:read",
    description: "View services",
    module: "Services",
  },
  {
    id: "services:create",
    code: "services:create",
    description: "Create services",
    module: "Services",
  },
  {
    id: "services:update",
    code: "services:update",
    description: "Update services",
    module: "Services",
  },
  {
    id: "services:delete",
    code: "services:delete",
    description: "Delete services",
    module: "Services",
  },
  {
    id: "quotations:read",
    code: "quotations:read",
    description: "View quotations",
    module: "Quotations",
  },
  {
    id: "quotations:create",
    code: "quotations:create",
    description: "Create quotations",
    module: "Quotations",
  },
  {
    id: "quotations:update",
    code: "quotations:update",
    description: "Update quotations",
    module: "Quotations",
  },
  {
    id: "quotations:delete",
    code: "quotations:delete",
    description: "Delete quotations",
    module: "Quotations",
  },
  {
    id: "projects:read",
    code: "projects:read",
    description: "View projects",
    module: "Projects",
  },
  {
    id: "projects:create",
    code: "projects:create",
    description: "Create projects",
    module: "Projects",
  },
  {
    id: "projects:update",
    code: "projects:update",
    description: "Update projects",
    module: "Projects",
  },
  {
    id: "projects:delete",
    code: "projects:delete",
    description: "Delete projects",
    module: "Projects",
  },

  // Tasks & Checklists
  {
    id: "tasks:read",
    code: "tasks:read",
    description: "View tasks",
    module: "Tasks",
  },
  {
    id: "tasks:read-all",
    code: "tasks:read-all",
    description: "View all tasks across all users",
    module: "Tasks",
  },
  {
    id: "tasks:create",
    code: "tasks:create",
    description: "Create tasks",
    module: "Tasks",
  },
  {
    id: "tasks:update",
    code: "tasks:update",
    description: "Update tasks",
    module: "Tasks",
  },
  {
    id: "tasks:delete",
    code: "tasks:delete",
    description: "Delete tasks",
    module: "Tasks",
  },
  {
    id: "tasks:assign",
    code: "tasks:assign",
    description: "Assign tasks to users",
    module: "Tasks",
  },
  {
    id: "tasks:manage-locks",
    code: "tasks:manage-locks",
    description: "Manage locked tasks and review unlock requests",
    module: "Tasks",
  },
  {
    id: "checklists:read",
    code: "checklists:read",
    description: "View checklists",
    module: "Checklists",
  },
  {
    id: "checklists:create",
    code: "checklists:create",
    description: "Create checklists",
    module: "Checklists",
  },
  {
    id: "checklists:update",
    code: "checklists:update",
    description: "Update checklists",
    module: "Checklists",
  },
  {
    id: "checklists:delete",
    code: "checklists:delete",
    description: "Delete checklists",
    module: "Checklists",
  },
  {
    id: "checklists:verify",
    code: "checklists:verify",
    description: "Verify checklists",
    module: "Checklists",
  },
  {
    id: "checklists:submit",
    code: "checklists:submit",
    description: "Submit checklist documents (client upload)",
    module: "Checklists",
  },
  {
    id: "checklists:review",
    code: "checklists:review",
    description: "Review checklists",
    module: "Checklists",
  },

  // Reports & Documents
  {
    id: "reports:read",
    code: "reports:read",
    description: "View reports",
    module: "Reports",
  },
  {
    id: "reports:create",
    code: "reports:create",
    description: "Create reports",
    module: "Reports",
  },
  {
    id: "reports:update",
    code: "reports:update",
    description: "Update reports",
    module: "Reports",
  },
  {
    id: "reports:delete",
    code: "reports:delete",
    description: "Delete reports",
    module: "Reports",
  },
  {
    id: "comments:read",
    code: "comments:read",
    description: "View comments",
    module: "Comments",
  },
  {
    id: "comments:create",
    code: "comments:create",
    description: "Create comments",
    module: "Comments",
  },
  {
    id: "comments:update",
    code: "comments:update",
    description: "Update comments",
    module: "Comments",
  },
  {
    id: "comments:delete",
    code: "comments:delete",
    description: "Delete comments",
    module: "Comments",
  },

  // Payments & Invoicing
  {
    id: "payments:read",
    code: "payments:read",
    description: "View payments",
    module: "Payments",
  },
  {
    id: "payments:create",
    code: "payments:create",
    description: "Create payments",
    module: "Payments",
  },
  {
    id: "payments:update",
    code: "payments:update",
    description: "Update payments",
    module: "Payments",
  },
  {
    id: "payments:delete",
    code: "payments:delete",
    description: "Delete payments",
    module: "Payments",
  },

  // System & Settings
  {
    id: "system:read",
    code: "system:read",
    description: "View system settings",
    module: "System",
  },
  {
    id: "system:update",
    code: "system:update",
    description: "Update system settings",
    module: "System",
  },
  {
    id: "cms:read",
    code: "cms:read",
    description: "View CMS content",
    module: "CMS",
  },
  {
    id: "cms:create",
    code: "cms:create",
    description: "Create CMS content",
    module: "CMS",
  },
  {
    id: "cms:update",
    code: "cms:update",
    description: "Update CMS content",
    module: "CMS",
  },
  {
    id: "cms:delete",
    code: "cms:delete",
    description: "Delete CMS content",
    module: "CMS",
  },

  // Notifications & Analytics
  {
    id: "notifications:read",
    code: "notifications:read",
    description: "View notifications",
    module: "Notifications",
  },
  {
    id: "notifications:create",
    code: "notifications:create",
    description: "Create notifications",
    module: "Notifications",
  },
  {
    id: "analytics:read",
    code: "analytics:read",
    description: "View analytics",
    module: "Analytics",
  },
  {
    id: "exports:create",
    code: "exports:create",
    description: "Create exports",
    module: "Exports",
  },
  {
    id: "meetings:read",
    code: "meetings:read",
    description: "View meetings",
    module: "Meetings",
  },
  {
    id: "meetings:create",
    code: "meetings:create",
    description: "Create meetings",
    module: "Meetings",
  },
  {
    id: "meetings:update",
    code: "meetings:update",
    description: "Update meetings",
    module: "Meetings",
  },
  {
    id: "meetings:delete",
    code: "meetings:delete",
    description: "Delete meetings",
    module: "Meetings",
  },

  // ChatModule Access
  {
    id: "chat-module:access",
    code: "chat-module:access",
    description: "To Access Chat Module",
    module: "Chat Module",
  },
];

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmation = useConfirmation();
  const [formData, setFormData] = useState<CreateRoleForm>({
    name: "",
    description: "",
    permissions: [],
  });
  const [selectedModule, setSelectedModule] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [showViewForm, setShowViewForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Get unique modules for filter
  const modules = [
    "All",
    ...Array.from(new Set(AVAILABLE_PERMISSIONS.map((p) => p.module))),
  ];

  const filteredPermissions =
    selectedModule === "All"
      ? AVAILABLE_PERMISSIONS
      : AVAILABLE_PERMISSIONS.filter((p) => p.module === selectedModule);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        console.log("🔄 Fetching roles from database...");
        const response = await apiClient.get("/roles");
        console.log(
          "✅ Roles fetched successfully:",
          response.data.data?.length || 0,
        );
        setRoles(response.data.data || []);
      } catch (error) {
        console.error("❌ Error fetching roles:", error);
        // Fallback to empty array if API fails
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return roles.slice(start, start + currentPageSize);
  }, [roles, currentPage, currentPageSize]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingRole) {
        console.log("🔄 Updating role in database...", formData.name);
        const response = await apiClient.put(`/roles/${editingRole.id}`, {
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
        });

        console.log("✅ Role updated successfully");

        // Update local state with the response
        setRoles((prev) =>
          prev.map((role) =>
            role.id === editingRole.id ? response.data.data : role,
          ),
        );
        setEditingRole(null);
        toast.success("Role updated successfully"); // ← Added this
      } else {
        console.log("🔄 Creating new role in database...", formData.name);
        const response = await apiClient.post("/roles", {
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
        });

        console.log("✅ Role created successfully:", response.data.data);

        // Add to local state
        setRoles((prev) => [...prev, response.data.data]);
        toast.success("Role created successfully"); // ← Already exists but confirming
      }

      setShowCreateForm(false);
      resetForm();
    } catch (error: any) {
      console.error("❌ Error creating/updating role:", error);

      const errorMessage =
        error.response?.data?.message || "Error saving role. Please try again.";
      toast.error(errorMessage); // ← Changed from toast() to toast.error()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);

    let permissionCodes: string[] = [];
    if (Array.isArray(role.permissions)) {
      permissionCodes = role.permissions.map((p) =>
        typeof p === "string" ? p : p.code,
      );
    } else if (typeof role.permissions === "string") {
      try {
        const parsed = JSON.parse(role.permissions);
        permissionCodes = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn("Failed to parse permissions JSON:", role.permissions);
        permissionCodes = [];
      }
    }

    // Auto-add read permissions for existing selections
    const finalPermissions = ensureReadPermissions(permissionCodes);

    setFormData({
      name: role.name,
      description: role.description,
      permissions: finalPermissions,
    });
    setShowCreateForm(true);
  };

  const ensureReadPermissions = (permissions: string[]): string[] => {
    const result = [...permissions];

    // Find all modules that have create/update/delete
    const modulesNeedingRead = new Set<string>();
    result.forEach((code) => {
      const parts = code.split(":");
      const module = parts[0];
      const action = parts[1];
      if (["create", "update", "delete"].includes(action)) {
        modulesNeedingRead.add(module);
      }
    });

    // Auto-add read for those modules
    modulesNeedingRead.forEach((mod) => {
      const readPermission = `${mod}:read`;
      const readExists = AVAILABLE_PERMISSIONS.some(
        (p) => p.code === readPermission,
      );
      if (readExists && !result.includes(readPermission)) {
        result.push(readPermission);
      }
    });

    return result;
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", permissions: [] });
    setEditingRole(null);
  };

  const handleDeleteRole = (role: Role) => {
    confirmation.ask({
      title: "Delete Role?",
      description: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
      type: "danger",
      actionLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          console.log("🔄 Deleting role from database...", role.name);
          await apiClient.delete(`/roles/${role.id}`);
          console.log("✅ Role deleted successfully");

          // Remove from local state
          setRoles((prev) => prev.filter((r) => r.id !== role.id));

          // Show success toast
          toast.success("Role deleted successfully");
        } catch (error: any) {
          console.error("❌ Error deleting role:", error);

          const errorMessage =
            error.response?.data?.message ||
            "Error deleting role. Please try again.";

          toast.error(errorMessage);
        }
      },
    });
  };

  const handlePermissionChange = (permissionCode: string, checked: boolean) => {
    if (checked) {
      const newPermissions = [...formData.permissions, permissionCode];

      // Auto-add read permissions
      const finalPermissions = ensureReadPermissions(newPermissions);

      setFormData((prev) => ({
        ...prev,
        permissions: finalPermissions,
      }));
    } else {
      const parts = permissionCode.split(":");
      const module = parts[0];
      const action = parts[1];

      let permissionsToRemove = [permissionCode];

      // If unchecking read → remove all related permissions
      if (action === "read") {
        const relatedPermissions = [
          `${module}:create`,
          `${module}:update`,
          `${module}:delete`,
        ];
        permissionsToRemove = [
          permissionCode,
          ...relatedPermissions.filter((p) => formData.permissions.includes(p)),
        ];
      }

      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter(
          (p) => !permissionsToRemove.includes(p),
        ),
      }));
    }
  };

  const handleSelectAllModule = () => {
    const modulePermissions = filteredPermissions.map((p) => p.code);
    const otherPermissions = formData.permissions.filter(
      (code) => !filteredPermissions.some((p) => p.code === code),
    );

    const allPermissions = [...otherPermissions, ...modulePermissions];

    // Auto-add read permissions
    const finalPermissions = ensureReadPermissions(allPermissions);

    setFormData((prev) => ({
      ...prev,
      permissions: finalPermissions,
    }));
  };

  const handleDeselectAllModule = () => {
    const modulePermissionCodes = filteredPermissions.map((p) => p.code);

    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.filter(
        (code) => !modulePermissionCodes.includes(code),
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmationDialog {...confirmation.dialog} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
          <p className="text-sm text-slate-600">
            Create and manage user roles with granular permissions
          </p>
        </div>
        <PermissionGate requiredPermissions={["roles:create"]}>
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Role
          </button>
        </PermissionGate>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedRoles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {role.name}
                </h3>
                {role.isDefault && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
                    Default Role
                  </span>
                )}
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  role.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {role.status}
              </span>
            </div>

            <p className="text-sm text-slate-600 mb-4">{role.description}</p>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Users: {role.userCount}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Permissions (
                  {(() => {
                    if (Array.isArray(role.permissions)) {
                      return role.permissions.length;
                    } else if (typeof role.permissions === "string") {
                      try {
                        const parsed = JSON.parse(role.permissions);
                        return Array.isArray(parsed) ? parsed.length : 0;
                      } catch (e) {
                        return 0;
                      }
                    }
                    return 0;
                  })()}
                  )
                </p>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    // Handle permissions - they might be JSON string or array
                    let permissions: Permission[] = [];
                    if (Array.isArray(role.permissions)) {
                      permissions = role.permissions;
                    } else if (typeof role.permissions === "string") {
                      try {
                        const parsed = JSON.parse(role.permissions);
                        if (Array.isArray(parsed)) {
                          // Map string codes to permission objects
                          permissions = parsed
                            .map((code) =>
                              AVAILABLE_PERMISSIONS.find(
                                (p) => p.code === code,
                              ),
                            )
                            .filter(Boolean) as Permission[];
                        }
                      } catch (e) {
                        permissions = [];
                      }
                    }

                    return (
                      <>
                        {permissions.slice(0, 3).map((permission) => (
                          <span
                            key={permission.code}
                            className="inline-flex px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded"
                          >
                            {permission.module}
                          </span>
                        ))}
                        {permissions.length > 3 && (
                          <span className="inline-flex px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded">
                            +{permissions.length - 3} more
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center space-x-2 mt-4 pt-4 border-t border-slate-100">
              {/* View Button */}
              <button
                onClick={() => {
                  setSelectedRole(role);
                  setShowViewForm(true);
                }} // Placeholder for future implementation
                className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                title="View Details"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>

              {/* Edit Button */}
              <PermissionGate requiredPermissions={["roles:update"]}>
                <button
                  onClick={() => handleEditRole(role)}
                  className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit Role"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </PermissionGate>

              {/* Delete Button */}
              {!role.isDefault && (
                <PermissionGate requiredPermissions={["roles:delete"]}>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Role"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </PermissionGate>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(roles.length / currentPageSize)}
        totalItems={roles.length}
        pageSize={currentPageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Create/Edit Role Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingRole ? "Edit Role" : "Create New Role"}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <form onSubmit={handleCreateRole} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Role Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter role name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Module Filter
                    </label>
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {modules.map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Description *
                  </label>
                  <textarea
                    id="description"
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Describe the role and its responsibilities"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Permissions ({formData.permissions.length} selected)
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAllModule}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Select All {selectedModule}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllModule}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                      >
                        Deselect All {selectedModule}
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredPermissions.map((permission) => (
                        <label
                          key={permission.code}
                          className="flex items-start space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(
                              permission.code,
                            )}
                            onChange={(e) =>
                              handlePermissionChange(
                                permission.code,
                                e.target.checked,
                              )
                            }
                            className="mt-0.5 text-primary-600 focus:ring-primary-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-900">
                              {permission.code}
                            </span>
                            <p className="text-xs text-slate-500">
                              {permission.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={
                  isSubmitting || !formData.name || !formData.description
                }
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingRole
                    ? "Update Role"
                    : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewForm && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl  max-w-xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                View Role
              </h2>
              <button
                onClick={() => {
                  setShowViewForm(false);
                  setSelectedRole(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* Role Name */}
              <div>
                <p className="text-sm font-medium text-slate-500">Role Name</p>
                <p className="text-sm text-slate-900 mt-1">
                  {selectedRole.name}
                </p>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Description
                </p>
                <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg">
                  {selectedRole.description}
                </p>
              </div>

              {/* Permissions */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Permissions
                </p>

                {(() => {
                  const permissionCodes = Array.isArray(
                    selectedRole.permissions,
                  )
                    ? selectedRole.permissions.map((p: any) =>
                        typeof p === "string" ? p : p.code,
                      )
                    : [];

                  return (
                    <div className="border border-slate-200 rounded-lg p-4 max-h-80 ">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AVAILABLE_PERMISSIONS.map((permission) => {
                          const hasPermission = permissionCodes.includes(
                            permission.code,
                          );

                          return (
                            <div
                              key={permission.code}
                              className="flex items-start space-x-2"
                            >
                              {/* Symbol */}
                              <span
                                className={`mt-0.5 text-sm font-bold ${
                                  hasPermission
                                    ? "text-green-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {hasPermission ? "✓" : "—"}
                              </span>

                              {/* Text */}
                              <div>
                                <span className="text-sm font-medium text-slate-900">
                                  {permission.code}
                                </span>
                                <p className="text-xs text-slate-500">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex p-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowViewForm(false);
                  setSelectedRole(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/dialogs";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "@/components/pagination/Pagination";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles:
    | string[]
    | Array<{
        id: number;
        userId: number;
        roleId: number;
        role: { id: number; name: string; description: string };
      }>;
  permissions: string[];
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  lastLoginAt?: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

interface AddUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  userType: "internal" | "client";
  organizationId?: string | undefined;
  roles: number[];
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const confirmation = useConfirmation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roles: [] as number[],
  });
  const [reload, setReload] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [formData, setFormData] = useState<AddUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    userType: "internal",
    organizationId: undefined,
    roles: [],
  });

  // Default system roles (in real app, fetch from roles API)
  const defaultRoles: Role[] = [
    {
      id: 1,
      name: "Super Admin",
      description: "Full access to all modules & settings",
      status: "ACTIVE",
    },
    {
      id: 2,
      name: "Operations Manager",
      description: "Project creation, checklist management, workflow control",
      status: "ACTIVE",
    },
    {
      id: 3,
      name: "Analyst / Engineer",
      description: "View assigned projects, manage execution tasks",
      status: "ACTIVE",
    },
    {
      id: 4,
      name: "Reviewer / QA",
      description: "Access verification gate, approve/reject checklists",
      status: "ACTIVE",
    },
    {
      id: 5,
      name: "Sales Executive",
      description: "Manage Leads/Opportunities, create quotations",
      status: "ACTIVE",
    },
    {
      id: 6,
      name: "Accounts Executive",
      description: "Manage payment status, generate invoices",
      status: "ACTIVE",
    },
    {
      id: 7,
      name: "CMS Admin",
      description: "Manage blog posts, graphics, videos",
      status: "ACTIVE",
    },
    {
      id: 8,
      name: "Client User",
      description: "Access client portal and mobile app",
      status: "ACTIVE",
    },
  ];

  const fetchUsers = useCallback(async (page = currentPage, size = pageSize) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("pageSize", size.toString());
      const usersResponse = await apiClient.get(`/users?${params.toString()}`);
      const usersData =
        usersResponse.data.data?.users || usersResponse.data.data || [];
      setUsers(usersData);
      if (usersResponse.data.meta) {
        setTotalItems(usersResponse.data.meta.total);
        setTotalPages(usersResponse.data.meta.totalPages);
        setCurrentPage(usersResponse.data.meta.page);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [, rolesResponse, orgsResponse] = await Promise.all([
          fetchUsers(1, pageSize),
          apiClient.get("/roles/lookup"),
          apiClient.get("/organizations/lookup"),
        ]);

        setAvailableRoles(rolesResponse.data.data || []);
        setOrganizations(orgsResponse.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setAvailableRoles(defaultRoles);
        setUsers([]);
        setOrganizations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [reload]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    setGeneralError("");

    try {
      console.log(
        "🔄 Creating new user in database...",
        formData.firstName,
        formData.lastName
      );

      const requestData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        // Don't send phone field if empty - backend doesn't accept empty strings
        ...(formData.phone && { phone: formData.phone }),
        roleIds: formData.roles, // Send role IDs to the API (backend expects roleIds)
        // Don't send organizationId if undefined
        ...(formData.organizationId && {
          organizationId: formData.organizationId,
        }),
      };

      console.log("📤 Request data being sent:", requestData);

      // Call the API to create the user
      const response = await apiClient.post("/users", requestData);

      console.log("✅ User created successfully:", response.data.data);
      toast.success("User created successfully");

      // Add the newly created user to the local state
      const newUser: User = {
        id: response.data.data.id,
        firstName: response.data.data.firstName,
        lastName: response.data.data.lastName,
        email: response.data.data.email,
        roles:
          response.data.data.roles ||
          formData.roles
            .map((roleId) => {
              const role = availableRoles.find((r) => r.id === roleId);
              return role ? role.name : "";
            })
            .filter(Boolean),
        permissions: [], // Permissions derived from roles
        status: "ACTIVE",
        isActive: true,
        createdAt: response.data.data.createdAt || new Date().toISOString(),
      };

      setUsers((prev) => [...prev, newUser]);
      setShowAddForm(false);
      resetForm();
    } catch (error: any) {
      console.error("❌ Error creating user:", error);

      if (error.response?.data?.error?.details) {
        // Handle validation errors from backend
        setFormErrors(error.response.data.error.details);
      } else if (error.response?.data?.error?.message) {
        // Handle other API errors (like duplicate email)
        setGeneralError(error.response.data.error.message);
      } else if (error.response?.data?.message) {
        // Handle simple error messages
        setGeneralError(error.response.data.message);
      } else {
        // Fallback error message
        setGeneralError("Error creating user. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      userType: "internal",
      organizationId: undefined,
      roles: [],
    });
    setFormErrors({});
    setGeneralError("");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (roleId: number, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({ ...prev, roles: [...prev.roles, roleId] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        roles: prev.roles.filter((r) => r !== roleId),
      }));
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);

    // Extract role names from the user.roles array (handling both string and object formats)
    const userRoleNames = (Array.isArray(user.roles) ? user.roles : [])
      .map((role: any) => {
        return typeof role === "string"
          ? role
          : role?.role?.name || role?.name || "";
      })
      .filter(Boolean);

    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: availableRoles
        .filter((role) => userRoleNames.includes(role.name))
        .map((role) => role.id),
    });
    setShowEditModal(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      console.log(
        "🔄 Updating user...",
        editFormData.firstName,
        editFormData.lastName
      );

      // Prepare update data including roles
      const updateData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        roleIds: editFormData.roles, // Include role updates (backend expects roleIds)
      };

      await apiClient.put(
        `/users/${selectedUser.id}`,
        updateData
      );
      console.log("✅ User updated successfully");
      toast.success("User updated successfully");

      // Update local state with new role names
      const updatedRoleNames = availableRoles
        .filter((role) => editFormData.roles.includes(role.id))
        .map((role) => role.name);

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                firstName: editFormData.firstName,
                lastName: editFormData.lastName,
                email: editFormData.email,
                roles: updatedRoleNames,
              }
            : user
        )
      );

      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error("❌ Error updating user:", error);

      if (error.response?.data?.error?.details) {
        // Handle validation errors from backend
        setFormErrors(error.response.data.error.details);
      } else if (error.response?.data?.error?.message) {
        // Handle other API errors (like duplicate email)
        setGeneralError(error.response.data.error.message);
      } else if (error.response?.data?.message) {
        // Handle simple error messages
        setGeneralError(error.response.data.message);
      } else {
        // Fallback error message
        setGeneralError("Error updating user. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRoleChange = (roleId: number, checked: boolean) => {
    if (checked) {
      setEditFormData((prev) => ({ ...prev, roles: [...prev.roles, roleId] }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        roles: prev.roles.filter((r) => r !== roleId),
      }));
    }
  };

  const handleDeactivateUser = (user: User) => {
    // Check if admin user
    if (user.email === "admin@greenex.com") {
      toast.error("Cannot deactivate the system administrator account.");
      return;
    }

    confirmation.ask({
      title: `${user.isActive ? "Deactivate User?" : "Active User?"}`,
      description: `Are you sure you want to ${user.isActive ? "deactivate" : "activate"} ${user.firstName} ${user.lastName}? This will ${user.isActive ? "restrict" : "grant"} their access to the system.`,
      type: "warning",
      actionLabel: `${user.isActive ? "Deactivate" : "Active"}`,
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          console.log("🔄 Deactivating user...", user.firstName, user.lastName);
          await apiClient.delete(`/users/${user.id}`);
          console.log("✅ User deactivated successfully");

          // Remove from local state
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          setReload((prev) => !prev);
          // Show success toast
          toast.success("User deactivated successfully");
        } catch (error: any) {
          console.error("❌ Error deactivating user:", error);

          const errorMessage =
            error.response?.data?.message ||
            "Error deactivating user. Please try again.";

          toast.error(errorMessage);
        }
      },
    });
  };

  const getStatusColor = (isActive: boolean) => {
    if (isActive) {
      return "bg-green-100 text-green-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-purple-100 text-purple-800";
      case "Manager":
        return "bg-blue-100 text-blue-800";
      case "Consultant":
        return "bg-green-100 text-green-800";
      case "Viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
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
          <p className="text-sm text-slate-600">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <PermissionGate requiredPermissions={["users:create"]}>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add User
          </button>
        </PermissionGate>
      </div>

      {/* Users List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">All Users</h3>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-slate-400">👥</span>
            </div>
            <p className="text-slate-500 mb-4">No users found</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Add your first user
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(user.roles) ? user.roles : []).map(
                          (role, index) => {
                            // Handle both string and object formats for backward compatibility
                            const roleName =
                              typeof role === "string"
                                ? role
                                : role?.role?.name || (role as any)?.name || "Unknown";
                            const roleKey =
                              typeof role === "string"
                                ? role
                                : `${role?.id || index}`;

                            return (
                              <span
                                key={roleKey}
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(roleName)}`}
                              >
                                {roleName}
                              </span>
                            );
                          }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.isActive)}`}
                      >
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View User"
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
                        <PermissionGate requiredPermissions={["users:update"]}>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User"
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
                        <PermissionGate requiredPermissions={["users:delete"]}>
                          <button
                            onClick={() => handleDeactivateUser(user)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title={
                              user.isActive ? "Deactivate User" : "Active User"
                            }
                          >
                          {user.isActive ? (
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
                          ) : (
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                        </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          loading={isLoading}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchUsers(page, pageSize);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
            fetchUsers(1, size);
          }}
        />
      </div>

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Add User</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Error Messages */}
              {generalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{generalError}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.firstName
                          ? "border-red-300 bg-red-50"
                          : "border-slate-300"
                      }`}
                      placeholder="John"
                    />
                    {formErrors.firstName && (
                      <div className="mt-1">
                        {formErrors.firstName.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.lastName
                          ? "border-red-300 bg-red-50"
                          : "border-slate-300"
                      }`}
                      placeholder="Doe"
                    />
                    {formErrors.lastName && (
                      <div className="mt-1">
                        {formErrors.lastName.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      formErrors.email
                        ? "border-red-300 bg-red-50"
                        : "border-slate-300"
                    }`}
                    placeholder="john.doe@greenex.com"
                  />
                  {formErrors.email && (
                    <div className="mt-1">
                      {formErrors.email.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      formErrors.password
                        ? "border-red-300 bg-red-50"
                        : "border-slate-300"
                    }`}
                    placeholder="Enter secure password"
                  />
                  {formErrors.password && (
                    <div className="mt-1">
                      {formErrors.password.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Must be at least 8 characters with uppercase, lowercase, and
                    number
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="userType"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    User Type *
                  </label>
                  <select
                    id="userType"
                    name="userType"
                    required
                    value={formData.userType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="internal">Internal User</option>
                    <option value="client">Client User</option>
                  </select>
                </div>

                {formData.userType === "client" && (
                  <div>
                    <label
                      htmlFor="organizationId"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Client Organization *
                    </label>
                    <select
                      id="organizationId"
                      name="organizationId"
                      required
                      value={formData.organizationId ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          organizationId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assign Roles * ({formData.roles.length} selected)
                  </label>
                  <div
                    className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${
                      formErrors.roleIds
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="space-y-3">
                      {availableRoles
                        .filter((role) =>
                          formData.userType === "client"
                            ? role.name === "Client User"
                            : role.name !== "Client User"
                        )
                        .map((role) => (
                          <label
                            key={role.id}
                            className="flex items-start space-x-3 p-2 border border-slate-100 rounded hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={formData.roles.includes(role.id)}
                              onChange={(e) =>
                                handleRoleChange(role.id, e.target.checked)
                              }
                              className="mt-0.5 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">
                                {role.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {role.description}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                  {formErrors.roleIds && (
                    <div className="mt-1">
                      {formErrors.roleIds.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Permissions are automatically inherited from selected roles.
                    Manage permissions through Role Management.
                  </p>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Adding..." : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                User Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <p className="text-slate-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <p className="text-slate-900">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Roles
                </label>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(selectedUser.roles)
                    ? selectedUser.roles
                    : []
                  ).map((role, index) => {
                    // Handle both string and object formats for backward compatibility
                    const roleName =
                      typeof role === "string"
                        ? role
                        : role?.role?.name || (role as any)?.name || "Unknown";
                    const roleKey =
                      typeof role === "string" ? role : `${role?.id || index}`;

                    return (
                      <span
                        key={roleKey}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(roleName)}`}
                      >
                        {roleName}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.isActive)}`}
                >
                  {selectedUser.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Login
                </label>
                <p className="text-slate-900">
                  {selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Created
                </label>
                <p className="text-slate-900">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-slate-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Edit User
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
                <div>
                  <label
                    htmlFor="editFirstName"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="editFirstName"
                    required
                    value={editFormData.firstName}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editLastName"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="editLastName"
                    required
                    value={editFormData.lastName}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editEmail"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    required
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Roles ({editFormData.roles.length} selected)
                  </label>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {availableRoles.map((role) => (
                        <label
                          key={role.id}
                          className="flex items-start space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={editFormData.roles.includes(role.id)}
                            onChange={(e) =>
                              handleEditRoleChange(role.id, e.target.checked)
                            }
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-900">
                              {role.name}
                            </span>
                            <p className="text-xs text-slate-500">
                              {role.description}
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
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditUser}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

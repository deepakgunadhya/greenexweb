import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/dialogs";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "@/components/pagination/Pagination";

interface Organization {
  id: number;
  name: string;
  type: string;
  industry: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AddOrganizationForm {
  name: string;
  type: "CLIENT" | "PROSPECT" | "PARTNER";
  industry: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}
// Validation functions
const validateEmail = (email: string): string | null => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return null;

  // Remove spaces, dashes, parentheses
  const cleanPhone = phone.replace(/[\s()-]/g, "");

  // Allow optional +91 at the start
  const numberWithoutCode = cleanPhone.replace(/^(\+91)/, "");

  if (!/^\d+$/.test(numberWithoutCode)) {
    return "Phone number must contain digits only";
  }

  if (numberWithoutCode.length !== 10) {
    return "Indian mobile number must be exactly 10 digits";
  }

  if (!/^[6-9]\d{9}$/.test(numberWithoutCode)) {
    return "Indian mobile number must start with 6, 7, 8, or 9";
  }

  return null;
};

const validateWebsite = (website: string): string | null => {
  if (!website) return null;
  try {
    const url = new URL(website);
    if (!url.protocol.match(/^https?:$/)) {
      return "Website must start with http:// or https://";
    }
    return null;
  } catch {
    return "Please enter a valid website URL";
  }
};

const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`;
  }
  const trimmedValue = value.trim();

    // Check max length for organization name
  if (fieldName === "Organization name" && trimmedValue.length > 250) {
    return `${fieldName} must be less than 250 characters`;
  }
  // Only letters, numbers, and spaces
  if (!/^[A-Za-z0-9\s]+$/.test(trimmedValue)) {
    return `${fieldName} must contain only letters and numbers`;
  }
  // Must contain at least one letter
  if (!/[A-Za-z]/.test(trimmedValue)) {
    return `${fieldName} must contain at least one letter`;
  }
  return null;
};

const validatePostalCode = (postalCode: string): string | null => {
  if (!postalCode) return null;

  // Remove any spaces
  const cleanPostalCode = postalCode.replace(/\s+/g, "");

  if (!/^\d+$/.test(cleanPostalCode)) {
    return "Postal code must contain digits only";
  }

  if (cleanPostalCode.length !== 6) {
    return "Postal code must be exactly 6 digits";
  }

  return null;
};

// Replace the existing validateTextOnly function
const validateTextOnly = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === "") return null;
  const trimmedValue = value.trim();

  // Only letters and spaces allowed
  if (!/^[A-Za-z\s]+$/.test(trimmedValue)) {
    return `${fieldName} must contain letters only`;
  }

  return null;
};

// Add new validation function for industry (letters, numbers, and spaces allowed but not only numbers)
const validateIndustry = (value: string): string | null => {
  if (!value || value.trim() === "") return null;
  const trimmedValue = value.trim();

  // Must contain at least one letter
  if (!/[A-Za-z]/.test(trimmedValue)) {
    return "Industry must contain at least one letter";
  }

  // Only letters, numbers, and spaces allowed
  if (!/^[A-Za-z0-9\s]+$/.test(trimmedValue)) {
    return "Industry must contain only letters and numbers";
  }

  return null;
};

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const confirmation = useConfirmation();
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "",
    industry: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    website: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [generalError, setGeneralError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState<AddOrganizationForm>({
    name: "",
    type: "PROSPECT",
    industry: "",
    email: "",
    phone: "",
    website: "",
    address: "",
  });

  const fetchOrganizations = useCallback(
    async (page = currentPage, size = pageSize) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", size.toString());
        const response = await apiClient.get(
          `/organizations?${params.toString()}`,
        );
        setOrganizations(response.data.data || []);
        if (response.data.meta) {
          setTotalItems(response.data.meta.total);
          setTotalPages(response.data.meta.totalPages);
          setCurrentPage(response.data.meta.page);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchOrganizations(1, pageSize);
  }, []);

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case "name":
        return validateRequired(value, "Organization name");
      case "type":
        return validateRequired(value, "Type");
      case "industry":
        return validateIndustry(value);
      case "email":
        return validateEmail(value);
      case "phone":
        return validatePhone(value);
      case "website":
        return validateWebsite(value);
      case "postalCode":
        return validatePostalCode(value);
      case "city":
        return validateTextOnly(value, "City");
      case "state":
        return validateTextOnly(value, "State");
      case "country":
        return validateTextOnly(value, "Country");
      default:
        return null;
    }
  };

  const validateForm = (
    data: typeof formData | typeof editFormData,
  ): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    const nameError = validateRequired(data.name, "Organization name");
    if (nameError) errors.name = nameError;

    const typeError = validateRequired(data.type, "Type");
    if (typeError) errors.type = typeError;

    // Optional fields - validate only if provided
    if (data.industry) {
      const industryError = validateIndustry(data.industry);
      if (industryError) errors.industry = industryError;
    }

    if (data.email) {
      const emailError = validateEmail(data.email);
      if (emailError) errors.email = emailError;
    }

    if (data.phone) {
      const phoneError = validatePhone(data.phone);
      if (phoneError) errors.phone = phoneError;
    }

    if (data.website) {
      const websiteError = validateWebsite(data.website);
      if (websiteError) errors.website = websiteError;
    }

    if (data.postalCode) {
      const postalError = validatePostalCode(data.postalCode);
      if (postalError) errors.postalCode = postalError;
    }

    if (data.city) {
      const cityError = validateTextOnly(data.city, "City");
      if (cityError) errors.city = cityError;
    }

    if (data.state) {
      const stateError = validateTextOnly(data.state, "State");
      if (stateError) errors.state = stateError;
    }

    if (data.country) {
      const countryError = validateTextOnly(data.country, "Country");
      if (countryError) errors.country = countryError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    const allFields = Object.keys(formData).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setTouchedFields(allFields);

    if (!validateForm(formData)) {
      setGeneralError("Please fix the validation errors before submitting");
      return;
    }

    setIsSubmitting(true);
    setGeneralError("");

    try {
      console.log("Creating new organization...", formData.name);

      const requestData = {
        name: formData.name,
        type: formData.type,
        ...(formData.industry && { industry: formData.industry }),
        ...(formData.email && { email: formData.email }),
        ...(formData.phone && { phone: formData.phone }),
        ...(formData.website && { website: formData.website }),
        ...(formData.address && { address: formData.address }),
        ...(formData.city && { city: formData.city }),
        ...(formData.state && { state: formData.state }),
        ...(formData.country && { country: formData.country }),
        ...(formData.postalCode && { postalCode: formData.postalCode }),
      };

      const response = await apiClient.post("/organizations", requestData);
      console.log("Organization created successfully");

      setOrganizations((prev) => [...prev, response.data.data]);
      toast.success("Organization created successfully");
      setShowAddForm(false);
      resetForm();
      setGeneralError("");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Error creating organization. Please try again.";
      toast.error(errorMessage);
      setGeneralError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "PROSPECT",
      industry: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    });
    setFieldErrors({});
    setTouchedFields({});
    setGeneralError("");
    setFormErrors({});
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touchedFields[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error || "",
      }));
    }
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));

    if (touchedFields[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error || "",
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error || "",
    }));
  };

  const handleViewOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowViewModal(true);
  };

  const handleEditOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setEditFormData({
      name: organization.name,
      type: organization.type,
      industry: organization.industry,
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      city: organization.city || "",
      state: organization.state || "",
      country: organization.country || "",
      postalCode: organization.postalCode || "",
      website: organization.website || "",
    });
    setShowEditModal(true);
    setFieldErrors({});
    setTouchedFields({});
  };

  const handleSaveEditOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization) return;

    const allFields = Object.keys(editFormData).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setTouchedFields(allFields);

    if (!validateForm(editFormData as any)) {
      setGeneralError("Please fix the validation errors before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Updating organization...", editFormData.name);
      await apiClient.put(
        `/organizations/${selectedOrganization.id}`,
        editFormData,
      );
      console.log("Organization updated successfully");

      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === selectedOrganization.id
            ? { ...org, ...editFormData, updatedAt: new Date().toISOString() }
            : org,
        ),
      );
      toast.success("Organization updated successfully");
      setShowEditModal(false);
      setSelectedOrganization(null);
      setFieldErrors({});
      setTouchedFields({});
      setGeneralError("");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Error updating organization. Please try again.";
      toast.error(errorMessage);
      setGeneralError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleDeactivateOrganization = async (organization: Organization) => {
  //   if (
  //     !confirm(
  //       `Are you sure you want to deactivate ${organization.name}? This action will remove them from the active list.`
  //     )
  //   ) {
  //     return;
  //   }

  //   try {
  //     console.log("🔄 Deactivating organization...", organization.name);
  //     await apiClient.delete(`/organizations/${organization.id}`);
  //     console.log("✅ Organization deactivated successfully");

  //     // Remove from local state
  //     setOrganizations((prev) =>
  //       prev.filter((org) => org.id !== organization.id)
  //     );
  //   } catch (error: any) {
  //     console.error("❌ Error deactivating organization:", error);

  //     const errorMessage =
  //       error.response?.data?.message ||
  //       "Error deactivating organization. Please try again.";
  //     alert(errorMessage);
  //   }
  // };

  const handleDeactivateOrganization = (organization: Organization) => {
    confirmation.ask({
      title: "Delete Organization?",
      description: `Are you sure you want to delete the organization "${organization.name}"? This action cannot be undone.`,
      type: "danger",
      actionLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          console.log(
            "🔄 Deleting organization from database...",
            organization.name,
          );
          await apiClient.delete(`organizations/${organization.id}`);
          console.log("✅ Organization deleted successfully");

          // Update local state
          setOrganizations((prev) =>
            prev.filter((r) => r.id !== organization.id),
          );

          // Show success toast
          toast.success("Organization deleted successfully");
        } catch (error: any) {
          console.error("❌ Error deleting Organization:", error);

          const errorMessage =
            error.response?.data?.message ||
            "Error deleting organization. Please try again.";

          toast.error(errorMessage);
        }
      },
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CLIENT":
        return "bg-green-100 text-green-800";
      case "PROSPECT":
        return "bg-yellow-100 text-yellow-800";
      case "PARTNER":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
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
            Manage your clients, partners, and prospects
          </p>
        </div>
        <PermissionGate requiredPermissions={["organizations:create"]}>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Organization
          </button>
        </PermissionGate>
      </div>

      {/* Organizations List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">
            All Organizations
          </h3>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-slate-400">🏢</span>
            </div>
            <p className="text-slate-500">No organizations found</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Add your first organization
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {org.name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {org.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          org.type === "CLIENT"
                            ? "bg-green-100 text-green-800"
                            : org.type === "PROSPECT"
                              ? "bg-yellow-100 text-yellow-800"
                              : org.type === "PARTNER"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {org.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {org.industry || "Not specified"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewOrganization(org)}
                          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Organization"
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
                        <PermissionGate
                          requiredPermissions={["organizations:update"]}
                        >
                          <button
                            onClick={() => handleEditOrganization(org)}
                            className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Organization"
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
                        <PermissionGate
                          requiredPermissions={["organizations:delete"]}
                        >
                          <button
                            onClick={() => handleDeactivateOrganization(org)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate Organization"
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
            fetchOrganizations(page, pageSize);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
            fetchOrganizations(1, size);
          }}
        />
      </div>

      {/* Add Organization Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Add Organization
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* General Error Display */}
              {generalError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleAddOrganization} className="space-y-4">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                    Basic Information
                  </h3>

                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.name
                          ? "border-red-300 bg-red-50"
                          : "border-slate-300"
                      }`}
                      placeholder="Enter organization name"
                    />

                    {fieldErrors.name && touchedFields.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="type"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Type *
                      </label>
                      <select
                        id="type"
                        name="type"
                        required
                        value={formData.type}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          formErrors.type
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                      >
                        <option value="PROSPECT">Prospect</option>
                        <option value="CLIENT">Client</option>
                        <option value="PARTNER">Partner</option>
                        <option value="VENDOR">Vendor</option>
                      </select>
                      {fieldErrors.type && touchedFields.type && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.type}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="industry"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Industry
                      </label>
                      <input
                        type="text"
                        id="industry"
                        name="industry"
                        value={formData.industry}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          formErrors.industry
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                        placeholder="e.g. Technology"
                      />
                      {formErrors.industry && (
                        <div className="mt-1 text-sm text-red-600">
                          {formErrors.industry.map((error, index) => (
                            <div key={index}>{error}</div>
                          ))}
                        </div>
                      )}
                      {fieldErrors.industry && touchedFields.industry && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.industry}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          formErrors.email
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                        placeholder="contact@example.com"
                      />
                      {fieldErrors.email && touchedFields.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter phone number"
                      />
                      {fieldErrors.phone && touchedFields.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="website"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                    {fieldErrors.website && touchedFields.website && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.website}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                    Address Information
                  </h3>

                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="city"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Pune"
                      />
                      {fieldErrors.city && touchedFields.city && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="state"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        State/Province
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="MH"
                      />
                      {fieldErrors.state && touchedFields.state && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="country"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="India"
                      />
                      {fieldErrors.country && touchedFields.country && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.country}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="postalCode"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Postal Code
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="10001"
                      />
                      {fieldErrors.postalCode && touchedFields.postalCode && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOrganization}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Adding..." : "Add Organization"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Organization Modal */}
      {showViewModal && selectedOrganization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Organization Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  Basic Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name
                  </label>
                  <p className="text-slate-900">{selectedOrganization.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                      selectedOrganization.type,
                    )}`}
                  >
                    {selectedOrganization.type}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Industry
                  </label>
                  <p className="text-slate-900">
                    {selectedOrganization.industry || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  Contact Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <p className="text-slate-900">
                    {selectedOrganization.email || "Not provided"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <p className="text-slate-900">
                    {selectedOrganization.phone || "Not provided"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Website
                  </label>
                  {selectedOrganization.website ? (
                    <a
                      href={selectedOrganization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      {selectedOrganization.website}
                    </a>
                  ) : (
                    <p className="text-slate-900">Not provided</p>
                  )}
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  Address Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Street Address
                    </label>
                    <p className="text-slate-900">
                      {selectedOrganization.address || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      State/Province
                    </label>
                    <p className="text-slate-900">
                      {selectedOrganization.state || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <p className="text-slate-900">
                      {selectedOrganization.city || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Postal Code
                    </label>
                    <p className="text-slate-900">
                      {selectedOrganization.postalCode || "Not provided"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country
                  </label>
                  <p className="text-slate-900">
                    {selectedOrganization.country || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Created At */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Created
                </label>
                <p className="text-slate-900">
                  {new Date(
                    selectedOrganization.createdAt,
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
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

      {/* Edit Organization Modal */}
      {showEditModal && selectedOrganization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Edit Organization
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setFieldErrors({});
                  setTouchedFields({});
                  setGeneralError("");
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* General Error Display */}
              {generalError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSaveEditOrganization} className="space-y-4">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                    Basic Information
                  </h3>

                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.name
                          ? "border-red-300 bg-red-50"
                          : "border-slate-300"
                      }`}
                      placeholder="Enter organization name"
                    />
                    {fieldErrors.name && touchedFields.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="type"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Type *
                      </label>
                      <select
                        id="type"
                        name="type"
                        required
                        value={editFormData.type}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          formErrors.type
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                      >
                        <option value="PROSPECT">Prospect</option>
                        <option value="CLIENT">Client</option>
                        <option value="PARTNER">Partner</option>
                        <option value="VENDOR">Vendor</option>
                      </select>
                      {fieldErrors.type && touchedFields.type && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.type}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="industry"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Industry
                      </label>
                      <input
                        type="text"
                        id="industry"
                        name="industry"
                        value={editFormData.industry}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          formErrors.industry
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                        placeholder="e.g. Technology"
                      />
                      {formErrors.industry && (
                        <div className="mt-1 text-sm text-red-600">
                          {formErrors.industry.map((error, index) => (
                            <div key={index}>{error}</div>
                          ))}
                        </div>
                      )}
                      {fieldErrors.industry && touchedFields.industry && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.industry}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          formErrors.email
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                        placeholder="contact@example.com"
                      />
                      {fieldErrors.email && touchedFields.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter phone number"
                      />
                      {fieldErrors.phone && touchedFields.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="website"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={editFormData.website}
                      onChange={handleEditInputChange}
                      onBlur={handleBlur}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                    {fieldErrors.website && touchedFields.website && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.website}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                    Address Information
                  </h3>

                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="city"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={editFormData.city}
                        onChange={handleEditInputChange}
                         onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Pune"
                      />
                      {fieldErrors.city && touchedFields.city && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="state"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        State/Province
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={editFormData.state}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="MH"
                      />
                      {fieldErrors.state && touchedFields.state && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="country"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={editFormData.country}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="India"
                      />
                      {fieldErrors.country && touchedFields.country && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.country}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="postalCode"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Postal Code
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={editFormData.postalCode}
                        onChange={handleEditInputChange}
                        onBlur={handleBlur}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="10001"
                      />
                      {fieldErrors.postalCode && touchedFields.postalCode && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setFieldErrors({});
                  setTouchedFields({});
                  setGeneralError("");
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditOrganization}
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

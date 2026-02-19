import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchServices,
  createService,
  updateService,
  deleteService,
  clearError,
  setFilters,
  resetFilters,
  selectFilteredServices,
  selectServicesLoading,
  selectServicesCreating,
  selectServicesUpdating,
  selectServicesDeleting,
  selectServicesError,
  selectServicesFilters,
} from "../store/slices/servicesSlice";
import {
  Service,
  CreateServiceDto,
  UpdateServiceDto,
} from "../lib/api/services";
import { PermissionGate } from "../components/auth/permission-gate";
import { Pagination } from "../components/pagination/Pagination";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/dialogs";
import { useConfirmation } from "@/hooks/use-confirmation";

// ============ VALIDATION FUNCTIONS ============

const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`;
  }
  return null;
};

const validateServiceName = (name: string): string | null => {
  const requiredError = validateRequired(name, "Service name");
  if (requiredError) return requiredError;

  if (name.length < 2) {
    return "Service name must be at least 2 characters";
  }
  if (name.length > 100) {
    return "Service name cannot exceed 100 characters";
  }
  return null;
};

const validateCategory = (category?: string): string | null => {
  if (!category || category.trim() === "") {
    return "Category is required";
  }
  return null;
};

const validateBasePrice = (
  price: string | number | undefined
): string | null => {
  if (price === "" || price === null || price === undefined) return null; // Optional field

  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return "Please enter a valid price";
  }
  if (numPrice < 0) {
    return "Price cannot be negative";
  }
  if (numPrice > 1000000000) {
    return "Price cannot exceed ₹1,00,00,00,000";
  }
  return null;
};

const validateDescription = (description: string): string | null => {
  if (!description) return null; // Optional field
  if (description.length > 500) {
    return "Description cannot exceed 500 characters";
  }
  return null;
};

const validateUnit = (unit: string): string | null => {
  if (!unit) return null; // Optional field
  if (unit.length > 50) {
    return "Unit cannot exceed 50 characters";
  }
  return null;
};

export function ServicesPage() {
  const dispatch = useAppDispatch();

  const services = useAppSelector(selectFilteredServices);
  const isLoading = useAppSelector(selectServicesLoading);
  const isCreating = useAppSelector(selectServicesCreating);
  const isUpdating = useAppSelector(selectServicesUpdating);
  const isDeleting = useAppSelector(selectServicesDeleting);
  const error = useAppSelector(selectServicesError);
  const filters = useAppSelector(selectServicesFilters);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const confirmation = useConfirmation();
  // Validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );
  const [generalError, setGeneralError] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const [formData, setFormData] = useState<CreateServiceDto>({
    name: '',
    description: '',
    category: 'General',
    basePrice: undefined,
    unit: '',
    isActive: true,
    checklistTemplateIds: [],
  });

  // ============ VALIDATION HELPERS ============

  const validateField = (
    name: string,
    value: string | number | boolean | undefined
  ): string | null => {
    switch (name) {
      case "name":
        return validateServiceName(value as string);
      case "category":
        return validateCategory(value as string);
      case "basePrice":
        return validateBasePrice(value as string | number | undefined);
      case "description":
        return validateDescription(value as string);
      case "unit":
        return validateUnit(value as string);
      default:
        return null;
    }
  };

  const validateForm = (data: CreateServiceDto): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    const nameError = validateServiceName(data.name);
    if (nameError) errors.name = nameError;

    const categoryError = validateCategory(data.category);
    if (categoryError) errors.category = categoryError;

    // Optional fields with validation
    if (data.description) {
      const descError = validateDescription(data.description);
      if (descError) errors.description = descError;
    }

    if (data.unit) {
      const unitError = validateUnit(data.unit);
      if (unitError) errors.unit = unitError;
    }

    if (data.basePrice !== undefined && data.basePrice !== null) {
      const priceError = validateBasePrice(data.basePrice);
      if (priceError) errors.basePrice = priceError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============ HELPER FUNCTION FOR INPUT CLASSES ============

  const getInputClassName = (fieldName: string) => {
    const hasError = fieldErrors[fieldName] && touchedFields[fieldName];
    return `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
      hasError ? "" : "border-slate-300"
    }`;
  };

  useEffect(() => {
    dispatch(fetchServices(filters.includeInactive));
  }, [dispatch, filters.includeInactive]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = Object.keys(formData).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setTouchedFields(allFields);

    // Validate form
    if (!validateForm(formData)) {
      setGeneralError("Please fix the validation errors before submitting");
      return;
    }

    setGeneralError("");

    try {
      // Prepare request data
      const requestData: CreateServiceDto = {
        name: formData.name.trim(),
        category: formData.category,
        isActive: formData.isActive,
        checklistTemplateIds: formData.checklistTemplateIds,
        ...(formData.description && {
          description: formData.description.trim(),
        }),
        ...(formData.unit && { unit: formData.unit.trim() }),
        ...(formData.basePrice !== undefined && {
          basePrice: formData.basePrice,
        }),
      };

      await dispatch(createService(requestData)).unwrap();
      toast.success("Service created successfully");
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to create service:", error);
      const errorMessage =
        error?.message || "Error creating service. Please try again.";
      toast.error(errorMessage);
      setGeneralError(errorMessage);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    // Mark all fields as touched
    const allFields = Object.keys(formData).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setTouchedFields(allFields);

    // Validate form
    if (!validateForm(formData)) {
      setGeneralError("Please fix the validation errors before submitting");
      return;
    }

    setGeneralError("");

    try {
      const updateData: UpdateServiceDto = {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        category: formData.category,
        basePrice: formData.basePrice,
        unit: formData.unit?.trim(),
        isActive: formData.isActive,
        checklistTemplateIds: formData.checklistTemplateIds,
      };

      await dispatch(
        updateService({ id: selectedService.id, serviceData: updateData })
      ).unwrap();
      toast.success("Service updated successfully");
      setShowEditModal(false);
      setSelectedService(null);
      resetForm();
    } catch (error: any) {
      console.error("Failed to update service:", error);
      const errorMessage =
        error?.message || "Error updating service. Please try again.";
      toast.error(errorMessage);
      setGeneralError(errorMessage);
    }
  };

const handleDeleteService = (service: Service) => {
  confirmation.ask({
    title: "Deactivate Service?",
    description: `Are you sure you want to deactivate "${service.name}"? This action cannot be undone.`,
    type: "danger",
    actionLabel: "Deactivate",
    cancelLabel: "Cancel",
    onConfirm: async () => {
      try {
        console.log("🔄 Deactivating service...", service.name);

        await dispatch(deleteService(service.id)).unwrap();

        console.log("✅ Service deactivated successfully");
        toast.success("Service deactivated successfully");
      } catch (error: any) {
        console.error("❌ Failed to deactivate service:", error);

        toast.error(
          error?.message || "Error deactivating service. Please try again."
        );
      }
    },
  });
};


  const handleViewService = (service: Service) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category || "General",
      basePrice: service.basePrice,
      unit: service.unit || "",
      isActive: service.isActive,
      checklistTemplateIds:
        service.associatedChecklists?.map((cl) => cl.id) || [],
    });
    setFieldErrors({});
    setTouchedFields({});
    setGeneralError("");
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "General",
      basePrice: undefined,
      unit: "",
      isActive: true,
      checklistTemplateIds: [],
    });
    setFieldErrors({});
    setTouchedFields({});
    setGeneralError("");
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedService(null);
    resetForm();
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    const newValue =
      type === "checkbox"
        ? checked
        : type === "number"
          ? value
            ? Number(value)
            : undefined
          : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Real-time validation for touched fields
    if (touchedFields[name]) {
      const error = validateField(name, newValue);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error || "",
      }));
    }

    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError("");
    }
  };

  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error || "",
    }));
  };

  // Paginated services
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return services.slice(start, start + currentPageSize);
  }, [services, currentPage, currentPageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFilters({ search: e.target.value }));
    setCurrentPage(1);
  };

  const handleIncludeInactiveChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    dispatch(setFilters({ includeInactive: e.target.checked }));
    setCurrentPage(1);
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
          <h1 className="text-3xl font-heading font-semibold text-slate-900">
            Service Catalogue
          </h1>
          <p className="text-sm text-slate-600">
            Manage environmental consulting services, pricing, and checklist
            associations
          </p>
        </div>
        <PermissionGate requiredPermissions={["services:create"]}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Service
          </button>
        </PermissionGate>
      </div>


      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search services..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.includeInactive}
              onChange={handleIncludeInactiveChange}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Include inactive</span>
          </label>
          <button
            onClick={() => dispatch(resetFilters())}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-slate-400">🛠️</span>
            </div>
            <p className="text-slate-500 mb-4">No services found</p>
            <PermissionGate requiredPermissions={["services:create"]}>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Create your first service
              </button>
            </PermissionGate>
          </div>
        ) : (
          paginatedServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900 truncate flex-1 mr-2">
                  {service.name}
                </h3>
                <div className="flex items-center space-x-1">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      service.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {service.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {service.description}
                </p>
              )}

              <div className="space-y-3 mb-4">
                {service.basePrice && (
                  <div>
                    <p className="text-sm text-slate-500">Base Price</p>
                    <p className="text-sm font-medium text-slate-900">
                      ₹{service.basePrice.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="text-sm font-medium text-slate-900">
                    {service.category}
                  </p>
                </div>

                {service.associatedChecklists &&
                  service.associatedChecklists.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500">
                        Associated Checklists
                      </p>
                      <p className="text-sm text-slate-900">
                        {service.associatedChecklists.length} template
                        {service.associatedChecklists.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
              </div>

              {/* Standard Action Button Pattern */}
              <div className="flex justify-end items-center space-x-2 mt-4 pt-4 border-t border-slate-100">
                {/* View Button */}
                <button
                  onClick={() => handleViewService(service)}
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
                <PermissionGate requiredPermissions={["services:update"]}>
                  <button
                    onClick={() => handleEditService(service)}
                    className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit"
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
                <PermissionGate requiredPermissions={["services:delete"]}>
                  <button
                    onClick={() => handleDeleteService(service)}
                    disabled={isDeleting}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Deactivate"
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
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(services.length / currentPageSize)}
        totalItems={services.length}
        pageSize={currentPageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Create Service Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Create Service
              </h2>
              <button
                onClick={handleCloseModals}
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

              <form onSubmit={handleCreateService} className="space-y-4">
                {/* Service Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Service Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={getInputClassName("name")}
                    placeholder="e.g., Carbon Footprint Assessment"
                  />
                  {fieldErrors.name && touchedFields.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Description
                    <span className="text-slate-400 font-normal ml-1">
                      ({(formData.description || "").length}/500)
                    </span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    rows={3}
                    className={getInputClassName("description")}
                    placeholder="Brief description of the service"
                  />
                  {fieldErrors.description && touchedFields.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                {/* Category and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={getInputClassName("category")}
                    >
                      <option value="">Select category</option>
                      <option value="General">General</option>
                      <option value="Environmental Audit">
                        Environmental Audit
                      </option>
                      <option value="Carbon Assessment">
                        Carbon Assessment
                      </option>
                      <option value="Sustainability Consulting">
                        Sustainability Consulting
                      </option>
                      <option value="Compliance">Compliance</option>
                      <option value="Training">Training</option>
                    </select>
                    {fieldErrors.category && touchedFields.category && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="unit"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Unit
                    </label>
                    <input
                      type="text"
                      id="unit"
                      name="unit"
                      value={formData.unit || ""}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={getInputClassName("unit")}
                      placeholder="e.g., per project, per hour"
                    />
                    {fieldErrors.unit && touchedFields.unit && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.unit}
                      </p>
                    )}
                  </div>
                </div>

                {/* Base Price */}
                <div>
                  <label
                    htmlFor="basePrice"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Base Price (₹)
                  </label>
                  <input
                    type="number"
                    id="basePrice"
                    name="basePrice"
                    min="0"
                    step="0.01"
                    value={formData.basePrice ?? ""}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={getInputClassName("basePrice")}
                    placeholder="0.00"
                  />
                  {fieldErrors.basePrice && touchedFields.basePrice && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.basePrice}
                    </p>
                  )}
                </div>

                {/* Is Active Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 text-sm text-slate-700"
                  >
                    Active service (available for projects)
                  </label>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseModals}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateService}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Edit Service
              </h2>
              <button
                onClick={handleCloseModals}
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

              <form onSubmit={handleUpdateService} className="space-y-4">
                {/* Service Name */}
                <div>
                  <label
                    htmlFor="edit-name"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Service Name *
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={getInputClassName("name")}
                    placeholder="e.g., Carbon Footprint Assessment"
                  />
                  {fieldErrors.name && touchedFields.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="edit-description"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Description
                    <span className="text-slate-400 font-normal ml-1">
                      ({(formData.description || "").length}/500)
                    </span>
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    rows={3}
                    className={getInputClassName("description")}
                    placeholder="Brief description of the service"
                  />
                  {fieldErrors.description && touchedFields.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                {/* Category and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="edit-category"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Category *
                    </label>
                    <select
                      id="edit-category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={getInputClassName("category")}
                    >
                      <option value="">Select category</option>
                      <option value="General">General</option>
                      <option value="Environmental Audit">
                        Environmental Audit
                      </option>
                      <option value="Carbon Assessment">
                        Carbon Assessment
                      </option>
                      <option value="Sustainability Consulting">
                        Sustainability Consulting
                      </option>
                      <option value="Compliance">Compliance</option>
                      <option value="Training">Training</option>
                    </select>
                    {fieldErrors.category && touchedFields.category && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="edit-unit"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Unit
                    </label>
                    <input
                      type="text"
                      id="edit-unit"
                      name="unit"
                      value={formData.unit || ""}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={getInputClassName("unit")}
                      placeholder="e.g., per project, per hour"
                    />
                    {fieldErrors.unit && touchedFields.unit && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.unit}
                      </p>
                    )}
                  </div>
                </div>

                {/* Base Price */}
                <div>
                  <label
                    htmlFor="edit-basePrice"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Base Price (₹)
                  </label>
                  <input
                    type="number"
                    id="edit-basePrice"
                    name="basePrice"
                    min="0"
                    step="0.01"
                    value={formData.basePrice ?? ""}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={getInputClassName("basePrice")}
                    placeholder="0.00"
                  />
                  {fieldErrors.basePrice && touchedFields.basePrice && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.basePrice}
                    </p>
                  )}
                </div>

                {/* Is Active Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="edit-isActive"
                    className="ml-2 text-sm text-slate-700"
                  >
                    Active service (available for projects)
                  </label>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseModals}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpdateService}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Service Modal */}
      {showViewModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Service Details
              </h2>
              <button
                onClick={handleCloseModals}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-3">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Service Name</p>
                      <p className="font-medium">{selectedService.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedService.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {selectedService.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Category</p>
                      <p className="font-medium">{selectedService.category}</p>
                    </div>
                    {selectedService.basePrice && (
                      <div>
                        <p className="text-sm text-slate-500">Base Price</p>
                        <p className="font-medium">
                          ₹{selectedService.basePrice.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedService.unit && (
                      <div>
                        <p className="text-sm text-slate-500">Unit</p>
                        <p className="font-medium">{selectedService.unit}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedService.description && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-800 mb-3">
                      Description
                    </h3>
                    <p className="text-slate-600">
                      {selectedService.description}
                    </p>
                  </div>
                )}

                {/* Associated Checklists */}
                {selectedService.associatedChecklists &&
                  selectedService.associatedChecklists.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-slate-800 mb-3">
                        Associated Checklist Templates
                      </h3>
                      <div className="space-y-2">
                        {selectedService.associatedChecklists.map(
                          (checklist) => (
                            <div
                              key={checklist.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-slate-900">
                                  {checklist.name}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Category: {checklist.category}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-slate-200">
              <button
                onClick={handleCloseModals}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
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

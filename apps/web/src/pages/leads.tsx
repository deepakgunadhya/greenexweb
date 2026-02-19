import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "@/components/pagination/Pagination";

interface Organization {
  id: string;
  name: string;
  type: string;
  industry: string | null;
  email?: string;
  phone?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
}

interface Lead {
  id: string;
  organizationId: string;
  contactId?: string;
  source: "MOBILE_APP" | "MANUAL";
  status: "NEW" | "IN_PROGRESS" | "CLOSED";
  title: string;
  description?: string;
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  organization: Organization;
  contact?: Contact;
}

interface LeadResponse {
  success: boolean;
  data: Lead[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface LeadStats {
  totalLeads: number;
  byStatus: {
    new: number;
    inProgress: number;
    closed: number;
  };
  conversionRate: number;
  avgDealSize: number;
  leadsBySource: Array<{
    source: string;
    _count: { id: number };
  }>;
}

const statusColors = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
} as const;

const sourceColors = {
  MOBILE_APP: "bg-purple-100 text-purple-700",
  MANUAL: "bg-gray-100 text-gray-700",
} as const;

interface CreateLeadForm {
  title: string;
  description: string;
  organizationId?: string;
  companyName?: string;
  isExistingOrganization: boolean;
  contactId?: string;
  source: "MOBILE_APP" | "MANUAL";
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPosition?: string;
}

interface OrganizationOption {
  id: string;
  name: string;
  type: string;
}

// Validation Rules Constants
const VALIDATION_RULES = {
  title: {
    minLength: 3,
    maxLength: 255,
  },
  companyName: {
    minLength: 2,
    maxLength: 255,
  },
  description: {
    maxLength: 1000,
  },
  contactName: {
    minLength: 2,
    maxLength: 100,
  },
  contactPosition: {
    maxLength: 100,
  },
  estimatedValue: {
    min: 0,
    max: 999999999999,
  },
  probability: {
    min: 0,
    max: 100,
  },
  notes: {
    maxLength: 1000,
  },
  phone: {
    minDigits: 10,
    maxDigits: 15,
  },
} as const;

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateLeadForm>({
    title: "",
    description: "",
    isExistingOrganization: false,
    organizationId: "",
    companyName: "",
    source: "MANUAL",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactPosition: "",
  });
  const [editForm, setEditForm] = useState<CreateLeadForm>({
    title: "",
    description: "",
    isExistingOrganization: true,
    organizationId: "",
    companyName: "",
    source: "MANUAL",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactPosition: "",
  });
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  // Validation states
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============ VALIDATION FUNCTIONS ============

  const validateEmail = (email: string): boolean => {
    if (!email || typeof email !== "string") return false;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (trimmedEmail.length > 254) return false;
    if (trimmedEmail.includes("..")) return false;
    if (trimmedEmail.startsWith(".") || trimmedEmail.endsWith(".")) return false;

    return emailRegex.test(trimmedEmail);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone || typeof phone !== "string") return false;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return false;

    const digitsOnly = trimmedPhone.replace(/[\s\-().+]/g, "");

    if (!/^\d+$/.test(digitsOnly)) return false;

    return (
      digitsOnly.length >= VALIDATION_RULES.phone.minDigits &&
      digitsOnly.length <= VALIDATION_RULES.phone.maxDigits
    );
  };

  const hasValidContent = (value: string | undefined | null): boolean => {
    if (!value || typeof value !== "string") return false;
    return value.trim().length > 0;
  };

  // New validation: Check if value contains at least one letter (not just numbers)
  const containsLetter = (value: string | undefined | null): boolean => {
    if (!value || typeof value !== "string") return false;
    return /[a-zA-Z]/.test(value.trim());
  };

  const validateDate = (
    dateString: string,
    options: { mustBeFuture?: boolean; allowToday?: boolean } = {}
  ): { isValid: boolean; error?: string } => {
    if (!dateString) return { isValid: true };

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return { isValid: false, error: "Please enter a valid date" };
    }

    const minDate = new Date("1900-01-01");
    const maxDate = new Date("2100-12-31");
    if (date < minDate || date > maxDate) {
      return { isValid: false, error: "Please enter a reasonable date" };
    }

    if (options.mustBeFuture) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (options.allowToday) {
        if (date < today) {
          return {
            isValid: false,
            error: "Date must be today or in the future",
          };
        }
      } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (date < tomorrow) {
          return { isValid: false, error: "Date must be in the future" };
        }
      }
    }

    return { isValid: true };
  };

  const validateNumber = (
    value: number | string | undefined | null,
    options: {
      min?: number;
      max?: number;
      allowDecimal?: boolean;
      required?: boolean;
      fieldName?: string;
    } = {}
  ): { isValid: boolean; error?: string } => {
    const {
      min,
      max,
      allowDecimal = true,
      required = false,
      fieldName = "Value",
    } = options;

    if (value === undefined || value === null || value === "") {
      if (required) {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true };
    }

    const numValue = Number(value);

    if (isNaN(numValue)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }

    if (!isFinite(numValue)) {
      return { isValid: false, error: `${fieldName} value is too large` };
    }

    if (!allowDecimal && !Number.isInteger(numValue)) {
      return { isValid: false, error: `${fieldName} must be a whole number` };
    }

    if (min !== undefined && numValue < min) {
      return { isValid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (max !== undefined && numValue > max) {
      return { isValid: false, error: `${fieldName} must be at most ${max}` };
    }

    return { isValid: true };
  };

  const validateStringLength = (
    value: string | undefined | null,
    options: {
      minLength?: number;
      maxLength?: number;
      required?: boolean;
      fieldName?: string;
    } = {}
  ): { isValid: boolean; error?: string } => {
    const {
      minLength,
      maxLength,
      required = false,
      fieldName = "Field",
    } = options;

    const trimmedValue = value?.trim() || "";

    if (required && !trimmedValue) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    if (!trimmedValue) {
      return { isValid: true };
    }

    if (minLength !== undefined && trimmedValue.length < minLength) {
      return {
        isValid: false,
        error: `${fieldName} must be at least ${minLength} characters`,
      };
    }

    if (maxLength !== undefined && trimmedValue.length > maxLength) {
      return {
        isValid: false,
        error: `${fieldName} must be less than ${maxLength} characters`,
      };
    }

    return { isValid: true };
  };

  const validateForm = (
    form: CreateLeadForm,
    isEditMode: boolean = false
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Title validation - REQUIRED and must contain letters
    const titleValidation = validateStringLength(form.title, {
      required: true,
      minLength: VALIDATION_RULES.title.minLength,
      maxLength: VALIDATION_RULES.title.maxLength,
      fieldName: "Title",
    });
    if (!titleValidation.isValid && titleValidation.error) {
      errors.title = titleValidation.error;
    } else if (form.title?.trim() && !containsLetter(form.title)) {
      errors.title = "Title must contain letters, not just numbers";
    }

    // Organization validation
    if (isEditMode || form.isExistingOrganization) {
      if (!form.organizationId) {
        errors.organizationId = "Please select an organization";
      }
    } else {
      // Company name - REQUIRED and must contain letters
      const companyValidation = validateStringLength(form.companyName, {
        required: true,
        minLength: VALIDATION_RULES.companyName.minLength,
        maxLength: VALIDATION_RULES.companyName.maxLength,
        fieldName: "Company name",
      });
      if (!companyValidation.isValid && companyValidation.error) {
        errors.companyName = companyValidation.error;
      } else if (form.companyName?.trim() && !containsLetter(form.companyName)) {
        errors.companyName = "Company name must contain letters, not just numbers";
      }
    }

    // Description validation
    const descValidation = validateStringLength(form.description, {
      maxLength: VALIDATION_RULES.description.maxLength,
      fieldName: "Description",
    });
    if (!descValidation.isValid && descValidation.error) {
      errors.description = descValidation.error;
    }

    // Contact Name - REQUIRED and must contain letters
    const nameValidation = validateStringLength(form.contactName, {
      required: true,
      minLength: VALIDATION_RULES.contactName.minLength,
      maxLength: VALIDATION_RULES.contactName.maxLength,
      fieldName: "Contact name",
    });
    if (!nameValidation.isValid && nameValidation.error) {
      errors.contactName = nameValidation.error;
    } else if (form.contactName?.trim() && !containsLetter(form.contactName)) {
      errors.contactName = "Contact name must contain letters, not just numbers";
    }

    // Email - REQUIRED
    if (!hasValidContent(form.contactEmail)) {
      errors.contactEmail = "Email is required";
    } else if (!validateEmail(form.contactEmail!)) {
      errors.contactEmail = "Please enter a valid email address";
    }

    // Phone validation (optional)
    if (hasValidContent(form.contactPhone)) {
      if (!validatePhone(form.contactPhone!)) {
        errors.contactPhone = `Phone number must be ${VALIDATION_RULES.phone.minDigits}-${VALIDATION_RULES.phone.maxDigits} digits`;
      }
    }

    // Position validation - must contain letters if provided
    if (hasValidContent(form.contactPosition)) {
      const positionValidation = validateStringLength(form.contactPosition, {
        maxLength: VALIDATION_RULES.contactPosition.maxLength,
        fieldName: "Position",
      });
      if (!positionValidation.isValid && positionValidation.error) {
        errors.contactPosition = positionValidation.error;
      } else if (!containsLetter(form.contactPosition)) {
        errors.contactPosition = "Position must contain letters, not just numbers";
      }
    }

    // Estimated Value validation
    const estimatedValueValidation = validateNumber(form.estimatedValue, {
      min: VALIDATION_RULES.estimatedValue.min,
      max: VALIDATION_RULES.estimatedValue.max,
      allowDecimal: true,
      fieldName: "Estimated value",
    });
    if (!estimatedValueValidation.isValid && estimatedValueValidation.error) {
      errors.estimatedValue = estimatedValueValidation.error;
    }

    // Probability validation
    const probabilityValidation = validateNumber(form.probability, {
      min: VALIDATION_RULES.probability.min,
      max: VALIDATION_RULES.probability.max,
      allowDecimal: false,
      fieldName: "Probability",
    });
    if (!probabilityValidation.isValid && probabilityValidation.error) {
      errors.probability = probabilityValidation.error;
    }

    // Expected Close Date validation
    if (form.expectedCloseDate) {
      const dateValidation = validateDate(form.expectedCloseDate, {
        mustBeFuture: !isEditMode,
        allowToday: true,
      });
      if (!dateValidation.isValid && dateValidation.error) {
        errors.expectedCloseDate = dateValidation.error;
      }
    }

    // Notes validation
    const notesValidation = validateStringLength(form.notes, {
      maxLength: VALIDATION_RULES.notes.maxLength,
      fieldName: "Notes",
    });
    if (!notesValidation.isValid && notesValidation.error) {
      errors.notes = notesValidation.error;
    }

    return errors;
  };

  const validateField = (
    fieldName: keyof CreateLeadForm,
    value: unknown,
    form: CreateLeadForm,
    isEditMode: boolean = false
  ): string | null => {
    const tempForm = { ...form, [fieldName]: value };
    const errors = validateForm(tempForm, isEditMode);
    return errors[fieldName] || null;
  };

  const clearFieldError = (fieldName: string) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  const getInputClass = (fieldName: string) => {
    const baseClass =
      "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2";
    const errorClass = validationErrors[fieldName]
      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
      : "border-slate-300 focus:ring-primary-500";
    return `${baseClass} ${errorClass}`;
  };

  const renderFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      return (
        <p className="mt-1 text-sm text-red-600">
          {validationErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  const fetchLeads = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedSource !== "all") params.append("source", selectedSource);
      if (search.trim()) params.append("search", search.trim());
      params.append("page", page.toString());
      params.append("pageSize", size.toString());

      const url = `/leads?${params.toString()}`;

      const response = await apiClient.get<LeadResponse>(url);

      if (response.data.success) {
        setLeads(response.data.data);
        if (response.data.meta) {
          setTotalItems(response.data.meta.total);
          setTotalPages(response.data.meta.totalPages);
          setCurrentPage(response.data.meta.page);
        }
      } else {
        setError("Failed to fetch leads");
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      setError("Failed to fetch leads");
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: LeadStats;
      }>("/leads/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching lead stats:", err);
    }
  };

  const updateLeadStatus = async (
    leadId: string,
    newStatus: "NEW" | "IN_PROGRESS" | "CLOSED"
  ) => {
    try {
      const response = await apiClient.put<{ success: boolean; data: Lead }>(
        `/leads/${leadId}`,
        {
          status: newStatus,
        }
      );

      if (response.data.success) {
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
        toast.success(`Lead status updated to ${newStatus}`);
        fetchStats();
      }
    } catch (err: unknown) {
      console.error("Error updating lead status:", err);
      const errorMessage =
        (err as { data?: { error?: { message?: string } } })?.data?.error
          ?.message || "Failed to update lead status";
      toast.error(errorMessage);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: OrganizationOption[];
      }>("/organizations/lookup");
      const data = response.data?.data || response.data;
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

const createLead = async () => {
  try {
    setIsSubmitting(true);

    const errors = validateForm(createForm, false);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      const errorCount = Object.keys(errors).length;
      toast.error(
        `Please fix ${errorCount} validation error${errorCount > 1 ? "s" : ""}`
      );
      return;
    }

    const apiData = {
      title: createForm.title.trim(),
      description: createForm.description?.trim() || undefined,
      source: createForm.source,
      ...(createForm.isExistingOrganization
        ? { organizationId: createForm.organizationId }
        : { companyName: createForm.companyName?.trim() }),
      ...(createForm.contactName?.trim() && {
        contactName: createForm.contactName.trim(),
      }),
      ...(createForm.contactEmail?.trim() && {
        contactEmail: createForm.contactEmail.trim(),
      }),
      ...(createForm.contactPhone?.trim() && {
        contactPhone: createForm.contactPhone.trim(),
      }),
      ...(createForm.contactPosition?.trim() && {
        contactPosition: createForm.contactPosition.trim(),
      }),
      ...(createForm.estimatedValue && {
        estimatedValue: Number(createForm.estimatedValue),
      }),
      ...(createForm.probability && {
        probability: Number(createForm.probability),
      }),
      ...(createForm.expectedCloseDate && {
        expectedCloseDate: createForm.expectedCloseDate,
      }),
      ...(createForm.notes?.trim() && { notes: createForm.notes.trim() }),
    };

    const response = await apiClient.post<{ success: boolean; data: Lead }>(
      "/leads",
      apiData
    );

    if (response.data.success) {
      setCreateForm({
        title: "",
        description: "",
        isExistingOrganization: false,
        organizationId: "",
        companyName: "",
        source: "MANUAL",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactPosition: "",
      });
      setShowCreateModal(false);
      clearValidationErrors();
      toast.success("Lead created successfully");

      // Refresh the full list to get complete data with contacts
      await fetchLeads(1, pageSize);
      fetchStats();
      fetchOrganizations();
    }
  } catch (err: unknown) {
    console.error("Error creating lead:", err);
    const axiosError = err as {
      response?: {
        data?: {
          error?: { code?: string; message?: string; details?: unknown };
        };
      };
      data?: { error?: { message?: string } };
    };

    if (
      axiosError.response?.data?.error?.code === "VALIDATION_ERROR" &&
      axiosError.response?.data?.error?.details
    ) {
      const details = axiosError.response.data.error.details as Record<
        string,
        string | string[]
      >;
      const fieldErrors = Object.entries(details)
        .map(
          ([field, fieldErrs]) =>
            `${field}: ${Array.isArray(fieldErrs) ? fieldErrs.join(", ") : fieldErrs}`
        )
        .join(" | ");
      toast.error(`Validation Error: ${fieldErrors}`);
    } else {
      const errorMessage =
        axiosError.data?.error?.message || "Failed to create lead";
      toast.error(errorMessage);
    }
  } finally {
    setIsSubmitting(false);
  }
};

 const updateLead = async () => {
  if (!selectedLead) return;

  try {
    setIsSubmitting(true);

    const errors = validateForm(editForm, true);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      const errorCount = Object.keys(errors).length;
      toast.error(
        `Please fix ${errorCount} validation error${errorCount > 1 ? "s" : ""}`
      );
      return;
    }

    const apiData = {
      title: editForm.title.trim(),
      description: editForm.description?.trim() || undefined,
      source: editForm.source,
      organizationId: editForm.organizationId,
      ...(editForm.contactName?.trim() && {
        contactName: editForm.contactName.trim(),
      }),
      ...(editForm.contactEmail?.trim() && {
        contactEmail: editForm.contactEmail.trim(),
      }),
      ...(editForm.contactPhone?.trim() && {
        contactPhone: editForm.contactPhone.trim(),
      }),
      ...(editForm.contactPosition?.trim() && {
        contactPosition: editForm.contactPosition.trim(),
      }),
      ...(editForm.estimatedValue && {
        estimatedValue: Number(editForm.estimatedValue),
      }),
      ...(editForm.probability && {
        probability: Number(editForm.probability),
      }),
      ...(editForm.expectedCloseDate && {
        expectedCloseDate: editForm.expectedCloseDate,
      }),
      ...(editForm.notes?.trim() && { notes: editForm.notes.trim() }),
    };

    const response = await apiClient.put<{ success: boolean; data: Lead }>(
      `/leads/${selectedLead.id}`,
      apiData
    );

    if (response.data.success) {
      setShowEditModal(false);
      setSelectedLead(null);
      clearValidationErrors();
      toast.success("Lead updated successfully");

      // Refresh the full list to get complete data with contacts
      await fetchLeads(currentPage, pageSize);
      fetchStats();
    }
  } catch (err: unknown) {
    console.error("Error updating lead:", err);
    const errorMessage =
      (err as { data?: { error?: { message?: string } } })?.data?.error
        ?.message || "Failed to update lead";
    toast.error(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditForm({
      title: lead.title,
      description: lead.description || "",
      isExistingOrganization: true,
      organizationId: lead.organizationId,
      companyName: lead.organization.name,
      contactId: lead.contactId,
      source: lead.source,
      estimatedValue: lead.estimatedValue || undefined,
      probability: lead.probability || undefined,
      expectedCloseDate: lead.expectedCloseDate
        ? new Date(lead.expectedCloseDate).toISOString().split("T")[0]
        : "",
      notes: lead.notes || undefined,
      contactName: lead.contact
        ? `${lead.contact.firstName || ""} ${lead.contact.lastName || ""}`.trim()
        : "",
      contactEmail: lead.contact?.email || "",
      contactPhone: lead.contact?.phone || "",
      contactPosition: lead.contact?.position || "",
    });
    clearValidationErrors();
    setShowEditModal(true);
  };

  useEffect(() => {
    fetchLeads(1, pageSize);
    setCurrentPage(1);
    fetchStats();
    fetchOrganizations();
  }, [selectedStatus, selectedSource, isOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Lead Management
          </h1>
          <p className="text-slate-600 mt-1">
            Track and manage your sales leads
          </p>
        </div>
        <PermissionGate requiredPermissions={["leads:create"]}>
          <button
            onClick={() => {
              setShowCreateModal(true);
              clearValidationErrors();
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create Lead
          </button>
        </PermissionGate>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-slate-900">
              {stats.totalLeads}
            </div>
            <div className="text-sm text-slate-600">Total Leads</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">
              {stats.byStatus.new}
            </div>
            <div className="text-sm text-slate-600">New Leads</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-amber-600">
              {stats.byStatus.inProgress}
            </div>
            <div className="text-sm text-slate-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-green-600">
              {stats.byStatus.closed}
            </div>
            <div className="text-sm text-slate-600">Closed Leads</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Sources</option>
              <option value="MOBILE_APP">Mobile App</option>
              <option value="MANUAL">Manual Entry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
            />
          </div>

          <button
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 h-9 m-6 self-end rounded-lg font-medium transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {error ? (
          <div className="p-4 text-red-600">Error: {error}</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No leads found. Try adjusting your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Lead Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {lead.title}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {lead.description}
                        </div>
                        {lead.contact && (
                          <div className="text-xs text-slate-400 mt-1">
                            Contact: {lead.contact.firstName}{" "}
                            {lead.contact.lastName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {lead.organization.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {lead.organization.type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sourceColors[lead.source]}`}
                      >
                        {lead.source.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) =>
                          updateLeadStatus(
                            lead.id,
                            e.target.value as "NEW" | "IN_PROGRESS" | "CLOSED"
                          )
                        }
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-primary-500 ${statusColors[lead.status]}`}
                      >
                        <option value="NEW">NEW</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">
                        {lead.estimatedValue
                          ? `$${Number(lead.estimatedValue).toLocaleString()}`
                          : "-"}
                      </div>
                      {lead.probability && (
                        <div className="text-xs text-slate-500">
                          {lead.probability}% probability
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewLead(lead)}
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
                        <PermissionGate requiredPermissions={["leads:update"]}>
                          <button
                            onClick={() => handleEditLead(lead)}
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
          loading={loading}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchLeads(page, pageSize);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
            fetchLeads(1, size);
          }}
        />
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Create New Lead
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }));
                    clearFieldError("title");
                  }}
                  onBlur={() => {
                    const error = validateField(
                      "title",
                      createForm.title,
                      createForm,
                      false
                    );
                    if (error) {
                      setValidationErrors((prev) => ({ ...prev, title: error }));
                    }
                  }}
                  className={getInputClass("title")}
                  placeholder="Lead title"
                />
                {renderFieldError("title")}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    clearFieldError("description");
                  }}
                  onBlur={() => {
                    const error = validateField(
                      "description",
                      createForm.description,
                      createForm,
                      false
                    );
                    if (error) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        description: error,
                      }));
                    }
                  }}
                  className={getInputClass("description")}
                  rows={3}
                  placeholder="Lead description"
                />
                {renderFieldError("description")}
              </div>

              {/* Organization Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Organization *
                </label>
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!createForm.isExistingOrganization}
                      onChange={() => {
                        setCreateForm((prev) => ({
                          ...prev,
                          isExistingOrganization: false,
                          organizationId: "",
                          companyName: "",
                        }));
                        clearFieldError("organizationId");
                        clearFieldError("companyName");
                      }}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">New Company</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={createForm.isExistingOrganization}
                      onChange={() => {
                        setCreateForm((prev) => ({
                          ...prev,
                          isExistingOrganization: true,
                          organizationId: "",
                          companyName: "",
                        }));
                        clearFieldError("organizationId");
                        clearFieldError("companyName");
                      }}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">
                      Existing Organization
                    </span>
                  </label>
                </div>

                {createForm.isExistingOrganization ? (
                  <div>
                    <select
                      value={createForm.organizationId || ""}
                      onChange={(e) => {
                        setCreateForm((prev) => ({
                          ...prev,
                          organizationId: e.target.value,
                        }));
                        clearFieldError("organizationId");
                      }}
                      onBlur={() => {
                        if (
                          createForm.isExistingOrganization &&
                          !createForm.organizationId
                        ) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            organizationId: "Please select an organization",
                          }));
                        }
                      }}
                      className={getInputClass("organizationId")}
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.type})
                        </option>
                      ))}
                    </select>
                    {renderFieldError("organizationId")}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={createForm.companyName || ""}
                      onChange={(e) => {
                        setCreateForm((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }));
                        clearFieldError("companyName");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "companyName",
                          createForm.companyName,
                          createForm,
                          false
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            companyName: error,
                          }));
                        }
                      }}
                      className={getInputClass("companyName")}
                      placeholder="Company name"
                    />
                    {renderFieldError("companyName")}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Source
                </label>
                <select
                  value={createForm.source}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      source: e.target.value as "MOBILE_APP" | "MANUAL",
                    }))
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="MANUAL">Manual Entry</option>
                  <option value="MOBILE_APP">Mobile App</option>
                </select>
              </div>

              {/* Contact Information Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Contact Information *
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={createForm.contactName || ""}
                      onChange={(e) => {
                        setCreateForm((prev) => ({
                          ...prev,
                          contactName: e.target.value,
                        }));
                        clearFieldError("contactName");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "contactName",
                          createForm.contactName,
                          createForm,
                          false
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactName: error,
                          }));
                        }
                      }}
                      className={getInputClass("contactName")}
                      placeholder="Full name"
                    />
                    {renderFieldError("contactName")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={createForm.contactPosition || ""}
                      onChange={(e) => {
                        setCreateForm((prev) => ({
                          ...prev,
                          contactPosition: e.target.value,
                        }));
                        clearFieldError("contactPosition");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "contactPosition",
                          createForm.contactPosition,
                          createForm,
                          false
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactPosition: error,
                          }));
                        }
                      }}
                      className={getInputClass("contactPosition")}
                      placeholder="Job title"
                    />
                    {renderFieldError("contactPosition")}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={createForm.contactEmail || ""}
                      onChange={(e) => {
                        setCreateForm((prev) => ({
                          ...prev,
                          contactEmail: e.target.value,
                        }));
                        clearFieldError("contactEmail");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "contactEmail",
                          createForm.contactEmail,
                          createForm,
                          false
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactEmail: error,
                          }));
                        }
                      }}
                      className={getInputClass("contactEmail")}
                      placeholder="contact@company.com"
                    />
                    {renderFieldError("contactEmail")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={createForm.contactPhone || ""}
                      onChange={(e) => {
                        setCreateForm((prev) => ({
                          ...prev,
                          contactPhone: e.target.value,
                        }));
                        clearFieldError("contactPhone");
                      }}
                      onBlur={() => {
                        if (
                          createForm.contactPhone?.trim() &&
                          !validatePhone(createForm.contactPhone)
                        ) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactPhone: `Phone number must be ${VALIDATION_RULES.phone.minDigits}-${VALIDATION_RULES.phone.maxDigits} digits`,
                          }));
                        }
                      }}
                      className={getInputClass("contactPhone")}
                      placeholder="+1-555-123-4567"
                    />
                    {renderFieldError("contactPhone")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estimated Value
                  </label>
                  <input
                    type="number"
                    value={createForm.estimatedValue || ""}
                    onChange={(e) => {
                      setCreateForm((prev) => ({
                        ...prev,
                        estimatedValue: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }));
                      clearFieldError("estimatedValue");
                    }}
                    onBlur={() => {
                      const validation = validateNumber(
                        createForm.estimatedValue,
                        {
                          min: VALIDATION_RULES.estimatedValue.min,
                          max: VALIDATION_RULES.estimatedValue.max,
                          fieldName: "Estimated value",
                        }
                      );
                      if (!validation.isValid && validation.error) {
                        const errorMsg = validation.error;
                        setValidationErrors((prev) => ({
                          ...prev,
                          estimatedValue: errorMsg,
                        }));
                      }
                    }}
                    className={getInputClass("estimatedValue")}
                    placeholder="0"
                  />
                  {renderFieldError("estimatedValue")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.probability || ""}
                    onChange={(e) => {
                      setCreateForm((prev) => ({
                        ...prev,
                        probability: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }));
                      clearFieldError("probability");
                    }}
                    onBlur={() => {
                      const validation = validateNumber(createForm.probability, {
                        min: VALIDATION_RULES.probability.min,
                        max: VALIDATION_RULES.probability.max,
                        allowDecimal: false,
                        fieldName: "Probability",
                      });
                      if (!validation.isValid && validation.error) {
                        const errorMsg = validation.error;
                        setValidationErrors((prev) => ({
                          ...prev,
                          probability: errorMsg,
                        }));
                      }
                    }}
                    className={getInputClass("probability")}
                    placeholder="50"
                  />
                  {renderFieldError("probability")}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={createForm.expectedCloseDate || ""}
                  onChange={(e) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      expectedCloseDate: e.target.value,
                    }));
                    clearFieldError("expectedCloseDate");
                  }}
                  onBlur={() => {
                    const validation = validateDate(
                      createForm.expectedCloseDate || "",
                      {
                        mustBeFuture: true,
                        allowToday: true,
                      }
                    );
                    if (!validation.isValid && validation.error) {
                      const errorMsg = validation.error;
                      setValidationErrors((prev) => ({
                        ...prev,
                        expectedCloseDate: errorMsg,
                      }));
                    }
                  }}
                  className={getInputClass("expectedCloseDate")}
                />
                {renderFieldError("expectedCloseDate")}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={createForm.notes || ""}
                  onChange={(e) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }));
                    clearFieldError("notes");
                  }}
                  onBlur={() => {
                    const error = validateField(
                      "notes",
                      createForm.notes,
                      createForm,
                      false
                    );
                    if (error) {
                      setValidationErrors((prev) => ({ ...prev, notes: error }));
                    }
                  }}
                  className={getInputClass("notes")}
                  rows={2}
                  placeholder="Additional notes"
                />
                {renderFieldError("notes")}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  clearValidationErrors();
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createLead}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Lead Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Title
                  </label>
                  <p className="text-slate-900">{selectedLead.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedLead.status]}`}
                  >
                    {selectedLead.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <p className="text-slate-900">
                  {selectedLead.description || "No description"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Organization
                  </label>
                  <p className="text-slate-900">
                    {selectedLead.organization.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedLead.organization.type}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Source
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sourceColors[selectedLead.source]}`}
                  >
                    {selectedLead.source.replace("_", " ")}
                  </span>
                </div>
              </div>

              {selectedLead.contact && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Contact
                  </label>
                  <p className="text-slate-900">
                    {selectedLead.contact.firstName}{" "}
                    {selectedLead.contact.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedLead.contact.email}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Estimated Value
                  </label>
                  <p className="text-slate-900">
                    {selectedLead.estimatedValue
                      ? `$${Number(selectedLead.estimatedValue).toLocaleString()}`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Probability
                  </label>
                  <p className="text-slate-900">
                    {selectedLead.probability
                      ? `${selectedLead.probability}%`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              {selectedLead.expectedCloseDate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Expected Close Date
                  </label>
                  <p className="text-slate-900">
                    {new Date(
                      selectedLead.expectedCloseDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}

              {selectedLead.notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <p className="text-slate-900">{selectedLead.notes}</p>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-slate-500">
                Created: {new Date(selectedLead.createdAt).toLocaleString()}
                <br />
                Updated: {new Date(selectedLead.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Edit Lead
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, title: e.target.value }));
                    clearFieldError("title");
                  }}
                  onBlur={() => {
                    const error = validateField(
                      "title",
                      editForm.title,
                      editForm,
                      true
                    );
                    if (error) {
                      setValidationErrors((prev) => ({ ...prev, title: error }));
                    }
                  }}
                  className={getInputClass("title")}
                />
                {renderFieldError("title")}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => {
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    clearFieldError("description");
                  }}
                  onBlur={() => {
                    const error = validateField(
                      "description",
                      editForm.description,
                      editForm,
                      true
                    );
                    if (error) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        description: error,
                      }));
                    }
                  }}
                  className={getInputClass("description")}
                  rows={3}
                />
                {renderFieldError("description")}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization *
                </label>
                <select
                  value={editForm.organizationId}
                  onChange={(e) => {
                    setEditForm((prev) => ({
                      ...prev,
                      organizationId: e.target.value,
                    }));
                    clearFieldError("organizationId");
                  }}
                  onBlur={() => {
                    if (!editForm.organizationId) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        organizationId: "Please select an organization",
                      }));
                    }
                  }}
                  className={getInputClass("organizationId")}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type})
                    </option>
                  ))}
                </select>
                {renderFieldError("organizationId")}
              </div>

              {/* Contact Information Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Contact Information *
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.contactName || ""}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          contactName: e.target.value,
                        }));
                        clearFieldError("contactName");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "contactName",
                          editForm.contactName,
                          editForm,
                          true
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactName: error,
                          }));
                        }
                      }}
                      className={getInputClass("contactName")}
                      placeholder="Full name"
                    />
                    {renderFieldError("contactName")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={editForm.contactPosition || ""}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          contactPosition: e.target.value,
                        }));
                        clearFieldError("contactPosition");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "contactPosition",
                          editForm.contactPosition,
                          editForm,
                          true
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactPosition: error,
                          }));
                        }
                      }}
                      className={getInputClass("contactPosition")}
                      placeholder="Job title"
                    />
                    {renderFieldError("contactPosition")}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editForm.contactEmail || ""}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          contactEmail: e.target.value,
                        }));
                        clearFieldError("contactEmail");
                      }}
                      onBlur={() => {
                        const error = validateField(
                          "contactEmail",
                          editForm.contactEmail,
                          editForm,
                          true
                        );
                        if (error) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactEmail: error,
                          }));
                        }
                      }}
                      className={getInputClass("contactEmail")}
                      placeholder="contact@company.com"
                    />
                    {renderFieldError("contactEmail")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.contactPhone || ""}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          contactPhone: e.target.value,
                        }));
                        clearFieldError("contactPhone");
                      }}
                      onBlur={() => {
                        if (
                          editForm.contactPhone?.trim() &&
                          !validatePhone(editForm.contactPhone)
                        ) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            contactPhone: `Phone number must be ${VALIDATION_RULES.phone.minDigits}-${VALIDATION_RULES.phone.maxDigits} digits`,
                          }));
                        }
                      }}
                      className={getInputClass("contactPhone")}
                      placeholder="+1-555-0123"
                    />
                    {renderFieldError("contactPhone")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estimated Value
                  </label>
                  <input
                    type="number"
                    value={editForm.estimatedValue || ""}
                    onChange={(e) => {
                      setEditForm((prev) => ({
                        ...prev,
                        estimatedValue: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }));
                      clearFieldError("estimatedValue");
                    }}
                    onBlur={() => {
                      const validation = validateNumber(editForm.estimatedValue, {
                        min: VALIDATION_RULES.estimatedValue.min,
                        max: VALIDATION_RULES.estimatedValue.max,
                        fieldName: "Estimated value",
                      });
                      if (!validation.isValid && validation.error) {
                        const errorMsg = validation.error;
                        setValidationErrors((prev) => ({
                          ...prev,
                          estimatedValue: errorMsg,
                        }));
                      }
                    }}
                    className={getInputClass("estimatedValue")}
                  />
                  {renderFieldError("estimatedValue")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.probability || ""}
                    onChange={(e) => {
                      setEditForm((prev) => ({
                        ...prev,
                        probability: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }));
                      clearFieldError("probability");
                    }}
                    onBlur={() => {
                      const validation = validateNumber(editForm.probability, {
                        min: VALIDATION_RULES.probability.min,
                        max: VALIDATION_RULES.probability.max,
                        allowDecimal: false,
                        fieldName: "Probability",
                      });
                      if (!validation.isValid && validation.error) {
                        const errorMsg = validation.error;
                        setValidationErrors((prev) => ({
                          ...prev,
                          probability: errorMsg,
                        }));
                      }
                    }}
                    className={getInputClass("probability")}
                  />
                  {renderFieldError("probability")}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={editForm.expectedCloseDate || ""}
                  onChange={(e) => {
                    setEditForm((prev) => ({
                      ...prev,
                      expectedCloseDate: e.target.value,
                    }));
                    clearFieldError("expectedCloseDate");
                  }}
                  onBlur={() => {
                    const validation = validateDate(
                      editForm.expectedCloseDate || "",
                      {
                        mustBeFuture: false,
                      }
                    );
                    if (!validation.isValid && validation.error) {
                      const errorMsg = validation.error;
                      setValidationErrors((prev) => ({
                        ...prev,
                        expectedCloseDate: errorMsg,
                      }));
                    }
                  }}
                  className={getInputClass("expectedCloseDate")}
                />
                {renderFieldError("expectedCloseDate")}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes || ""}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }));
                    clearFieldError("notes");
                  }}
                  onBlur={() => {
                    const error = validateField(
                      "notes",
                      editForm.notes,
                      editForm,
                      true
                    );
                    if (error) {
                      setValidationErrors((prev) => ({ ...prev, notes: error }));
                    }
                  }}
                  className={getInputClass("notes")}
                  rows={2}
                />
                {renderFieldError("notes")}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  clearValidationErrors();
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={updateLead}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isSubmitting
                    ? "bg-slate-400 text-slate-200 cursor-not-allowed"
                    : "bg-primary-600 hover:bg-primary-700 text-white"
                }`}
              >
                {isSubmitting ? "Updating..." : "Update Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
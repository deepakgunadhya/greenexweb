import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { PermissionGate } from "@/components/common/PermissionGate";
import { Pagination } from "@/components/pagination/Pagination";

interface Project {
  id: string;
  name: string;
  status: string;
  verificationStatus?: string;
  executionStatus?: string;
  clientReviewStatus?: string;
  paymentStatus?: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
  };
  startDate: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  projectNumber?: string;
  description?: string;
  quotation?: {
    id: string;
    quotation_number: string;
    title: string;
  };
  poNumber?: string;
  poAttachmentPath?: string;
  poAttachmentOriginalName?: string;
}

interface EligibleQuotation {
  id: string;
  quotation_number: string;
  title: string;
  amount: string;
  approved_at: string | null;
  organization: {
    id: string;
    name: string;
    type: string;
  };
  lead: {
    id: string;
    title: string;
    contactName?: string;
    contactEmail?: string;
  };
}

interface AddProjectForm {
  quotationId: string;
  name: string;
  description: string;
  startDate: string;
  serviceIds: string[];
  poNumber: string;
  poAttachment: File | null;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [eligibleQuotations, setEligibleQuotations] = useState<EligibleQuotation[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [validTransitions, setValidTransitions] = useState<Record<string, string[]>>({});
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false);
  const [statusUpdateAllowed, setStatusUpdateAllowed] = useState<{
    allowed: boolean;
    reason?: string;
    canFinalizeChecklist: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<AddProjectForm>({
    quotationId: "",
    name: "",
    description: "",
    startDate: "",
    serviceIds: [],
    poNumber: "",
    poAttachment: null,
  });
  
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    estimatedCost: "",
    status: "",
    verificationStatus: "",
    executionStatus: "",
    clientReviewStatus: "",
    paymentStatus: "",
    poNumber: "",
    poAttachment: null as File | null,
    removePoAttachment: false,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchProjects = useCallback(async (page = 1, size = 9) => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("pageSize", size.toString());
      const response = await apiClient.get(`/projects?${params.toString()}`);
      setProjects(response.data.data || []);
      if (response.data.meta) {
        setTotalItems(response.data.meta.total);
        setTotalPages(response.data.meta.totalPages);
        setCurrentPage(response.data.meta.page);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects, eligible quotations, and services
        const [, quotationsResponse, servicesResponse] = await Promise.all([
          fetchProjects(1, pageSize),
          apiClient.get("/projects/quotations/eligible"),
          apiClient.get("/services/lookup"),
        ]);

        setEligibleQuotations(quotationsResponse.data.data || []);
        setServices(servicesResponse.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create project from accepted quotation (SRS 5.2.3) using FormData for file upload
      const fd = new FormData();
      fd.append("quotationId", formData.quotationId);
      fd.append("name", formData.name);
      if (formData.description) fd.append("description", formData.description);
      if (formData.startDate) fd.append("startDate", formData.startDate);
      fd.append("serviceIds", JSON.stringify(formData.serviceIds));
      if (formData.poNumber) fd.append("poNumber", formData.poNumber);
      if (formData.poAttachment) fd.append("file", formData.poAttachment);

      const response = await apiClient.post("/projects/create-from-quotation", fd);

      const newProject = response.data.data;
      
      // Add the new project to the list
      setProjects((prev) => [newProject, ...prev]);
      
      // Remove the used quotation from eligible list
      setEligibleQuotations((prev) => 
        prev.filter(q => q.id !== formData.quotationId)
      );
      
      setShowAddForm(false);
      setFormData({
        quotationId: "",
        name: "",
        description: "",
        startDate: "",
        serviceIds: [],
        poNumber: "",
        poAttachment: null,
      });
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === 'quotationId') {
      // Auto-generate project name from selected quotation
      const selectedQuotation = eligibleQuotations.find(q => q.id === value);
      if (selectedQuotation) {
        const generatedName = `${selectedQuotation.organization.name} – ${selectedQuotation.title} – ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        setFormData((prev) => ({ ...prev, [name]: value, name: generatedName }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleServiceSelection = (serviceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: checked
        ? [...prev.serviceIds, serviceId]
        : prev.serviceIds.filter(id => id !== serviceId)
    }));
  };

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}/details`);
  };

  const handleManageChecklists = (project: Project) => {
    navigate(`/projects/${project.id}/checklists`);
  };

  const handleManageTasks = (project: Project) => {
    navigate(`/projects/${project.id}/tasks`);
  };

  const handleEditProject = async (project: Project) => {
    setSelectedProject(project);
    setIsLoadingTransitions(true);
    setStatusUpdateAllowed(null);

    // Populate form with current project data
    setEditFormData({
      name: project.name,
      description: project.description || "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      estimatedCost: project.estimatedCost?.toString() || "",
      status: project.status,
      verificationStatus: project.verificationStatus || "",
      executionStatus: project.executionStatus || "",
      clientReviewStatus: project.clientReviewStatus || "",
      paymentStatus: project.paymentStatus || "",
      poNumber: project.poNumber || "",
      poAttachment: null,
      removePoAttachment: false,
    });

    try {
      // Fetch valid transitions and status update permission in parallel
      const [transitionsResponse, canUpdateResponse] = await Promise.all([
        apiClient.get(`/projects/${project.id}/status/transitions`),
        apiClient.get(`/projects/${project.id}/status/can-update`),
      ]);
      setValidTransitions(transitionsResponse.data.data || {});
      setStatusUpdateAllowed(canUpdateResponse.data.data || { allowed: true, canFinalizeChecklist: false });
    } catch (error) {
      console.error("Error fetching status info:", error);
      setValidTransitions({});
      setStatusUpdateAllowed({ allowed: true, canFinalizeChecklist: false });
    } finally {
      setIsLoadingTransitions(false);
    }

    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setSelectedProject(null);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    setIsSubmitting(true);
    
    try {
      // Remove PO attachment if requested (before updating other fields)
      if (editFormData.removePoAttachment && selectedProject.poAttachmentPath) {
        await apiClient.delete(`/projects/${selectedProject.id}/po-attachment`);
      }

      // Prepare basic project updates using FormData for file upload support
      const fd = new FormData();
      fd.append("name", editFormData.name);
      fd.append("description", editFormData.description);
      if (editFormData.startDate) fd.append("startDate", editFormData.startDate);
      if (editFormData.endDate) fd.append("endDate", editFormData.endDate);
      if (editFormData.estimatedCost) fd.append("estimatedCost", editFormData.estimatedCost);
      fd.append("poNumber", editFormData.poNumber);
      if (editFormData.poAttachment) fd.append("file", editFormData.poAttachment);

      // Prepare status updates (only include changed statuses)
      const statusUpdates: any = {};
      if (editFormData.status !== selectedProject.status) {
        statusUpdates.status = editFormData.status;
      }
      if (editFormData.verificationStatus !== selectedProject.verificationStatus) {
        statusUpdates.verificationStatus = editFormData.verificationStatus;
      }
      if (editFormData.executionStatus !== selectedProject.executionStatus) {
        statusUpdates.executionStatus = editFormData.executionStatus;
      }
      if (editFormData.clientReviewStatus !== selectedProject.clientReviewStatus) {
        statusUpdates.clientReviewStatus = editFormData.clientReviewStatus;
      }
      if (editFormData.paymentStatus !== selectedProject.paymentStatus) {
        statusUpdates.paymentStatus = editFormData.paymentStatus;
      }

      // Update basic project info
      await apiClient.put(`/projects/${selectedProject.id}`, fd);
      
      // Update status fields if any changed
      if (Object.keys(statusUpdates).length > 0) {
        await apiClient.put(`/projects/${selectedProject.id}/status`, statusUpdates);
      }
      
      // Refresh the projects list
      await fetchProjects(currentPage, pageSize);
      
      setShowEditModal(false);
      setSelectedProject(null);
      alert("Project updated successfully!");
    } catch (error: any) {
      console.error("Error updating project:", error);
      const errorMessage = error.response?.data?.error?.message || "Failed to update project. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "planned":
        return "bg-slate-100 text-slate-700";
      case "checklist_finalized":
        return "bg-blue-100 text-blue-700";
      case "verification_passed":
        return "bg-emerald-100 text-emerald-700";
      case "execution_in_progress":
        return "bg-amber-100 text-amber-700";
      case "execution_complete":
        return "bg-purple-100 text-purple-700";
      case "draft_prepared":
        return "bg-purple-100 text-purple-700";
      case "client_review":
        return "bg-cyan-100 text-cyan-700";
      case "account_closure":
        return "bg-orange-100 text-orange-700";
      case "completed":
        return "bg-primary-100 text-primary-700";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Track and manage your environmental consulting projects
          </p>
        </div>
        <PermissionGate requiredPermissions={["projects:create"]}>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Project
          </button>
        </PermissionGate>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-slate-400">📋</span>
            </div>
            <p className="text-slate-500 mb-4">No projects found</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Create your first project
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-none hover:shadow-md transition-all duration-300 overflow-hidden border border-slate-100 hover:border-primary-200 group"
            >
              {/* Card Header with Gradient */}
              <div className="bg-gradient-to-r from-primary-10  p-6 border-b border-primary-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="text-lg font-semibold text-slate-900 truncate group-hover:text-primary-700 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(project.status)}`}
                  >
                    {project.status.replace("_", " ")}
                  </span>
                </div>
                
                {/* Organization */}
                <div className="flex items-center text-sm text-slate-600 mt-2">
                  <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium truncate">{project.organization?.name || 'N/A'}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                {/* Dates Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center text-xs text-slate-500 mb-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Start Date
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {project.startDate 
                          ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'
                        }
                    </p>
                  </div>
                  
                  {project.endDate && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex items-center text-xs text-slate-500 mb-1">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        End Date
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Estimated Cost */}
                {project.estimatedCost && (
                  <div className="to-teal-50 rounded-lg p-3 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs  font-medium mb-1">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Estimated Cost
                      </div>
                      <p className="text-lg font-bold text-emerald-700">
                        ₹{project.estimatedCost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer - Action Buttons */}
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between space-x-2 pt-4 border-t border-slate-100">
                  {/* View Button */}
                  <button 
                    onClick={() => handleViewProject(project)}
                    className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-all duration-200 hover:shadow-md"
                    title="View Details"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>

                  {/* Manage Checklists Button */}
                  <PermissionGate requiredPermissions={["checklists:read"]}>
                    <button
                      onClick={() => handleManageChecklists(project)}
                      className="p-2.5 text-green-600 hover:text-white hover:bg-green-600 bg-green-50 rounded-lg transition-all duration-200 hover:shadow-md"
                      title="Manage Checklists"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </PermissionGate>

                  {/* Manage Tasks Button */}
                  <PermissionGate requiredPermissions={["tasks:read"]}>
                    <button
                      onClick={() => handleManageTasks(project)}
                      className="p-2.5 text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-md"
                      title="Manage Tasks"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </button>
                  </PermissionGate>

                  {/* Edit Button */}
                  <button 
                    onClick={() => handleEditProject(project)}
                    className="p-2.5 text-slate-600 hover:text-white hover:bg-slate-700 bg-slate-100 rounded-lg transition-all duration-200 hover:shadow-md"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        loading={isLoading}
        pageSizeOptions={[9, 18, 36]}
        onPageChange={(page) => {
          setCurrentPage(page);
          fetchProjects(page, pageSize);
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
          fetchProjects(1, size);
        }}
      />

      {/* Add Project Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Create Project
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {eligibleQuotations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl text-slate-400">📋</span>
                </div>
                <p className="text-slate-500 mb-2">No eligible quotations found</p>
                <p className="text-sm text-slate-400">
                  Projects can only be created from accepted quotations.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <label
                    htmlFor="quotationId"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Select Accepted Quotation *
                  </label>
                  <select
                    id="quotationId"
                    name="quotationId"
                    required
                    value={formData.quotationId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Choose a quotation to create project...</option>
                    {eligibleQuotations.map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>
                        {quotation.quotation_number} - {quotation.organization.name} - ₹{quotation.amount}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.quotationId && (
                  <>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Quotation Details</h4>
                      {(() => {
                        const selectedQuotation = eligibleQuotations.find(q => q.id === formData.quotationId);
                        return selectedQuotation ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Organization:</span>
                              <p className="font-medium">{selectedQuotation.organization.name}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Amount:</span>
                              <p className="font-medium">₹{selectedQuotation.amount}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-500">Title:</span>
                              <p className="font-medium">{selectedQuotation.title}</p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Project Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Project name (auto-generated)"
                      />
                      <p className="text-xs text-slate-500 mt-1">Auto-generated from quotation. You can modify it.</p>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Brief project description"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="poNumber"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        PO Number
                      </label>
                      <input
                        type="text"
                        id="poNumber"
                        name="poNumber"
                        value={formData.poNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter PO number"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="poAttachment"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        PO Attachment
                      </label>
                      <input
                        type="file"
                        id="poAttachment"
                        accept=".pdf,.doc,.docx,.txt,.jpeg,.jpg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFormData((prev) => ({ ...prev, poAttachment: file }));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                      <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, TXT, JPEG, PNG (max 10MB)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Services *
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {services.map((service) => (
                          <label key={service.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.serviceIds.includes(service.id)}
                              onChange={(e) => handleServiceSelection(service.id, e.target.checked)}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm">{service.name}</span>
                            {service.basePrice && (
                              <span className="text-xs text-slate-500 ml-auto">₹{service.basePrice}</span>
                            )}
                          </label>
                        ))}
                      </div>
                      {formData.serviceIds.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">Please select at least one service</p>
                      )}
                    </div>
                  </>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.quotationId || formData.serviceIds.length === 0}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Project Modal */}
      {showViewModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Project Details
              </h2>
              <button
                onClick={handleCloseModals}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Project Number</p>
                    <p className="font-medium">{selectedProject.projectNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Organization</p>
                    <p className="font-medium">{selectedProject.organization?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Start Date</p>
                    <p className="font-medium">
                      {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  {selectedProject.endDate && (
                    <div>
                      <p className="text-sm text-slate-500">End Date</p>
                      <p className="font-medium">{new Date(selectedProject.endDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedProject.estimatedCost && (
                    <div>
                      <p className="text-sm text-slate-500">Estimated Cost</p>
                      <p className="font-medium">₹{selectedProject.estimatedCost.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-3">Description</h3>
                  <p className="text-slate-600">{selectedProject.description}</p>
                </div>
              )}

              {/* Quotation Information */}
              {selectedProject.quotation && (
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-3">Quotation Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Quotation Number</p>
                      <p className="font-medium">{selectedProject.quotation.quotation_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Title</p>
                      <p className="font-medium">{selectedProject.quotation.title}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Information */}
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-3">Status Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Verification Status</p>
                    <p className="font-medium">{selectedProject.verificationStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Execution Status</p>
                    <p className="font-medium">{selectedProject.executionStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Client Review Status</p>
                    <p className="font-medium">{selectedProject.clientReviewStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Payment Status</p>
                    <p className="font-medium">{selectedProject.paymentStatus || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Checklist Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-slate-800">Project Checklists</h3>
                  <PermissionGate requiredPermissions={["checklists:read"]}>
                    <button
                      onClick={() => handleManageChecklists(selectedProject)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      Manage Checklists →
                    </button>
                  </PermissionGate>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-slate-600">
                        Checklists are automatically created based on selected services
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Click "Manage Checklists" to view, fill out, and track completion of project checklists
                  </p>
                </div>
              </div>

              {/* Task Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-slate-800">Project Tasks</h3>
                  <PermissionGate requiredPermissions={["tasks:read"]}>
                    <button
                      onClick={() => handleManageTasks(selectedProject)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Manage Tasks →
                    </button>
                  </PermissionGate>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span className="text-sm text-slate-600">
                        Manage work assignments and track task progress
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Click "Manage Tasks" to create, assign, and monitor project tasks
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
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

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Edit Project
              </h2>
              <button
                onClick={handleCloseModals}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {isLoadingTransitions ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProject} className="space-y-4">
                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column - Basic Project Information */}
                  <div className="border-r-0 md:border-r border-slate-200 md:pr-6">
                    <h3 className="text-md font-medium text-slate-800 mb-3 pb-2 border-b border-slate-200">Basic Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Project name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editFormData.description}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Project description"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={editFormData.startDate}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={editFormData.endDate}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Estimated Cost
                        </label>
                        <input
                          type="number"
                          value={editFormData.estimatedCost}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter estimated cost"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          PO Number
                        </label>
                        <input
                          type="text"
                          value={editFormData.poNumber}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter PO number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          PO Attachment
                        </label>
                        {selectedProject?.poAttachmentOriginalName && !editFormData.removePoAttachment && !editFormData.poAttachment && (
                          <div className="mb-2 flex items-center justify-between text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <div className="flex items-center min-w-0">
                              <svg className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate">{selectedProject.poAttachmentOriginalName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditFormData(prev => ({ ...prev, removePoAttachment: true }))}
                              className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                              title="Remove attachment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {editFormData.removePoAttachment && !editFormData.poAttachment && (
                          <div className="mb-2 flex items-center justify-between text-sm bg-red-50 p-2 rounded-lg border border-red-200">
                            <span className="text-red-600">Attachment will be removed on save</span>
                            <button
                              type="button"
                              onClick={() => setEditFormData(prev => ({ ...prev, removePoAttachment: false }))}
                              className="ml-2 text-xs text-slate-600 hover:text-slate-800 underline"
                            >
                              Undo
                            </button>
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.jpeg,.jpg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setEditFormData(prev => ({ ...prev, poAttachment: file, removePoAttachment: false }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedProject?.poAttachmentOriginalName && !editFormData.removePoAttachment
                            ? "Upload a new file to replace the existing one"
                            : "PDF, DOC, DOCX, TXT, JPEG, PNG (max 10MB)"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Status Management */}
                  <div className="md:pl-6">
                    <h3 className="text-md font-medium text-slate-800 mb-3 pb-2 border-b border-slate-200">Status Management</h3>

                    {/* Warning when status updates are not allowed */}
                    {statusUpdateAllowed && !statusUpdateAllowed.allowed && (
                      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-amber-800">Status Updates Restricted</p>
                            <p className="text-sm text-amber-700 mt-1">{statusUpdateAllowed.reason}</p>
                            {statusUpdateAllowed.canFinalizeChecklist && (
                              <p className="text-sm text-amber-700 mt-1">
                                All checklists are verified. You can finalize the checklist to enable status updates.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Main Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Main Status
                        </label>
                        <select
                          value={editFormData.status}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                          disabled={!!(statusUpdateAllowed && !statusUpdateAllowed.allowed && !statusUpdateAllowed.canFinalizeChecklist)}
                          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            statusUpdateAllowed && !statusUpdateAllowed.allowed && !statusUpdateAllowed.canFinalizeChecklist
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <option value={selectedProject.status}>{selectedProject.status} (current)</option>
                          {validTransitions.status?.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Verification Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Verification Status
                        </label>
                        <select
                          value={editFormData.verificationStatus}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, verificationStatus: e.target.value }))}
                          disabled={!!(statusUpdateAllowed && !statusUpdateAllowed.allowed)}
                          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            statusUpdateAllowed && !statusUpdateAllowed.allowed
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <option value={selectedProject.verificationStatus}>{selectedProject.verificationStatus} (current)</option>
                          {validTransitions.verificationStatus?.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Execution Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Execution Status
                        </label>
                        <select
                          value={editFormData.executionStatus}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, executionStatus: e.target.value }))}
                          disabled={!!(statusUpdateAllowed && !statusUpdateAllowed.allowed)}
                          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            statusUpdateAllowed && !statusUpdateAllowed.allowed
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <option value={selectedProject.executionStatus}>{selectedProject.executionStatus} (current)</option>
                          {validTransitions.executionStatus?.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Client Review Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Client Review Status
                        </label>
                        <select
                          value={editFormData.clientReviewStatus}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, clientReviewStatus: e.target.value }))}
                          disabled={!!(statusUpdateAllowed && !statusUpdateAllowed.allowed)}
                          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            statusUpdateAllowed && !statusUpdateAllowed.allowed
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <option value={selectedProject.clientReviewStatus}>{selectedProject.clientReviewStatus} (current)</option>
                          {validTransitions.clientReviewStatus?.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Payment Status
                        </label>
                        <select
                          value={editFormData.paymentStatus}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                          disabled={!!(statusUpdateAllowed && !statusUpdateAllowed.allowed)}
                          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            statusUpdateAllowed && !statusUpdateAllowed.allowed
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <option value={selectedProject.paymentStatus}>{selectedProject.paymentStatus} (current)</option>
                          {validTransitions.paymentStatus?.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Full Width */}
                <div className="flex space-x-3 pt-4 border-t border-slate-200 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModals}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

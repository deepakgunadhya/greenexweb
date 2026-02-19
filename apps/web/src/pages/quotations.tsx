import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/dialogs";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "@/components/pagination/Pagination";
import { apiClient } from "@/lib/api/client";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchQuotations,
  fetchQuotationStats,
  uploadQuotation,
  updateQuotationStatus,
  updateQuotationMetadata,
  deleteQuotation,
  downloadQuotationPDF,
  clearError,
} from "@/store/slices/quotationsSlice";

interface Lead {
  id: string;
  title: string;
  organization?: {
    name: string;
  };
  contact?: {
    firstName: string;
    lastName: string;
  };
}

type QuotationFormData = {
  leadId: string;
  title: string;
  amount: number | "";
  notes: string;
  file: File | null;
};

const QuotationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { quotations, loading, uploadLoading, error, stats, meta } = useAppSelector(
    (state) => state.quotations
  );

  const initialFormData: QuotationFormData = {
    leadId: "",
    title: "",
    amount: "",
    notes: "",
    file: null,
  };

  const [leads, setLeads] = useState<Lead[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    amount: number | "";
    notes: string;
  }>({ title: "", amount: "", notes: "" });
  const confirmation = useConfirmation();

  // Form state
  const [formData, setFormData] = useState<QuotationFormData>(initialFormData);

  // Filters state
  const [filters, setFilters] = useState({
    status: "",
    leadId: "",
    page: 1,
    pageSize: 20,
  });

  // Load initial data
  useEffect(() => {
    dispatch(fetchQuotations(filters));
    dispatch(fetchQuotationStats());
    loadLeads();
  }, [dispatch, filters]);

  // Clear errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const loadLeads = async () => {
    try {
      const response = await apiClient.get("/leads/lookup");
      const data = response.data?.data || response.data;
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load leads:", error);
      toast.error("Failed to load leads");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file) {
      toast.error("Please select a PDF file");
      return;
    }

    // Check file extension as fallback since MIME type can vary
    const fileName = formData.file.name.toLowerCase();
    const isPdf =
      formData.file.type === "application/pdf" || fileName.endsWith(".pdf");

    if (!isPdf) {
      toast.error("Only PDF files are allowed");
      return;
    }

    // Debug logging and validation
    console.log("Submitting quotation upload:", {
      leadId: formData.leadId,
      title: formData.title,
      fileName: formData.file?.name,
      fileType: formData.file?.type,
      fileSize: formData.file?.size,
    });

    if (!formData.file) {
      toast.error("File is missing - please select a file again");
      return;
    }

    try {
      await dispatch(
        uploadQuotation({
          leadId: formData.leadId,
          title: formData.title,
          amount: formData.amount ? Number(formData.amount) : undefined,
          notes: formData.notes,
          file: formData.file,
        })
      ).unwrap();

      toast.success("Quotation uploaded successfully");
      setShowUploadForm(false);
      setFormData(initialFormData);

      // Refresh data
      dispatch(fetchQuotations(filters));
      dispatch(fetchQuotationStats());
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.message || "Failed to upload quotation");
    }
  };

  const handleStatusUpdate = async (quotationId: string, status: string) => {
    try {
      await dispatch(
        updateQuotationStatus({
          id: quotationId,
          status: status as "SENT" | "ACCEPTED" | "REJECTED",
        })
      ).unwrap();

      toast.success(`Quotation status updated to ${status}`);

      // Refresh data and close modal
      dispatch(fetchQuotations(filters));
      dispatch(fetchQuotationStats());
      setShowViewModal(false);
    } catch (error: any) {
      console.error("Status update failed:", error);
      toast.error(error.message || "Failed to update quotation status");
    }
  };

  const handleDownload = async (quotationId: string) => {
    try {
      await dispatch(downloadQuotationPDF(quotationId)).unwrap();
      toast.success("Download started");
    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download quotation");
    }
  };

  const handleDelete = (quotationId: string) => {
    confirmation.ask({
      title: "Delete Quotation",
      description:
        "Are you sure you want to delete this quotation? This action cannot be undone.",
      type: "danger",
      actionLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          await dispatch(deleteQuotation(quotationId)).unwrap();
          toast.success("Quotation deleted successfully");

          // Refresh data
          dispatch(fetchQuotations(filters));
          dispatch(fetchQuotationStats());
          confirmation.close();
        } catch (error: any) {
          console.error("Delete failed:", error);
          toast.error(error.message || "Failed to delete quotation");
        }
      },
    });
  };

  const handleView = (quotation: any) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  const handleEdit = (quotation: any) => {
    setSelectedQuotation(quotation);
    setEditFormData({
      title: quotation.title,
      amount: quotation.amount || "",
      notes: quotation.notes || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQuotation) return;

    try {
      await dispatch(
        updateQuotationMetadata({
          id: selectedQuotation.id,
          title: editFormData.title,
          amount: editFormData.amount ? Number(editFormData.amount) : undefined,
          notes: editFormData.notes || undefined,
        })
      ).unwrap();

      toast.success("Quotation updated successfully");
      setShowEditModal(false);
      setEditFormData({ title: "", amount: "", notes: "" });

      // Refresh data
      dispatch(fetchQuotations(filters));
      dispatch(fetchQuotationStats());
    } catch (error: any) {
      console.error("Update failed:", error);
      toast.error(error.message || "Failed to update quotation");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      UPLOADED: "bg-slate-100 text-slate-700",
      SENT: "bg-blue-100 text-blue-700",
      ACCEPTED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-md ${statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-700"}`}
      >
        {status}
      </span>
    );
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute requiredPermissions={["quotations:read"]}>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-slate-900">
              Quotations
            </h1>
            <p className="text-slate-600 mt-1">
              Manage and track quotations for leads
            </p>
          </div>

          <PermissionGate requiredPermissions={["quotations:create"]}>
            <button
              onClick={() => setShowUploadForm(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Upload Quotation
            </button>
          </PermissionGate>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Accepted</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.accepted}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">
                    Total Value
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(stats.totalValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">
                    Accepted Value
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(stats.acceptedValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">
              {typeof error === "string" ? error : error.message}
            </p>
          </div>
        )}

        {/* Quotations Table */}
        <div className="bg-white rounded-lg shadow ">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">
              Quotations List
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading quotations...</p>
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-600">No quotations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full  table-fixed divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-slate-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-slate-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-slate-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium  text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4  ">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {quotation.title}
                          </p>
                          {quotation.originalFileName && (
                            <p className="text-sm text-slate-500">
                              {quotation.originalFileName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 ">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {quotation.lead?.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {quotation.lead?.organization?.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 ">
                        {formatCurrency(quotation.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap ">
                        {getStatusBadge(quotation.status)}
                      </td>
                      <td className="px-6 py-4  ">
                        <div>
                          <p className="text-sm text-slate-900">
                            {formatDate(quotation.createdAt)}
                          </p>
                          <p className="text-sm text-slate-500">
                            by {quotation.uploader?.firstName}{" "}
                            {quotation.uploader?.lastName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right ">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Button */}
                          <button
                            onClick={() => handleView(quotation)}
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
                          <PermissionGate
                            requiredPermissions={["quotations:update"]}
                          >
                            {quotation.status !== "ACCEPTED" && (
                              <button
                                onClick={() => handleEdit(quotation)}
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
                            )}
                          </PermissionGate>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(quotation.id)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PDF"
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
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <PermissionGate
                            requiredPermissions={["quotations:delete"]}
                          >
                            {quotation.status !== "ACCEPTED" && (
                              <button
                                onClick={() => handleDelete(quotation.id)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
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
                            )}
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
          {meta && (
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={filters.pageSize}
              loading={loading}
              onPageChange={(page) => {
                setFilters((prev) => ({ ...prev, page }));
              }}
              onPageSizeChange={(pageSize) => {
                setFilters((prev) => ({ ...prev, page: 1, pageSize }));
              }}
            />
          )}
        </div>

        {/* Upload Quotation Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleUploadSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">
                          Upload Quotation
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Lead *
                            </label>
                            <select
                              value={formData.leadId}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  leadId: e.target.value,
                                })
                              }
                              required
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Select a lead</option>
                              {leads.map((lead) => (
                                <option key={lead.id} value={lead.id}>
                                  {lead.title} - {lead.organization?.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Title *
                            </label>
                            <input
                              type="text"
                              value={formData.title}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  title: e.target.value,
                                })
                              }
                              required
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Quotation reference or title"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.amount}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  amount: e.target.value
                                    ? Number(e.target.value)
                                    : "",
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={formData.notes}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  notes: e.target.value,
                                })
                              }
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Additional notes..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              PDF File *
                            </label>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                console.log(
                                  "File selected:",
                                  file?.name,
                                  file?.type,
                                  file?.size
                                );
                                setFormData({ ...formData, file });
                              }}
                              required
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            {formData.file && (
                              <p className="text-sm text-green-600 mt-1">
                                ✓ Selected: {formData.file.name} (
                                {(formData.file.size / 1024).toFixed(1)} KB)
                              </p>
                            )}
                            <p className="text-sm text-slate-500 mt-1">
                              Only PDF files are allowed. Max size: 10MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadLoading ? "Uploading..." : "Upload"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadForm(false);
                        setFormData(initialFormData);
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Quotation Modal */}
        {showViewModal && selectedQuotation && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">
                        Quotation Details
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            Title
                          </label>
                          <p className="text-sm text-slate-900">
                            {selectedQuotation.title}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            Lead
                          </label>
                          <p className="text-sm text-slate-900">
                            {selectedQuotation.lead?.title} -{" "}
                            {selectedQuotation.lead?.organization?.name}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            Amount
                          </label>
                          <p className="text-sm text-slate-900">
                            {formatCurrency(selectedQuotation.amount)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            Status
                          </label>
                          <div className="mt-1">
                            {getStatusBadge(selectedQuotation.status)}
                          </div>
                        </div>

                        {selectedQuotation.notes && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700">
                              Notes
                            </label>
                            <p className="text-sm text-slate-900 whitespace-pre-wrap">
                              {selectedQuotation.notes}
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            File
                          </label>
                          <p className="text-sm text-slate-900">
                            {selectedQuotation.originalFileName}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            Uploaded
                          </label>
                          <p className="text-sm text-slate-900">
                            {formatDate(selectedQuotation.createdAt)} by{" "}
                            {selectedQuotation.uploader?.firstName}{" "}
                            {selectedQuotation.uploader?.lastName}
                          </p>
                        </div>

                        {/* Status Update Actions */}
                        <PermissionGate
                          requiredPermissions={["quotations:update"]}
                        >
                          {selectedQuotation.status !== "ACCEPTED" &&
                            selectedQuotation.status !== "REJECTED" && (
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Update Status
                                </label>
                                <div className="flex gap-2">
                                  {selectedQuotation.status !== "SENT" && (
                                    <button
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedQuotation.id,
                                          "SENT"
                                        )
                                      }
                                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                    >
                                      Mark as Sent
                                    </button>
                                  )}
                                  {selectedQuotation.status !== "UPLOADED" && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleStatusUpdate(
                                            selectedQuotation.id,
                                            "ACCEPTED"
                                          )
                                        }
                                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleStatusUpdate(
                                            selectedQuotation.id,
                                            "REJECTED"
                                          )
                                        }
                                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={() => handleDownload(selectedQuotation.id)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedQuotation(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Quotation Modal */}
        {showEditModal && selectedQuotation && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleEditSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">
                          Edit Quotation
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Title *
                            </label>
                            <input
                              type="text"
                              value={editFormData.title}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  title: e.target.value,
                                })
                              }
                              required
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Quotation reference or title"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.amount}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  amount: e.target.value
                                    ? Number(e.target.value)
                                    : "",
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={editFormData.notes}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  notes: e.target.value,
                                })
                              }
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Additional notes..."
                            />
                          </div>

                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-blue-700">
                              <strong>Note:</strong> You can only edit the
                              title, amount, and notes. To change the PDF file,
                              delete this quotation and upload a new one.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Updating..." : "Update"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditFormData({ title: "", amount: "", notes: "" });
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <ConfirmationDialog {...confirmation.dialog} />
      </div>
    </ProtectedRoute>
  );
};

export { QuotationsPage };
export default QuotationsPage;

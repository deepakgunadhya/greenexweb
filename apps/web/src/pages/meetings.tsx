import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/dialogs";
import { apiClient } from "@/lib/api/client";
import { useAppDispatch, useAppSelector } from "@/store";
import { useAuth } from "@/hooks/use-auth";
import { Pagination } from "@/components/pagination/Pagination";
import {
  fetchMeetings,
  fetchMeetingStats,
  fetchGoogleStatus,
  disconnectGoogle,
  scheduleMeeting,
  updateMeeting,
  startMeeting,
  completeMeeting,
  cancelMeeting,
  clearError,
  setGoogleStatus,
} from "@/store/slices/meetingsSlice";
import PermissionGate from "@/components/common/PermissionGate";

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

type MeetingFormData = {
  leadId: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number | "";
  location: string;
  meetingType: string;
  clientSide: string;
  greenexSide: string;
  meetingLink: string;
};

const MeetingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { meetings, loading, error, stats, meta, googleConnected } =
    useAppSelector((state) => state.meetings);

  const [_currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const initialFormData: MeetingFormData = {
    leadId: "",
    title: "",
    description: "",
    scheduledAt: "",
    duration: 60,
    location: "",
    meetingType: "KICKOFF",
    clientSide: "",
    greenexSide: "",
    meetingLink: "",
  };

  const [leads, setLeads] = useState<Lead[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const confirmation = useConfirmation();
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    outcome: "",
    actionItems: "",
    followUpRequired: false,
    followUpDate: "",
    followUpNotes: "",
  });

  // Form state for scheduling new meeting
  const [formData, setFormData] = useState<MeetingFormData>(initialFormData);

  // Initialize Google status from localStorage
  useEffect(() => {
    const storedGoogleConnected =
      localStorage.getItem("googleConnected") === "true";
    if (storedGoogleConnected) {
      dispatch(setGoogleStatus({ connected: true, isActive: true }));
    }
  }, [dispatch]);

  // Handle Google connection callback and fetch initial data
  useEffect(() => {
    // Handle Google connection callback
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const status = url.searchParams.get("google");

      if (status === "connected") {
        dispatch(setGoogleStatus({ connected: true, isActive: true }));
        localStorage.setItem("googleConnected", "true");
        toast.success("Google Calendar connected successfully!");

        // Clean URL
        url.searchParams.delete("google");
        window.history.replaceState({}, "", url.toString());
      } else if (status === "error") {
        dispatch(setGoogleStatus({ connected: false, isActive: false }));
        localStorage.removeItem("googleConnected");
        toast.error("Failed to connect Google Calendar. Please try again.");

        // Clean URL
        url.searchParams.delete("google");
        window.history.replaceState({}, "", url.toString());
      }
    }

    // Fetch initial data
    dispatch(fetchGoogleStatus());
    dispatch(fetchMeetings({ page: 1, pageSize }));
    dispatch(fetchMeetingStats(undefined));
    fetchLeads();
  }, [dispatch, pageSize]);

  // Clear errors when component unmounts or errors change
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const fetchLeads = async () => {
    try {
      const response = await apiClient.get("/leads/lookup");
      const data = response.data?.data || response.data;
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    }
  };

  const handleConnectGoogle = () => {
    console.log("🔗 Connect Google clicked", { user, userId: user?.id });

    if (!user?.id) {
      console.error("❌ No user ID found", { user });
      toast.error("Please login to connect Google Calendar");
      return;
    }

    const baseUrl = apiClient.defaults.baseURL || "";
    const url = `${baseUrl}/auth/google?userId=${user.id}`;
    console.log("🌐 Redirecting to:", url);
    window.location.href = url;
  };

  const handleDisconnectGoogle = () => {
    confirmation.ask({
      title: "Remove Google Calendar?",
      description:
        "Are you sure you want to disconnect Google Calendar? You will need to reconnect to create calendar events.",
      type: "danger",
      actionLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          console.log("🔄 Disconnecting Google Calendar...");
          await dispatch(disconnectGoogle()).unwrap();
          localStorage.removeItem("googleConnected");
          console.log("✅ Google Calendar disconnected successfully");
          toast.success("Google Calendar disconnected successfully");
        } catch (err: any) {
          console.error("❌ Error disconnecting Google Calendar:", err);
          toast.error(err.message || "Failed to disconnect Google Calendar");
        }
      },
    });
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert datetime-local format to proper ISO string
      const meetingData = {
        leadId: formData.leadId,
        title: formData.title,
        description: formData.description || undefined,
        scheduledAt: formData.scheduledAt
          ? new Date(formData.scheduledAt).toISOString()
          : "",
        duration:
          formData.duration === "" || Number.isNaN(formData.duration as number)
            ? undefined
            : Number(formData.duration),
        location: formData.location || undefined,
        meetingType: formData.meetingType,
        clientSide: formData.clientSide || undefined,
        greenexSide: formData.greenexSide || undefined,
        meetingLink:
          !googleConnected && formData.meetingLink
            ? formData.meetingLink
            : undefined,
      };

      await dispatch(scheduleMeeting(meetingData)).unwrap();
      console.log("Meeting scheduled successfully");
      toast.success("Meeting scheduled successfully!");

      // Reset form and refresh data
      setFormData(initialFormData);
      setShowScheduleForm(false);
      setCurrentPage(1);
      dispatch(fetchMeetings({ page: 1, pageSize }));
      dispatch(fetchMeetingStats(undefined)); // Refresh stats
    } catch (err: any) {
      console.error("Schedule meeting error:", err);
      const errorMessage =
        err.payload?.message || err.message || "Failed to schedule meeting";
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleDurationWheel: React.WheelEventHandler<HTMLInputElement> = (
    e,
  ) => {
    // Prevent mouse wheel from changing number input
    e.preventDefault();
  };

  const handleViewMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowViewModal(true);
  };

  const handleEditMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    // Pre-fill form with meeting data
    setFormData({
      leadId: meeting.leadId || "",
      title: meeting.title || "",
      description: meeting.description || "",
      scheduledAt: meeting.scheduledAt
        ? new Date(meeting.scheduledAt).toISOString().slice(0, 16)
        : "",
      duration: meeting.duration || 60,
      location: meeting.location || "",
      meetingType: meeting.meetingType || "KICKOFF",
      clientSide: meeting.clientSide || "",
      greenexSide: meeting.greenexSide || "",
      meetingLink: meeting.meetingLink || "",
    });
    setShowViewModal(false);
    setShowEditForm(true);
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMeeting) return;

    try {
      const updateData = {
        id: selectedMeeting.id,
        title: formData.title,
        description: formData.description || undefined,
        scheduledAt: formData.scheduledAt
          ? new Date(formData.scheduledAt).toISOString()
          : undefined,
        duration:
          formData.duration === "" || Number.isNaN(formData.duration as number)
            ? undefined
            : Number(formData.duration),
        location: formData.location || undefined,
        meetingType: formData.meetingType,
        clientSide: formData.clientSide || undefined,
        greenexSide: formData.greenexSide || undefined,
        meetingLink:
          !googleConnected && formData.meetingLink
            ? formData.meetingLink
            : undefined,
      };

      await dispatch(updateMeeting(updateData)).unwrap();
      toast.success("Meeting updated successfully!");
      setShowEditForm(false);
      setSelectedMeeting(null);
    } catch (err: any) {
      console.error("Update meeting error:", err);
      toast.error(err.message || "Failed to update meeting");
    }
  };

  const handleStartMeeting = async (meeting: any) => {
    try {
      await dispatch(startMeeting(meeting.id)).unwrap();
      toast.success("Meeting started successfully");
    } catch (error: any) {
      console.error("Error starting meeting:", error);
      toast.error(error.message || "Failed to start meeting");
    }
  };

  const handleCancelMeeting = (meeting: any) => {
    confirmation.ask({
      title: "Cancel Meeting?",
      description: `Are you sure you want to cancel "${meeting.title}"? This action cannot be undone.`,
      type: "danger",
      actionLabel: "Cancel Meeting",
      cancelLabel: "Keep Meeting",
      onConfirm: async () => {
        try {
          await dispatch(
            cancelMeeting({
              id: meeting.id,
              reason: "Cancelled by user",
            }),
          ).unwrap();
          toast.success("Meeting cancelled successfully!");
        } catch (error: any) {
          console.error("Error cancelling meeting:", error);
          toast.error(error.message || "Failed to cancel meeting");
        }
      },
    });
  };

  const handleCompleteMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    setCompletionForm({
      outcome: "",
      actionItems: "",
      followUpRequired: false,
      followUpDate: "",
      followUpNotes: "",
    });
    setShowCompleteForm(true);
  };

  const handleViewNotes = (meeting: any) => {
    setSelectedMeeting(meeting);
    setCompletionForm({
      outcome: meeting.outcome || "",
      actionItems: meeting.actionItems || "",
      followUpRequired: meeting.followUpRequired || false,
      followUpDate: meeting.followUpDate
        ? new Date(meeting.followUpDate).toISOString().split("T")[0]
        : "",
      followUpNotes: meeting.followUpNotes || "",
    });
    setShowCompleteForm(true);
  };

  const submitMeetingCompletion = async () => {
    if (!selectedMeeting) return;

    try {
      if (!completionForm.outcome.trim()) {
        toast.error("Outcome is required to complete a meeting");
        return;
      }

      if (
        completionForm.followUpRequired &&
        !completionForm.followUpDate.trim()
      ) {
        toast.error("Follow-up date is required when follow-up is checked");
        return;
      }

      const completionData = {
        id: selectedMeeting.id,
        outcome: completionForm.outcome,
        actionItems: completionForm.actionItems || undefined,
        followUpRequired: completionForm.followUpRequired,
        followUpDate: completionForm.followUpDate
          ? new Date(completionForm.followUpDate).toISOString()
          : undefined,
        followUpNotes: completionForm.followUpNotes || undefined,
      };

      await dispatch(completeMeeting(completionData)).unwrap();
      setShowCompleteForm(false);

      // If follow-up is required, show follow-up scheduling modal
      if (completionForm.followUpRequired) {
        // Pre-fill follow-up meeting form
        setFormData({
          leadId: selectedMeeting.leadId,
          title: `Follow-up Meeting - ${selectedMeeting.title}`,
          description:
            completionForm.followUpNotes ||
            "Follow-up meeting to discuss action items and progress.",
          scheduledAt: completionForm.followUpDate
            ? completionForm.followUpDate + "T10:00:00"
            : "",
          duration: 60,
          location: selectedMeeting.location || "",
          meetingType: "FOLLOWUP",
          clientSide: selectedMeeting.clientSide || "",
          greenexSide: selectedMeeting.greenexSide || "",
          meetingLink: selectedMeeting.meetingLink || "",
        });
        setShowScheduleForm(true);
        toast.success(
          "Meeting completed. Please schedule the follow-up meeting.",
        );
      } else {
        toast.success("Meeting completed successfully");
      }

      setSelectedMeeting(null);
      dispatch(fetchMeetingStats(undefined)); // Refresh stats
    } catch (error: any) {
      console.error("Error completing meeting:", error);
      toast.error(error.message || "Failed to complete meeting");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ConfirmationDialog {...confirmation.dialog} />
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Meetings</h1>
            <p className="text-slate-600 mt-1">
              Schedule and manage kick-off meetings
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!googleConnected && (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="bg-white border border-primary-600 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Connect Google
              </button>
            )}
            {googleConnected && (
              <>
                <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  Google connected
                </span>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="bg-white border border-red-600 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Remove Google
                </button>
              </>
            )}
            <PermissionGate requiredPermissions={["organizations:create"]}>
              <button
                onClick={() => {
                  setFormData(initialFormData);
                  setShowScheduleForm(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors"
              >
                Schedule Meeting
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-slate-900">
              {stats.total}
            </div>
            <div className="text-sm text-slate-600">Total Meetings</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">
              {stats.scheduled}
            </div>
            <div className="text-sm text-slate-600">Scheduled</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-amber-600">
              {stats.upcomingThisWeek}
            </div>
            <div className="text-sm text-slate-600">This Week</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            {typeof error === "string" ? error : error.message}
          </p>
          <button
            onClick={() => dispatch(clearError())}
            className="mt-2 text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View Meeting Modal */}
      {showViewModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Meeting Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedMeeting(null);
                }}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <p className="text-gray-900">{selectedMeeting.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900">
                  {selectedMeeting.description || "N/A"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Type
                  </label>
                  <p className="text-gray-900">{selectedMeeting.meetingType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      selectedMeeting.status,
                    )}`}
                  >
                    {selectedMeeting.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <p className="text-gray-900">
                    {selectedMeeting.scheduledAt
                      ? formatDate(selectedMeeting.scheduledAt)
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <p className="text-gray-900">
                    {selectedMeeting.duration || 60} minutes
                  </p>
                </div>
              </div>

              {selectedMeeting.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <p className="text-gray-900">{selectedMeeting.location}</p>
                </div>
              )}

              {selectedMeeting.meetingLink && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Link
                  </label>
                  <a
                    href={selectedMeeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800 underline"
                  >
                    {selectedMeeting.meetingLink}
                  </a>
                </div>
              )}

              {(selectedMeeting.clientSide || selectedMeeting.greenexSide) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedMeeting.clientSide && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client Side
                      </label>
                      <p className="text-gray-900">
                        {selectedMeeting.clientSide}
                      </p>
                    </div>
                  )}
                  {selectedMeeting.greenexSide && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Greenex Side
                      </label>
                      <p className="text-gray-900">
                        {selectedMeeting.greenexSide}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedMeeting.outcome && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outcome
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedMeeting.outcome}
                  </p>
                </div>
              )}

              {selectedMeeting.actionItems && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Items
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedMeeting.actionItems}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex justify-end space-x-3">
                  {selectedMeeting.status === "SCHEDULED" && (
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        handleEditMeeting(selectedMeeting);
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Edit Meeting
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedMeeting(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Form */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Schedule New Meeting</h2>

            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead *
                </label>
                <select
                  name="leadId"
                  value={formData.leadId}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.title}
                      {lead.organization?.name &&
                        ` - ${lead.organization.name}`}
                      {lead.contact &&
                        ` (${lead.contact.firstName} ${lead.contact.lastName})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Kick-off Meeting"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Meeting agenda or description"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="480"
                  onWheel={handleDurationWheel}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Type
                </label>
                <select
                  name="meetingType"
                  value={formData.meetingType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="KICKOFF">Kick-off Meeting</option>
                  <option value="FOLLOWUP">Follow-up</option>
                  <option value="CLARIFICATION">Clarification</option>
                  <option value="CLOSURE">Project Closure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Meeting location or room"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {!googleConnected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    name="meetingLink"
                    value={formData.meetingLink}
                    onChange={handleInputChange}
                    placeholder="e.g., https://meet.google.com/xxx-xxxx-xxx"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    loading
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {loading ? "Scheduling..." : "Schedule Meeting"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Meetings</h2>
        </div>

        {meetings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No meetings scheduled yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meeting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {meeting.title}
                        </div>
                        {meeting.description && (
                          <div className="text-sm text-gray-500">
                            {meeting.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {meeting.meetingType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {meeting.scheduledAt
                        ? formatDate(meeting.scheduledAt)
                        : "Not scheduled"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(meeting.status)}`}
                      >
                        {meeting.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        onClick={() => handleViewMeeting(meeting)}
                      >
                        View
                      </button>
                      {meeting.status === "SCHEDULED" && (
                        <>
                          <button
                            className="text-green-600 hover:text-green-900 mr-3"
                            onClick={() => handleStartMeeting(meeting)}
                            disabled={loading}
                          >
                            Start
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleCancelMeeting(meeting)}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {meeting.status === "IN_PROGRESS" && (
                        <button
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          onClick={() => handleCompleteMeeting(meeting)}
                        >
                          Complete
                        </button>
                      )}
                      {meeting.status === "COMPLETED" && (
                        <button
                          className="text-slate-600 hover:text-slate-900"
                          onClick={() => handleViewNotes(meeting)}
                        >
                          View Notes
                        </button>
                      )}
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
            pageSize={meta.pageSize}
            loading={loading}
            onPageChange={(page) => {
              setCurrentPage(page);
              dispatch(fetchMeetings({ page, pageSize }));
            }}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setCurrentPage(1);
              dispatch(fetchMeetings({ page: 1, pageSize: newPageSize }));
            }}
          />
        )}
      </div>

      {/* Edit Meeting Form */}
      {showEditForm && selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Meeting</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedMeeting(null);
                }}
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

            <form onSubmit={handleUpdateMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead *
                </label>
                <select
                  name="leadId"
                  value={formData.leadId}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled
                >
                  <option value={formData.leadId}>
                    {leads.find((l) => l.id === formData.leadId)?.title ||
                      "Selected Lead"}
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Lead cannot be changed after meeting creation
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Kick-off Meeting"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Meeting agenda or description"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="480"
                  onWheel={handleDurationWheel}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Type
                </label>
                <select
                  name="meetingType"
                  value={formData.meetingType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="KICKOFF">Kick-off Meeting</option>
                  <option value="FOLLOWUP">Follow-up</option>
                  <option value="CLARIFICATION">Clarification</option>
                  <option value="CLOSURE">Project Closure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Meeting location or room"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {!googleConnected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    name="meetingLink"
                    value={formData.meetingLink}
                    onChange={handleInputChange}
                    placeholder="e.g., https://meet.google.com/xxx-xxxx-xxx"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    loading
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {loading ? "Updating..." : "Update Meeting"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedMeeting(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Completion/Notes Modal */}
      {showCompleteForm && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedMeeting.status === "COMPLETED"
                  ? "Meeting Notes"
                  : "Complete Meeting"}
              </h2>
              <button
                onClick={() => setShowCompleteForm(false)}
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

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Meeting:</p>
              <p className="font-medium text-slate-900">
                {selectedMeeting.title}
              </p>
              <p className="text-sm text-slate-500">
                {formatDate(selectedMeeting.scheduledAt)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Meeting Outcome
                </label>
                <textarea
                  value={completionForm.outcome}
                  onChange={(e) =>
                    setCompletionForm((prev) => ({
                      ...prev,
                      outcome: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Summarize the meeting outcome..."
                  disabled={selectedMeeting.status === "COMPLETED"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Action Items
                </label>
                <textarea
                  value={completionForm.actionItems}
                  onChange={(e) =>
                    setCompletionForm((prev) => ({
                      ...prev,
                      actionItems: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="List action items and next steps..."
                  disabled={selectedMeeting.status === "COMPLETED"}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={completionForm.followUpRequired}
                  onChange={(e) =>
                    setCompletionForm((prev) => ({
                      ...prev,
                      followUpRequired: e.target.checked,
                    }))
                  }
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  disabled={selectedMeeting.status === "COMPLETED"}
                />
                <label
                  htmlFor="followUpRequired"
                  className="ml-2 text-sm text-slate-700"
                >
                  Follow-up meeting required
                </label>
              </div>

              {completionForm.followUpRequired && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={completionForm.followUpDate}
                      onChange={(e) =>
                        setCompletionForm((prev) => ({
                          ...prev,
                          followUpDate: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={selectedMeeting.status === "COMPLETED"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Follow-up Notes
                    </label>
                    <textarea
                      value={completionForm.followUpNotes}
                      onChange={(e) =>
                        setCompletionForm((prev) => ({
                          ...prev,
                          followUpNotes: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Notes for follow-up meeting..."
                      disabled={selectedMeeting.status === "COMPLETED"}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCompleteForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                {selectedMeeting.status === "COMPLETED" ? "Close" : "Cancel"}
              </button>
              {selectedMeeting.status !== "COMPLETED" && (
                <button
                  onClick={submitMeetingCompletion}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    loading
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {loading ? "Completing..." : "Complete Meeting"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;

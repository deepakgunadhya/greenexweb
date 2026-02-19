import { useState } from "react";

interface Report {
  id: number;
  title: string;
  type:
    | "ENVIRONMENTAL_AUDIT"
    | "CARBON_ASSESSMENT"
    | "SUSTAINABILITY"
    | "CUSTOM";
  projectId?: number;
  projectName?: string;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "DELIVERED";
  createdAt: string;
  lastModified: string;
  fileSize?: string;
}

export function ReportsPage() {
  const [reports] = useState<Report[]>([
    {
      id: 1,
      title: "Environmental Impact Assessment - Q4 2024",
      type: "ENVIRONMENTAL_AUDIT",
      projectName: "GreenTech Industries Assessment",
      status: "APPROVED",
      createdAt: "2024-12-01T10:00:00Z",
      lastModified: "2024-12-08T14:30:00Z",
      fileSize: "2.4 MB",
    },
    {
      id: 2,
      title: "Carbon Footprint Analysis Draft",
      type: "CARBON_ASSESSMENT",
      projectName: "EcoManufacturing Sustainability Audit",
      status: "DRAFT",
      createdAt: "2024-12-05T09:00:00Z",
      lastModified: "2024-12-09T11:15:00Z",
      fileSize: "1.8 MB",
    },
  ]);

  const [activeTab, setActiveTab] = useState<
    "all" | "draft" | "review" | "approved" | "delivered"
  >("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      case "REVIEW":
        return "bg-blue-100 text-blue-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "DELIVERED":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ENVIRONMENTAL_AUDIT":
        return "🌍";
      case "CARBON_ASSESSMENT":
        return "🌱";
      case "SUSTAINABILITY":
        return "♻️";
      case "CUSTOM":
        return "📄";
      default:
        return "📋";
    }
  };

  const filteredReports =
    activeTab === "all"
      ? reports
      : reports.filter((report) => report.status.toLowerCase() === activeTab);

  const tabs = [
    { id: "all", label: "All Reports", count: reports.length },
    {
      id: "draft",
      label: "Draft",
      count: reports.filter((r) => r.status === "DRAFT").length,
    },
    {
      id: "review",
      label: "In Review",
      count: reports.filter((r) => r.status === "REVIEW").length,
    },
    {
      id: "approved",
      label: "Approved",
      count: reports.filter((r) => r.status === "APPROVED").length,
    },
    {
      id: "delivered",
      label: "Delivered",
      count: reports.filter((r) => r.status === "DELIVERED").length,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-600">
            Generate and manage environmental assessment reports
          </p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          Generate Report
        </button>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? "bg-primary-100 text-primary-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Reports List */}
        <div className="divide-y divide-slate-200">
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl text-slate-400">📈</span>
              </div>
              <p className="text-slate-500">No reports found for this filter</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getTypeIcon(report.type)}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-slate-900">
                        {report.title}
                      </h3>
                      <div className="mt-1 text-sm text-slate-500">
                        {report.projectName && (
                          <span className="inline-flex items-center">
                            Project: {report.projectName}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-slate-400">
                        <span>
                          Created:{" "}
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          Modified:{" "}
                          {new Date(report.lastModified).toLocaleDateString()}
                        </span>
                        {report.fileSize && (
                          <span>Size: {report.fileSize}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}
                    >
                      {report.status.replace("_", " ")}
                    </span>

                    <div className="flex space-x-2">
                      <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View
                      </button>
                      <button className="text-slate-600 hover:text-slate-700 text-sm font-medium">
                        Edit
                      </button>
                      <button className="text-slate-600 hover:text-slate-700 text-sm font-medium">
                        Download
                      </button>
                      {report.status === "APPROVED" && (
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Deliver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report Templates */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">
            Report Templates
          </h3>
          <p className="text-sm text-slate-500">
            Quick start with predefined report templates
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-xl">🌍</span>
              <h4 className="font-medium text-slate-900">
                Environmental Audit
              </h4>
            </div>
            <p className="text-sm text-slate-600">
              Comprehensive environmental impact assessment template
            </p>
            <div className="mt-3">
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                Standard Template
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-xl">🌱</span>
              <h4 className="font-medium text-slate-900">Carbon Footprint</h4>
            </div>
            <p className="text-sm text-slate-600">
              Carbon emission analysis and reduction recommendations
            </p>
            <div className="mt-3">
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                Standard Template
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-xl">♻️</span>
              <h4 className="font-medium text-slate-900">
                Sustainability Report
              </h4>
            </div>
            <p className="text-sm text-slate-600">
              ESG compliance and sustainability metrics reporting
            </p>
            <div className="mt-3">
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                EcoVadis Compatible
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

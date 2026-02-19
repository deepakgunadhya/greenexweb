import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchClientProjects } from '@/store/slices/clientProjectsSlice';
import { FileText, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Pagination } from '@/components/pagination/Pagination';

export function ClientProjects() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projects, loading, error } = useAppSelector(state => state.clientProjects);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return projects.slice(start, start + currentPageSize);
  }, [projects, currentPage, currentPageSize]);

  useEffect(() => {
    dispatch(fetchClientProjects());
  }, [dispatch]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'PLANNED': 'bg-slate-100 text-slate-700',
      'CHECKLIST_FINALIZED': 'bg-blue-100 text-blue-700',
      'VERIFICATION_PASSED': 'bg-emerald-100 text-emerald-700',
      'EXECUTION_IN_PROGRESS': 'bg-amber-100 text-amber-700',
      'DRAFT_PREPARED': 'bg-purple-100 text-purple-700',
      'CLIENT_REVIEW': 'bg-cyan-100 text-cyan-700',
      'COMPLETED': 'bg-green-100 text-green-700',
    };
    return statusMap[status] || 'bg-slate-100 text-slate-600';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewChecklists = (projectId: string) => {
    navigate(`/client/projects/${projectId}/checklists`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-medium">Error loading projects</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
        <p className="text-slate-600 mt-1">View your project status and reports</p>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-slate-900">No Projects Yet</h3>
          <p className="text-slate-600 mt-2">
            You don't have any projects assigned yet. Projects will appear here once they are created.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {paginatedProjects.map((project: any) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {project.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {formatStatus(project.status)}
                      </span>
                    </div>
                    {project.projectNumber && (
                      <p className="text-sm text-slate-500 mt-1">
                        Project #{project.projectNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Project Description */}
                {project.description && (
                  <p className="text-slate-600 mb-4">{project.description}</p>
                )}

                {/* Project Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Start: {formatDate(project.startDate)}
                    </span>
                  </div>
                  {project.endDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        End: {formatDate(project.endDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      {project.checklistCount || 0} Checklist{project.checklistCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleViewChecklists(project.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Checklists
                  </button>
                  {project.checklistCount > 0 && (
                    <span className="text-sm text-slate-500">
                      {project.checklistCount} document{project.checklistCount !== 1 ? 's' : ''} to review
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(projects.length / currentPageSize)}
        totalItems={projects.length}
        pageSize={currentPageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

export default ClientProjects;

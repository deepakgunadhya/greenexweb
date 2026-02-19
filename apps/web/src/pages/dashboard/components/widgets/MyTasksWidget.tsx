/**
 * My Tasks Widget
 * Displays the current user's pending tasks
 */

import { Link } from 'react-router-dom';
import type { TaskSummary } from '../../../../types/dashboard';

interface MyTasksWidgetProps {
  tasks: TaskSummary[];
  loading?: boolean;
}

const priorityColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

const statusColors = {
  to_do: 'bg-slate-100 text-slate-700',
  doing: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
};

function formatDueDate(dateString?: string): string {
  if (!dateString) return 'No due date';

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate < today) {
    return 'Overdue';
  } else if (taskDate.getTime() === today.getTime()) {
    return 'Due today';
  } else if (taskDate.getTime() === tomorrow.getTime()) {
    return 'Due tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function getDueDateColor(dateString?: string): string {
  if (!dateString) return 'text-slate-400';

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate < today) {
    return 'text-red-600';
  } else if (taskDate.getTime() === today.getTime()) {
    return 'text-amber-600';
  }
  return 'text-slate-500';
}

export function MyTasksWidget({ tasks, loading }: MyTasksWidgetProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-slate-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              <div className="h-2 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">My Tasks</h3>
        <Link
          to="/tasks?filter=my-tasks"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-sm text-slate-500">No pending tasks</p>
          <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-800 truncate">
                    {task.title}
                  </h4>
                  {task.projectName && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {task.projectName}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    priorityColors[task.priority as keyof typeof priorityColors] ||
                    priorityColors.medium
                  }`}
                >
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    statusColors[task.status as keyof typeof statusColors] ||
                    statusColors.to_do
                  }`}
                >
                  {task.status.replace('_', ' ')}
                </span>
                <span className={`text-xs ${getDueDateColor(task.dueDate)}`}>
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTasksWidget;

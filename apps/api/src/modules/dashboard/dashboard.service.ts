/**
 * Dashboard Service
 * Enterprise-level dashboard with permission-based data aggregation
 * Executes queries in parallel for optimal performance
 */

import prisma from "../../config/database";
import {
  DashboardStats,
  DashboardStatsRequest,
  DashboardPreferences,
  LeadStats,
  LeadSummary,
  OrganizationStats,
  ProjectStats,
  TaskStats,
  TaskSummary,
  QuotationStats,
  MeetingStats,
  MeetingSummary,
  CMSStats,
  UserStats,
  ActivityItem,
  ClientDashboardStats,
  ClientMonthlyTrends,
  ClientMeetingSummary,
  ClientActivityItem,
  PaymentStats,
  PaymentSummary,
  MonthlyTrends,
  MonthlyDataPoint,
} from "./dashboard.types";

export class DashboardService {
  /**
   * Get permission-filtered dashboard statistics
   * Only fetches data for modules the user has permission to view
   */
  async getStats(request: DashboardStatsRequest): Promise<DashboardStats> {
    const stats: DashboardStats = {};
    const promises: Promise<void>[] = [];

    // Permission-based data fetching (parallel execution)
    if (request.permissions.includes("leads:read")) {
      promises.push(
        this.getLeadStats().then((data) => {
          stats.leads = data;
        })
      );
    }

    if (request.permissions.includes("organizations:read")) {
      promises.push(
        this.getOrganizationStats().then((data) => {
          stats.organizations = data;
        })
      );
    }

    if (request.permissions.includes("projects:read")) {
      promises.push(
        this.getProjectStats().then((data) => {
          stats.projects = data;
        })
      );
    }

    if (request.permissions.includes("tasks:read")) {
      promises.push(
        this.getTaskStats(request.userId).then((data) => {
          stats.tasks = data;
        })
      );
    }

    if (request.permissions.includes("quotations:read")) {
      promises.push(
        this.getQuotationStats().then((data) => {
          stats.quotations = data;
        })
      );
    }

    if (request.permissions.includes("meetings:read")) {
      promises.push(
        this.getMeetingStats(request.userId).then((data) => {
          stats.meetings = data;
        })
      );
    }

    if (request.permissions.includes("cms:read")) {
      promises.push(
        this.getCMSStats().then((data) => {
          stats.cms = data;
        })
      );
    }

    if (request.permissions.includes("users:read")) {
      promises.push(
        this.getUserStats().then((data) => {
          stats.users = data;
        })
      );
    }

    // Payment stats (requires projects:read or quotations:read permission)
    if (
      request.permissions.includes("projects:read") ||
      request.permissions.includes("quotations:read")
    ) {
      promises.push(
        this.getPaymentStats().then((data) => {
          stats.payments = data;
        })
      );
    }

    // Monthly trends (available to users with read access to any module)
    const hasReadAccess =
      request.permissions.includes("projects:read") ||
      request.permissions.includes("leads:read") ||
      request.permissions.includes("quotations:read") ||
      request.permissions.includes("tasks:read");

    if (hasReadAccess) {
      promises.push(
        this.getMonthlyTrends(request.permissions).then((data) => {
          stats.monthlyTrends = data;
        })
      );
    }

    await Promise.all(promises);
    return stats;
  }

  /**
   * Get lead statistics
   */
  private async getLeadStats(): Promise<LeadStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byStatus, thisMonth, recentLeadsData, closedCount] =
      await Promise.all([
        prisma.lead.count({ where: { isDeleted: false } }),
        prisma.lead.groupBy({
          by: ["status"],
          where: { isDeleted: false },
          _count: { id: true },
        }),
        prisma.lead.count({
          where: {
            isDeleted: false,
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.lead.findMany({
          where: { isDeleted: false },
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            organization: {
              select: { name: true },
            },
          },
        }),
        prisma.lead.count({
          where: { isDeleted: false, status: "CLOSED" },
        }),
      ]);

    const statusMap: Record<string, number> = {
      new: 0,
      inProgress: 0,
      closed: 0,
    };

    byStatus.forEach((item) => {
      const statusKey =
        item.status === "NEW"
          ? "new"
          : item.status === "IN_PROGRESS"
          ? "inProgress"
          : "closed";
      statusMap[statusKey] = item._count.id;
    });

    const conversionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    const recentLeads: LeadSummary[] = recentLeadsData.map((lead) => ({
      id: lead.id,
      title: lead.title,
      status: lead.status,
      organizationName: lead.organization?.name,
      createdAt: lead.createdAt,
    }));

    return {
      total,
      byStatus: statusMap as LeadStats["byStatus"],
      conversionRate,
      thisMonth,
      recentLeads,
    };
  }

  /**
   * Get organization statistics
   */
  private async getOrganizationStats(): Promise<OrganizationStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byType, thisMonth] = await Promise.all([
      prisma.organization.count({
        where: { isDeleted: false, isActive: true },
      }),
      prisma.organization.groupBy({
        by: ["type"],
        where: { isDeleted: false, isActive: true },
        _count: { id: true },
      }),
      prisma.organization.count({
        where: {
          isDeleted: false,
          isActive: true,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    const typeMap: Record<string, number> = {
      prospect: 0,
      client: 0,
      partner: 0,
    };

    byType.forEach((item) => {
      const typeKey = item.type?.toLowerCase() || "prospect";
      if (typeKey in typeMap) {
        typeMap[typeKey] = item._count.id;
      }
    });

    return {
      total,
      byType: typeMap as OrganizationStats["byType"],
      thisMonth,
    };
  }

  /**
   * Get project statistics
   * Note: Project model doesn't have isDeleted field
   */
  private async getProjectStats(): Promise<ProjectStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byStatus, completedThisMonth] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.project.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: startOfMonth },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    let activeProjects = 0;

    byStatus.forEach((item) => {
      statusMap[item.status] = item._count.id;
      if (
        item.status !== "COMPLETED" &&
        item.status !== "CANCELLED" &&
        item.status !== "ON_HOLD"
      ) {
        activeProjects += item._count.id;
      }
    });

    // Calculate timeline metrics based on project dates
    const projectsWithDates = await prisma.project.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        endDate: { not: null },
      },
      select: {
        id: true,
        endDate: true,
        status: true,
      },
    });

    let onTrack = 0;
    let atRisk = 0;
    let overdue = 0;

    const todayDate = new Date();
    const sevenDaysFromNow = new Date(
      todayDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    projectsWithDates.forEach((project) => {
      if (project.endDate) {
        if (project.endDate < todayDate) {
          overdue++;
        } else if (project.endDate <= sevenDaysFromNow) {
          atRisk++;
        } else {
          onTrack++;
        }
      }
    });

    return {
      total,
      byStatus: statusMap,
      timeline: { onTrack, atRisk, overdue },
      completedThisMonth,
      activeProjects,
    };
  }

  /**
   * Get task statistics (with user-specific "my tasks")
   * Note: ProjectTask model doesn't have isDeleted field
   */
  private async getTaskStats(userId: string): Promise<TaskStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [total, myTasks, byStatus, byPriority, tasksDueToday, overdueCount] =
      await Promise.all([
        prisma.projectTask.count(),
        prisma.projectTask.count({
          where: {
            assigneeId: userId,
            status: { not: "done" },
          },
        }),
        prisma.projectTask.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        prisma.projectTask.groupBy({
          by: ["priority"],
          _count: { id: true },
        }),
        prisma.projectTask.count({
          where: {
            dueDate: { gte: todayStart, lt: todayEnd },
            status: { not: "done" },
          },
        }),
        prisma.projectTask.count({
          where: {
            dueDate: { lt: todayStart },
            status: { not: "done" },
          },
        }),
      ]);

    const statusMap = { to_do: 0, doing: 0, blocked: 0, done: 0 };
    byStatus.forEach((item) => {
      if (item.status in statusMap) {
        statusMap[item.status as keyof typeof statusMap] = item._count.id;
      }
    });

    const priorityMap = { high: 0, medium: 0, low: 0 };
    byPriority.forEach((item) => {
      const priority = item.priority?.toLowerCase() || "medium";
      if (priority in priorityMap) {
        priorityMap[priority as keyof typeof priorityMap] = item._count.id;
      }
    });

    const onTrack = total - statusMap.done - tasksDueToday - overdueCount;

    return {
      total,
      myTasks,
      byStatus: statusMap,
      bySla: {
        on_track: Math.max(0, onTrack),
        due_today: tasksDueToday,
        overdue: overdueCount,
      },
      byPriority: priorityMap,
    };
  }

  /**
   * Get quotation statistics
   * Note: Quotation uses 'amount' field, not 'totalAmount'
   */
  private async getQuotationStats(): Promise<QuotationStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byStatus, thisMonth, valueAggregations] = await Promise.all([
      prisma.quotation.count({ where: { isDeleted: false } }),
      prisma.quotation.groupBy({
        by: ["status"],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.quotation.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.quotation.aggregate({
        where: { isDeleted: false },
        _sum: { amount: true },
      }),
    ]);

    // Get pending and accepted values
    const [pendingAgg, acceptedAgg] = await Promise.all([
      prisma.quotation.aggregate({
        where: { isDeleted: false, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.quotation.aggregate({
        where: { isDeleted: false, status: "ACCEPTED" },
        _sum: { amount: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((item) => {
      statusMap[item.status] = item._count.id;
    });

    return {
      total,
      byStatus: statusMap,
      totalValue: valueAggregations._sum.amount?.toNumber() || 0,
      pendingValue: pendingAgg._sum.amount?.toNumber() || 0,
      acceptedValue: acceptedAgg._sum.amount?.toNumber() || 0,
      thisMonth,
    };
  }

  /**
   * Get meeting statistics
   * Note: Meeting model uses 'organizedBy' field, not 'createdById'
   */
  private async getMeetingStats(userId: string): Promise<MeetingStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [upcoming, scheduledToday, completedThisWeek, upcomingMeetingsData] =
      await Promise.all([
        prisma.meeting.count({
          where: {
            isDeleted: false,
            startTime: { gte: now },
            status: { in: ["SCHEDULED", "CONFIRMED"] },
          },
        }),
        prisma.meeting.count({
          where: {
            isDeleted: false,
            startTime: { gte: todayStart, lt: todayEnd },
          },
        }),
        prisma.meeting.count({
          where: {
            isDeleted: false,
            status: "COMPLETED",
            endTime: { gte: weekAgo },
          },
        }),
        prisma.meeting.findMany({
          where: {
            isDeleted: false,
            startTime: { gte: now },
            status: { in: ["SCHEDULED", "CONFIRMED"] },
          },
          take: 5,
          orderBy: { startTime: "asc" },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            meetingType: true,
            status: true,
          },
        }),
      ]);

    const upcomingMeetings: MeetingSummary[] = upcomingMeetingsData.map(
      (meeting) => ({
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime || new Date(),
        endTime: meeting.endTime || undefined,
        type: meeting.meetingType,
        status: meeting.status,
        participants: 0, // Meeting model doesn't have participants count in schema
      })
    );

    return {
      upcoming,
      scheduledToday,
      completedThisWeek,
      upcomingMeetings,
    };
  }

  /**
   * Get CMS statistics
   */
  private async getCMSStats(): Promise<CMSStats> {
    const [total, byStatus, byType] = await Promise.all([
      prisma.content.count({ where: { isDeleted: false } }),
      prisma.content.groupBy({
        by: ["status"],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.content.groupBy({
        by: ["type"],
        where: { isDeleted: false },
        _count: { id: true },
      }),
    ]);

    let published = 0;
    let draft = 0;

    byStatus.forEach((item) => {
      if (item.status === "PUBLISHED") {
        published = item._count.id;
      } else if (item.status === "DRAFT") {
        draft = item._count.id;
      }
    });

    const typeMap: Record<string, number> = {};
    byType.forEach((item) => {
      typeMap[item.type] = item._count.id;
    });

    return {
      totalContent: total,
      published,
      draft,
      byType: typeMap,
    };
  }

  /**
   * Get user statistics
   * Note: User model doesn't have isDeleted field
   */
  private async getUserStats(): Promise<UserStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, byType, newThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ["userType"],
        where: { isActive: true },
        _count: { id: true },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    const typeMap = { internal: 0, client: 0 };
    byType.forEach((item) => {
      const userType = item.userType?.toLowerCase() || "internal";
      if (userType in typeMap) {
        typeMap[userType as keyof typeof typeMap] = item._count.id;
      }
    });

    return {
      total,
      active,
      byType: typeMap,
      newThisMonth,
    };
  }

  /**
   * Get recent activities based on user permissions
   */
  async getActivities(
    request: DashboardStatsRequest,
    limit: number = 10
  ): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch activities from different modules based on permissions
    const promises: Promise<void>[] = [];

    if (request.permissions.includes("leads:read")) {
      promises.push(
        prisma.lead
          .findMany({
            where: {
              isDeleted: false,
              updatedAt: { gte: weekAgo },
            },
            take: limit,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              status: true,
              updatedAt: true,
              createdAt: true,
            },
          })
          .then((leads) => {
            leads.forEach((lead) => {
              activities.push({
                id: `lead-${lead.id}`,
                type: "lead",
                action:
                  lead.updatedAt.getTime() === lead.createdAt.getTime()
                    ? "created"
                    : "updated",
                title: lead.title,
                description: `Lead ${lead.status.toLowerCase()}`,
                timestamp: lead.updatedAt,
              });
            });
          })
      );
    }

    if (request.permissions.includes("projects:read")) {
      promises.push(
        prisma.project
          .findMany({
            where: {
              updatedAt: { gte: weekAgo },
            },
            take: limit,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              status: true,
              updatedAt: true,
              createdAt: true,
            },
          })
          .then((projects) => {
            projects.forEach((project) => {
              activities.push({
                id: `project-${project.id}`,
                type: "project",
                action:
                  project.updatedAt.getTime() === project.createdAt.getTime()
                    ? "created"
                    : "updated",
                title: project.name,
                description: `Project status: ${project.status}`,
                timestamp: project.updatedAt,
              });
            });
          })
      );
    }

    if (request.permissions.includes("quotations:read")) {
      promises.push(
        prisma.quotation
          .findMany({
            where: {
              isDeleted: false,
              updatedAt: { gte: weekAgo },
            },
            take: limit,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              quotation_number: true,
              status: true,
              amount: true,
              updatedAt: true,
              createdAt: true,
            },
          })
          .then((quotations) => {
            quotations.forEach((quotation) => {
              activities.push({
                id: `quotation-${quotation.id}`,
                type: "quotation",
                action:
                  quotation.updatedAt.getTime() === quotation.createdAt.getTime()
                    ? "created"
                    : "updated",
                title: quotation.quotation_number,
                description: `Quotation ${quotation.status.toLowerCase()} - $${quotation.amount || 0}`,
                timestamp: quotation.updatedAt,
              });
            });
          })
      );
    }

    if (request.permissions.includes("tasks:read")) {
      promises.push(
        prisma.projectTask
          .findMany({
            where: {
              updatedAt: { gte: weekAgo },
            },
            take: limit,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              status: true,
              updatedAt: true,
              createdAt: true,
              project: {
                select: { name: true },
              },
            },
          })
          .then((tasks) => {
            tasks.forEach((task) => {
              activities.push({
                id: `task-${task.id}`,
                type: "task",
                action:
                  task.updatedAt.getTime() === task.createdAt.getTime()
                    ? "created"
                    : "updated",
                title: task.title,
                description: `Task ${task.status} - ${task.project?.name || "No project"}`,
                timestamp: task.updatedAt,
              });
            });
          })
      );
    }

    await Promise.all(promises);

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get user's tasks summary
   * Note: ProjectTask uses 'assigneeId' field
   */
  async getMyTasksSummary(userId: string): Promise<TaskSummary[]> {
    const tasks = await prisma.projectTask.findMany({
      where: {
        assigneeId: userId,
        status: { not: "done" },
      },
      take: 10,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: {
          select: { name: true },
        },
      },
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority || "medium",
      dueDate: task.dueDate || undefined,
      projectName: task.project?.name,
    }));
  }

  /**
   * Get user's upcoming meetings
   * Note: Meeting uses 'organizedBy' field
   */
  async getMyMeetings(userId: string): Promise<MeetingSummary[]> {
    const now = new Date();

    const meetings = await prisma.meeting.findMany({
      where: {
        isDeleted: false,
        startTime: { gte: now },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        organizedBy: userId,
      },
      take: 10,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        meetingType: true,
        status: true,
      },
    });

    return meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      startTime: meeting.startTime || new Date(),
      endTime: meeting.endTime || undefined,
      type: meeting.meetingType,
      status: meeting.status,
      participants: 0,
    }));
  }

  /**
   * Get client portal dashboard statistics
   * Data is isolated to the client's organization
   * Note: Quotation uses 'amount' field
   */
  async getClientDashboardStats(
    organizationId: string
  ): Promise<ClientDashboardStats> {
    const [projectsData, quotationsData, submissionsData] = await Promise.all([
      // Projects for this organization
      prisma.project.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      }),

      // Quotations for this organization
      prisma.quotation.findMany({
        where: {
          lead: { organizationId },
          isDeleted: false,
        },
        select: {
          id: true,
          status: true,
          amount: true,
        },
      }),

      // Client submissions for this organization
      prisma.clientSubmission.findMany({
        where: {
          assignment: {
            project: { organizationId },
          },
          isLatest: true,
        },
        select: {
          id: true,
          status: true,
        },
      }),
    ]);

    // Process projects
    const projectStats: ClientDashboardStats["projects"] = {
      total: projectsData.length,
      inProgress: 0,
      completed: 0,
      inReview: 0,
      recentProjects: projectsData.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      })),
    };

    projectsData.forEach((project) => {
      if (project.status === "COMPLETED") {
        projectStats.completed++;
      } else if (project.status === "CLIENT_REVIEW") {
        projectStats.inReview++;
      } else if (
        !["CANCELLED", "ON_HOLD", "COMPLETED"].includes(project.status)
      ) {
        projectStats.inProgress++;
      }
    });

    // Process quotations
    const quotationStats: ClientDashboardStats["quotations"] = {
      total: quotationsData.length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      totalValue: 0,
    };

    quotationsData.forEach((quotation) => {
      quotationStats.totalValue += quotation.amount?.toNumber() || 0;
      if (quotation.status === "PENDING") {
        quotationStats.pending++;
      } else if (quotation.status === "ACCEPTED") {
        quotationStats.accepted++;
      } else if (quotation.status === "REJECTED") {
        quotationStats.rejected++;
      }
    });

    // Process submissions
    const submissionStats: ClientDashboardStats["submissions"] = {
      total: submissionsData.length,
      pending: 0,
      approved: 0,
      needsRevision: 0,
    };

    submissionsData.forEach((submission) => {
      if (submission.status === "PENDING") {
        submissionStats.pending++;
      } else if (submission.status === "APPROVED") {
        submissionStats.approved++;
      } else if (submission.status === "NEEDS_REVISION") {
        submissionStats.needsRevision++;
      }
    });

    // Get monthly trends and additional data in parallel
    const [monthlyTrends, upcomingMeetings, recentActivity] = await Promise.all([
      this.getClientMonthlyTrends(organizationId),
      this.getClientUpcomingMeetings(organizationId),
      this.getClientRecentActivity(organizationId),
    ]);

    return {
      projects: projectStats,
      quotations: quotationStats,
      submissions: submissionStats,
      monthlyTrends,
      upcomingMeetings,
      recentActivity,
    };
  }

  /**
   * Get monthly trends for client dashboard
   */
  private async getClientMonthlyTrends(organizationId: string): Promise<ClientMonthlyTrends> {
    const trends: ClientMonthlyTrends = {
      projects: [],
      quotations: [],
      submissions: [],
    };

    const now = new Date();

    // Get data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      const [projectCount, quotationCount, submissionCount] = await Promise.all([
        prisma.project.count({
          where: {
            organizationId,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.quotation.count({
          where: {
            lead: { organizationId },
            isDeleted: false,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.clientSubmission.count({
          where: {
            assignment: { project: { organizationId } },
            uploadedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

      trends.projects.push({ month: monthName, value: projectCount });
      trends.quotations.push({ month: monthName, value: quotationCount });
      trends.submissions.push({ month: monthName, value: submissionCount });
    }

    // Calculate change percentages
    this.calculateChangePercentages(trends.projects);
    this.calculateChangePercentages(trends.quotations);
    this.calculateChangePercentages(trends.submissions);

    return trends;
  }

  /**
   * Get upcoming meetings for client
   */
  private async getClientUpcomingMeetings(organizationId: string): Promise<ClientMeetingSummary[]> {
    const now = new Date();

    const meetings = await prisma.meeting.findMany({
      where: {
        lead: { organizationId },
        startTime: { gte: now },
        status: { not: "CANCELLED" },
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        meetingType: true,
        status: true,
      },
      orderBy: { startTime: "asc" },
      take: 5,
    });

    return meetings.map((m) => ({
      id: m.id,
      title: m.title,
      startTime: m.startTime!,
      endTime: m.endTime || undefined,
      type: m.meetingType,
      status: m.status,
    }));
  }

  /**
   * Get recent activity for client
   */
  private async getClientRecentActivity(organizationId: string): Promise<ClientActivityItem[]> {
    const activities: ClientActivityItem[] = [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get recent projects
    const recentProjects = await prisma.project.findMany({
      where: {
        organizationId,
        updatedAt: { gte: oneMonthAgo },
      },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    recentProjects.forEach((p) => {
      activities.push({
        id: `project-${p.id}`,
        type: "project",
        action: "updated",
        title: p.name,
        description: `Project status: ${p.status.replace(/_/g, " ").toLowerCase()}`,
        timestamp: p.updatedAt,
      });
    });

    // Get recent quotations
    const recentQuotations = await prisma.quotation.findMany({
      where: {
        lead: { organizationId },
        isDeleted: false,
        updatedAt: { gte: oneMonthAgo },
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    recentQuotations.forEach((q) => {
      activities.push({
        id: `quotation-${q.id}`,
        type: "quotation",
        action: q.status === "SENT" ? "received" : q.status.toLowerCase(),
        title: q.title || "Quotation",
        description: `Quotation ${q.status.toLowerCase()}`,
        timestamp: q.updatedAt,
      });
    });

    // Get recent submissions
    const recentSubmissions = await prisma.clientSubmission.findMany({
      where: {
        assignment: { project: { organizationId } },
        uploadedAt: { gte: oneMonthAgo },
      },
      select: {
        id: true,
        status: true,
        uploadedAt: true,
        assignment: {
          select: {
            templateFile: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
      take: 5,
    });

    recentSubmissions.forEach((s) => {
      activities.push({
        id: `submission-${s.id}`,
        type: "submission",
        action: s.status.toLowerCase(),
        title: s.assignment?.templateFile?.title || "Document Submission",
        description: `Submission ${s.status.replace(/_/g, " ").toLowerCase()}`,
        timestamp: s.uploadedAt,
      });
    });

    // Sort by timestamp and return top 10
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  /**
   * Get payment statistics from projects and quotations
   */
  private async getPaymentStats(): Promise<PaymentStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get projects with payment info
    const [projectsWithPayments, acceptedQuotations, monthlyRevenueData] =
      await Promise.all([
        prisma.project.findMany({
          select: {
            id: true,
            name: true,
            paymentStatus: true,
            estimatedCost: true,
            actualCost: true,
            updatedAt: true,
            organization: {
              select: { name: true },
            },
          },
        }),
        prisma.quotation.aggregate({
          where: {
            isDeleted: false,
            status: "ACCEPTED",
          },
          _sum: { amount: true },
        }),
        // Get monthly revenue from accepted quotations (last 6 months)
        this.getMonthlyRevenueData(),
      ]);

    // Calculate payment status counts
    const byStatus = { pending: 0, partial: 0, paid: 0, overdue: 0 };
    let totalRevenue = 0;
    let pendingPayments = 0;
    let receivedThisMonth = 0;
    let overdueAmount = 0;

    const recentPayments: PaymentSummary[] = [];

    projectsWithPayments.forEach((project) => {
      const amount = project.actualCost?.toNumber() || project.estimatedCost?.toNumber() || 0;

      const status = project.paymentStatus?.toLowerCase() || "pending";
      if (status === "pending") {
        byStatus.pending++;
        pendingPayments += amount;
      } else if (status === "partial") {
        byStatus.partial++;
        // Estimate half remaining for partial payments
        pendingPayments += amount * 0.5;
        totalRevenue += amount * 0.5;
      } else if (status === "paid") {
        byStatus.paid++;
        totalRevenue += amount;
        // Check if payment was marked this month
        if (project.updatedAt >= startOfMonth) {
          receivedThisMonth += amount;
        }
      } else if (status === "overdue") {
        byStatus.overdue++;
        overdueAmount += amount;
        pendingPayments += amount;
      }

      // Add to recent payments (top 5)
      if (recentPayments.length < 5) {
        recentPayments.push({
          id: project.id,
          amount,
          status: project.paymentStatus || "pending",
          projectName: project.name,
          organizationName: project.organization?.name,
        });
      }
    });

    return {
      totalRevenue: totalRevenue || acceptedQuotations._sum.amount?.toNumber() || 0,
      pendingPayments,
      receivedThisMonth,
      overdueAmount,
      byStatus,
      recentPayments,
      monthlyRevenue: monthlyRevenueData,
    };
  }

  /**
   * Get monthly revenue data for the last 6 months
   */
  private async getMonthlyRevenueData(): Promise<MonthlyDataPoint[]> {
    const months: MonthlyDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      // Get accepted quotations for this month
      const monthlyTotal = await prisma.quotation.aggregate({
        where: {
          isDeleted: false,
          status: "ACCEPTED",
          updatedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      });

      months.push({
        month: monthName,
        value: monthlyTotal._sum.amount?.toNumber() || 0,
      });
    }

    // Calculate change percentages
    for (let i = 1; i < months.length; i++) {
      months[i].previousValue = months[i - 1].value;
      if (months[i - 1].value > 0) {
        months[i].change = Math.round(
          ((months[i].value - months[i - 1].value) / months[i - 1].value) * 100
        );
      }
    }

    return months;
  }

  /**
   * Get monthly trends for various metrics
   */
  private async getMonthlyTrends(permissions: string[]): Promise<MonthlyTrends> {
    const trends: MonthlyTrends = {
      projects: [],
      quotations: [],
      leads: [],
      tasks: [],
      revenue: [],
    };

    const now = new Date();
    const promises: Promise<void>[] = [];

    // Get monthly data for the last 6 months
    if (permissions.includes("projects:read")) {
      promises.push(
        this.getMonthlyProjectData().then((data) => {
          trends.projects = data;
        })
      );
    }

    if (permissions.includes("quotations:read")) {
      promises.push(
        this.getMonthlyQuotationData().then((data) => {
          trends.quotations = data;
        })
      );
      promises.push(
        this.getMonthlyRevenueData().then((data) => {
          trends.revenue = data;
        })
      );
    }

    if (permissions.includes("leads:read")) {
      promises.push(
        this.getMonthlyLeadData().then((data) => {
          trends.leads = data;
        })
      );
    }

    if (permissions.includes("tasks:read")) {
      promises.push(
        this.getMonthlyTaskData().then((data) => {
          trends.tasks = data;
        })
      );
    }

    await Promise.all(promises);
    return trends;
  }

  /**
   * Get monthly project creation data
   */
  private async getMonthlyProjectData(): Promise<MonthlyDataPoint[]> {
    const months: MonthlyDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      const count = await prisma.project.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      months.push({ month: monthName, value: count });
    }

    this.calculateChangePercentages(months);
    return months;
  }

  /**
   * Get monthly quotation data
   */
  private async getMonthlyQuotationData(): Promise<MonthlyDataPoint[]> {
    const months: MonthlyDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      const count = await prisma.quotation.count({
        where: {
          isDeleted: false,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      months.push({ month: monthName, value: count });
    }

    this.calculateChangePercentages(months);
    return months;
  }

  /**
   * Get monthly lead data
   */
  private async getMonthlyLeadData(): Promise<MonthlyDataPoint[]> {
    const months: MonthlyDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      const count = await prisma.lead.count({
        where: {
          isDeleted: false,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      months.push({ month: monthName, value: count });
    }

    this.calculateChangePercentages(months);
    return months;
  }

  /**
   * Get monthly task completion data
   */
  private async getMonthlyTaskData(): Promise<MonthlyDataPoint[]> {
    const months: MonthlyDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      const count = await prisma.projectTask.count({
        where: {
          status: "done",
          updatedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      months.push({ month: monthName, value: count });
    }

    this.calculateChangePercentages(months);
    return months;
  }

  /**
   * Calculate change percentages for monthly data
   */
  private calculateChangePercentages(months: MonthlyDataPoint[]): void {
    for (let i = 1; i < months.length; i++) {
      months[i].previousValue = months[i - 1].value;
      if (months[i - 1].value > 0) {
        months[i].change = Math.round(
          ((months[i].value - months[i - 1].value) / months[i - 1].value) * 100
        );
      } else if (months[i].value > 0) {
        months[i].change = 100;
      } else {
        months[i].change = 0;
      }
    }
  }

  // Valid widget IDs that can be stored in preferences
  private static readonly VALID_WIDGET_IDS = [
    'overview-stats',
    'revenue-overview',
    'projects-analytics',
    'tasks-analytics',
    'leads-analytics',
    'my-tasks',
    'activity-feed',
    'organizations-stats',
    'users-stats',
    'cms-stats',
  ];

  /**
   * Get user's dashboard widget preferences
   */
  async getWidgetPreferences(userId: string): Promise<DashboardPreferences> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dashboardPreferences: true },
    });

    if (!user?.dashboardPreferences) {
      return { hiddenWidgets: [] };
    }

    const prefs = user.dashboardPreferences as Record<string, unknown>;
    return {
      hiddenWidgets: Array.isArray(prefs.hiddenWidgets) ? prefs.hiddenWidgets : [],
    };
  }

  /**
   * Update user's dashboard widget preferences
   */
  async updateWidgetPreferences(
    userId: string,
    preferences: DashboardPreferences
  ): Promise<DashboardPreferences> {
    const validHiddenWidgets = preferences.hiddenWidgets.filter(
      (id) => DashboardService.VALID_WIDGET_IDS.includes(id)
    );

    const updatedPrefs = { hiddenWidgets: validHiddenWidgets };

    await prisma.user.update({
      where: { id: userId },
      data: { dashboardPreferences: updatedPrefs },
    });

    return updatedPrefs;
  }
}

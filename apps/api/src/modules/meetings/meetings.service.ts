import { PrismaClient, Meeting, Prisma } from "@prisma/client";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "./meetings.google";
import { logger } from "../../utils/logger";
import prisma from "../../config/database";
import { EmailService } from "../email/email.service";
import {
  getMeetingCreatedTemplate,
  getMeetingUpdatedTemplate,
  getMeetingDeletedTemplate,
} from "../email/templates/meeting.template";

export class MeetingsService {
  private emailService: EmailService;

  constructor(private prisma: PrismaClient) {
    this.emailService = new EmailService();
  }

  async createMeeting(data: Prisma.MeetingCreateInput): Promise<Meeting> {
    return await this.prisma.meeting.create({
      data,
      include: {
        lead: {
          include: {
            organization: true,
            contact: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getMeetingById(id: string): Promise<Meeting | null> {
    return await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            organization: true,
            contact: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getMeetingsByLead(leadId: string): Promise<Meeting[]> {
    return await this.prisma.meeting.findMany({
      where: {
        leadId,
        isDeleted: false,
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async getMeetingsByOrganization(organizationId: string): Promise<Meeting[]> {
    return await this.prisma.meeting.findMany({
      where: {
        lead: {
          organizationId,
        },
        isDeleted: false,
      },
      include: {
        lead: {
          select: {
            id: true,
            title: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async getAllMeetings(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    meetingType?: string;
    organizedBy?: string;
    scheduledFrom?: Date;
    scheduledTo?: Date;
  }): Promise<{ meetings: Meeting[]; total: number }> {
    const {
      page = 1,
      pageSize = 10,
      status,
      meetingType,
      organizedBy,
      scheduledFrom,
      scheduledTo,
    } = options;

    const skip = (page - 1) * pageSize;

    const where: Prisma.MeetingWhereInput = {
      isDeleted: false,
      ...(status && { status }),
      ...(meetingType && { meetingType }),
      ...(organizedBy && { organizedBy }),
      ...(scheduledFrom &&
        scheduledTo && {
          scheduledAt: {
            gte: scheduledFrom,
            lte: scheduledTo,
          },
        }),
    };

    const [meetings, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        include: {
          lead: {
            include: {
              organization: true,
              contact: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { scheduledAt: "asc" },
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return { meetings, total };
  }

  async updateMeeting(
    id: string,
    data: Prisma.MeetingUpdateInput
  ): Promise<Meeting> {
    return await this.prisma.$transaction(async (tx) => {
      const existingMeeting = await tx.meeting.findUnique({
        where: { id },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!existingMeeting) {
        throw new Error("Meeting not found");
      }

      const updatedMeeting = await tx.meeting.update({
        where: { id },
        data,
        include: {
          lead: {
            include: {
              organization: true,
              contact: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (existingMeeting.calendarEventId) {
        try {
          const googleAuth = await prisma.googleAuth.findUnique({
            where: { userId: existingMeeting.organizedBy },
          });

          if (googleAuth && googleAuth.isActive && googleAuth.accessToken) {
            logger.info("Google Calendar connected, updating calendar event", {
              meetingId: id,
              eventId: existingMeeting.calendarEventId,
            });

            const title = (data.title as string) || existingMeeting.title;
            const description =
              (data.description as string) || existingMeeting.description || "";
            const scheduledAt =
              (data.scheduledAt as Date) || existingMeeting.scheduledAt;
            const duration =
              (data.duration as number) || existingMeeting.duration || 60;

            if (!scheduledAt) {
              logger.warn(
                "Meeting has no scheduledAt, skipping calendar update",
                {
                  meetingId: id,
                }
              );
              return updatedMeeting;
            }

            const startTime = new Date(scheduledAt);
            const endTime = new Date(
              startTime.getTime() + duration * 60 * 1000
            );

            const attendees: string[] = [];
            if (updatedMeeting.organizer?.email) {
              attendees.push(updatedMeeting.organizer.email);
            }
            if (updatedMeeting.lead?.contact?.email) {
              attendees.push(updatedMeeting.lead.contact.email);
            }
            if (updatedMeeting.lead?.organization?.email) {
              attendees.push(updatedMeeting.lead.organization.email);
            }

            const calendarEvent = await updateCalendarEvent({
              accessToken: googleAuth.accessToken,
              refreshToken: googleAuth.refreshToken || null,
              eventId: existingMeeting.calendarEventId,
              summary: title,
              description: description,
              start: startTime,
              end: endTime,
              attendees: attendees.length > 0 ? attendees : [],
            });

            if (calendarEvent.newAccessToken) {
              await prisma.googleAuth.update({
                where: { userId: existingMeeting.organizedBy },
                data: {
                  accessToken: calendarEvent.newAccessToken,
                  refreshToken:
                    calendarEvent.newRefreshToken || googleAuth.refreshToken,
                },
              });
              logger.info(
                "Google access token refreshed during meeting update",
                {
                  meetingId: id,
                }
              );
            }

            if (
              calendarEvent.meetLink &&
              calendarEvent.meetLink !== existingMeeting.meetingLink
            ) {
              await tx.meeting.update({
                where: { id },
                data: {
                  meetingLink: calendarEvent.meetLink,
                },
              });

              return (await tx.meeting.findUnique({
                where: { id },
                include: {
                  lead: {
                    include: {
                      organization: true,
                      contact: true,
                    },
                  },
                  organizer: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              })) as Meeting;
            }

            logger.info("Google Calendar event updated successfully", {
              meetingId: id,
              eventId: existingMeeting.calendarEventId,
            });
          } else {
            logger.info(
              "Google Calendar not connected or inactive, skipping calendar event update",
              {
                meetingId: id,
              }
            );
          }
        } catch (googleError: any) {
          logger.error("Failed to update Google Calendar event", {
            meetingId: id,
            error: googleError.message,
            stack: googleError.stack,
          });
        }
      }

      try {
        const recipients: string[] = [];

        const organizerEmail = updatedMeeting.organizer?.email;
        if (organizerEmail) {
          recipients.push(organizerEmail);
        }

        const leadContactEmail = updatedMeeting.lead?.contact?.email;
        if (leadContactEmail) {
          recipients.push(leadContactEmail);
        }

        const leadOrgEmail = updatedMeeting.lead?.organization?.email;
        if (leadOrgEmail && !leadContactEmail) {
          recipients.push(leadOrgEmail);
        }

        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length > 0) {
          const html = getMeetingUpdatedTemplate({
            title: updatedMeeting.title,
            description: updatedMeeting.description || undefined,
            meetingType: updatedMeeting.meetingType || undefined,
            status: updatedMeeting.status,
            scheduledAt: updatedMeeting.scheduledAt,
            duration: updatedMeeting.duration || undefined,
            location: updatedMeeting.location || undefined,
            meetingLink: updatedMeeting.meetingLink || undefined,
            organizerName: updatedMeeting.organizer
              ? `${updatedMeeting.organizer.firstName} ${updatedMeeting.organizer.lastName}`
              : undefined,
            organizerEmail: updatedMeeting.organizer?.email || undefined,
            recipientEmails: uniqueRecipients,
          });

          await this.emailService.sendEmail({
            to: uniqueRecipients,
            subject: `Meeting Updated: ${updatedMeeting.title}`,
            html,
          });
        }
      } catch (error) {
        logger.error("Failed to send meeting update email", {
          meetingId: id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return updatedMeeting;
    });
  }

  async scheduleMeeting(
    leadId: string,
    organizerId: string,
    meetingData: {
      title: string;
      description?: string;
      scheduledAt: Date;
      duration?: number;
      location?: string;
      meetingLink?: string;
      meetingType?: string;
      clientSide?: string;
      greenexSide?: string;
    }
  ): Promise<Meeting> {
    return await this.prisma.$transaction(async (tx) => {
      const duration = meetingData.duration || 60;
      const startTime = new Date(meetingData.scheduledAt);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      const existingMeetings = await tx.meeting.findMany({
        where: {
          leadId,
          isDeleted: false,
          status: {
            in: ["SCHEDULED", "IN_PROGRESS"],
          },
          scheduledAt: {
            not: null,
          },
          duration: {
            not: null,
          },
        },
      });

      const conflictingMeeting = existingMeetings.find((meeting) => {
        if (!meeting.scheduledAt || !meeting.duration) return false;
        const existingStart = new Date(meeting.scheduledAt);
        const existingEnd = new Date(
          existingStart.getTime() + meeting.duration * 60 * 1000
        );
        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        );
      });

      if (conflictingMeeting) {
        throw new Error(
          "This lead already has a meeting scheduled at this time."
        );
      }

      const meeting = await tx.meeting.create({
        data: {
          leadId,
          organizedBy: organizerId,
          title: meetingData.title,
          description: meetingData.description,
          scheduledAt: meetingData.scheduledAt,
          duration: meetingData.duration || 60,
          location: meetingData.location,
          meetingLink: meetingData.meetingLink,
          meetingType: meetingData.meetingType || "KICKOFF",
          clientSide: meetingData.clientSide,
          greenexSide: meetingData.greenexSide,
          status: "SCHEDULED",
        },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (meetingData.meetingType === "KICKOFF") {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            meetingStatus: "SCHEDULED",
            businessStage: "MEETING_SCHEDULED",
            stageChangedAt: new Date(),
            stageChangedById: organizerId,
          },
        });
      }

      let googleCalendarCreated = false;

      try {
        const googleAuth = await prisma.googleAuth.findUnique({
          where: { userId: organizerId },
        });

        if (googleAuth && googleAuth.isActive && googleAuth.accessToken) {
          logger.info("Google Calendar connected, creating calendar event", {
            meetingId: meeting.id,
          });

          const startTime = new Date(meetingData.scheduledAt);
          const endTime = new Date(
            startTime.getTime() + (meetingData.duration || 60) * 60 * 1000
          );

          const attendees: string[] = [];
          if (meeting.organizer?.email) {
            attendees.push(meeting.organizer.email);
          }
          if (meeting.lead?.contact?.email) {
            attendees.push(meeting.lead.contact.email);
          }
          if (meeting.lead?.organization?.email) {
            attendees.push(meeting.lead.organization.email);
          }

          const calendarEvent = await createCalendarEvent({
            accessToken: googleAuth.accessToken,
            refreshToken: googleAuth.refreshToken || null,
            summary: meetingData.title,
            description: meetingData.description || "",
            start: startTime,
            end: endTime,
            attendees: attendees.length > 0 ? attendees : [],
          });

          if (calendarEvent.newAccessToken) {
            await prisma.googleAuth.update({
              where: { userId: organizerId },
              data: {
                accessToken: calendarEvent.newAccessToken,
                refreshToken:
                  calendarEvent.newRefreshToken || googleAuth.refreshToken,
              },
            });
            logger.info("Google access token refreshed", {
              meetingId: meeting.id,
            });
          }

          if (calendarEvent.eventId) {
            const updateData: any = {
              calendarEventId: calendarEvent.eventId,
            };

            if (calendarEvent.meetLink) {
              updateData.meetingLink = calendarEvent.meetLink;
            }

            await tx.meeting.update({
              where: { id: meeting.id },
              data: updateData,
            });

            logger.info("Google Calendar event created successfully", {
              meetingId: meeting.id,
              eventId: calendarEvent.eventId,
              meetLink: calendarEvent.meetLink,
            });

            googleCalendarCreated = true;

            const updatedMeeting = await tx.meeting.findUnique({
              where: { id: meeting.id },
              include: {
                lead: {
                  include: {
                    organization: true,
                    contact: true,
                  },
                },
                organizer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            });

            return updatedMeeting as Meeting;
          }
        } else {
          logger.info(
            "Google Calendar not connected or inactive, skipping calendar event creation",
            {
              meetingId: meeting.id,
            }
          );
        }
      } catch (googleError: any) {
        logger.error("Failed to create Google Calendar event", {
          meetingId: meeting.id,
          error: googleError.message,
          stack: googleError.stack,
        });
      }

      // Only send email notification if Google Calendar was NOT created
      if (!googleCalendarCreated) {
        try {
          const recipients: string[] = [];

          const organizerEmail = meeting.organizer?.email;
          if (organizerEmail) {
            recipients.push(organizerEmail);
          }

          const leadContactEmail = meeting.lead?.contact?.email;
          if (leadContactEmail) {
            recipients.push(leadContactEmail);
          }

          const leadOrgEmail = meeting.lead?.organization?.email;
          if (leadOrgEmail && !leadContactEmail) {
            recipients.push(leadOrgEmail);
          }

          const uniqueRecipients = [...new Set(recipients)];

          if (uniqueRecipients.length > 0) {
            const html = getMeetingCreatedTemplate({
              title: meeting.title,
              description: meeting.description || undefined,
              meetingType: meeting.meetingType || undefined,
              status: meeting.status,
              scheduledAt: meeting.scheduledAt,
              duration: meeting.duration || undefined,
              location: meeting.location || undefined,
              meetingLink: meeting.meetingLink || undefined,
              organizerName: meeting.organizer
                ? `${meeting.organizer.firstName} ${meeting.organizer.lastName}`
                : undefined,
              organizerEmail: meeting.organizer?.email || undefined,
              recipientEmails: uniqueRecipients,
            });

            await this.emailService.sendEmail({
              to: uniqueRecipients,
              subject: `New Meeting Scheduled: ${meeting.title}`,
              html,
            });
          }
        } catch (error) {
          logger.error("Failed to send meeting creation email", {
            meetingId: meeting.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return meeting;
    });
  }

  async startMeeting(meetingId: string, startTime?: Date): Promise<Meeting> {
    const meeting = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: "IN_PROGRESS",
        startTime: startTime || new Date(),
      },
      include: {
        lead: true,
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return meeting;
  }

  async completeMeeting(
    meetingId: string,
    completionData: {
      endTime?: Date;
      outcome?: string;
      actionItems?: string;
      followUpRequired?: boolean;
      followUpDate?: Date;
      followUpNotes?: string;
    }
  ): Promise<Meeting> {
    return await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: "COMPLETED",
          endTime: completionData.endTime || new Date(),
          outcome: completionData.outcome,
          actionItems: completionData.actionItems,
          followUpRequired: completionData.followUpRequired || false,
          followUpDate: completionData.followUpDate,
          followUpNotes: completionData.followUpNotes,
        },
        include: {
          lead: true,
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (meeting.meetingType === "KICKOFF") {
        await tx.lead.update({
          where: { id: meeting.leadId },
          data: {
            meetingStatus: "COMPLETED",
            businessStage: "MEETING_COMPLETED",
            stageChangedAt: new Date(),
            stageChangedById: meeting.organizedBy,
          },
        });
      }

      return meeting;
    });
  }

  async cancelMeeting(meetingId: string, reason?: string): Promise<Meeting> {
    return await this.prisma.$transaction(async (tx) => {
      const existingMeeting = await tx.meeting.findUnique({
        where: { id: meetingId },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!existingMeeting) {
        throw new Error("Meeting not found");
      }

      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: "CANCELLED",
          outcome: reason ? `Cancelled: ${reason}` : "Meeting cancelled",
        },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (meeting.meetingType === "KICKOFF") {
        await tx.lead.update({
          where: { id: meeting.leadId },
          data: {
            meetingStatus: "CANCELLED",
          },
        });
      }

      if (existingMeeting.calendarEventId) {
        try {
          const googleAuth = await prisma.googleAuth.findUnique({
            where: { userId: existingMeeting.organizedBy },
          });

          if (googleAuth && googleAuth.isActive && googleAuth.accessToken) {
            logger.info(
              "Deleting Google Calendar event for cancelled meeting",
              {
                meetingId,
                eventId: existingMeeting.calendarEventId,
              }
            );

            const deleteResult = await deleteCalendarEvent({
              accessToken: googleAuth.accessToken,
              refreshToken: googleAuth.refreshToken || null,
              eventId: existingMeeting.calendarEventId,
            });

            if (deleteResult.newAccessToken) {
              await prisma.googleAuth.update({
                where: { userId: existingMeeting.organizedBy },
                data: {
                  accessToken: deleteResult.newAccessToken,
                  refreshToken:
                    deleteResult.newRefreshToken || googleAuth.refreshToken,
                },
              });
            }

            logger.info("Google Calendar event deleted successfully", {
              meetingId,
              eventId: existingMeeting.calendarEventId,
            });
          }
        } catch (googleError: any) {
          logger.error("Failed to delete Google Calendar event", {
            meetingId,
            error: googleError.message,
            stack: googleError.stack,
          });
        }
      }

      try {
        const recipients: string[] = [];

        const organizerEmail = meeting.organizer?.email;
        if (organizerEmail) {
          recipients.push(organizerEmail);
        }

        const leadContactEmail = meeting.lead?.contact?.email;
        if (leadContactEmail) {
          recipients.push(leadContactEmail);
        }

        const leadOrgEmail = meeting.lead?.organization?.email;
        if (leadOrgEmail && !leadContactEmail) {
          recipients.push(leadOrgEmail);
        }

        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length > 0) {
          const html = getMeetingDeletedTemplate({
            title: meeting.title,
            status: meeting.status,
          });

          await this.emailService.sendEmail({
            to: uniqueRecipients,
            subject: `Meeting Cancelled: ${meeting.title}`,
            html,
          });
        }
      } catch (error) {
        logger.error("Failed to send meeting cancellation email", {
          meetingId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return meeting;
    });
  }

  async rescheduleMeeting(
    meetingId: string,
    newScheduledAt: Date,
    reason?: string
  ): Promise<Meeting> {
    return await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        scheduledAt: newScheduledAt,
        outcome: reason ? `Rescheduled: ${reason}` : "Meeting rescheduled",
        status: "SCHEDULED",
      },
      include: {
        lead: {
          include: {
            organization: true,
            contact: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
  async deleteMeeting(id: string): Promise<void> {
    return await this.prisma.$transaction(async (tx) => {
      // Get meeting with organizer info before deleting
      const existingMeeting = await tx.meeting.findUnique({
        where: { id },
        include: {
          organizer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!existingMeeting) {
        throw new Error("Meeting not found");
      }

      // Delete Google Calendar event if it exists
      if (existingMeeting.calendarEventId) {
        try {
          const googleAuth = await prisma.googleAuth.findUnique({
            where: { userId: existingMeeting.organizedBy },
          });

          if (googleAuth && googleAuth.isActive && googleAuth.accessToken) {
            logger.info("Deleting Google Calendar event for deleted meeting", {
              meetingId: id,
              eventId: existingMeeting.calendarEventId,
            });

            const deleteResult = await deleteCalendarEvent({
              accessToken: googleAuth.accessToken,
              refreshToken: googleAuth.refreshToken || null,
              eventId: existingMeeting.calendarEventId,
            });

            // Update tokens if refreshed
            if (deleteResult.newAccessToken) {
              await prisma.googleAuth.update({
                where: { userId: existingMeeting.organizedBy },
                data: {
                  accessToken: deleteResult.newAccessToken,
                  refreshToken:
                    deleteResult.newRefreshToken || googleAuth.refreshToken,
                },
              });
            }

            logger.info("Google Calendar event deleted successfully", {
              meetingId: id,
              eventId: existingMeeting.calendarEventId,
            });
          }
        } catch (googleError: any) {
          // Log error but don't fail the deletion
          logger.error("Failed to delete Google Calendar event", {
            meetingId: id,
            error: googleError.message,
            stack: googleError.stack,
          });
        }
      }

      // Soft delete the meeting
      await tx.meeting.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Send email notification
      try {
        const organizerEmail = existingMeeting.organizer?.email;
        const recipients: string[] = [];
        if (organizerEmail) recipients.push(organizerEmail);

        if (recipients.length > 0) {
          const html = getMeetingDeletedTemplate({
            title: existingMeeting.title,
            status: existingMeeting.status,
          });

          await this.emailService.sendEmail({
            to: [...new Set(recipients)],
            subject: `Meeting Deleted: ${existingMeeting.title}`,
            html,
          });
        }
      } catch (error) {
        logger.error("Failed to send meeting deletion email", {
          meetingId: id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Don't fail the deletion if email fails
      }
    });
  }

  async getMeetingStats(organizerId?: string): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    upcomingThisWeek: number;
  }> {
    const whereCondition: Prisma.MeetingWhereInput = {
      isDeleted: false,
      ...(organizerId && { organizedBy: organizerId }),
    };

    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);

    const [total, scheduled, completed, cancelled, upcomingThisWeek] =
      await Promise.all([
        this.prisma.meeting.count({
          where: whereCondition,
        }),
        this.prisma.meeting.count({
          where: { ...whereCondition, status: "SCHEDULED" },
        }),
        this.prisma.meeting.count({
          where: { ...whereCondition, status: "COMPLETED" },
        }),
        this.prisma.meeting.count({
          where: { ...whereCondition, status: "CANCELLED" },
        }),
        this.prisma.meeting.count({
          where: {
            ...whereCondition,
            status: "SCHEDULED",
            scheduledAt: {
              gte: now,
              lte: weekFromNow,
            },
          },
        }),
      ]);

    return {
      total,
      scheduled,
      completed,
      cancelled,
      upcomingThisWeek,
    };
  }
}

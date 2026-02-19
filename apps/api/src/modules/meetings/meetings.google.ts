import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function createOAuthClient(): any {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars missing");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(userId: string): string {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}> {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    access_token: credentials.access_token || "",
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date,
  };
}

export async function createCalendarEvent(params: {
  accessToken: string;
  refreshToken?: string | null;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
}): Promise<{
  eventId: string;
  meetLink: string;
  newAccessToken?: string;
  newRefreshToken?: string;
}> {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: params.accessToken,
    refresh_token: params.refreshToken || undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.start.toISOString(),
    },
    end: {
      dateTime: params.end.toISOString(),
    },
    attendees: params.attendees.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    const created = response.data;
    return {
      eventId: created.id || "",
      meetLink:
        created.hangoutLink ||
        (created.conferenceData?.entryPoints?.[0]?.uri ?? ""),
    };
  } catch (error: any) {
    // Check if error is due to expired access token
    if (
      error.code === 401 &&
      params.refreshToken &&
      (error.message?.includes("Invalid Credentials") ||
        error.message?.includes("invalid_token"))
    ) {
      // Refresh the access token and retry
      const newTokens = await refreshAccessToken(params.refreshToken);
      oauth2Client.setCredentials({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || params.refreshToken,
      });

      const retryCalendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });

      const retryResponse = await retryCalendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: "all",
      });

      const retryCreated = retryResponse.data;
      return {
        eventId: retryCreated.id || "",
        meetLink:
          retryCreated.hangoutLink ||
          (retryCreated.conferenceData?.entryPoints?.[0]?.uri ?? ""),
        newAccessToken: newTokens.access_token,
        newRefreshToken: newTokens.refresh_token,
      };
    }
    throw error;
  }
}

export async function updateCalendarEvent(params: {
  accessToken: string;
  refreshToken?: string | null;
  eventId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
}): Promise<{
  eventId: string;
  meetLink: string;
  newAccessToken?: string;
  newRefreshToken?: string;
}> {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: params.accessToken,
    refresh_token: params.refreshToken || undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // First, get the existing event to preserve conference data
  let existingEvent;
  try {
    const existingEventResponse = await calendar.events.get({
      calendarId: "primary",
      eventId: params.eventId,
    });
    existingEvent = existingEventResponse.data;
  } catch (error: any) {
    // If event not found, we'll create a new one with conference data
    console.error("Error fetching existing event:", error);
  }

  const event: any = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.start.toISOString(),
    },
    end: {
      dateTime: params.end.toISOString(),
    },
    attendees: params.attendees.map((email) => ({ email })),
  };

  // Preserve existing conference data if it exists
  if (existingEvent?.conferenceData) {
    event.conferenceData = existingEvent.conferenceData;
  }

  try {
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: params.eventId,
      requestBody: event,
      conferenceDataVersion: existingEvent?.conferenceData ? 1 : 0,
      sendUpdates: "all",
    });

    const updated = response.data;
    return {
      eventId: updated.id || params.eventId,
      meetLink:
        updated.hangoutLink ||
        (updated.conferenceData?.entryPoints?.[0]?.uri ?? ""),
    };
  } catch (error: any) {
    // Check if error is due to expired access token
    if (
      error.code === 401 &&
      params.refreshToken &&
      (error.message?.includes("Invalid Credentials") ||
        error.message?.includes("invalid_token"))
    ) {
      // Refresh the access token and retry
      const newTokens = await refreshAccessToken(params.refreshToken);
      oauth2Client.setCredentials({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || params.refreshToken,
      });

      const retryCalendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });

      const retryResponse = await retryCalendar.events.update({
        calendarId: "primary",
        eventId: params.eventId,
        requestBody: event,
        conferenceDataVersion: existingEvent?.conferenceData ? 1 : 0,
        sendUpdates: "all",
      });

      const retryUpdated = retryResponse.data;
      return {
        eventId: retryUpdated.id || params.eventId,
        meetLink:
          retryUpdated.hangoutLink ||
          (retryUpdated.conferenceData?.entryPoints?.[0]?.uri ?? ""),
        newAccessToken: newTokens.access_token,
        newRefreshToken: newTokens.refresh_token,
      };
    }
    throw error;
  }
}

export async function deleteCalendarEvent(params: {
  accessToken: string;
  refreshToken?: string | null;
  eventId: string;
}): Promise<{
  success: boolean;
  newAccessToken?: string;
  newRefreshToken?: string;
}> {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: params.accessToken,
    refresh_token: params.refreshToken || undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: params.eventId,
    });

    return { success: true };
  } catch (error: any) {
    // Check if error is due to expired access token
    if (
      error.code === 401 &&
      params.refreshToken &&
      (error.message?.includes("Invalid Credentials") ||
        error.message?.includes("invalid_token"))
    ) {
      // Refresh the access token and retry
      const newTokens = await refreshAccessToken(params.refreshToken);
      oauth2Client.setCredentials({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || params.refreshToken,
      });

      const retryCalendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });

      await retryCalendar.events.delete({
        calendarId: "primary",
        eventId: params.eventId,
      });

      return {
        success: true,
        newAccessToken: newTokens.access_token,
        newRefreshToken: newTokens.refresh_token,
      };
    }
    throw error;
  }
}
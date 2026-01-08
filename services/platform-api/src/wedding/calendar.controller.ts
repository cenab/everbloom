import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { WeddingService } from './wedding.service';
import { FEATURE_DISABLED, EVENT_DETAILS_NOT_CONFIGURED, WEDDING_NOT_FOUND } from '../types';

/**
 * Public controller for calendar invite functionality
 * Provides ICS file download and Google Calendar links
 */
@Controller('calendar')
export class CalendarController {
  constructor(private readonly weddingService: WeddingService) {}

  /**
   * Generate and download ICS calendar file for a wedding
   * Requires CALENDAR_INVITE feature to be enabled and event details to be configured
   */
  @Get(':slug/download.ics')
  async downloadIcs(
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    const wedding = await this.weddingService.getWeddingBySlug(slug);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if CALENDAR_INVITE feature is enabled
    if (!wedding.features.CALENDAR_INVITE) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    // Check if event details are configured
    if (!wedding.eventDetails) {
      throw new ForbiddenException({
        ok: false,
        error: EVENT_DETAILS_NOT_CONFIGURED,
      });
    }

    const { date, startTime, endTime, venue, address, city, timezone } =
      wedding.eventDetails;

    // Generate ICS content
    const icsContent = this.generateIcsContent({
      title: `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}'s Wedding`,
      date,
      startTime,
      endTime,
      location: `${venue}, ${address}, ${city}`,
      description: `Join us to celebrate the wedding of ${wedding.partnerNames[0]} and ${wedding.partnerNames[1]}.`,
      timezone: timezone || 'UTC',
    });

    // Set response headers for ICS file download
    const filename = `${wedding.slug}-wedding.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);
  }

  /**
   * Get Google Calendar link for a wedding
   * Returns a redirect URL that opens Google Calendar with prefilled event details
   */
  @Get(':slug/google')
  async getGoogleCalendarLink(
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    const wedding = await this.weddingService.getWeddingBySlug(slug);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if CALENDAR_INVITE feature is enabled
    if (!wedding.features.CALENDAR_INVITE) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    // Check if event details are configured
    if (!wedding.eventDetails) {
      throw new ForbiddenException({
        ok: false,
        error: EVENT_DETAILS_NOT_CONFIGURED,
      });
    }

    const { date, startTime, endTime, venue, address, city } =
      wedding.eventDetails;

    // Build Google Calendar URL
    const googleCalendarUrl = this.buildGoogleCalendarUrl({
      title: `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}'s Wedding`,
      date,
      startTime,
      endTime,
      location: `${venue}, ${address}, ${city}`,
      description: `Join us to celebrate the wedding of ${wedding.partnerNames[0]} and ${wedding.partnerNames[1]}.`,
    });

    res.redirect(googleCalendarUrl);
  }

  /**
   * Generate ICS file content
   */
  private generateIcsContent(params: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    timezone: string;
  }): string {
    const { title, date, startTime, endTime, location, description, timezone } =
      params;

    // Convert date and time to ICS format (YYYYMMDDTHHMMSS)
    const dateNoHyphens = date.replace(/-/g, '');
    const startTimeNoColon = startTime.replace(':', '') + '00';
    const endTimeNoColon = endTime.replace(':', '') + '00';

    const dtStart = `${dateNoHyphens}T${startTimeNoColon}`;
    const dtEnd = `${dateNoHyphens}T${endTimeNoColon}`;

    // Generate a unique ID for the event
    const uid = `${dateNoHyphens}-${Date.now()}@wedding-bestie`;

    // Escape special characters for ICS
    const escapeIcs = (str: string) =>
      str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

    const now = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Bestie//Calendar Invite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${timezone}:${dtStart}`,
      `DTEND;TZID=${timezone}:${dtEnd}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `LOCATION:${escapeIcs(location)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    return lines.join('\r\n');
  }

  /**
   * Build Google Calendar event URL
   */
  private buildGoogleCalendarUrl(params: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
  }): string {
    const { title, date, startTime, endTime, location, description } = params;

    // Convert to Google Calendar date format (YYYYMMDDTHHMMSS)
    const dateNoHyphens = date.replace(/-/g, '');
    const startTimeNoColon = startTime.replace(':', '') + '00';
    const endTimeNoColon = endTime.replace(':', '') + '00';

    const dates = `${dateNoHyphens}T${startTimeNoColon}/${dateNoHyphens}T${endTimeNoColon}`;

    const params_obj = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates,
      location,
      details: description,
    });

    return `https://www.google.com/calendar/render?${params_obj.toString()}`;
  }
}

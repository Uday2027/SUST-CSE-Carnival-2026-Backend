import { Response, NextFunction } from 'express';
import prisma from '../../common/lib/prisma.js';
import emailService from '../../common/services/email.service.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import { SendBulkEmailInput } from './email.validation.js';
import { AppError } from '../../common/lib/AppError.js';

export const sendBulkEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, body, filter } = req.body as SendBulkEmailInput;
    const recipients: string[] = [];
    let teams: any[] = [];

    switch (filter.type) {
      case 'ALL':
        teams = await prisma.team.findMany({
          include: { members: true },
        });
        break;

      case 'SEGMENT':
        if (!filter.segment) {
          throw new AppError('A segment must be specified for segment-based filtering', 400);
        }
        teams = await prisma.team.findMany({
          where: { segment: filter.segment },
          include: { members: true },
        });
        break;

      case 'SELECTED':
        teams = await prisma.team.findMany({
          where: { isSelected: true },
          include: { members: true },
        });
        break;

      case 'CUSTOM':
        if (!filter.teamIds || filter.teamIds.length === 0) {
          throw new AppError('One or more team IDs must be provided for custom filtering', 400);
        }
        teams = await prisma.team.findMany({
          where: { id: { in: filter.teamIds } },
          include: { members: true },
        });
        break;

      case 'TEAM':
        if (!filter.teamIds || filter.teamIds.length === 0) {
          throw new AppError('A team ID is required for team-based filtering', 400);
        }
        teams = await prisma.team.findMany({
          where: { id: filter.teamIds[0] }, // Only take the first one for individual team targeting
          include: { members: true },
        });
        break;

      case 'MEMBER':
        if (!filter.memberId) {
          throw new AppError('A member ID is required for member-based filtering', 400);
        }
        const member = await prisma.member.findUnique({
          where: { id: filter.memberId },
        });
        if (member?.email) {
          recipients.push(member.email);
        }
        break;

      case 'INDIVIDUAL':
        if (!filter.customEmail) {
          throw new AppError('A custom email address is required for individual filtering', 400);
        }
        recipients.push(filter.customEmail);
        break;
    }

    // Extract member emails from fetched teams (for cases that populate `teams`)
    if (teams.length > 0) {
      teams.forEach(team => {
        team.members.forEach((member: any) => {
          if (member.email && !recipients.includes(member.email)) {
            recipients.push(member.email);
          }
        });
      });
    }

    if (recipients.length === 0) {
      throw new AppError('No eligible recipients found based on the provided filter', 400);
    }

    // Send emails
    const { sent, failed } = await emailService.sendBulkEmail(recipients, subject, body);

    // Log email
    await prisma.emailLog.create({
      data: {
        senderId: req.admin!.adminId,
        subject,
        recipientCount: recipients.length,
        filterCriteria: filter as any,
        sentBy: req.admin!.adminId,
      },
    });

    res.json({
      message: 'Bulk email sent',
      stats: {
        total: recipients.length,
        sent,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.emailLog.findMany({
      include: {
        sender: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 100,
    });

    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

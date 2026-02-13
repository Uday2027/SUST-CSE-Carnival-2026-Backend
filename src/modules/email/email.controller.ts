import { Response } from 'express';
import prisma from '../../common/lib/prisma.js';
import emailService from '../../common/services/email.service.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import { SendBulkEmailInput } from './email.validation.js';

export const sendBulkEmail = async (req: AuthRequest, res: Response): Promise<void> => {
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
          res.status(400).json({ error: 'Segment is required for SEGMENT filter' });
          return;
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
          res.status(400).json({ error: 'Team IDs are required for CUSTOM filter' });
          return;
        }
        teams = await prisma.team.findMany({
          where: { id: { in: filter.teamIds } },
          include: { members: true },
        });
        break;

      case 'TEAM':
        if (!filter.teamIds || filter.teamIds.length === 0) {
          res.status(400).json({ error: 'Team ID is required for TEAM filter' });
          return;
        }
        teams = await prisma.team.findMany({
          where: { id: filter.teamIds[0] }, // Only take the first one for individual team targeting
          include: { members: true },
        });
        break;

      case 'MEMBER':
        if (!filter.memberId) {
          res.status(400).json({ error: 'Member ID is required for MEMBER filter' });
          return;
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
          res.status(400).json({ error: 'Custom email is required for INDIVIDUAL filter' });
          return;
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
      res.status(400).json({ error: 'No recipients found for the selected filter' });
      return;
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
    console.error('Send bulk email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmailLogs = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Get email logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

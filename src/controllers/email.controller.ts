import { Response } from 'express';
import prisma from '../lib/prisma.js';
import emailService from '../services/email.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { SendBulkEmailInput } from '../validations/schemas.js';

export const sendBulkEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, body, filter } = req.body as SendBulkEmailInput;

    // Build query based on filter
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
    }

    // Extract all member emails
    const recipients: string[] = [];
    teams.forEach(team => {
      team.members.forEach((member: any) => {
        if (member.email && !recipients.includes(member.email)) {
          recipients.push(member.email);
        }
      });
    });

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

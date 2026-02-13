import { Request, Response } from 'express';
import prisma from '../../common/lib/prisma.js';
import emailService from '../../common/services/email.service.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import {
  TeamRegistrationInput,
  UpdateTeamSelectionInput,
  DisqualifyTeamInput,
  UpdateStandingInput,
  TeamSearchInput,
} from './team.validation.js';

export const registerTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamName, segment, members } = req.body as TeamRegistrationInput;

    // Get team leader's university as institution
    const institution = members[0].universityName;

    // Create team with members
    const team = await prisma.team.create({
      data: {
        teamName,
        segment,
        institution,
        members: {
          create: members.map((member, index) => ({
            fullName: member.name,
            email: member.email,
            phone: member.phone,
            university: member.universityName,
            tshirtSize: member.tshirtSize,
            isTeamLeader: index === 0,
          })),
        },
      },
      include: {
        members: true,
      },
    });

    // Send confirmation email
    try {
      await emailService.sendTeamRegistrationConfirmation(
        teamName,
        segment,
        members.map(m => ({ email: m.email, name: m.name }))
      );
    } catch (emailError) {
      console.error('Failed to send registration confirmation:', emailError);
    }

    res.status(201).json({
      message: 'Team registered successfully',
      team: {
        id: team.id,
        teamName: team.teamName,
        segment: team.segment,
        institution: team.institution,
        members: team.members,
      },
    });
  } catch (error) {
    console.error('Team registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { segment, isSelected, search, page, limit } = req.query as unknown as TeamSearchInput;

    // Build filter based on admin scopes
    const filter: any = {};

    // If not super admin, filter by scopes
    if (!req.admin?.isSuperAdmin && req.admin?.scopes) {
      filter.segment = { in: req.admin.scopes };
    }

    // Apply additional filters
    if (segment) {
      filter.segment = segment;
    }

    if (isSelected !== undefined) {
      filter.isSelected = isSelected;
    }

    if (search) {
      filter.OR = [
        { teamName: { contains: search, mode: 'insensitive' } },
        { institution: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where: filter,
        include: {
          members: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.team.count({ where: filter }),
    ]);

    res.json({
      teams,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeamById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Check scope access
    if (!req.admin?.isSuperAdmin && !req.admin?.scopes.includes(team.segment)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTeamSelection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { isSelected } = req.body as UpdateTeamSelectionInput;

    const team = await prisma.team.update({
      where: { id },
      data: { isSelected },
      include: { members: true },
    });

    res.json({
      message: `Team ${isSelected ? 'selected' : 'unselected'} successfully`,
      team,
    });
  } catch (error) {
    console.error('Update team selection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const disqualifyTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { isDisqualified, reason } = req.body as DisqualifyTeamInput;

    const team = await prisma.team.update({
      where: { id },
      data: {
        isDisqualified,
        disqualificationReason: reason,
      },
      include: { members: true },
    });

    res.json({
      message: `Team ${isDisqualified ? 'disqualified' : 'reinstated'} successfully`,
      team,
    });
  } catch (error) {
    console.error('Disqualify team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStanding = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { standing } = req.body as UpdateStandingInput;

    const team = await prisma.team.update({
      where: { id },
      data: { standing },
      include: { members: true },
    });

    res.json({
      message: 'Team standing updated successfully',
      team,
    });
  } catch (error) {
    console.error('Update standing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    await prisma.team.delete({
      where: { id },
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

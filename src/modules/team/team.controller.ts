import { Request, Response, NextFunction } from 'express';
import prisma from '../../common/lib/prisma.js';
import emailService from '../../common/services/email.service.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import {
  TeamRegistrationInput,
  UpdateTeamSelectionInput,
  DisqualifyTeamInput,
  UpdateStandingInput,
  TeamSearchInput,
  UpdateTeamInput,
} from './team.validation.js';
import { AppError } from '../../common/lib/AppError.js';

export const registerTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamName, segment, members } = req.body as TeamRegistrationInput;

    // ─── Deadline Validation ───────────────────────────
    const segmentLabels: Record<string, string> = {
      'IUPC': 'IUPC',
      'HACKATHON': 'Hackathon',
      'DL_ENIGMA_2_0': 'DL Enigma 2.0',
    };
    const segmentLabel = segmentLabels[segment] || segment;

    const deadline = await prisma.registrationDeadline.findUnique({
      where: { segment: segment as any },
    });

    if (!deadline) {
      throw new AppError(
        `Registration for ${segmentLabel} is not yet open. Please check back later.`,
        400
      );
    }

    const now = new Date();
    const startDate = new Date(deadline.startDate);
    const endDate = new Date(deadline.endDate);

    if (now < startDate) {
      const formattedStart = startDate.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
      throw new AppError(
        `Registration for ${segmentLabel} has not opened yet. Registration opens on ${formattedStart}.`,
        400
      );
    }

    if (now > endDate) {
      const formattedEnd = endDate.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
      throw new AppError(
        `Registration for ${segmentLabel} has closed. The deadline was ${formattedEnd}.`,
        400
      );
    }

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

    // Send confirmation email with payment link and PDF receipt
    try {
      await emailService.sendTeamRegistrationConfirmation({
        ...team,
        payments: [], // Newly registered team has no payments yet
      });
    } catch (emailError) {
      console.error('Failed to send registration confirmation:', emailError);
    }

    res.status(201).json({
      message: 'Team registered successfully',
      team: {
        id: team.id,
        uniqueId: team.uniqueId, // Return unique ID for checkout redirect
        teamName: team.teamName,
        segment: team.segment,
        institution: team.institution,
        members: team.members,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public endpoint: fetch all registration deadlines (no auth needed)
export const getPublicDeadlines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deadlines = await prisma.registrationDeadline.findMany({
      select: {
        segment: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { segment: 'asc' },
    });

    res.json({ deadlines });
  } catch (error) {
    next(error);
  }
};


export const getTeams = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    next(error);
  }
};

export const getTeamById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
      throw new AppError('Team not found', 404);
    }

    // Check scope access
    if (!req.admin?.isSuperAdmin && !req.admin?.scopes.includes(team.segment)) {
      throw new AppError('You do not have permission to view teams in this segment', 403);
    }

    res.json({ team });
  } catch (error) {
    next(error);
  }
};

export const getTeamByUniqueId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { uniqueId } = req.params as { uniqueId: string };

    const team = await prisma.team.findUnique({
      where: { uniqueId },
      select: {
        id: true,
        teamName: true,
        institution: true,
        segment: true,
        isSelected: true,
        members: {
          select: {
            fullName: true,
            email: true,
            isTeamLeader: true,
          },
        },
        payments: {
          select: {
            status: true,
            amount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    res.json({ team });
  } catch (error) {
    next(error);
  }
};

export const updateTeamSelection = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { isSelected } = req.body as UpdateTeamSelectionInput;

    const team = await prisma.team.update({
      where: { id },
      data: { isSelected },
      include: { members: true },
    });

    if (isSelected) {
      // Send selection email to all members
      await emailService.sendTeamSelectionEmail(team);
    }

    res.json({
      message: `Team ${isSelected ? 'selected' : 'unselected'} successfully`,
      team,
    });
  } catch (error) {
    next(error);
  }
};

export const disqualifyTeam = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    next(error);
  }
};

export const updateStanding = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    next(error);
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    await prisma.team.delete({
      where: { id },
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const updateData = req.body as UpdateTeamInput;

    const team = await prisma.team.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Team updated successfully',
      team,
    });
  } catch (error) {
    next(error);
  }
};

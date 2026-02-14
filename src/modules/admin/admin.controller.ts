import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../common/lib/prisma.js';
import { generateToken, generateRandomPassword } from '../../common/lib/jwt.js';
import emailService from '../../common/services/email.service.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import { 
  LoginInput, 
  CreateAdminInput 
} from './admin.validation.js';
import { AppError } from '../../common/lib/AppError.js';

export const login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: { scopes: true },
    });

    if (!admin) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if admin is active
    if (admin.status !== 'ACTIVE') {
      throw new AppError('Your account has been suspended. Please contact the super admin.', 403);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken(admin);

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        scopes: admin.scopes.map(s => s.scope),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, scopes } = req.body as CreateAdminInput;

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new AppError('An admin account with this email already exists', 409);
    }

    // Generate random password
    const plainPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Create admin with scopes
    const newAdmin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
        isSuperAdmin: false,
        status: 'ACTIVE',
        scopes: {
          create: scopes.map(scope => ({ scope })),
        },
      },
      include: {
        scopes: true,
      },
    });

    // Send email with credentials
    try {
      await emailService.sendAdminCreationEmail(email, plainPassword);
    } catch (emailError) {
      console.error('Failed to send admin creation email:', emailError);
      // Continue even if email fails - admin is already created
    }

    res.status(201).json({
      message: 'Admin created successfully. Credentials sent via email.',
      tempPassword: plainPassword, // Returning for immediate display/fallback
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        scopes: newAdmin.scopes.map(s => s.scope),
        status: newAdmin.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { scopes, status } = req.body as { scopes: ('IUPC' | 'HACKATHON' | 'DL_ENIGMA_2_0')[], status?: 'ACTIVE' | 'SUSPENDED' };

    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    if (admin.isSuperAdmin) {
      throw new AppError('Cannot update super admin', 403);
    }

    // Update admin and replace scopes transactionally
    const updatedAdmin = await prisma.$transaction(async (tx) => {
      // Update status if provided
      if (status) {
        await tx.admin.update({
          where: { id },
          data: { status },
        });
      }

      // Replace scopes
      await tx.adminScope.deleteMany({
        where: { adminId: id },
      });

      await tx.adminScope.createMany({
        data: scopes.map(scope => ({
          adminId: id,
          scope,
        })),
      });

      return tx.admin.findUnique({
        where: { id },
        include: { scopes: true },
      });
    });

    res.json({
      message: 'Admin updated successfully',
      admin: {
        id: updatedAdmin!.id,
        email: updatedAdmin!.email,
        scopes: updatedAdmin!.scopes.map(s => s.scope),
        status: updatedAdmin!.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdmins = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admins = await prisma.admin.findMany({
      include: {
        scopes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      admins: admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        status: admin.status,
        scopes: admin.scopes.map(s => s.scope),
        createdAt: admin.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    if (admin.isSuperAdmin) {
      throw new AppError('The super admin account cannot be deleted', 403);
    }

    await prisma.admin.delete({
      where: { id },
    });

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.admin!.adminId as string;
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        scopes: true,
      },
    });

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    res.json({
      id: admin.id,
      email: admin.email,
      isSuperAdmin: admin.isSuperAdmin,
      status: admin.status,
      scopes: admin.scopes.map(s => s.scope),
      createdAt: admin.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalTeams,
      selectedTeams,
      totalPayments,
      segmentStats,
      recentTeams,
      tshirtStats,
      segmentTshirtStats
    ] = await Promise.all([
      prisma.team.count(),
      prisma.team.count({ where: { isSelected: true } }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      prisma.team.groupBy({
        by: ['segment'],
        _count: { _all: true }
      }),
      prisma.team.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          teamName: true,
          segment: true,
          institution: true,
          createdAt: true
        }
      }),
      // Overall tshirt stats
      prisma.member.groupBy({
        by: ['tshirtSize'],
        _count: { _all: true }
      }),
      // Granular tshirt stats by segment
      prisma.$queryRaw`
        SELECT t.segment, m.tshirt_size as "tshirtSize", COUNT(*)::int as count
        FROM members m
        JOIN teams t ON m.team_id = t.id
        GROUP BY t.segment, m.tshirt_size
        ORDER BY t.segment, m.tshirt_size
      `
    ]);

    res.json({
      summary: {
        totalTeams,
        selectedTeams,
        totalRevenue: totalPayments._sum.amount || 0,
      },
      segments: segmentStats.map(s => ({
        name: s.segment,
        count: s._count._all
      })),
      tshirtSizes: tshirtStats.map((t: any) => ({
        size: t.tshirtSize,
        count: t._count._all
      })),
      segmentTshirtStats,
      recentActivities: recentTeams.map(t => ({
        id: t.id,
        type: 'REGISTRATION',
        title: `New Team: ${t.teamName}`,
        subtitle: `${t.segment} | ${t.institution}`,
        timestamp: t.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const exportTeamsCSV = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { segment } = req.query as { segment?: string };
    
    const filter: any = {};
    if (segment) filter.segment = segment;
    if (!req.admin?.isSuperAdmin && req.admin?.scopes) {
      filter.segment = { in: req.admin.scopes };
    }

    const teams = await prisma.team.findMany({
      where: filter,
      include: {
        members: {
          orderBy: { isTeamLeader: 'desc' } // Leader first
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // CSV Header
    const fields = [
      'Team Name',
      'Segment',
      'Institution',
      'Status',
      'Payment Status',
      'Payment Amount',
      'Transaction ID',
      'Leader Name',
      'Leader Email',
      'Leader Phone',
      'Leader T-Shirt',
      'Member 1 Name',
      'Member 1 T-Shirt',
      'Member 2 Name',
      'Member 2 T-Shirt',
      'Registration Date'
    ];

    let csv = fields.join(',') + '\n';

    teams.forEach(team => {
      const payment = team.payments[0];
      const leader = team.members.find(m => m.isTeamLeader);
      const members = team.members.filter(m => !m.isTeamLeader);

      const row = [
        team.teamName,
        team.segment,
        team.institution,
        team.isSelected ? 'Selected' : (team.isDisqualified ? 'Disqualified' : 'Pending'),
        payment?.status || 'PENDING',
        payment?.amount || 0,
        payment?.transactionId || 'N/A',
        leader?.fullName || 'N/A',
        leader?.email || 'N/A',
        leader?.phone || 'N/A',
        leader?.tshirtSize || 'N/A',
        members[0]?.fullName || 'N/A',
        members[0]?.tshirtSize || 'N/A',
        members[1]?.fullName || 'N/A',
        members[1]?.tshirtSize || 'N/A',
        new Date(team.createdAt).toISOString().split('T')[0]
      ].map(field => `"${String(field).replace(/"/g, '""')}"`); // Escape quotes

      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=teams-export-${Date.now()}.csv`);
    
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

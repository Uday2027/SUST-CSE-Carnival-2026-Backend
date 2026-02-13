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
      recentTeams
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
      })
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

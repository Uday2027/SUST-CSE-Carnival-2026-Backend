import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { generateToken, generateRandomPassword } from '../lib/jwt.js';
import emailService from '../services/email.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { 
  LoginInput, 
  CreateAdminInput 
} from '../validations/schemas.js';

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: { scopes: true },
    });

    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if admin is active
    if (admin.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Account is suspended' });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, scopes } = req.body as CreateAdminInput;

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      res.status(409).json({ error: 'Admin with this email already exists' });
      return;
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
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdmins = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
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
      res.status(403).json({ error: 'Cannot delete super admin' });
      return;
    }

    await prisma.admin.delete({
      where: { id },
    });

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

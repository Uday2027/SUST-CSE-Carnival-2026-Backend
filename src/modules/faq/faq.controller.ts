import { Request, Response, NextFunction } from 'express';
import prisma from '../../common/lib/prisma.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import { AppError } from '../../common/lib/AppError.js';
import { AskQuestionInput, AnswerQuestionInput } from './faq.validation.js';
import emailService from '../../common/services/email.service.js';

export const askQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { teamName, leaderEmail, question } = req.body as AskQuestionInput;

        // Verify team and leader
        const team = await prisma.team.findFirst({
            where: {
                teamName: { equals: teamName, mode: 'insensitive' },
                members: {
                    some: {
                        email: { equals: leaderEmail, mode: 'insensitive' },
                        isTeamLeader: true,
                    },
                },
            },
        });

        if (!team) {
            throw new AppError('Invalid Team Name or Team Leader Email. Only registered teams can ask questions.', 401);
        }

        // Create FAQ
        const faq = await prisma.fAQ.create({
            data: {
                teamId: team.id,
                question,
            },
        });

        res.status(201).json({
            message: 'Question submitted successfully. An admin will answer it soon.',
            faq,
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicFaqs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const faqs = await prisma.fAQ.findMany({
            where: {
                status: 'ANSWERED',
            },
            include: {
                team: {
                    select: { teamName: true },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        res.json({ faqs });
    } catch (error) {
        next(error);
    }
};

export const getAdminFaqs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const pendingFaqs = await prisma.fAQ.findMany({
            where: { status: 'PENDING' },
            include: {
                team: { select: { teamName: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        const answeredFaqs = await prisma.fAQ.findMany({
            where: { status: 'ANSWERED' },
            include: {
                team: { select: { teamName: true } },
                admin: { select: { email: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 50, // Limit for performance
        });

        res.json({ pendingFaqs, answeredFaqs });
    } catch (error) {
        next(error);
    }
};

export const answerQuestion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { answer } = req.body as AnswerQuestionInput;
        const adminId = req.admin!.adminId;

        const faq = await prisma.fAQ.findUnique({ where: { id } });

        if (!faq) {
            throw new AppError('FAQ not found', 404);
        }

        const updatedFaq = await prisma.fAQ.update({
            where: { id },
            data: {
                answer: answer as string,
                status: 'ANSWERED',
                answeredBy: adminId as string,
            },
            include: {
                admin: { select: { email: true } },
                team: { include: { members: true } }
            }
        });

        // Send email notification to team
        try {
            await emailService.sendFaqAnswerEmail(updatedFaq.team, updatedFaq);
        } catch (error) {
            console.error('Failed to send FAQ answer email:', error);
        }

        res.json({
            message: 'Question answered successfully',
            faq: updatedFaq,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteFaq = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        const faq = await prisma.fAQ.findUnique({ where: { id } });

        if (!faq) {
            throw new AppError('FAQ not found', 404);
        }

        await prisma.fAQ.delete({ where: { id } });

        res.json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        next(error);
    }
};

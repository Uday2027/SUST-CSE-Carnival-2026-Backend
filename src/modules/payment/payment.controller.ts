import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/lib/AppError.js';
import prisma from '../../common/lib/prisma.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import emailService from '../../common/services/email.service.js';
import { InitiatePaymentInput, ManualApprovalInput, PayLaterInput } from './payment.validation.js';

// SSLCommerz dummy configuration
const SSLCOMMERZ_CONFIG = {
  storeId: process.env.SSLCOMMERZ_STORE_ID || 'test_store',
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || 'test_password',
  isLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',
  apiUrl: process.env.SSLCOMMERZ_IS_LIVE === 'true'
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com',
};

const FEES: Record<string, number> = {
  "IUPC": 5500,
  "HACKATHON": 2000,
  "DL_ENIGMA_2_0": 1500,
  "DL ENIGMA 2.0": 1500, // Handle variations
  "DL ENIGMA": 1500
};

export const initiatePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { uniqueId } = req.body as InitiatePaymentInput;

    // Fetch team details
    const team = await prisma.team.findUnique({
      where: { uniqueId },
      include: { members: { where: { isTeamLeader: true } } },
    });

    if (!team) {
      throw new AppError('The specified team was not found', 404);
    }

    const teamLeader = team.members[0];
    if (!teamLeader) {
      throw new AppError('Team leader information is missing for this team', 400);
    }

    // Determine amount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const amount = FEES[team.segment as any] || FEES[team.segment.replace(/_/g, ' ') as any] || 0;
    if (amount === 0) {
        // Fallback or error if segment fee not defined? limiting risk by defaulting to 0 but treating as error contextually if needed
        // For now preventing 0 payment unless intended.
        throw new AppError(`Invalid fee configuration for segment: ${team.segment}`, 400);
    }


    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        teamId: team.id,
        transactionId,
        amount,
        currency: 'BDT',
        status: 'PENDING',
      },
    });

    // SSLCommerz payment gateway payload (Dummy for now)
    const paymentData = {
      store_id: SSLCOMMERZ_CONFIG.storeId,
      store_passwd: SSLCOMMERZ_CONFIG.storePassword,
      total_amount: amount.toString(),
      currency: 'BDT',
      tran_id: transactionId,
      success_url: process.env.SSLCOMMERZ_SUCCESS_URL,
      fail_url: process.env.SSLCOMMERZ_FAIL_URL,
      cancel_url: process.env.SSLCOMMERZ_CANCEL_URL,
      ipn_url: process.env.SSLCOMMERZ_IPN_URL,
      cus_name: teamLeader.fullName,
      cus_email: teamLeader.email,
      cus_phone: teamLeader.phone || 'N/A',
      cus_add1: team.institution,
      cus_city: 'Sylhet',
      cus_country: 'Bangladesh',
      product_name: `${team.segment} Registration Fee`,
      product_category: 'Competition Fee',
      product_profile: 'general',
    };

    // For now, return the payment data (in production, you would redirect to SSLCommerz)
    res.json({
      message: 'Payment initiated',
      payment: {
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        status: payment.status,
      },
      paymentUrl: `${SSLCOMMERZ_CONFIG.apiUrl}/gwprocess/v4/api.php`, // return expected field
      gatewayUrl: `${SSLCOMMERZ_CONFIG.apiUrl}/gwprocess/v4/api.php`,
      paymentData,
      note: 'In production, redirect user to SSLCommerz gateway with this data',
    });
  } catch (error) {
    next(error);
  }
};

export const handlePayLater = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { uniqueId } = req.body as PayLaterInput;

        const team = await prisma.team.findUnique({
            where: { uniqueId },
            include: { members: true },
        });

        if (!team) {
            throw new AppError('Team not found', 404);
        }

        // Send Email
        try {
            await emailService.sendTeamRegistrationConfirmation(
                team.teamName,
                team.segment,
                team.uniqueId,
                team.members.map(m => ({ email: m.email, name: m.fullName }))
            );
        } catch (error) {
            console.error('Failed to send pay later email:', error);
            throw new AppError('Failed to send email. Please try again later or contact support.', 500);
        }

        res.json({ message: 'Payment link sent to email addresses' });
    } catch (error) {
        next(error);
    }
};

export const handlePaymentCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tran_id, status, val_id } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { transactionId: tran_id },
      include: { team: true },
    });

    if (!payment) {
      throw new AppError('Payment record for this transaction was not found', 404);
    }

    // Update payment status based on SSLCommerz response
    let paymentStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED' = 'FAILED';
    
    if (status === 'VALID' || status === 'VALIDATED') {
      paymentStatus = 'SUCCESS';
    } else if (status === 'CANCELLED') {
      paymentStatus = 'CANCELLED';
    }

    await prisma.payment.update({
      where: { transactionId: tran_id },
      data: {
        status: paymentStatus,
        valId: val_id,
      },
    });

    res.json({
      message: 'Payment callback processed',
      status: paymentStatus,
    });
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        team: {
          select: {
            teamName: true,
            segment: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

export const manualApprovePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { note } = req.body as ManualApprovalInput;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        approvedBy: req.admin!.adminId,
        manualApprovalNote: note,
      },
      include: {
        team: true,
      },
    });

    res.json({
      message: 'Payment manually approved',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { InitiatePaymentInput, ManualApprovalInput } from '../validations/schemas.js';

// SSLCommerz dummy configuration
const SSLCOMMERZ_CONFIG = {
  storeId: process.env.SSLCOMMERZ_STORE_ID || 'test_store',
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || 'test_password',
  isLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',
  apiUrl: process.env.SSLCOMMERZ_IS_LIVE === 'true'
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com',
};

export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, amount } = req.body as InitiatePaymentInput;

    // Fetch team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { where: { isTeamLeader: true } } },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const teamLeader = team.members[0];
    if (!teamLeader) {
      res.status(400).json({ error: 'Team leader not found' });
      return;
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        teamId,
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
      gatewayUrl: `${SSLCOMMERZ_CONFIG.apiUrl}/gwprocess/v4/api.php`,
      paymentData,
      note: 'In production, redirect user to SSLCommerz gateway with this data',
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handlePaymentCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tran_id, status, val_id } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { transactionId: tran_id },
      include: { team: true },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
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
    console.error('Payment callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const manualApprovePayment = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Manual approve payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

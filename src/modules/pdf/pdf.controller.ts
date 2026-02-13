import PDFDocument from 'pdfkit';
import { Response } from 'express';
import prisma from '../../common/lib/prisma.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';

export const downloadTeamsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { segment } = req.query;

    // Build filter based on admin scopes
    const filter: any = {};

    // If not super admin, filter by scopes
    if (!req.admin?.isSuperAdmin && req.admin?.scopes) {
      filter.segment = { in: req.admin.scopes };
    }

    if (segment) {
      filter.segment = segment;
    }

    const teams = await prisma.team.findMany({
      where: filter,
      include: {
        members: true,
      },
      orderBy: {
        teamName: 'asc',
      },
    });

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=teams-${segment || 'all'}-${Date.now()}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content
    doc.fontSize(24).text('SUST CSE Carnival 2026', { align: 'center' });
    doc.fontSize(18).text('Team Registration List', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    teams.forEach((team: any, index: number) => {
      // Add page break if needed
      if (index > 0 && index % 3 === 0) {
        doc.addPage();
      }

      doc.fontSize(16).fillColor('#3d5a30').text(`${index + 1}. ${team.teamName}`);
      doc.fontSize(10).fillColor('black');
      doc.text(`Competition: ${team.segment}`);
      doc.text(`Institution: ${team.institution}`);
      doc.text(`Status: ${team.isSelected ? 'Selected ✓' : 'Pending'}`);
      
      if (team.standing !== 'NONE') {
        doc.text(`Standing: ${team.standing}`);
      }

      doc.moveDown(0.5);
      doc.fontSize(12).text('Team Members:', { underline: true });
      doc.fontSize(10);

      team.members.forEach((member: any, idx: number) => {
        doc.text(`  ${idx + 1}. ${member.fullName} ${member.isTeamLeader ? '(Leader)' : ''}`);
        doc.text(`     Email: ${member.email}`);
        doc.text(`     Phone: ${member.phone || 'N/A'}`);
        doc.text(`     University: ${member.university}`);
        doc.text(`     T-Shirt: ${member.tshirtSize}`);
      });

      doc.moveDown(2);
    });

    // Add footer
    doc.fontSize(8).fillColor('gray').text(
      `Total Teams: ${teams.length}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Team, Member, Payment } from '@prisma/client';

class PdfService {
  async generateReceiptPDF(team: Team & { members: Member[]; payments: Payment[] }): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // --- DESIGN ---

        // Background Watermark
        doc.save();
        doc.rotate(-45, { origin: [300, 400] });
        doc.fontSize(100).fillColor('#f0f0f0').text('SUST CSE', 50, 300, { align: 'center' });
        doc.restore();

        // Header
        doc.rect(0, 0, 595.28, 120).fill('#3d5a30'); // Green Header
        doc.fontSize(28).fillColor('white').text('SUST CSE CARNIVAL 2026', 50, 40);
        doc.fontSize(12).text('OFFICIAL REGISTRATION RECEIPT', 50, 75, { characterSpacing: 2 });
        
        // Receipt Info (Right side of header)
        doc.fontSize(10).text(`Receipt ID: ${team.uniqueId.substring(0, 8).toUpperCase()}`, 400, 40, { align: 'right' });
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 55, { align: 'right' });

        doc.moveDown(4);

        // Team Info Section
        doc.fillColor('black');
        doc.fontSize(10).text('TEAM REGISTRATION DETAILS', 50, 140, { characterSpacing: 1 });
        doc.rect(50, 155, 495, 2).fill('#3d5a30'); // Divider

        doc.fontSize(24).font('Helvetica-Bold').text(team.teamName, 50, 170);
        
        doc.fontSize(12).font('Helvetica').text('Competition Segment:', 50, 205);
        doc.font('Helvetica-Bold').text(team.segment, 200, 205);

        doc.font('Helvetica').text('Institution:', 50, 225);
        doc.font('Helvetica-Bold').text(team.institution || 'N/A', 200, 225);

        doc.font('Helvetica').text('Registration ID:', 50, 245);
        doc.font("Courier").text(team.uniqueId, 200, 245);

        // Payment Status Badge
        const paymentStatus = team.payments[0]?.status || 'PENDING';
        const badgeColor = paymentStatus === 'SUCCESS' ? '#22c55e' : (paymentStatus === 'PENDING' ? '#eab308' : '#ef4444');
        
        doc.rect(400, 190, 120, 40).fill(badgeColor);
        doc.fontSize(14).fillColor('white').font('Helvetica-Bold').text(paymentStatus, 400, 203, { width: 120, align: 'center' });
        doc.fillColor('black');

        // Members Section
        doc.fontSize(10).font('Helvetica').text('TEAM MEMBERS', 50, 300, { characterSpacing: 1 });
        doc.rect(50, 315, 495, 2).fill('#3d5a30');

        let y = 330;
        
        team.members.forEach((member: any, i: number) => {
            doc.font('Helvetica-Bold').fontSize(12).text(`${i+1}. ${member.fullName}`, 50, y);
            if (member.isTeamLeader) {
                doc.fontSize(8).fillColor('#3d5a30').text(' (LEADER)', 50 + doc.widthOfString(`${i+1}. ${member.fullName}`) + 5, y + 2);
            }
            
            doc.fillColor('black').font('Helvetica').fontSize(10);
            doc.text(member.email, 300, y);
            doc.text(member.phone || '', 450, y);
            
            y += 25;
        });

        // QR Code
        // Generate QR Data: ID | Name | Status
        const qrData = JSON.stringify({
            id: team.uniqueId,
            name: team.teamName,
            status: paymentStatus,
            members: team.members.length
        });
        
        try {
            const qrImage = await QRCode.toBuffer(qrData, { width: 150, margin: 1 });
            doc.image(qrImage, 420, 680, { width: 100 });
            doc.fontSize(8).text('Scan for Verification', 420, 785, { width: 100, align: 'center' });
        } catch (e) {
            console.error("QR Generation failed", e);
        }

        // Footer
        doc.fontSize(10).text('Instructions:', 50, 680, { underline: true });
        doc.fontSize(9).text('1. Please print this receipt or save it on your mobile device.', 50, 700);
        doc.text('2. Present the QR code at the registration desk for check-in.', 50, 715);
        doc.text('3. For any issues, contact support at cse.carnival@sust.edu', 50, 730);

        doc.rect(0, 820, 595.28, 22).fill('#3d5a30');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new PdfService();

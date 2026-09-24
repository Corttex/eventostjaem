import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id;

    // Buscar o ticket e os dados do usuário
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 });
    }

    // Criar um novo documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]); // Formato Retrato
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Cores
    const primaryGold = rgb(223 / 255, 186 / 255, 82 / 255);
    const darkBg = rgb(4 / 255, 8 / 255, 18 / 255);

    // Fundo Escuro
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: darkBg,
    });

    // Borda Dourada
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: primaryGold,
      borderWidth: 2,
    });

    // Tentar carregar a logo do TJAEM
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-tjaem.png');
      const logoImageBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoImageBytes);
      const logoDims = logoImage.scale(0.3);
      
      page.drawImage(logoImage, {
        x: (width / 2) - (logoDims.width / 2),
        y: height - 150,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch (e) {
      console.log('Logo não encontrada para o PDF, pulando...', e);
    }

    // Textos do Evento
    page.drawText('CONVITE ESPECIAL OFICIAL', {
      x: width / 2 - 120,
      y: height - 190,
      size: 16,
      font: fontBold,
      color: primaryGold,
    });

    page.drawText('30 ANOS DA LEI DE ARBITRAGEM NO BRASIL', {
      x: width / 2 - 200,
      y: height - 230,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Linha separadora
    page.drawLine({
      start: { x: 50, y: height - 260 },
      end: { x: width - 50, y: height - 260 },
      thickness: 1,
      color: primaryGold,
    });

    // Dados do Participante
    page.drawText('DADOS DO PARTICIPANTE:', {
      x: 50,
      y: height - 310,
      size: 12,
      font: font,
      color: primaryGold,
    });

    page.drawText(`NOME: ${ticket.user.name.toUpperCase()}`, {
      x: 50,
      y: height - 340,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`CPF: ${ticket.user.cpf}`, {
      x: 50,
      y: height - 370,
      size: 14,
      font: font,
      color: rgb(1, 1, 1),
    });

    page.drawText(`TICKET ID: ${ticket.id.split('-')[0].toUpperCase()}`, {
      x: 50,
      y: height - 400,
      size: 12,
      font: font,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Data e Local
    page.drawText('DATA E LOCAL:', {
      x: 50,
      y: height - 460,
      size: 12,
      font: font,
      color: primaryGold,
    });

    page.drawText('11 de Outubro de 2026, 09h às 17h', {
      x: 50,
      y: height - 490,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('SGAS quadra 603 Sul, conjunto "c" L2 Sul', {
      x: 50,
      y: height - 515,
      size: 14,
      font: font,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('Asa Sul, Brasília / DF', {
      x: 50,
      y: height - 540,
      size: 14,
      font: font,
      color: rgb(1, 1, 1),
    });

    // Gerar QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(ticket.qrCodeToken, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    
    // Converter Base64 do QR Code para bytes
    const qrCodeImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrCodeImageBytes);
    
    page.drawImage(qrImage, {
      x: width / 2 - 100,
      y: 80,
      width: 200,
      height: 200,
    });

    page.drawText('Apresente este QR Code na entrada', {
      x: width / 2 - 120,
      y: 50,
      size: 14,
      font: font,
      color: primaryGold,
    });

    // Salvar e Enviar o PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ingresso_${ticket.user.name.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json({ error: 'Erro ao gerar o ingresso' }, { status: 500 });
  }
}

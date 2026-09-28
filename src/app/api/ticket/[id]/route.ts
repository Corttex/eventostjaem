import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Função auxiliar para desenhar retângulos com bordas arredondadas nativamente
function drawRoundedRect(page: any, { x, y, width, height, radius = 12, color }: { x: number; y: number; width: number; height: number; radius?: number; color: any }) {
  const r = Math.min(radius, width / 2, height / 2);
  // 4 cantos arredondados
  page.drawCircle({ x: x + r, y: y + r, size: r, color });
  page.drawCircle({ x: x + width - r, y: y + r, size: r, color });
  page.drawCircle({ x: x + r, y: y + height - r, size: r, color });
  page.drawCircle({ x: x + width - r, y: y + height - r, size: r, color });
  // Corpos retangulares internos
  page.drawRectangle({ x: x + r, y: y, width: width - 2 * r, height: height, color });
  page.drawRectangle({ x: x, y: y + r, width: width, height: height - 2 * r, color });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ticketId } = await params;

    // Buscar o ticket e os dados do usuário
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 });
    }

    // Verificar se o ingresso já foi pago
    let isPaid = ticket.status === 'PAID';

    // Se estiver pendente, faz uma verificação rápida no Asaas caso já tenha sido aprovado
    if (!isPaid && ticket.asaasPaymentId) {
      try {
        const asaasApiKey = process.env.ASAAS_API_KEY;
        const res = await fetch(`https://api.asaas.com/v3/payments/${ticket.asaasPaymentId}`, {
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey || ''
          }
        });
        if (res.ok) {
          const paymentData = await res.json();
          if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'].includes(paymentData.status)) {
            // Atualizar status no banco
            await prisma.ticket.updateMany({
              where: { asaasPaymentId: ticket.asaasPaymentId },
              data: { status: 'PAID' }
            });
            isPaid = true;
          }
        }
      } catch (checkErr) {
        console.warn('Erro ao consultar status no Asaas:', checkErr);
      }
    }

    // Se ainda não estiver pago, não libera o PDF oficial
    if (!isPaid) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Pagamento Pendente - TJAEM</title>
          <style>
            body { background: #060b16; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #0f172a; border: 1px solid #dfba52; padding: 2.5rem; border-radius: 16px; max-width: 500px; text-align: center; }
            h1 { color: #dfba52; font-size: 1.8rem; margin-top: 0; }
            p { color: rgba(255,255,255,0.8); line-height: 1.6; }
            .btn { display: inline-block; background: #dfba52; color: #000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 1.5rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Pagamento Pendente</h1>
            <p>O ingresso para <strong>${ticket.user.name}</strong> só pode ser gerado e baixado após a confirmação do pagamento pelo banco.</p>
            <p>Assim que o pagamento for compensado, o download será liberado automaticamente.</p>
            <a href="/sucesso/${ticket.asaasPaymentId || ticket.id}" class="btn">Ir para Página de Pagamento</a>
          </div>
        </body>
        </html>`,
        {
          status: 402,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }

    // Criar o documento PDF
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 600;
    const pageHeight = 850;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Cores oficiais de alta definição
    const primaryGold = rgb(223 / 255, 186 / 255, 82 / 255);
    const darkBg = rgb(6 / 255, 11 / 255, 22 / 255);
    const cardBg = rgb(15 / 255, 23 / 255, 42 / 255);
    const cardBorder = rgb(180 / 255, 150 / 255, 65 / 255);
    const textWhite = rgb(1, 1, 1);
    const textMuted = rgb(160 / 255, 174 / 255, 192 / 255);

    // 1. Fundo do Ingresso
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: darkBg,
    });

    // 2. Moldura Dourada Dupla Exclusiva
    page.drawRectangle({
      x: 20,
      y: 20,
      width: pageWidth - 40,
      height: pageHeight - 40,
      borderColor: primaryGold,
      borderWidth: 2,
    });

    page.drawRectangle({
      x: 26,
      y: 26,
      width: pageWidth - 52,
      height: pageHeight - 52,
      borderColor: rgb(120 / 255, 100 / 255, 45 / 255),
      borderWidth: 0.75,
    });

    // 3. Logo do TJAEM (Totalmente contida e posicionada com margem segura)
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-tjaem.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImg = await pdfDoc.embedPng(logoBytes);
        const targetHeight = 85;
        const targetWidth = (logoImg.width / logoImg.height) * targetHeight;
        const logoX = (pageWidth - targetWidth) / 2;
        const logoY = 720;
        
        page.drawImage(logoImg, {
          x: logoX,
          y: logoY,
          width: targetWidth,
          height: targetHeight,
        });
      }
    } catch (err) {
      console.warn('Logo TJAEM não carregada no PDF:', err);
    }

    // 4. Cabeçalho Centralizado
    const subtitle = 'CONVITE ESPECIAL OFICIAL';
    const subtitleWidth = fontBold.widthOfTextAtSize(subtitle, 12);
    page.drawText(subtitle, {
      x: (pageWidth - subtitleWidth) / 2,
      y: 690,
      size: 12,
      font: fontBold,
      color: primaryGold,
    });

    const title = '30 ANOS DA LEI DE ARBITRAGEM NO BRASIL';
    const titleWidth = fontBold.widthOfTextAtSize(title, 16);
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: 668,
      size: 16,
      font: fontBold,
      color: textWhite,
    });

    // Linha divisória
    page.drawLine({
      start: { x: 70, y: 650 },
      end: { x: pageWidth - 70, y: 650 },
      thickness: 1,
      color: primaryGold,
    });

    // 5. Card: Dados do Participante (Perfeitamente estruturado)
    const cardWidth = 500;
    const cardX = (pageWidth - cardWidth) / 2;
    const card1Y = 505;
    const card1Height = 125;

    page.drawRectangle({
      x: cardX,
      y: card1Y,
      width: cardWidth,
      height: card1Height,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page.drawText('DADOS DO PARTICIPANTE', {
      x: cardX + 20,
      y: card1Y + card1Height - 24,
      size: 10,
      font: fontBold,
      color: primaryGold,
    });

    // Truncar ou ajustar nome se muito longo
    let displayName = ticket.user.name.toUpperCase();
    if (displayName.length > 40) {
      displayName = displayName.substring(0, 38) + '...';
    }

    page.drawText(`NOME: ${displayName}`, {
      x: cardX + 20,
      y: card1Y + card1Height - 50,
      size: 13,
      font: fontBold,
      color: textWhite,
    });

    page.drawText(`CPF: ${ticket.user.cpf}`, {
      x: cardX + 20,
      y: card1Y + card1Height - 74,
      size: 11,
      font: font,
      color: textWhite,
    });

    page.drawText(`E-MAIL: ${ticket.user.email}`, {
      x: cardX + 220,
      y: card1Y + card1Height - 74,
      size: 11,
      font: font,
      color: textMuted,
    });

    page.drawText(`CREDENCIAL: #${ticket.id.substring(0, 8).toUpperCase()}`, {
      x: cardX + 20,
      y: card1Y + card1Height - 98,
      size: 11,
      font: fontBold,
      color: primaryGold,
    });

    page.drawText('STATUS: INSCRIÇÃO CONFIRMADA (PAGO)', {
      x: cardX + 220,
      y: card1Y + card1Height - 98,
      size: 10,
      font: fontBold,
      color: rgb(74 / 255, 222 / 255, 128 / 255), // Verde
    });

    // 6. Card: Data e Local do Evento (Totalmente afastado do QR Code)
    const card2Y = 380;
    const card2Height = 105;

    page.drawRectangle({
      x: cardX,
      y: card2Y,
      width: cardWidth,
      height: card2Height,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page.drawText('DATA E LOCAL DO EVENTO', {
      x: cardX + 20,
      y: card2Y + card2Height - 24,
      size: 10,
      font: fontBold,
      color: primaryGold,
    });

    page.drawText('20 de Outubro de 2026 • Das 09h às 17h', {
      x: cardX + 20,
      y: card2Y + card2Height - 50,
      size: 12,
      font: fontBold,
      color: textWhite,
    });

    page.drawText('SGAS quadra 603 Sul, conjunto "c" L2 Sul', {
      x: cardX + 20,
      y: card2Y + card2Height - 72,
      size: 11,
      font: font,
      color: textWhite,
    });

    page.drawText('Asa Sul, Brasília / DF', {
      x: cardX + 20,
      y: card2Y + card2Height - 90,
      size: 11,
      font: font,
      color: textMuted,
    });

    // 7. QR Code com Fundo Branco e Bordas Arredondadas (Afastado do texto!)
    const qrBoxSize = 170;
    const qrBoxX = (pageWidth - qrBoxSize) / 2;
    const qrBoxY = 140;

    // Fundo branco com bordas arredondadas (radius 16)
    drawRoundedRect(page, {
      x: qrBoxX,
      y: qrBoxY,
      width: qrBoxSize,
      height: qrBoxSize,
      radius: 16,
      color: rgb(1, 1, 1),
    });

    // Gerar QR Code de Alta Resolução
    const qrDataUrl = await QRCode.toDataURL(ticket.qrCodeToken, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: { dark: '#040812', light: '#FFFFFF' }
    });
    const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);

    const qrInnerSize = 146;
    const qrInnerX = (pageWidth - qrInnerSize) / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;

    page.drawImage(qrImage, {
      x: qrInnerX,
      y: qrInnerY,
      width: qrInnerSize,
      height: qrInnerSize,
    });

    // 8. Rodapé Informativo Centralizado
    const footer1 = 'Apresente este QR Code na portaria do evento';
    const footer1Width = fontBold.widthOfTextAtSize(footer1, 11);
    page.drawText(footer1, {
      x: (pageWidth - footer1Width) / 2,
      y: 110,
      size: 11,
      font: fontBold,
      color: primaryGold,
    });

    const footer2 = 'Tribunal de Justiça Arbitral e Mediação do Brasil • TJAEM';
    const footer2Width = font.widthOfTextAtSize(footer2, 9);
    page.drawText(footer2, {
      x: (pageWidth - footer2Width) / 2,
      y: 90,
      size: 9,
      font: font,
      color: textMuted,
    });

    // Salvar e Enviar o PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as unknown as BodyInit, {
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

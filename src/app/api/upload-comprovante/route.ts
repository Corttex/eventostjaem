import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ticketId = formData.get('ticketId') as string | null;
    const paymentId = formData.get('paymentId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Limite de 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Limite máximo: 10MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Diretório em public/uploads/comprovantes
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'comprovantes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Nome único
    const ext = path.extname(file.name) || '.jpg';
    const cleanExt = ext.length > 5 ? '.jpg' : ext;
    const fileName = `comprovante_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${cleanExt}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/comprovantes/${fileName}`;

    // Vincular o comprovante no banco de dados
    if (paymentId) {
      await prisma.ticket.updateMany({
        where: { asaasPaymentId: paymentId },
        data: { associateDocUrl: fileUrl }
      });
    } else if (ticketId) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { associateDocUrl: fileUrl }
      });
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName
    });
  } catch (error: any) {
    console.error('Upload Comprovante Error:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload do comprovante', details: error.message }, { status: 500 });
  }
}


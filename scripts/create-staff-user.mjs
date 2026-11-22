import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function loadEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvIfNeeded();

const prisma = new PrismaClient();

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    let email = (process.env.STAFF_EMAIL || '').trim().toLowerCase();
    if (!email) {
      email = (await rl.question('E-mail do usuário de equipe: ')).trim().toLowerCase();
    }
    if (!email || !email.includes('@')) {
      throw new Error('E-mail inválido.');
    }

    let roleInput = (process.env.STAFF_ROLE || '').trim().toUpperCase();
    if (!roleInput) {
      roleInput = (await rl.question('Perfil (ADMIN ou SCANNER) [ADMIN]: ')).trim().toUpperCase() || 'ADMIN';
    }
    if (roleInput !== 'ADMIN' && roleInput !== 'SCANNER') {
      throw new Error('STAFF_ROLE deve ser ADMIN ou SCANNER.');
    }

    let password = process.env.STAFF_PASSWORD || '';
    if (!password) {
      password = await rl.question('Senha (mínimo 6 caracteres): ');
    }
    if (!password || password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    let name = (process.env.STAFF_NAME || '').trim();
    if (!name && !existing) {
      name = (await rl.question('Nome completo: ')).trim();
    }
    if (!name) {
      name = existing?.name || email.split('@')[0];
    }

    let cpf = (process.env.STAFF_CPF || '').replace(/\D/g, '');
    if (!cpf && !existing) {
      cpf = (await rl.question('CPF (somente números): ')).replace(/\D/g, '');
    }
    if (!cpf && !existing) {
      throw new Error('CPF é obrigatório para criar um novo usuário.');
    }

    const phone = (process.env.STAFF_PHONE || existing?.phone || '').replace(/\D/g, '');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        password: hashedPassword,
        role: roleInput,
        ...(phone ? { phone } : {}),
      },
      create: {
        name,
        email,
        cpf,
        phone,
        password: hashedPassword,
        role: roleInput,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log(`Usuário salvo no banco com sucesso: ${user.email} (${user.role})`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro ao salvar usuário de equipe:', err.message);
  process.exit(1);
});

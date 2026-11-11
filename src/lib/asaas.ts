import fs from 'fs';
import path from 'path';

let cachedApiKey: string | null = null;

function sanitizeKey(raw: string): string {
  if (!raw) return '';
  let k = raw.trim();
  // Remove aspas simples ou duplas ao redor (caso colado com aspas no Coolify)
  while ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.substring(1, k.length - 1).trim();
  }
  // Remove barras invertidas de escape
  if (k.startsWith('\\$')) {
    k = k.substring(1);
  }
  // Garante o prefixo '$' exigido pela API do Asaas
  if (!k.startsWith('$') && k.startsWith('aact_')) {
    k = '$' + k;
  }
  return k;
}

export function getAsaasApiKey(): string {
  if (cachedApiKey) return cachedApiKey;

  // 1. Tentar ler de process.env (injetado pelo Coolify/Docker)
  let key = sanitizeKey(process.env.ASAAS_API_KEY || '');

  // 2. Se vazio, tentar ler do arquivo .env caso exista
  if (!key || key.length < 15) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('ASAAS_API_KEY=')) {
            key = sanitizeKey(trimmed.substring('ASAAS_API_KEY='.length));
            break;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler .env para ASAAS_API_KEY:', e);
    }
  }

  cachedApiKey = key;
  return key;
}

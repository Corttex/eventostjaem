import fs from 'fs';
import path from 'path';

let cachedApiKey: string | null = null;

export function getAsaasApiKey(): string {
  if (cachedApiKey) return cachedApiKey;

  // 1. Try process.env
  let key = process.env.ASAAS_API_KEY || '';

  // 2. If empty or invalid, parse directly from .env file
  if (!key || key.length < 10) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('ASAAS_API_KEY=')) {
            let val = trimmed.substring('ASAAS_API_KEY='.length).trim();
            // Remove outer quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (val.startsWith('\\$')) {
              val = val.substring(1);
            }
            key = val;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler .env para ASAAS_API_KEY:', e);
    }
  }

  // Sanitize: ensure it starts with '$' (Asaas production API keys start with '$aact_')
  if (key.startsWith('\\$')) {
    key = key.substring(1);
  }
  if (!key.startsWith('$') && key.startsWith('aact_')) {
    key = '$' + key;
  }

  cachedApiKey = key;
  return key;
}

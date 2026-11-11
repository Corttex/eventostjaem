import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const realPrisma = new PrismaClient();
const localDataPath = path.resolve(process.cwd(), 'prisma', 'dev_local_data.json');

interface LocalDB {
  users: any[];
  tickets: any[];
}

function getLocalData(): LocalDB {
  try {
    if (fs.existsSync(localDataPath)) {
      const content = fs.readFileSync(localDataPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Erro ao ler dev_local_data.json:', e);
  }
  return { users: [], tickets: [] };
}

function saveLocalData(data: LocalDB) {
  try {
    fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar dev_local_data.json:', e);
  }
}

// Fallback implementation when Postgres is unreachable (e.g. Localhost without RDS VPN)
const fallbackUser = {
  findFirst: async (args?: any) => {
    const db = getLocalData();
    if (!args?.where) return db.users[0] || null;
    const { email, cpf, OR } = args.where;
    return db.users.find(u => {
      if (email && u.email === email) return true;
      if (cpf && u.cpf === cpf) return true;
      if (Array.isArray(OR)) {
        return OR.some(cond => (cond.email && u.email === cond.email) || (cond.cpf && u.cpf === cond.cpf));
      }
      return false;
    }) || null;
  },
  findUnique: async (args: any) => {
    const db = getLocalData();
    const { email, cpf, id } = args.where || {};
    return db.users.find(u => (id && u.id === id) || (email && u.email === email) || (cpf && u.cpf === cpf)) || null;
  },
  create: async (args: any) => {
    const db = getLocalData();
    const newUser = {
      id: randomUUID(),
      name: args.data.name,
      email: args.data.email,
      cpf: args.data.cpf,
      phone: args.data.phone || '',
      password: args.data.password,
      role: args.data.role || 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveLocalData(db);
    return newUser;
  }
};

const fallbackTicket = {
  findMany: async (args?: any) => {
    const db = getLocalData();
    let result = db.tickets.map(t => {
      const u = db.users.find(user => user.id === t.userId) || {
        name: 'Participante',
        email: 'participante@tjaembrasil.com.br',
        cpf: '000.000.000-00',
        phone: ''
      };
      return { ...t, user: u };
    });

    if (args?.where) {
      if (args.where.asaasPaymentId) {
        result = result.filter(t => t.asaasPaymentId === args.where.asaasPaymentId);
      }
      if (args.where.status) {
        result = result.filter(t => t.status === args.where.status);
      }
      if (args.where.OR && Array.isArray(args.where.OR)) {
        result = result.filter(t => {
          return args.where.OR.some((cond: any) => {
            if (cond.asaasPaymentId && t.asaasPaymentId === cond.asaasPaymentId) return true;
            if (cond.id && t.id === cond.id) return true;
            return false;
          });
        });
      }
    }

    if (args?.orderBy?.createdAt === 'desc') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  },
  findUnique: async (args: any) => {
    const db = getLocalData();
    const { id, qrCodeToken } = args.where || {};
    const t = db.tickets.find(item => (id && item.id === id) || (qrCodeToken && item.qrCodeToken === qrCodeToken));
    if (!t) return null;
    const u = db.users.find(user => user.id === t.userId) || {
      name: 'Participante',
      email: '',
      cpf: '',
      phone: ''
    };
    return { ...t, user: u };
  },
  findFirst: async (args: any) => {
    const db = getLocalData();
    const { id, qrCodeToken, asaasPaymentId } = args?.where || {};
    const t = db.tickets.find(item => 
      (id && item.id === id) || 
      (qrCodeToken && item.qrCodeToken === qrCodeToken) ||
      (asaasPaymentId && item.asaasPaymentId === asaasPaymentId)
    );
    if (!t) return null;
    const u = db.users.find(user => user.id === t.userId) || {
      name: 'Participante',
      email: '',
      cpf: '',
      phone: ''
    };
    return { ...t, user: u };
  },
  create: async (args: any) => {
    const db = getLocalData();
    const newTicket = {
      id: randomUUID(),
      userId: args.data.userId,
      asaasPaymentId: args.data.asaasPaymentId || null,
      status: args.data.status || 'PENDING',
      paymentMethod: args.data.paymentMethod || 'PIX',
      amount: Number(args.data.amount) || 0,
      ticketType: args.data.ticketType || 'INGRESSO_UNICO',
      qrCodeToken: randomUUID(),
      scanned: false,
      scannedAt: null,
      pdfUrl: null,
      isAssociate: false,
      associateRegistration: null,
      associateDocUrl: null,
      associateApproved: false,
      discountAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.tickets.push(newTicket);
    saveLocalData(db);
    return newTicket;
  },
  updateMany: async (args: any) => {
    const db = getLocalData();
    let count = 0;
    const { asaasPaymentId } = args.where || {};
    for (const t of db.tickets) {
      if (asaasPaymentId && t.asaasPaymentId === asaasPaymentId) {
        if (args.data.status) t.status = args.data.status;
        t.updatedAt = new Date().toISOString();
        count++;
      }
    }
    saveLocalData(db);
    return { count };
  },
  update: async (args: any) => {
    const db = getLocalData();
    const { id } = args.where || {};
    const t = db.tickets.find(item => item.id === id);
    if (t) {
      Object.assign(t, args.data, { updatedAt: new Date().toISOString() });
      saveLocalData(db);
      return t;
    }
    return null;
  },
  count: async () => {
    const db = getLocalData();
    return db.tickets.length;
  }
};

let dbMode: string = 'UNKNOWN';

// Resilient proxy: Tries real Prisma first; if database server is unreachable, falls back to local dev storage
export const prisma = new Proxy(realPrisma, {
  get(target, prop, receiver) {
    if (prop === 'user') {
      return new Proxy(target.user, {
        get(userTarget: any, userProp: string) {
          return async (...args: any[]) => {
            if (dbMode === 'LOCAL_FALLBACK') {
              return (fallbackUser as any)[userProp](...args);
            }
            try {
              return await userTarget[userProp](...args);
            } catch (err: any) {
              if (err?.message?.includes("Can't reach database server") || err?.message?.includes("getaddrinfo failed") || err?.name === 'PrismaClientInitializationError') {
                if (dbMode !== 'LOCAL_FALLBACK') {
                  console.warn('⚠️ [LOCAL DEV] Banco Postgres RDS inacessível. Usando armazenamento local prisma/dev_local_data.json');
                  dbMode = 'LOCAL_FALLBACK';
                }
                return (fallbackUser as any)[userProp](...args);
              }
              throw err;
            }
          };
        }
      });
    }

    if (prop === 'ticket') {
      return new Proxy(target.ticket, {
        get(ticketTarget: any, ticketProp: string) {
          return async (...args: any[]) => {
            if (dbMode === 'LOCAL_FALLBACK') {
              return (fallbackTicket as any)[ticketProp](...args);
            }
            try {
              return await ticketTarget[ticketProp](...args);
            } catch (err: any) {
              if (err?.message?.includes("Can't reach database server") || err?.message?.includes("getaddrinfo failed") || err?.name === 'PrismaClientInitializationError') {
                if (dbMode !== 'LOCAL_FALLBACK') {
                  console.warn('⚠️ [LOCAL DEV] Banco Postgres RDS inacessível. Usando armazenamento local prisma/dev_local_data.json');
                  dbMode = 'LOCAL_FALLBACK';
                }
                return (fallbackTicket as any)[ticketProp](...args);
              }
              throw err;
            }
          };
        }
      });
    }

    return Reflect.get(target, prop, receiver);
  }
});


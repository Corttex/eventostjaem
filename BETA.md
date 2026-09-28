# TJAEM Eventos - Finalização da Fase Beta

Este documento registra o estado atual do sistema após a finalização das funcionalidades principais (Beta) e serve como guia para as próximas etapas e deploy na VPS.

## 🚀 Funcionalidades Concluídas
- **Sistema de Checkout (Fluxo Multi-step):**
  - Seleção de quantidade de ingressos.
  - Coleta de dados (Nome, E-mail, CPF) para cada participante.
  - Integração com **Asaas** para geração de cobrança PIX via API.
  - Polling (verificação automática) de pagamento PIX no frontend.
- **Geração de Ingressos (PDF):**
  - Criação de PDF dinâmico com `pdf-lib`.
  - Design customizado: Logo CAMEB com fundo branco, data atualizada (20 de Outubro de 2026), e layout ajustado para QR Code.
- **Sistema Validador de QR Code (`/validador`):**
  - Acesso restrito por senha (master / 807522).
  - Dashboard de estatísticas em tempo real (Total Vendidos, Escaneados, Restantes).
  - Leitor de QR Code usando câmera ou leitor USB de código de barras.
  - Check-in manual com atualização em tempo real (sem recarregar a página).
- **Design & UI:**
  - Aplicação de cores dinâmicas e tipografia moderna.
  - Fundo escuro de tribunal ("bg-tribunal.jpg") implementado como overlay fixo.

## 🗄️ Banco de Dados (Migração para PostgreSQL)
O sistema foi configurado para rodar em produção usando **PostgreSQL**.
A URL do banco foi configurada no `.env` para apontar para a infraestrutura interna da VPS (`x3dn3ozarslvxo4rsvzjkrzh:5432`).

### ⚙️ Passos para Deploy na VPS
Após enviar este código para a VPS, você precisará obrigatoriamente executar estes dois comandos no terminal do servidor (onde o Next.js vai rodar):

1. **Gerar o cliente Prisma para a plataforma:**
   ```bash
   npx prisma generate
   ```

2. **Criar as tabelas no PostgreSQL da VPS:**
   ```bash
   npx prisma db push
   ```

## 🔐 Variáveis de Ambiente Necessárias (.env na VPS)
Certifique-se de que a VPS possui as seguintes variáveis configuradas:
- `DATABASE_URL` (Sua string do Postgres)
- `ASAAS_API_KEY` (Sua chave do Asaas)
- `JWT_SECRET` (Chave secreta para validações, se aplicável)
- `NEXT_PUBLIC_APP_URL` (URL pública do seu domínio)

---
*Versão gerada ao fim do escopo de desenvolvimento inicial (Beta).*

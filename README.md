# Dhande’s Ops

A mobile-first catering operations PWA for Dhande’s Millennium Catering.

## Product scope

- Enquiry and event lifecycle management
- Customer records and lead inbox
- Menu Studio: standardised menu extraction and branded PDF/DOCX generation
- Flexible quotations with a configurable default 20% advance
- Payments, expenses and event profitability
- Food quantity estimates with an editable 10–20% buffer
- Ingredient purchases and workforce records

## Stack

- Next.js App Router + TypeScript
- Supabase (PostgreSQL, Auth and Storage)
- Progressive Web App foundations for iPhone Safari

## Local development

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` when Supabase integration is added. Never commit real credentials.

## Current status

The initial UI and PWA shell are scaffolding only. Dashboard metrics are placeholders; authentication, persistence, event CRUD, document generation and WhatsApp integrations are not implemented yet.

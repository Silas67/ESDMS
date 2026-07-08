ESDMS — Election Security Duty Management System. A Next.js 16 / Prisma 7 web platform built for the Nigeria Police Force to manage officer duty assignments during Nigerian elections. Command officers (IGP → AIG → CP → DPO → SPO, each strictly scoped to their state/zone/LGA) import personnel and INEC polling-unit data, allocate officers to polling units as security duties, generate printable/scannable PDF duty cards, and track deployment coverage gaps — all enforced server-side so no role can see or touch data outside its command scope.

Stack: Next.js 16 (App Router), Prisma 7 + Supabase Postgres, Auth.js v5 credentials login, shadcn/ui on Base UI, Tailwind v4
Roles: IGP (national) → AIG (zonal) → CP (state) → DPO (LGA) → SPO (individual officer), each with a distinct dashboard and hard data-scope enforcement at the API/action level
Core flows: personnel roster (manual + Excel import) → polling-unit roster (INEC Excel import) → duty allocation → PDF duty cards with QR verification → coverage/gap reporting
Status: all seven planned phases built and verified; only test/fixture data loaded so far — real Nigerian LGA and polling-unit data still needs importing before production use

# Blog Personnel React + PostgreSQL

## Prerequis
- Node.js 20+
- PostgreSQL 14+

## 1. Configurer l'environnement
1. Copier `.env.example` vers `.env`
2. Adapter `DATABASE_URL` et `JWT_SECRET`

Exemple:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blog_personnel
JWT_SECRET=change_me_in_production
```

## 2. Creer la base PostgreSQL
```sql
CREATE DATABASE blog_personnel;
```

## 3. Installer les dependances
```bash
npm install
```

## 4. Initialiser les tables + donnees demo
```bash
npm run db:init
```

## 5. Lancer frontend + backend
```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000

## Comptes de demonstration
- `issiaka / pass123` (nom: issiaka traore)
- `hawa / pass123` (nom: hawa traore)

# Digitelio AI

**Créez. Publiez. Vendez. avec l'IA.**

SaaS permettant de créer et vendre des eBooks, formations et produits digitaux grâce à l'intelligence artificielle.

## Stack technique

| Couche       | Techno                          |
|--------------|----------------------------------|
| Frontend     | React + Vite + Tailwind CSS      |
| Backend      | Cloudflare Workers                |
| Base de données | Cloudflare D1 (SQLite)        |
| Stockage     | Cloudflare R2                     |
| Auth         | JWT + cookies sécurisés (httpOnly)|
| Déploiement  | GitHub → Cloudflare Pages/Workers |

## Structure du monorepo

```
digitelio-ai/
├── frontend/          # Application React (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Composants réutilisables (Navbar, Footer, ThemeToggle...)
│   │   ├── pages/          # Pages de l'application (Landing, Dashboard...)
│   │   ├── context/        # Contextes React (Thème clair/sombre)
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── worker/             # API Cloudflare Worker
│   ├── src/
│   │   ├── index.js      # Point d'entrée du Worker
│   │   └── utils/
│   ├── schema.sql        # Schéma de la base D1
│   └── wrangler.toml
│
└── README.md
```

## Sprint 1 — ce qui est livré

- ✅ Initialisation complète du monorepo (frontend + worker)
- ✅ Configuration Vite + Tailwind CSS (thème clair/sombre natif)
- ✅ Configuration Cloudflare Workers (wrangler.toml)
- ✅ Schéma D1 initial (users, projects)
- ✅ Configuration R2 (bucket de stockage des exports/assets)
- ✅ Landing page responsive, thème clair + sombre, fidèle à la maquette

## Démarrage rapide (frontend)

```bash
cd frontend
npm install
npm run dev
```

## Démarrage rapide (worker)

```bash
cd worker
npm install
npx wrangler d1 create digitelio-db
# Copier l'ID renvoyé dans wrangler.toml (database_id)
npx wrangler d1 execute digitelio-db --file=./schema.sql
npx wrangler r2 bucket create digitelio-storage
npx wrangler dev
```

## Déploiement (GitHub → Cloudflare)

1. Pousser ce repo sur GitHub.
2. Connecter le repo à Cloudflare Pages (frontend) et à Cloudflare Workers (worker) via l'intégration GitHub native.
3. Renseigner les variables d'environnement / secrets (JWT_SECRET, etc.) dans le dashboard Cloudflare.

---

Prochain sprint (Sprint 2) : Connexion / Inscription (JWT + cookies sécurisés) — en attente de validation.


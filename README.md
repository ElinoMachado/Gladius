# Gladius — Arena dos sobreviventes

Jogo web (Vite + TypeScript + Three.js).

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build local

```bash
npm run build
npm run preview
```

## GitHub Pages (importante)

O ficheiro `index.html` na **raiz do repo** é o template de **desenvolvimento** (aponta para `/src/main.ts`). **Não** é isso que deve ser publicado.

1. No repositório: **Settings → Pages**.
2. Em **Build and deployment → Source**, escolhe **GitHub Actions** (não uses “Deploy from a branch” com a pasta raiz).
3. Garante que o workflow **Deploy to GitHub Pages** (`.github/workflows/pages.yml`) corre com sucesso na aba **Actions**.
4. O site fica em `https://<utilizador>.github.io/Gladius/` (ajusta o nome do repo no URL se for diferente).

Se a fonte estiver em **branch `main` / folder `/ (root)`**, o GitHub serve esse `index.html` de dev → o browser pede `/src/main.ts` (404) e vês **ecrã branco**.

O ficheiro `.nojekyll` em `public/` evita que o Jekyll ignore ficheiros no build estático.

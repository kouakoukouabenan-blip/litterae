# Litterae

La dissertation littéraire pour les élèves de terminale : le cours, des sujets corrigés et un moteur de recherche sur plus de 360 résumés d'œuvres.

Projet personnel de Donatien Kouabenan, auteur du guide « La dissertation littéraire, version simplifiée ».

## Lancer le site en local

Il faut Node.js 20 ou plus récent.

```sh
npm install
npm run dev       # site de développement sur http://localhost:5173
npm run build     # vérifie les données et le code, puis produit dist/
npm run preview   # sert la version produite
```

## Mise en ligne

Chaque envoi sur la branche `main` publie le site sur GitHub Pages (`.github/workflows/deploy.yml`).
À faire une seule fois dans le dépôt : Settings, Pages, Source « GitHub Actions ».

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/data/` | Contenus : œuvres, sujets corrigés, leçons, boîte à outils |
| `src/lib/` | Logique : navigation, recherche, accès gratuit, carnet |
| `src/components/` | Éléments d'interface réutilisables |
| `src/screens/` | Un fichier par écran |
| `src/styles/` | Design system (`tokens.css`) puis mise en page |
| `scripts/check-data.mjs` | Contrôle des données, lancé avant chaque build |

## Modifier les contenus

Le contenu complet (résumés, corrigés) vit dans le dépôt **privé** `litterae-contenu`. Ce dépôt public ne reçoit que la partie gratuite :

```sh
npm run import-contenu -- ../litterae-contenu
```

`npm run build` refuse de produire le site si une donnée est incomplète ou si un contenu payant s'est glissé dans les données publiques.

## Accès complet

L'élève achète une licence sur Chariow et reçoit une clé par e-mail. Il la saisit dans l'écran « Clé d'accès » (`#/acces`) ; le serveur du dépôt privé la vérifie auprès de Chariow et renvoie le contenu payant, gardé ensuite sur l'appareil.

Réglages dans `src/lib/site.ts` : `ACHAT_URL` (page de vente Chariow) et `SERVEUR_URL` (adresse du serveur Cloudflare, ou variable `VITE_SERVEUR_URL`).

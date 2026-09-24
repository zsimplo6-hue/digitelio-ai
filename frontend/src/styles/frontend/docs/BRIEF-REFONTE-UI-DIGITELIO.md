# Refonte UI Digitelio AI — brief d'exécution

À coller dans l'outil qui modifie ton code (avec accès au dépôt `digitelio-ai`), en joignant les 8 images, `digitelio-design-system.css` et `tailwind.digitelio.preset.js`.

---

## Rôle

Tu es Lead Product Designer + Senior Frontend Engineer. Tu refonds **uniquement l'apparence** de Digitelio AI d'après les 8 maquettes jointes. Le comportement reste identique à 100 %.

## Interdits absolus

- Aucune route modifiée (ni URL du frontend, ni endpoint du Worker).
- Aucun fichier de `worker/` modifié. Aucune migration D1, aucun `schema.sql`, aucun `wrangler.toml`.
- Rien de SasPay touché : appels, callbacks, webhooks, montants, redirections, textes d'erreur techniques.
- Aucun composant métier renommé, aucun `fetch`/hook/contexte/store modifié.
- Aucune fonctionnalité supprimée, aucune nouvelle fonctionnalité ajoutée.
- Pas de nouvelle dépendance npm sans nécessité démontrée (préférer CSS + Tailwind existants).

Seuls fichiers modifiables : le JSX **de présentation** (structure et classes), le CSS, la config Tailwind (ajout via preset), `index.html` (balise des polices).

## Étape 0 — Audit (avant toute modification, rien n'est modifié)

Produis un rapport court avec :
1. Liste des routes du frontend et la page/composant de chacune.
2. Pour chacun des 8 écrans (Tableau de bord, eBooks, Formations, Pages de vente, Marketing digital, Analytics, Abonnements, Paramètres) : fichiers concernés, et séparation claire **logique** (appels API, état, handlers) vs **présentation** (JSX/classes).
3. Layout actuel (Navbar, sidebar, thème clair/sombre via `context/`), et comment `darkMode` est configuré dans `tailwind.config.js`.
4. Éléments visibles dans les maquettes qui **n'existent pas** aujourd'hui (voir tableau plus bas).
5. Risques de régression repérés.

Attends ma validation du rapport avant l'étape 1.

## Étape 1 — Installer le design system (additif)

- Copier `digitelio-design-system.css` dans `frontend/src/styles/`, l'importer une fois dans `main.jsx`.
- Ajouter le preset Tailwind (`presets: [digitelio]`) sans toucher au reste de la config.
- Ajouter dans `index.html` la balise des polices Inter + Plus Jakarta Sans (poids limités, `display=swap`).
- Vérifier que le build passe et que **rien n'a changé visuellement** avant d'aller plus loin.
- Si le sélecteur de mode sombre existant n'est ni `.dark` ni `[data-theme="dark"]`, adapter uniquement ce sélecteur dans le CSS.

## Étape 2 — Layout partagé

Remplacer l'habillage du layout authentifié (barre latérale + barre du haut) par `dg-sidebar`, `dg-topbar`, `dg-nav-item`, `dg-upsell`, `dg-main`. Les liens gardent leurs `to=`/`href` d'origine. Sous 1024 px la barre latérale devient un tiroir (`is-open` + `dg-scrim`), ouvert par un bouton menu dans la barre du haut : c'est le cas d'usage principal (Chrome sur Android).

## Étape 3 — Écrans, un par un (un commit par écran)

Ordre : Tableau de bord → Abonnements → Paramètres → eBooks → Formations → Pages de vente → Marketing digital → Analytics.

Pour chaque écran : ne changer que le balisage et les classes ; les données restent celles renvoyées par l'API existante.

| Écran | Composants du design system |
|---|---|
| Tableau de bord | `dg-grid-kpi` + `dg-stat`, bandeau revenus `dg-card--navy`, actions rapides `dg-btn`, progression `dg-ring`, activité récente `dg-list-row` + `dg-badge` |
| eBooks / Formations | `dg-stepper`, `dg-field`/`dg-input`/`dg-textarea`, options avancées `dg-toggle`, panneau Publication `dg-card`, CTA « Publier & Vendre » `dg-btn--primary dg-btn--block` |
| Pages de vente | liste de composants à gauche, aperçu au centre, réglages à droite ; sous 1024 px empiler (aperçu d'abord) |
| Marketing digital | sélecteurs d'objectif/plateforme en cartes cochables, réglages IA en `dg-tab` |
| Analytics | `dg-tabs`, KPI `dg-stat`, graphiques : garder la lib actuelle, restyler couleurs bleu/violet, tableau `dg-table` dans `dg-table-wrap` |
| Abonnements | `dg-plans` + `dg-plan`, plan courant `dg-plan--current`, formule mise en avant `dg-plan--featured` |
| Paramètres | onglets latéraux → `dg-tabs` sur mobile, formulaires `dg-field` |

Chaque écran doit avoir : états de chargement (`dg-skeleton`), vide (`dg-empty`), erreur, et fonctionner sans défilement horizontal à 360 px de large.

## Ce que les maquettes montrent mais qu'il ne faut PAS reproduire tel quel

Les maquettes sont des images avec des **données d'exemple**. Toute donnée affichée vient de l'API actuelle, jamais des images.

| Dans les maquettes | Règle |
|---|---|
| Plan « Premium 49 900 FCFA » | N'existe pas dans la grille actuelle : afficher uniquement les plans réellement renvoyés par le backend |
| Prix, limites, commissions (ex. « Business 10 000 FCFA/mois », « commission 10 % ») | Incohérents entre les écrans : utiliser les valeurs réelles du backend |
| Devise « Euro (€) » dans l'éditeur d'eBook | Garder la logique de devise actuelle |
| Dates 2025 / 2026, noms, avatars, chiffres | Données factices |
| Boutons ou onglets absents du code : « Mode IA / Modèle / Éditeur libre », Desktop/Mobile, Notifications, Intégrations, onglets Ventes/Audience/Sources, cloche avec badge, recherche ⌘K, plage de dates | Si la fonctionnalité existe : la restyler. Sinon : **ne pas l'afficher** (ou l'afficher désactivé avec la mention « Bientôt »), sans écrire de logique |
| Images générées (couvertures, hero, avatars) | Ne pas les intégrer comme assets ; utiliser les visuels réels de l'app ou des placeholders neutres |

## Règles de design

- Une seule famille de composants : uniquement `dg-*` pour le neuf, un seul rayon par niveau (carte 20, bouton 12, badge pilule).
- Le dégradé bleu→violet sert aux actions principales et à l'élément actif ; l'or sert uniquement au premium (couronne, plan supérieur).
- Ombres teintées indigo, jamais grises. Pas d'ombre ni de survol animé sur chaque carte.
- Animation : une seule entrée `dg-enter` par page, feedback au toucher sur les boutons ; `prefers-reduced-motion` respecté.
- Cibles tactiles ≥ 44 px, champs à 16 px (évite le zoom auto sur mobile), contraste texte ≥ 4.5:1, focus visible.
- Réseau limité : pas d'image lourde, pas de bibliothèque d'animation, polices en 2 familles / 5 poids max.

## Non-régression — à passer avant chaque commit

1. `npm run build` passe sans nouveau warning.
2. Toutes les routes répondent comme avant (liste de l'étape 0 comparée).
3. Parcours à tester à la main : connexion / déconnexion, création d'un eBook, création d'une formation, création et publication d'une page de vente, génération marketing IA, lecture des analytics, page Abonnements, modification du profil, bascule clair/sombre.
4. Aucune requête réseau ajoutée, supprimée ou modifiée (comparer l'onglet Réseau avant/après sur chaque écran).
5. Le flux de paiement SasPay reste strictement identique. L'état actuel de chaque écran doit être capturé **avant** refonte : un comportement déjà défaillant aujourd'hui (par exemple le paiement d'abonnement) ne doit être ni corrigé ni aggravé par ce chantier.
6. Test à 360 px, 768 px et 1280 px de large.
7. `git diff --stat` ne montre aucun fichier sous `worker/`.

## Livraison

Une branche `refonte-ui` (pas de push direct sur `main`), un commit par écran, un aperçu Cloudflare de la branche pour valider avant fusion.

# Fiche de reprise — Bondy TV Magazine (1er novembre 2026)

À lire au début d'une nouvelle conversation. Le dépôt est `tvbondyofficiel/bondytv`, le site `https://www.bondytv.com` (Cloudflare Pages, déploiement automatique depuis `main`). Admin : `bondytv.pages.dev/admin/`. Contenu : `content/site.json`.

## Qui et comment
- Le fondateur s'appelle **Mohammed** (prénom seulement : jamais de nom de famille, nulle part). Graphiste, il dicte à la voix, s'énerve vite, craint de gaspiller son forfait.
- Répondre **en français, simple, court, positif**. Ne jamais inventer de faits. Ne jamais demander de mot de passe ou de secret.
- **Une seule tâche à la fois.** Après « Arrête de publier » : toujours un **aperçu** (capture) sur une branche, puis attendre « publie / fais-le / oui » avant de fusionner dans `main`.
- Pas de **bleu** dans le design du site. Mettre « Exemple » sur tout contenu d'exemple.
- Tout changement du site doit aussi se refléter dans le PDF du magazine (et l'inverse).
- Quand il dit « non » à une proposition : ne pas publier, proposer 2–3 alternatives numérotées (« 1, 2 ou 3 »).

## Ce qui est publié (main, `sw.js` = `bondy-tv-v562`)
- Admin réorganisé : tableau de bord, familles avec boutons + onglets, bouton **Dupliquer** sur les articles, page Articles en **vignettes** par défaut, « Mes pages » en cartes, pages Contact et Diaporama réorganisées.
- Site public : page **Articles** en 4 colonnes continues séparées par des traits, recherche + filtres avec nombre ; accueil sans la vignette vidéo, « Ici, la parole est à vous » agrandi et centré.
- Magazine **N°1** (« Vivre ensemble, mieux », novembre 2026) : 22 pages, 7,7 Mo ; dernière page noire avec le texte « Pas pour la gloire, mais pour être utiles… », logo, QR code, réseaux. Source : `magazine/edition.html`, PDF refait automatiquement par GitHub (`scripts/build-magazine-pdf.py` ; le bot commit → toujours `git pull --rebase`).
- Décision de Mohammed : le texte « Pas pour la gloire… » va dans le **N°2** (dernière page), pas le N°1. Le N°1 est terminé : ne plus y toucher. Retrait du N°1 préparé sur la branche `brouillon-n1-retrait`, en attente de son « publie ». Texte rangé dans `n2-brouillon/derniere-page-texte.md`.

## N°2 « Noël à Bondy » (décembre 2026) — BROUILLON, NON PUBLIÉ
- Thème : Noël des années 1970, féerique, avec des photos de Bondy. Branche : `brouillon-n2-couverture` (ne pas fusionner sans accord).
- `n2-brouillon/couverture.html` + `n2-brouillon/noel-couverture.jpg` : couverture v3 (image fournie par Mohammed : sapin, peluche, bougies ; logo blanc ; titre doré). Format A4 portrait ; une version 16/9 pour le site reste possible.
- `n2-brouillon/edito.md` : édito « Votre magazine, votre voix » (texte de Mohammed, retravaillé).
- Plan de 24 pages : couverture ; sommaire/édito ; À la une ; commerçants ; solidarité ; enfants ; sorties ; « Ils font Bondy » (portraits, podcast, tribune) ; Bondy en images ; dessins ; entraide ; appel à contributions ; publicité ; pages de réserve ; dernière page (logo, QR, réseaux). Un tableur du plan a été envoyé (`Bondy-TV-N2-Noel-a-Bondy.xlsx`).
- À obtenir de Mohammed : ses photos de Noël à Bondy, les textes et portraits. Ne pas inventer de personnes ni de faits.

## Rythme de parution (décision de Mohammed)
- Un numéro sort **le 5 de chaque mois**. Raison : avoir le temps de voir ce que publie le Bondy Blog et pouvoir réagir.
- N°1 : novembre 2026. N°2 « Noël à Bondy » : **samedi 5 décembre 2026**. Prévoir : textes et photos reçus vers le 25 novembre, PDF final prêt le 3 décembre, publication le 5.
- Règle de stratégie graphique : le squelette ne bouge pas (logo, couleurs doré/vert/rouge/noir, polices Barlow, place du titre, du numéro et de la date) ; seule l'ambiance de la couverture change à chaque numéro ; une seule nouveauté à la fois ; pas de refonte avant 6 à 12 mois.

- La charte graphique d'une page est dans `n2-brouillon/CHARTE-GRAPHIQUE.md` (à respecter).

## En pause (ne pas lancer sans demande)
- Recadrage de la photo du rassemblement ; revue de sa page TikTok (il faut son @ ou une capture) ; redirection du domaine nu `bondytv.com` (Netlify) seulement si ça échoue sur son téléphone ; transfert de domaine pas avant le 18 déc. 2026 ; boutique ; réactivation de la Tribune citoyenne ; indexation Google (home, numéros, articles) = action de sa part.
- Articles cachés à laisser cachés : `mon-prof-de-conduite`, `mosquee-acmb`. Page désactivée : `logement.html`.
- Quatre articles sans photo (icône) : e-commerce, « Quand le mois est long », « Et si faire le bien… », « Une idée pour Bondy ? ».

## Notes techniques utiles
- Vérifier chaque changement en local : serveur statique sur le dépôt (port 8191) + Playwright (`service_workers='block'`), API GitHub simulée pour l'admin. Contrôler aussi mobile (390 px).
- À chaque publication : fusionner la branche dans `main`, passer `VERSION` de `sw.js` à +1, pousser, vérifier `git ls-remote`.
- Le crochet de fin de session exige un arbre propre et toutes les branches poussées. Éviter `--force` ; changer le nom de la branche si le distant diverge.
- Les fichiers `/tmp` ne survivent pas entre conversations.

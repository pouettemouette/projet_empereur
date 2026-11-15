# Château de Monlet

Site statique officiel du Château de Monlet, consacré à la salle, aux événements et aux hébergements. Il est publié sur GitHub Pages avec le domaine `www.chateau-monlet.fr` déclaré dans `CNAME`.

## Structure

- Pages HTML à la racine, afin de conserver les URL publiques.
- `assets/css/styles.css` : styles partagés et responsive.
- `assets/js/main.js` : navigation, carrousel, galerie et améliorations progressives.
- `assets/images` : originaux et variantes responsives WebP/JPEG.
- `scripts/check_site.py` : contrôles locaux et CI.

## Contrôles

```powershell
python scripts/check_site.py
node --check assets/js/main.js
git diff --check
```

Le contrôle Python n'utilise aucune dépendance externe. Le workflow GitHub Actions exécute automatiquement les contrôles lors des pushes et pull requests.

## Publication et formulaire

GitHub Pages sert directement les fichiers statiques. Le formulaire de contact est envoyé à Formspree via `https://formspree.io/f/mjgdkgwz`, puis redirige vers `merci.html`.

Les coordonnées, tarifs, capacités, disponibilités, équipements et informations juridiques ne doivent jamais être inventés. Toute nouvelle information de ce type doit être confirmée par le propriétaire avant publication.



## Vérifications avant publication

- Dans les réglages GitHub Pages, vérifier que l’option **Enforce HTTPS** est active. Après publication, contrôler que l’adresse HTTP redirige vers HTTPS et qu’une URL inconnue renvoie la page 404 avec le statut HTTP 404.
- Confirmer l’identité et les coordonnées de l’éditeur, les coordonnées complètes de l’hébergeur, le contact pour les droits et la durée de conservation des demandes. Les conditions d’utilisation décrivent le site et le formulaire. Les conditions commerciales doivent refléter les modalités validées par le château.
- Vérifier la réception d’une demande de test et la redirection configurée côté Formspree. Le champ anti-spam `_gotcha` reste actif.
- Les pages publiques chargent leurs ressources depuis le site. Avant d’ajouter une mesure d’audience, définir le service et vérifier ses conditions de consentement et l’information des visiteurs.
- Après déploiement, vérifier la propriété `chateau-monlet.fr` dans Google Search Console, soumettre `sitemap.xml` et inspecter l’URL d’accueil. Consulter les Core Web Vitals de terrain quand les données sont disponibles. Le rapport Lighthouse de la CI mesure les performances en laboratoire.

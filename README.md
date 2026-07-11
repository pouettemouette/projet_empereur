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


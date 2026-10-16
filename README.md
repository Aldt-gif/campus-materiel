# Campus Matériel

Application web (Angular) de réservation de matériel du campus. Deux profils : étudiant et responsable. La connexion est simulée, les données sont enregistrées dans le navigateur (localStorage).

## Installation

Prérequis : Node.js (version récente) et npm.

```bash
npm install
```

## Lancement

```bash
ng serve
```

Puis ouvrir http://localhost:4200.

## Comptes de démonstration

Il n'y a pas de mot de passe : on choisit un compte sur la page de connexion.

| Compte | Profil |
|---|---|
| Léa Moreau | Étudiant |
| Hugo Lambert | Étudiant |
| Antoine Ledentu | Responsable |

## Routes

| Route | Accès | Page |
|---|---|---|
| `/login` | Public | Choix du compte |
| `/catalogue` | Connecté | Catalogue, recherche, filtre par catégorie |
| `/materiels/:id` | Connecté | Fiche d'un équipement (réservation réservée aux étudiants) |
| `/mes-reservations` | Étudiant | Réservations de l'étudiant connecté |
| `/gestion` | Responsable | Liste de gestion (chargée à la demande) |
| `/gestion/nouveau` | Responsable | Création d'un équipement |
| `/gestion/:id/modifier` | Responsable | Modification d'un équipement |
| `/acces-refuse` | Public | Message d'accès refusé |
| `/` | Public | Redirige vers `/login` ou `/catalogue` selon la session |
| autre adresse | Public | Page « Page introuvable » |

## Fonctionnalités réalisées

- Connexion simulée avec deux étudiants et un responsable, session conservée après rechargement, supprimée à la déconnexion.
- Protection des routes par des guards (visiteur renvoyé vers la connexion, mauvais rôle renvoyé vers « Accès refusé »). Une adresse tapée directement est aussi contrôlée.
- Catalogue de 6 équipements dans 4 catégories : recherche par nom (sans tenir compte des accents ni des majuscules), filtre par catégorie, indication de disponibilité, message si aucun résultat.
- Fiche détail, avec message si l'équipement n'existe pas.
- Réservation : un équipement n'a qu'une réservation active, un étudiant peut en réserver plusieurs, il ne voit et n'annule que les siennes, l'annulation libère l'équipement immédiatement. La disponibilité est calculée à partir des réservations.
- Gestion du catalogue par le responsable : création, modification, suppression avec confirmation, suppression refusée (avec explication) si l'équipement est réservé.
- Un seul formulaire réactif pour la création et la modification, avec messages de validation et conservation de la saisie en cas d'erreur.
- État partagé par un service à signaux, mise à jour de l'écran sans rechargement.
- Persistance dans localStorage : les données de départ ne sont chargées que si rien n'est enregistré ; un message s'affiche si la lecture ou l'écriture échoue.
- Page de gestion chargée à la demande (lazy loading).
- Accessibilité : libellés reliés aux champs, messages d'erreur annoncés, lien actif du menu repérable, navigation au clavier.
- Interface colorée : une couleur et une icône par catégorie (bleu Informatique, violet Projection, orange Photo, rose Audio), en-tête en dégradé, pastilles d'état et de profil. Les couleurs sont regroupées dans les variables en haut de `src/styles.css`.
- Bouton de volume ludique dans l'en-tête : une boule qui glisse sur une ligne (gauche = faible, droite = fort), qui tombe si on la tire trop loin et affiche alors des valeurs absurdes (la puissance réelle reste plafonnée). Une fois tombée, la boule obéit à la physique (gravité, rebonds, roulement) : on peut l'attraper, la lancer, ou la déposer sur la ligne pour régler de nouveau le volume. Bruitages 8-bit générés par le navigateur (Web Audio) lors d'une réservation, d'une annulation, d'une connexion, etc. Le son est coupé par défaut et le volume est sauvegardé ; clavier et lecteurs d'écran pris en charge.

## Organisation du code

- `src/app/data` : données de départ et types.
- `src/app/services` : `AuthService` (session), `MaterielStore` (équipements et réservations), `StockageService` (localStorage).
- `src/app/guards` : protections de routes.
- `src/app/pages` : une page par route.
- `src/app/components` : composants réutilisables (carte d'équipement).

## Réinitialiser les données de démo

Dans les outils du navigateur (F12), onglet Application, Local Storage, supprimer les clés `campus-*`, puis recharger.

## Limites connues

- La sécurité est simulée : les rôles et la session sont vérifiés uniquement côté navigateur. Un vrai service devrait les contrôler côté serveur.
- La session est enregistrée dans localStorage (identifiant du compte) et peut être modifiée à la main : c'est acceptable pour une démonstration.
- Les données sont propres à chaque navigateur : deux navigateurs ne partagent pas leurs réservations. Deux onglets du même navigateur partagent le stockage, mais l'affichage de l'autre onglet ne se met pas à jour sans rechargement.
- Le nouvel identifiant d'un équipement est le plus grand identifiant + 1 : après suppression du dernier équipement, son numéro peut être réutilisé.
- Pas de dates de réservation (non demandé par le sujet).
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../data/donnees-initiales';
import { AuthService } from '../services/auth';

// Videur n°1 : il faut être connecté
export const connecteGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte()) {
    return true; // « passe »
  }
  // Visiteur : renvoyé vers la connexion, en mémorisant la page demandée (state.url)
  return router.createUrlTree(['/login'], { queryParams: { retour: state.url } });
};

// Videur n°2 : il faut être connecté ET avoir le rôle demandé.
// C'est une fonction qui fabrique un guard : roleGuard('manager'), roleGuard('student')
export const roleGuard = (roleRequis: Role): CanActivateFn => (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estConnecte()) {
    return router.createUrlTree(['/login'], { queryParams: { retour: state.url } });
  }
  if (auth.utilisateur()?.role === roleRequis) {
    return true;
  }
  // Connecté mais pas le bon rôle : accès refusé
  return router.createUrlTree(['/acces-refuse']);
};
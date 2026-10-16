import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Login } from './pages/login/login';
import { Catalogue } from './pages/catalogue/catalogue';
import { MaterielDetail } from './pages/materiel-detail/materiel-detail';
import { MesReservations } from './pages/mes-reservations/mes-reservations';
import { EquipementForm } from './pages/equipement-form/equipement-form';
import { AccesRefuse } from './pages/acces-refuse/acces-refuse';
import { Introuvable } from './pages/introuvable/introuvable';
import { AuthService } from './services/auth';
import { connecteGuard, roleGuard } from './guards/guards';

export const routes: Routes = [
  {
    // La racine renvoie vers le catalogue si on est connecté, vers la connexion sinon
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(AuthService).estConnecte() ? '/catalogue' : '/login')
  },
  { path: 'login', component: Login, title: 'Connexion' },
  { path: 'catalogue', component: Catalogue, title: 'Catalogue', canActivate: [connecteGuard] },
  { path: 'materiels/:id', component: MaterielDetail, title: 'Fiche du matériel', canActivate: [connecteGuard] },
  { path: 'mes-reservations', component: MesReservations, title: 'Mes réservations', canActivate: [roleGuard('student')] },
  {
    // Espace de gestion : réservé au responsable, une seule protection pour toutes ses pages
    path: 'gestion',
    canActivate: [roleGuard('manager')],
    children: [
      {
        path: '',
        // Chargée à la demande : téléchargée seulement quand on ouvre /gestion
        loadComponent: () => import('./pages/gestion/gestion').then(m => m.Gestion),
        title: 'Gestion du catalogue'
      },
      { path: 'nouveau', component: EquipementForm, title: 'Nouvel équipement' },
      { path: ':id/modifier', component: EquipementForm, title: 'Modifier un équipement' }
    ]
  },
  { path: 'acces-refuse', component: AccesRefuse, title: 'Accès refusé' },
  { path: '**', component: Introuvable, title: 'Page introuvable' }
];
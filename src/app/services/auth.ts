import { Injectable, computed, inject, signal } from '@angular/core';
import { COMPTES_INITIAUX, Compte } from '../data/donnees-initiales';
import { StockageService } from './stockage';

// Clé sous laquelle on enregistre la session (seulement l'identifiant du compte)
const CLE_SESSION = 'campus-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private stockage = inject(StockageService); // va chercher le service de stockage

  // La liste des trois comptes de démonstration
  readonly comptes: Compte[] = COMPTES_INITIAUX;

  // Le compte connecté, ou null si personne. Au démarrage, on restaure la session enregistrée.
  readonly utilisateur = signal<Compte | null>(this.restaurerSession());

  // Valeurs calculées à partir de l'utilisateur, mises à jour automatiquement
  readonly estConnecte = computed(() => this.utilisateur() !== null);
  readonly estEtudiant = computed(() => this.utilisateur()?.role === 'student');
  readonly estResponsable = computed(() => this.utilisateur()?.role === 'manager');

  // Connecte un compte de démonstration. Renvoie false si l'identifiant n'existe pas.
  connecter(compteId: number): boolean {
    const compte = this.comptes.find(c => c.id === compteId);
    if (!compte) {
      return false;
    }
    this.utilisateur.set(compte);
    this.stockage.ecrire(CLE_SESSION, compte.id);
    return true;
  }

  // Ferme la session : on vide l'utilisateur et on supprime la session enregistrée
  deconnecter(): void {
    this.utilisateur.set(null);
    this.stockage.supprimer(CLE_SESSION);
  }

  // Relit l'identifiant enregistré et retrouve le compte correspondant dans la liste connue
  private restaurerSession(): Compte | null {
    const id = this.stockage.lire<number>(CLE_SESSION);
    return this.comptes.find(c => c.id === id) ?? null;
  }
}
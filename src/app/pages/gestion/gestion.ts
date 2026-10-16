import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterielStore } from '../../services/materiel-store';

@Component({
  selector: 'app-gestion',
  imports: [RouterLink],
  templateUrl: './gestion.html',
  styleUrl: './gestion.css',
})
export class Gestion {
  protected readonly store = inject(MaterielStore);

  // Identifiant de l'équipement dont on attend la confirmation de suppression (null = aucun)
  protected readonly aSupprimer = signal<number | null>(null);
  protected readonly message = signal<{ texte: string; erreur: boolean } | null>(null);

  // 1er clic sur « Supprimer » : on demande confirmation
  protected demanderSuppression(id: number): void {
    this.message.set(null);
    this.aSupprimer.set(id);
  }

  protected annulerSuppression(): void {
    this.aSupprimer.set(null);
  }

  // Clic sur « Oui, supprimer » : le service refuse si l'équipement est réservé
  protected confirmerSuppression(id: number): void {
    const nom = this.store.trouver(id)?.nom ?? 'équipement';
    const resultat = this.store.supprimer(id);
    this.aSupprimer.set(null);
    this.message.set(
      resultat.ok
        ? { texte: `« ${nom} » a été supprimé du catalogue.`, erreur: false }
        : { texte: resultat.message, erreur: true }
    );
  }
}
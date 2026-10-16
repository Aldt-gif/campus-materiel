import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterielStore } from '../../services/materiel-store';

@Component({
  selector: 'app-mes-reservations',
  imports: [RouterLink],
  templateUrl: './mes-reservations.html',
  styleUrl: './mes-reservations.css',
})
export class MesReservations {
  protected readonly store = inject(MaterielStore);

  protected readonly message = signal<{ texte: string; erreur: boolean } | null>(null);

  // Pour chaque réservation de l'étudiant connecté, on retrouve l'équipement correspondant
  protected readonly lignes = computed(() =>
    this.store.mesReservations().map(reservation => ({
      reservation,
      equipement: this.store.trouver(reservation.equipementId)
    }))
  );

  protected annuler(reservationId: string, nom: string): void {
    const resultat = this.store.annuler(reservationId);
    this.message.set(
      resultat.ok
        ? { texte: `La réservation de « ${nom} » est annulée.`, erreur: false }
        : { texte: resultat.message, erreur: true }
    );
  }
}
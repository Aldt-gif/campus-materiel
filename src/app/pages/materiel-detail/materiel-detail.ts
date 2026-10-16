import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MaterielStore } from '../../services/materiel-store';

@Component({
  selector: 'app-materiel-detail',
  imports: [RouterLink],
  templateUrl: './materiel-detail.html',
  styleUrl: './materiel-detail.css',
})
export class MaterielDetail {
  protected readonly store = inject(MaterielStore);
  protected readonly auth = inject(AuthService);

  // Reçu depuis l'adresse /materiels/:id (grâce à withComponentInputBinding)
  readonly id = input.required<string>();

  protected readonly message = signal<{ texte: string; erreur: boolean } | null>(null);

  // undefined si l'identifiant n'existe pas (par exemple /materiels/999)
  protected readonly equipement = computed(() => this.store.trouver(Number(this.id())));

  protected readonly reservation = computed(() => {
    const equipement = this.equipement();
    return equipement ? this.store.reservationDe(equipement.id) : undefined;
  });

  // Vrai si la réservation en cours appartient à l'étudiant connecté
  protected readonly estMienne = computed(
    () => this.reservation()?.etudiantId === this.auth.utilisateur()?.id
  );

  protected reserver(id: number): void {
    const resultat = this.store.reserver(id);
    this.message.set(
      resultat.ok
        ? { texte: 'Réservation enregistrée.', erreur: false }
        : { texte: resultat.message, erreur: true }
    );
  }

  protected annuler(): void {
    const reservation = this.reservation();
    if (!reservation) {
      return;
    }
    const resultat = this.store.annuler(reservation.id);
    this.message.set(
      resultat.ok
        ? { texte: 'Réservation annulée. L\u2019équipement est de nouveau disponible.', erreur: false }
        : { texte: resultat.message, erreur: true }
    );
  }
}
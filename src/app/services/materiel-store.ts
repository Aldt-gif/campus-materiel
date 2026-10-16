import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CATEGORIES,
  EQUIPEMENTS_INITIAUX,
  RESERVATIONS_INITIALES,
  Equipement,
  Reservation
} from '../data/donnees-initiales';
import { AuthService } from './auth';
import { StockageService } from './stockage';

const CLE_EQUIPEMENTS = 'campus-equipements';
const CLE_RESERVATIONS = 'campus-reservations';

// Résultat d'une opération : réussie, ou refusée avec un message à afficher
export type Resultat = { ok: true } | { ok: false; message: string };

// Les informations saisies dans le formulaire (l'identifiant est généré par le service)
export type DonneesEquipement = Omit<Equipement, 'id'>;

function refus(message: string): Resultat {
  return { ok: false, message };
}

// Identifiant unique pour une réservation
function nouvelIdReservation(): string {
  return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

@Injectable({ providedIn: 'root' })
export class MaterielStore {
  private stockage = inject(StockageService);
  private auth = inject(AuthService);

  readonly categories = CATEGORIES;

  // État partagé : au démarrage, on relit le stockage ; le jeu initial sert seulement s'il n'y a rien
  private readonly _equipements = signal<Equipement[]>(this.charger(CLE_EQUIPEMENTS, EQUIPEMENTS_INITIAUX));
  private readonly _reservations = signal<Reservation[]>(this.charger(CLE_RESERVATIONS, RESERVATIONS_INITIALES));

  // Versions en lecture seule pour les pages : seul le service modifie les données
  readonly equipements = this._equipements.asReadonly();
  readonly reservations = this._reservations.asReadonly();

  // Réservations de l'étudiant connecté uniquement
  readonly mesReservations = computed(() => {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return [];
    }
    return this._reservations().filter(r => r.etudiantId === utilisateur.id);
  });

  // Identifiants des équipements réservés. La disponibilité est CALCULÉE à partir d'ici
  private readonly idsReserves = computed(() => new Set(this._reservations().map(r => r.equipementId)));

  trouver(id: number): Equipement | undefined {
    return this._equipements().find(e => e.id === id);
  }

  estDisponible(id: number): boolean {
    return !this.idsReserves().has(id);
  }

  reservationDe(equipementId: number): Reservation | undefined {
    return this._reservations().find(r => r.equipementId === equipementId);
  }

  // Trajet d'une réservation : contrôle du profil, de l'existence, de la disponibilité,
  // puis mise à jour de l'état, puis sauvegarde. Les pages se mettent à jour toutes seules.
  reserver(equipementId: number): Resultat {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur || utilisateur.role !== 'student') {
      return refus('Seuls les étudiants connectés peuvent réserver.');
    }
    const equipement = this.trouver(equipementId);
    if (!equipement) {
      return refus("Cet équipement n'existe pas.");
    }
    if (!this.estDisponible(equipementId)) {
      return refus(`« ${equipement.nom} » est déjà réservé.`);
    }
    const reservation: Reservation = {
      id: nouvelIdReservation(),
      equipementId,
      etudiantId: utilisateur.id
    };
    this._reservations.update(liste => [...liste, reservation]);
    this.sauver(CLE_RESERVATIONS, this._reservations());
    return { ok: true };
  }

  // Annuler = retirer la réservation. L'équipement redevient disponible immédiatement.
  annuler(reservationId: string): Resultat {
    const utilisateur = this.auth.utilisateur();
    const reservation = this._reservations().find(r => r.id === reservationId);
    if (!reservation) {
      return refus("Cette réservation n'existe pas.");
    }
    if (!utilisateur || reservation.etudiantId !== utilisateur.id) {
      return refus('Vous ne pouvez annuler que vos propres réservations.');
    }
    this._reservations.update(liste => liste.filter(r => r.id !== reservationId));
    this.sauver(CLE_RESERVATIONS, this._reservations());
    return { ok: true };
  }

  // Création d'un équipement (utilisée à l'étape de gestion). Renvoie son identifiant.
  creer(donnees: DonneesEquipement): number {
    const id = Math.max(0, ...this._equipements().map(e => e.id)) + 1;
    this._equipements.update(liste => [...liste, { id, ...this.nettoyer(donnees) }]);
    this.sauver(CLE_EQUIPEMENTS, this._equipements());
    return id;
  }

  // Modification d'un équipement (étape de gestion)
  modifier(id: number, donnees: DonneesEquipement): Resultat {
    if (!this.trouver(id)) {
      return refus("Cet équipement n'existe plus.");
    }
    this._equipements.update(liste =>
      liste.map(e => (e.id === id ? { id, ...this.nettoyer(donnees) } : e))
    );
    this.sauver(CLE_EQUIPEMENTS, this._equipements());
    return { ok: true };
  }

  // Suppression d'un équipement (étape de gestion) : refusée s'il est réservé
  supprimer(id: number): Resultat {
    const equipement = this.trouver(id);
    if (!equipement) {
      return refus("Cet équipement n'existe plus.");
    }
    if (!this.estDisponible(id)) {
      return refus(
        `Suppression impossible : « ${equipement.nom} » est actuellement réservé. ` +
        `Il pourra être supprimé après l'annulation de la réservation.`
      );
    }
    this._equipements.update(liste => liste.filter(e => e.id !== id));
    this.sauver(CLE_EQUIPEMENTS, this._equipements());
    return { ok: true };
  }

  // Relit une liste enregistrée ; copie du jeu initial seulement si rien n'est enregistré.
  // Un tableau vide enregistré est une donnée valide (ce n'est pas une absence de stockage).
  private charger<T>(cle: string, initial: T[]): T[] {
    const lu = this.stockage.lire<T[]>(cle);
    return Array.isArray(lu) ? lu : structuredClone(initial);
  }

  private sauver(cle: string, valeur: unknown): void {
    this.stockage.ecrire(cle, valeur);
  }

  // Retire les espaces inutiles au début et à la fin des textes saisis
  private nettoyer(d: DonneesEquipement): DonneesEquipement {
    return {
      nom: d.nom.trim(),
      categorie: d.categorie,
      description: d.description.trim(),
      localisation: d.localisation.trim()
    };
  }
}
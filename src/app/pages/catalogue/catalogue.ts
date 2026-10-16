import { Component, computed, inject, signal } from '@angular/core';
import { CarteEquipement } from '../../components/carte-equipement/carte-equipement';
import { AuthService } from '../../services/auth';
import { MaterielStore } from '../../services/materiel-store';

// Minuscules et sans accents : « Vidéo » est retrouvé en tapant « video »
function normaliser(texte: string): string {
  return texte.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

@Component({
  selector: 'app-catalogue',
  imports: [CarteEquipement],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue {
  protected readonly store = inject(MaterielStore);
  protected readonly auth = inject(AuthService);

  protected readonly recherche = signal('');
  protected readonly categorie = signal('');
  protected readonly message = signal<{ texte: string; erreur: boolean } | null>(null);

  // Liste filtrée : recalculée automatiquement quand la recherche, le filtre ou les données changent
  protected readonly resultats = computed(() => {
    const texte = normaliser(this.recherche());
    const categorie = this.categorie();
    return this.store.equipements().filter(
      e => normaliser(e.nom).includes(texte) && (categorie === '' || e.categorie === categorie)
    );
  });

  protected surRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  protected surCategorie(event: Event): void {
    this.categorie.set((event.target as HTMLSelectElement).value);
  }

  protected reinitialiser(): void {
    this.recherche.set('');
    this.categorie.set('');
  }

  // Appelée quand une carte envoie sa demande de réservation
  protected reserver(id: number): void {
    const resultat = this.store.reserver(id);
    const nom = this.store.trouver(id)?.nom ?? 'équipement';
    this.message.set(
      resultat.ok
        ? { texte: `« ${nom} » est réservé.`, erreur: false }
        : { texte: resultat.message, erreur: true }
    );
  }
}
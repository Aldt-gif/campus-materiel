import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StockageService {
  // Message d'erreur affiché à l'écran quand le stockage local échoue (null = tout va bien)
  readonly erreur = signal<string | null>(null);

  // Lit une valeur enregistrée sous une clé. Renvoie undefined s'il n'y a rien ou en cas d'échec.
  lire<T>(cle: string): T | undefined {
    try {
      const texte = localStorage.getItem(cle); // le stockage ne contient que du texte
      if (texte === null) {
        return undefined; // aucune donnée enregistrée : on utilisera le jeu initial
      }
      return JSON.parse(texte) as T; // retransforme le texte en tableau, nombre, etc.
    } catch {
      this.erreur.set('Lecture du stockage local impossible : les données de démonstration sont utilisées.');
      return undefined;
    }
  }

  // Enregistre une valeur sous une clé.
  ecrire(cle: string, valeur: unknown): void {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur)); // transforme la valeur en texte
    } catch {
      this.erreur.set('Enregistrement impossible : vos modifications seront perdues au rechargement de la page.');
    }
  }

  // Supprime une clé (utilisé à la déconnexion).
  supprimer(cle: string): void {
    try {
      localStorage.removeItem(cle);
    } catch {
      this.erreur.set('Suppression impossible dans le stockage local.');
    }
  }
}
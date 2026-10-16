import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './auth';
import { MaterielStore } from './materiel-store';
import { StockageService } from './stockage';

// Les bruitages disponibles
export type Effet =
  | 'tick'
  | 'reserver'
  | 'annuler'
  | 'connexion'
  | 'deconnexion'
  | 'creer'
  | 'supprimer'
  | 'chute'
  | 'rebond';

// De quel côté la boule est tombée de la ligne
export type Cote = 'gauche' | 'droite';

// Une note = fréquence (Hz), moment de départ et durée (secondes), forme d'onde
interface Note {
  frequence: number;
  debut: number;
  duree: number;
  forme: OscillatorType;
  force?: number;
}

// Les petites mélodies de chaque effet
const MELODIES: Record<Effet, Note[]> = {
  tick: [{ frequence: 1200, debut: 0, duree: 0.04, forme: 'square', force: 0.08 }],
  reserver: [
    { frequence: 523.25, debut: 0, duree: 0.12, forme: 'square' },
    { frequence: 659.25, debut: 0.09, duree: 0.12, forme: 'square' },
    { frequence: 783.99, debut: 0.18, duree: 0.22, forme: 'square' }
  ],
  annuler: [
    { frequence: 392, debut: 0, duree: 0.12, forme: 'triangle' },
    { frequence: 329.63, debut: 0.1, duree: 0.12, forme: 'triangle' },
    { frequence: 261.63, debut: 0.2, duree: 0.25, forme: 'triangle' }
  ],
  connexion: [
    { frequence: 659.25, debut: 0, duree: 0.1, forme: 'square' },
    { frequence: 880, debut: 0.09, duree: 0.22, forme: 'square' }
  ],
  deconnexion: [
    { frequence: 440, debut: 0, duree: 0.12, forme: 'triangle' },
    { frequence: 329.63, debut: 0.1, duree: 0.25, forme: 'triangle' }
  ],
  creer: [
    { frequence: 880, debut: 0, duree: 0.1, forme: 'sine' },
    { frequence: 1174.66, debut: 0.08, duree: 0.2, forme: 'sine' }
  ],
  supprimer: [
    { frequence: 196, debut: 0, duree: 0.15, forme: 'sawtooth' },
    { frequence: 98, debut: 0.12, duree: 0.3, forme: 'sawtooth' }
  ],
  // Bruit sourd quand la boule rebondit sur le sol ou un mur
  rebond: [{ frequence: 260, debut: 0, duree: 0.07, forme: 'sine', force: 0.18 }],
  // « Boing » puis trombone triste qui descend
  chute: [
    { frequence: 880, debut: 0, duree: 0.07, forme: 'sine' },
    { frequence: 620, debut: 0.06, duree: 0.09, forme: 'sine' },
    { frequence: 392, debut: 0.45, duree: 0.25, forme: 'sawtooth', force: 0.12 },
    { frequence: 370, debut: 0.7, duree: 0.25, forme: 'sawtooth', force: 0.12 },
    { frequence: 349.23, debut: 0.95, duree: 0.25, forme: 'sawtooth', force: 0.12 },
    { frequence: 329.63, debut: 1.2, duree: 0.7, forme: 'sawtooth', force: 0.12 }
  ]
};

// Valeurs absurdes affichées quand la boule est tombée (courtes pour tenir dans l'en-tête)
const ABSURDES: Record<Cote, string[]> = {
  gauche: ['-37 %', '-∞', 'NaN %', '-273 °C', 'son perdu', '< silence', 'moins que 0', 'abysses'],
  droite: ['142 %', '∞ %', '9001 !', 'mur du son', '11 / 10', 'en orbite', 'x 1 000 000', 'TROP FORT']
};

const CLE_VOLUME = 'campus-volume';

// Même tombée, la puissance réelle reste plafonnée (sécurité pour les casques)
const NIVEAU_CHUTE = 0.7;

@Injectable({ providedIn: 'root' })
export class SonService {
  private readonly stockage = inject(StockageService);
  private readonly store = inject(MaterielStore);
  private readonly auth = inject(AuthService);

  // Réglage normal : 0 à 100, sauvegardé (muet si rien n'est enregistré)
  private readonly _volume = signal(this.volumeInitial());
  readonly volume = this._volume.asReadonly();

  // Réglage cassé : la boule est tombée à gauche ou à droite (jamais sauvegardé)
  private readonly _chute = signal<Cote | null>(null);
  readonly chute = this._chute.asReadonly();
  private readonly _valeurAbsurde = signal<string | null>(null);
  readonly valeurAbsurde = this._valeurAbsurde.asReadonly();

  // Vrai pendant qu'un son joue (sert à animer l'interface)
  readonly joue = signal(false);

  private contexte: AudioContext | null = null;
  private volumeAvantMuet = 50;
  private dernierTick = 0;
  private minuteur: ReturnType<typeof setInterval> | null = null;
  private precedent: { reservations: number; equipements: number; utilisateur: number | null } | null = null;

  constructor() {
    // L'effect se relance dès qu'un des signaux lus change : le son suit l'état de l'appli
    effect(() => {
      const reservations = this.store.reservations().length;
      const equipements = this.store.equipements().length;
      const utilisateur = this.auth.utilisateur()?.id ?? null;
      untracked(() => this.reagir(reservations, equipements, utilisateur));
    });
  }

  // Choisit le bruitage selon ce qui a changé depuis la dernière fois
  private reagir(reservations: number, equipements: number, utilisateur: number | null): void {
    const avant = this.precedent;
    this.precedent = { reservations, equipements, utilisateur };
    if (!avant) {
      return; // premier passage (chargement de la page) : silence
    }
    if (utilisateur !== avant.utilisateur) {
      this.jouer(utilisateur === null ? 'deconnexion' : 'connexion');
    } else if (reservations > avant.reservations) {
      this.jouer('reserver');
    } else if (reservations < avant.reservations) {
      this.jouer('annuler');
    } else if (equipements > avant.equipements) {
      this.jouer('creer');
    } else if (equipements < avant.equipements) {
      this.jouer('supprimer');
    }
  }

  // Règle le volume (0 à 100), le sauvegarde et fait entendre un « tick » de contrôle
  regler(valeur: number): void {
    const v = Math.max(0, Math.min(100, Math.round(valeur)));
    if (v === this._volume()) {
      return;
    }
    this._volume.set(v);
    this.stockage.ecrire(CLE_VOLUME, v);
    const maintenant = Date.now();
    if (v > 0 && maintenant - this.dernierTick > 70) {
      this.dernierTick = maintenant;
      this.jouer('tick');
    }
  }

  // Coupe le son, ou le remet au niveau d'avant
  basculerMuet(): void {
    if (this._volume() > 0) {
      this.volumeAvantMuet = this._volume();
      this.regler(0);
    } else {
      this.regler(this.volumeAvantMuet);
    }
  }

  // La boule tombe : affichage absurde qui change toutes les 2 secondes, et sons déformés
  faireTomber(cote: Cote): void {
    this.arreterMinuteur();
    this._chute.set(cote);
    this._valeurAbsurde.set(this.tirer(cote));
    this.jouer('chute');
    this.minuteur = setInterval(() => this._valeurAbsurde.set(this.tirer(cote)), 2200);
  }

  // On remet la boule sur la ligne : retour au réglage normal
  remettre(): void {
    this.arreterMinuteur();
    this._chute.set(null);
    this._valeurAbsurde.set(null);
    this.jouer('tick');
  }

  private arreterMinuteur(): void {
    if (this.minuteur !== null) {
      clearInterval(this.minuteur);
      this.minuteur = null;
    }
  }

  // Tire une valeur absurde au hasard, différente de celle affichée
  private tirer(cote: Cote): string {
    const actuelle = this._valeurAbsurde();
    const choix = ABSURDES[cote].filter(valeur => valeur !== actuelle);
    return choix[Math.floor(Math.random() * choix.length)];
  }

  // Joue un bruitage avec le synthétiseur du navigateur (Web Audio API)
  jouer(effet: Effet): void {
    const chute = this._chute();
    const niveau = chute ? NIVEAU_CHUTE : this._volume() / 100;
    if (niveau === 0) {
      return;
    }
    // Boule tombée à gauche : graves, lent, étouffé. Tombée à droite : aigus, rapide, grésillant.
    const hauteur = chute === 'gauche' ? 0.5 : chute === 'droite' ? 2.2 : 1;
    const lenteur = chute === 'gauche' ? 1.8 : chute === 'droite' ? 0.55 : 1;
    try {
      const ctx = this.obtenirContexte();
      let sortie: AudioNode = ctx.destination;
      if (chute === 'gauche') {
        const filtre = ctx.createBiquadFilter();
        filtre.type = 'lowpass';
        filtre.frequency.value = 500; // effet « sous l'eau »
        filtre.connect(ctx.destination);
        sortie = filtre;
      }
      let finMax = 0;
      for (const note of MELODIES[effet]) {
        const debut = note.debut * lenteur;
        const duree = note.duree * lenteur;
        const t0 = ctx.currentTime + debut;
        const oscillateur = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillateur.type = chute === 'droite' ? 'sawtooth' : note.forme;
        oscillateur.frequency.setValueAtTime(note.frequence * hauteur, t0);
        // Enveloppe : montée très rapide puis extinction progressive (évite les « clics »)
        const pic = Math.max(0.0001, (note.force ?? 0.2) * niveau * niveau);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(pic, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
        oscillateur.connect(gain).connect(sortie);
        oscillateur.start(t0);
        oscillateur.stop(t0 + duree + 0.02);
        finMax = Math.max(finMax, debut + duree);
      }
      this.joue.set(true);
      setTimeout(() => this.joue.set(false), finMax * 1000);
    } catch {
      // Pas de son possible (navigateur ancien, audio bloqué) : l'appli continue sans bruit
    }
  }

  // Crée le contexte audio à la demande (les navigateurs exigent un geste de l'utilisateur avant)
  private obtenirContexte(): AudioContext {
    this.contexte ??= new AudioContext();
    if (this.contexte.state === 'suspended') {
      void this.contexte.resume();
    }
    return this.contexte;
  }

  private volumeInitial(): number {
    const enregistre = this.stockage.lire<number>(CLE_VOLUME);
    return typeof enregistre === 'number' && enregistre >= 0 && enregistre <= 100 ? Math.round(enregistre) : 0;
  }
}

import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { SonService } from '../../services/son';

// Au-delà du bout de la ligne, la boule tombe quand on la tire de plus de 18 % (≈ sa largeur)
const SEUIL_CHUTE = 18;

// Réglages de la physique (en pixels et en secondes)
const RAYON = 13; // rayon de la boule tombée
const GRAVITE = 2200; // accélération vers le bas
const REBOND = 0.62; // part de la vitesse conservée à chaque rebond
const VITESSE_MAX = 3200; // vitesse maximale d'un lancer

@Component({
  selector: 'app-bouton-volume',
  templateUrl: './bouton-volume.html',
  styleUrl: './bouton-volume.css',
  host: { '(window:resize)': 'redimensionner()' },
})
export class BoutonVolume {
  protected readonly son = inject(SonService);
  protected readonly seuil = SEUIL_CHUTE;
  protected readonly rayon = RAYON;

  // La ligne sur laquelle glisse la boule (sert à convertir un clic en pourcentage)
  private readonly piste = viewChild.required<ElementRef<HTMLElement>>('piste');

  // Position brute de la boule pendant qu'on la tire sur la ligne (peut sortir de 0 à 100)
  protected readonly balle = signal<number | null>(null);
  protected readonly position = computed(() => this.balle() ?? this.son.volume());

  // La boule dépasse un bout de la ligne : elle tremble et le bout devient rouge
  protected readonly danger = computed(() => {
    const p = this.position();
    return p < 0 ? 'gauche' : p > 100 ? 'droite' : null;
  });

  // ----- Boule tombée : position (centre, en pixels de la fenêtre), rotation, geste en cours -----
  protected readonly x = signal(0);
  protected readonly y = signal(0);
  protected readonly angle = signal(0);
  protected readonly saisie = signal(false); // on tient la boule
  protected readonly surLigne = signal(false); // la boule tenue est au-dessus de la ligne

  private vx = 0;
  private vy = 0;
  private raf: number | null = null;
  private dernierPas = 0;
  private dernierRebond = 0;
  private decalageBalleX = 0;
  private decalageBalleY = 0;
  private echantillons: { x: number; y: number; t: number }[] = [];

  protected readonly icone = computed(() => {
    const chute = this.son.chute();
    if (chute === 'gauche') return '🥶';
    if (chute === 'droite') return '🤯';
    const v = this.son.volume();
    if (v === 0) return '🔇';
    if (v < 34) return '🔈';
    if (v < 67) return '🔉';
    return '🔊';
  });

  protected readonly affichage = computed(() => {
    if (this.son.chute()) return this.son.valeurAbsurde() ?? '';
    const v = this.son.volume();
    if (v === 0) return 'MUET';
    if (v === 100) return 'À FOND !';
    return `${v} %`;
  });

  // Texte lu par les lecteurs d'écran (on n'annonce jamais les valeurs absurdes)
  protected readonly libelle = computed(() => {
    if (this.son.chute()) return 'Réglage cassé : la boule est tombée. Entrée pour la remettre.';
    const v = this.son.volume();
    if (v === 0) return 'Son coupé';
    if (v === 100) return 'Volume à fond';
    return `Volume ${v} pour cent`;
  });

  protected readonly statut = computed(() =>
    this.son.chute() ? 'La boule est tombée : le réglage du son est devenu absurde.' : ''
  );

  // Mémoire du geste en cours sur la ligne
  private decalage = 0;
  private enGlisse = false;

  constructor() {
    // Dès que la boule est remise (bouton, clavier ou dépôt), on arrête la simulation
    effect(() => {
      if (this.son.chute() === null) {
        untracked(() => this.arreter());
      }
    });
    inject(DestroyRef).onDestroy(() => this.arreter());
  }

  // ===================== Boule sur la ligne =====================

  // Convertit une position de souris ou de doigt en pourcentage de la ligne (0 = bout gauche)
  private pourcentage(clientX: number): number {
    const zone = this.piste().nativeElement.getBoundingClientRect();
    return ((clientX - zone.left) / zone.width) * 100;
  }

  protected enfoncer(e: PointerEvent): void {
    if (this.son.chute()) {
      return; // la boule est tombée : on la ramasse directement
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = this.pourcentage(e.clientX);
    const surLaBalle = Math.abs(p - this.son.volume()) < 12;
    // Si on attrape la boule, on garde l'écart pour qu'elle ne saute pas sous le doigt
    this.decalage = surLaBalle ? p - this.son.volume() : 0;
    this.enGlisse = true;
    if (!surLaBalle) {
      this.son.regler(Math.max(0, Math.min(100, p))); // clic sur la ligne : la boule y saute
    }
    this.balle.set(this.son.volume());
  }

  protected glisser(e: PointerEvent): void {
    if (!this.enGlisse) {
      return;
    }
    const brut = this.pourcentage(e.clientX) - this.decalage;
    if (brut < -SEUIL_CHUTE) {
      this.tomber('gauche', e);
    } else if (brut > 100 + SEUIL_CHUTE) {
      this.tomber('droite', e);
    } else {
      this.balle.set(brut);
      this.son.regler(Math.max(0, Math.min(100, brut)));
    }
  }

  protected relacher(e: PointerEvent): void {
    this.enGlisse = false;
    this.balle.set(null); // si elle dépassait un peu, la boule revient au bout de la ligne
    this.liberer(e);
  }

  // La boule quitte la ligne : elle devient un objet physique, avec un petit saut vers l'extérieur
  private tomber(cote: 'gauche' | 'droite', e: PointerEvent): void {
    this.enGlisse = false;
    this.balle.set(null);
    this.liberer(e);
    const ligne = this.piste().nativeElement.getBoundingClientRect();
    const pourcent = cote === 'gauche' ? -SEUIL_CHUTE : 100 + SEUIL_CHUTE;
    const centreY = ligne.top + ligne.height / 2;
    this.x.set(ligne.left + (ligne.width * pourcent) / 100);
    this.angle.set(0);
    if (this.mouvementReduit()) {
      // Sans animation : la boule est posée juste sous la ligne
      this.y.set(Math.min(window.innerHeight - RAYON, centreY + 56));
      this.vx = 0;
      this.vy = 0;
    } else {
      this.y.set(centreY);
      this.vx = cote === 'gauche' ? -240 : 240;
      this.vy = -260;
    }
    this.son.faireTomber(cote);
    this.demarrer();
  }

  private liberer(e: PointerEvent): void {
    const zone = e.currentTarget as HTMLElement;
    if (zone.hasPointerCapture(e.pointerId)) {
      zone.releasePointerCapture(e.pointerId);
    }
  }

  protected molette(e: WheelEvent): void {
    if (this.son.chute()) {
      return;
    }
    e.preventDefault();
    this.son.regler(this.son.volume() + (e.deltaY < 0 ? 5 : -5));
  }

  // Clavier : les flèches s'arrêtent aux bouts de la ligne (on ne tombe qu'à la souris ou au doigt)
  protected clavier(e: KeyboardEvent): void {
    if (this.son.chute()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        this.son.remettre();
      }
      return;
    }
    const v = this.son.volume();
    const actions: Record<string, () => void> = {
      ArrowUp: () => this.son.regler(v + 5),
      ArrowRight: () => this.son.regler(v + 5),
      ArrowDown: () => this.son.regler(v - 5),
      ArrowLeft: () => this.son.regler(v - 5),
      PageUp: () => this.son.regler(v + 10),
      PageDown: () => this.son.regler(v - 10),
      Home: () => this.son.regler(0),
      End: () => this.son.regler(100),
      Enter: () => this.son.basculerMuet(),
      ' ': () => this.son.basculerMuet()
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  // ===================== Boule tombée : saisie, lancer, dépôt =====================

  // On attrape la boule : la physique est mise en pause, la boule suit le doigt
  protected attraper(e: PointerEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.saisie.set(true);
    this.decalageBalleX = e.clientX - this.x();
    this.decalageBalleY = e.clientY - this.y();
    this.vx = 0;
    this.vy = 0;
    this.echantillons = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
  }

  protected deplacerBalle(e: PointerEvent): void {
    if (!this.saisie()) {
      return;
    }
    const largeur = document.documentElement.clientWidth;
    const hauteur = window.innerHeight;
    this.x.set(Math.max(RAYON, Math.min(largeur - RAYON, e.clientX - this.decalageBalleX)));
    this.y.set(Math.max(RAYON, Math.min(hauteur - RAYON, e.clientY - this.decalageBalleY)));
    this.surLigne.set(this.estSurLaLigne());
    // On garde les positions des 100 dernières millisecondes pour calculer la vitesse du lancer
    const maintenant = performance.now();
    this.echantillons.push({ x: e.clientX, y: e.clientY, t: maintenant });
    while (this.echantillons.length > 1 && maintenant - this.echantillons[0].t > 100) {
      this.echantillons.shift();
    }
  }

  // On lâche la boule : posée sur la ligne elle règle le volume, sinon elle est lancée
  protected lacher(e: PointerEvent): void {
    if (!this.saisie()) {
      return;
    }
    const element = e.currentTarget as HTMLElement;
    if (element.hasPointerCapture(e.pointerId)) {
      element.releasePointerCapture(e.pointerId);
    }
    this.saisie.set(false);

    if (this.estSurLaLigne()) {
      // Dépôt sur la ligne : le réglage redevient normal, au point où on a lâché la boule
      const pourcent = Math.max(0, Math.min(100, this.pourcentage(this.x())));
      this.surLigne.set(false);
      this.son.remettre();
      this.son.regler(pourcent);
      return;
    }
    this.surLigne.set(false);
    this.calculerVitesse();
    this.demarrer();
  }

  private estSurLaLigne(): boolean {
    const ligne = this.piste().nativeElement.getBoundingClientRect();
    const centreY = ligne.top + ligne.height / 2;
    return Math.abs(this.y() - centreY) < 28 && this.x() > ligne.left - 16 && this.x() < ligne.right + 16;
  }

  // Vitesse du lancer = distance parcourue pendant les dernières millisecondes du geste
  private calculerVitesse(): void {
    const premier = this.echantillons[0];
    const dernier = this.echantillons[this.echantillons.length - 1];
    this.vx = 0;
    this.vy = 0;
    if (!premier || !dernier || this.mouvementReduit()) {
      return;
    }
    const duree = (dernier.t - premier.t) / 1000;
    if (duree < 0.01 || performance.now() - dernier.t > 80) {
      return; // la main était immobile : la boule est simplement lâchée
    }
    let vitesseX = (dernier.x - premier.x) / duree;
    let vitesseY = (dernier.y - premier.y) / duree;
    const norme = Math.hypot(vitesseX, vitesseY);
    if (norme > VITESSE_MAX) {
      vitesseX = (vitesseX / norme) * VITESSE_MAX;
      vitesseY = (vitesseY / norme) * VITESSE_MAX;
    }
    this.vx = vitesseX;
    this.vy = vitesseY;
  }

  // ===================== Physique =====================

  private mouvementReduit(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Lance la boucle d'animation (une image environ toutes les 16 ms)
  private demarrer(): void {
    if (this.raf !== null || this.mouvementReduit()) {
      return;
    }
    this.dernierPas = performance.now();
    const pas = (maintenant: number): void => {
      const dt = Math.min(0.032, (maintenant - this.dernierPas) / 1000);
      this.dernierPas = maintenant;
      const auRepos = this.avancer(dt);
      this.raf = auRepos ? null : requestAnimationFrame(pas);
    };
    this.raf = requestAnimationFrame(pas);
  }

  private arreter(): void {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.saisie.set(false);
    this.surLigne.set(false);
    this.vx = 0;
    this.vy = 0;
  }

  // Si la fenêtre change de taille, la boule reste dans la fenêtre
  protected redimensionner(): void {
    if (!this.son.chute() || this.saisie()) {
      return;
    }
    this.x.set(Math.min(this.x(), document.documentElement.clientWidth - RAYON));
    this.y.set(Math.min(this.y(), window.innerHeight - RAYON));
    this.demarrer();
  }

  // Un pas de simulation. Renvoie true quand la boule est immobile au sol (ou tenue).
  private avancer(dt: number): boolean {
    if (this.saisie()) {
      return true;
    }
    const largeur = document.documentElement.clientWidth;
    const sol = window.innerHeight - RAYON;
    let x = this.x();
    let y = this.y();
    let impact = 0;

    this.vy += GRAVITE * dt; // la pesanteur tire vers le bas
    this.vx *= Math.exp(-0.2 * dt); // petite résistance de l'air
    x += this.vx * dt;
    y += this.vy * dt;

    if (y >= sol) {
      y = sol;
      if (this.vy > 0) {
        impact = Math.max(impact, this.vy);
        this.vy = -this.vy * REBOND;
        if (Math.abs(this.vy) < 70) {
          this.vy = 0; // les petits rebonds s'arrêtent
        }
      }
      this.vx *= Math.exp(-2.2 * dt); // frottement : la boule roule puis ralentit
    }
    if (y <= RAYON) {
      y = RAYON;
      if (this.vy < 0) {
        impact = Math.max(impact, -this.vy);
        this.vy = -this.vy * REBOND;
      }
    }
    if (x <= RAYON) {
      x = RAYON;
      if (this.vx < 0) {
        impact = Math.max(impact, -this.vx);
        this.vx = -this.vx * REBOND;
      }
    }
    if (x >= largeur - RAYON) {
      x = largeur - RAYON;
      if (this.vx > 0) {
        impact = Math.max(impact, this.vx);
        this.vx = -this.vx * REBOND;
      }
    }

    this.x.set(x);
    this.y.set(y);
    this.angle.update(a => a + ((this.vx * dt) / RAYON) * (180 / Math.PI)); // elle tourne en roulant

    if (impact > 350) {
      this.rebondir();
    }
    const auRepos = y >= sol - 0.5 && Math.abs(this.vx) < 8 && this.vy === 0;
    if (auRepos) {
      this.vx = 0;
    }
    return auRepos;
  }

  // Bruit de rebond, au plus un toutes les 140 ms
  private rebondir(): void {
    const maintenant = performance.now();
    if (maintenant - this.dernierRebond > 140) {
      this.dernierRebond = maintenant;
      this.son.jouer('rebond');
    }
  }
}

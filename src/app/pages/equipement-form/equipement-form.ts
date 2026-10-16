import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES, Categorie } from '../../data/donnees-initiales';
import { DonneesEquipement, MaterielStore } from '../../services/materiel-store';

// Texte obligatoire d'une longueur minimale, espaces de début et de fin ignorés
function texteMin(min: number): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    const texte = String(controle.value ?? '').trim();
    if (texte.length === 0) {
      return { requis: true };
    }
    if (texte.length < min) {
      return { tropCourt: { min, actuel: texte.length } };
    }
    return null;
  };
}

// La catégorie doit être l'une de celles de la liste
const categorieValide: ValidatorFn = (controle: AbstractControl): ValidationErrors | null =>
  (CATEGORIES as string[]).includes(controle.value) ? null : { requis: true };

// Messages affichés pour chaque champ et chaque type d'erreur
const MESSAGES: Record<string, Record<string, string>> = {
  nom: {
    requis: 'Le nom est obligatoire.',
    tropCourt: 'Le nom doit contenir au moins 3 caractères.'
  },
  categorie: {
    requis: 'Choisissez une catégorie.'
  },
  description: {
    requis: 'La description est obligatoire.',
    tropCourt: 'La description doit contenir au moins 10 caractères.'
  },
  localisation: {
    requis: 'La localisation est obligatoire.'
  }
};

@Component({
  selector: 'app-equipement-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './equipement-form.html',
  styleUrl: './equipement-form.css',
})
export class EquipementForm implements OnInit {
  private store = inject(MaterielStore);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);

  // Présent dans l'adresse /gestion/:id/modifier, absent dans /gestion/nouveau
  readonly id = input<string>();

  protected readonly categories = CATEGORIES;
  protected readonly modification = computed(() => this.id() !== undefined);
  protected readonly introuvable = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly formulaire = this.fb.group({
    nom: ['', [texteMin(3)]],
    categorie: ['', [categorieValide]],
    description: ['', [texteMin(10)]],
    localisation: ['', [texteMin(1)]]
  });

  // En modification, on pré-remplit le formulaire avec l'équipement existant
  ngOnInit(): void {
    const id = this.id();
    if (id === undefined) {
      return;
    }
    const equipement = this.store.trouver(Number(id));
    if (!equipement) {
      this.introuvable.set(true);
      return;
    }
    this.formulaire.setValue({
      nom: equipement.nom,
      categorie: equipement.categorie,
      description: equipement.description,
      localisation: equipement.localisation
    });
  }

  // Message d'erreur d'un champ (null tant que le champ est valide ou n'a pas été touché)
  protected messageErreur(champ: string): string | null {
    const controle = this.formulaire.get(champ);
    if (!controle || !controle.invalid || !(controle.touched || controle.dirty)) {
      return null;
    }
    const type = Object.keys(controle.errors ?? {})[0];
    return MESSAGES[champ]?.[type] ?? 'Valeur invalide.';
  }

  protected enregistrer(): void {
    this.erreur.set(null);

    if (this.formulaire.invalid) {
      // Affiche tous les messages d'erreur ; les valeurs saisies sont conservées
      this.formulaire.markAllAsTouched();
      this.erreur.set('Le formulaire contient des erreurs : corrigez les champs signalés.');
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    const donnees: DonneesEquipement = {
      nom: valeurs.nom,
      categorie: valeurs.categorie as Categorie,
      description: valeurs.description,
      localisation: valeurs.localisation
    };

    if (this.modification()) {
      const resultat = this.store.modifier(Number(this.id()), donnees);
      if (!resultat.ok) {
        this.erreur.set(resultat.message);
        return;
      }
    } else {
      this.store.creer(donnees);
    }
    this.router.navigate(['/gestion']);
  }
}
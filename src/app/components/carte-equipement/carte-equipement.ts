import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Equipement } from '../../data/donnees-initiales';

@Component({
  selector: 'app-carte-equipement',
  imports: [RouterLink],
  templateUrl: './carte-equipement.html',
  styleUrl: './carte-equipement.css',
})
export class CarteEquipement {
  // Données reçues du parent
  readonly equipement = input.required<Equipement>();
  readonly disponible = input.required<boolean>();
  readonly peutReserver = input(false);

  // Intention envoyée au parent : « je veux réserver cet équipement » (on transmet son identifiant)
  readonly reserver = output<number>();
}
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly auth = inject(AuthService); // protected : le HTML peut l'utiliser
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Appelée au clic sur un compte
  choisir(compteId: number): void {
    if (!this.auth.connecter(compteId)) {
      return;
    }
    // Adresse demandée avant la connexion (ajoutée plus tard par les guards, paramètre ?retour=)
    const retour = this.route.snapshot.queryParamMap.get('retour');
    // On n'accepte qu'une adresse interne : elle commence par un seul "/" (pas "//" ni "http")
    const interne = retour !== null && retour.startsWith('/') && !retour.startsWith('//');
    this.router.navigateByUrl(interne ? retour : '/catalogue');
  }
}
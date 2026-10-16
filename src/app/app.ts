import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth';
import { StockageService } from './services/stockage';
import { BoutonVolume } from './components/bouton-volume/bouton-volume';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BoutonVolume],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly stockage = inject(StockageService);
  private router = inject(Router);

  // Déconnexion : on vide la session, puis on ferme l'accès en revenant à la connexion
  deconnecter(): void {
    this.auth.deconnecter();
    this.router.navigate(['/login']);
  }
}
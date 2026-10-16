import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-acces-refuse',
  imports: [RouterLink],
  templateUrl: './acces-refuse.html',
  styleUrl: './acces-refuse.css',
})
export class AccesRefuse {
  protected readonly auth = inject(AuthService);
}
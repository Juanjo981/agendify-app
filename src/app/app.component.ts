import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Verifica el token al iniciar la app.
    // Si el token es válido refresca el usuario; si es inválido limpia la sesión.
    this.authService.restoreSession();
  }
}

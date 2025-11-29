import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(usuario: string, contrasena: string): Promise<any> {
    return this.http
      .post(`${this.baseUrl}/login`, { usuario, contrasena })
      .toPromise()
      .then((response: any) => {
        // Guarda todo el objeto del usuario
        localStorage.setItem('usuario', JSON.stringify(response));
        return response;
      });
  }

  logout(): void {
    localStorage.removeItem('usuario');
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('usuario') !== null;
  }

  getUsuario(): any {
    const data = localStorage.getItem('usuario');
    return data ? JSON.parse(data) : null;
  }

  getNombre(): string {
    const user = this.getUsuario();
    return user?.nombre || '';
  }
}

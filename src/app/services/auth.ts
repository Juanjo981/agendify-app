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
        // Guardar token o usuario si es necesario
        localStorage.setItem('usuario', JSON.stringify(response));
        return response;
      });
  }

  logout() {
    localStorage.removeItem('usuario');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('usuario');
  }
}

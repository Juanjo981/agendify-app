import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}/usuario`; // Asegúrate que coincida con tu backend

  constructor(private http: HttpClient) {}

  registrarUsuario(usuario: any) {
    return this.http.post(`${this.apiUrl}/crear`, usuario);
  }
}

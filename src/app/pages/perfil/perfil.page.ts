import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage {
  perfil = {
    nombre: 'Juan José',
    email: 'juan@correo.com',
    usuario: 'juanjo',
    telefono: '555-123-4567',
    domicilio: 'Calle Falsa 123',
    especialidad: 'Psicólogo',
    idioma: 'es',
    zonaHoraria: 'GMT-6',
    notificacionEmail: true,
    notificacionSMS: false,
  };

  passwordActual = '';
  nuevaPassword = '';
  confirmarPassword = '';

  editarPersonal = false;
  editarPreferencias = false;
  editarSeguridad = false;
  editarNotificaciones = false;

  guardarCambios() {
    console.log('Cambios guardados:', this.perfil);
    this.editarPersonal = false;
    this.editarPreferencias = false;
    this.editarSeguridad = false;
    this.editarNotificaciones = false;
  }

  toggleEditar(seccion: string) {
    switch (seccion) {
      case 'personal':
        this.editarPersonal = !this.editarPersonal;
        break;
      case 'preferencias':
        this.editarPreferencias = !this.editarPreferencias;
        break;
      case 'seguridad':
        this.editarSeguridad = !this.editarSeguridad;
        break;
      case 'notificaciones':
        this.editarNotificaciones = !this.editarNotificaciones;
        break;
    }
  }
}

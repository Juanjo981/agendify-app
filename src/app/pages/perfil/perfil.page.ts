import { Component, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  avatarUrl: string | null = null;

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

  perfilProfesional = {
    consultorio: 'Consultorio Psicológico Integral',
    direccion: 'Av. Insurgentes Sur 1234, CDMX',
    telefono: '555-987-6543',
    descripcion: 'Especialista en psicología clínica y terapia cognitivo-conductual con más de 10 años de experiencia.',
  };

  horarios = {
    duracionCita: 60,
    buffer: 10,
    inicio: '09:00',
    fin: '18:00',
  };

  readonly stats = {
    totalPacientes: 48,
    citasMes: 23,
    citasHoy: 4,
  };

  readonly integraciones = [
    { nombre: 'Google Calendar', desc: 'Sincroniza tus citas automáticamente', icon: 'calendar-outline', color: 'linear-gradient(135deg, #4285F4, #34A853)' },
    { nombre: 'WhatsApp Business', desc: 'Envía recordatorios a tus pacientes', icon: 'logo-whatsapp', color: 'linear-gradient(135deg, #25D366, #128C7E)' },
    { nombre: 'Pagos en línea', desc: 'Cobra consultas con tarjeta o transferencia', icon: 'card-outline', color: 'linear-gradient(135deg, #6366f1, #3b3f92)' },
    { nombre: 'Videollamadas', desc: 'Consultas en línea con tus pacientes', icon: 'videocam-outline', color: 'linear-gradient(135deg, #14b8a6, #0d9488)' },
  ];

  passwordActual = '';
  nuevaPassword = '';
  confirmarPassword = '';

  editarPersonal = false;
  editarPreferencias = false;
  editarSeguridad = false;
  editarNotificaciones = false;
  editarProfesional = false;
  editarHorarios = false;

  guardarCambios() {
    console.log('Cambios guardados:', this.perfil, this.perfilProfesional, this.horarios);
    this.editarPersonal = false;
    this.editarPreferencias = false;
    this.editarSeguridad = false;
    this.editarNotificaciones = false;
    this.editarProfesional = false;
    this.editarHorarios = false;
  }

  toggleEditar(seccion: string) {
    switch (seccion) {
      case 'personal':      this.editarPersonal      = !this.editarPersonal;      break;
      case 'preferencias':  this.editarPreferencias  = !this.editarPreferencias;  break;
      case 'seguridad':     this.editarSeguridad     = !this.editarSeguridad;     break;
      case 'notificaciones':this.editarNotificaciones= !this.editarNotificaciones;break;
      case 'profesional':   this.editarProfesional   = !this.editarProfesional;   break;
      case 'horarios':      this.editarHorarios      = !this.editarHorarios;      break;
    }
  }

  triggerAvatarPicker() {
    this.avatarInput.nativeElement.click();
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl);
    this.avatarUrl = URL.createObjectURL(file);
  }
}

import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './soporte.page.html',
  styleUrls: ['./soporte.page.scss'],
})
export class SoportePage {
  readonly appVersion  = '1.0.0';
  readonly buildVersion = '2026.03.11';

  faqs = [
    // ── Citas ─────────────────────────────────────────────────────────────
    {
      pregunta: '¿Cómo crear una cita?',
      respuesta: 'Ve a la sección "Citas" desde el menú lateral y presiona el botón "+ Nueva cita". Selecciona el paciente, la fecha, hora y tipo de consulta.',
      icono: 'calendar-outline',
      abierta: false,
    },
    {
      pregunta: '¿Cómo cancelar o reprogramar una cita?',
      respuesta: 'Abre el detalle de la cita desde la sección "Citas" y usa las opciones "Cancelar" o "Reprogramar". Podrás elegir una nueva fecha y hora sin perder el historial.',
      icono: 'calendar-clear-outline',
      abierta: false,
    },
    {
      pregunta: '¿Cómo cambiar el estado de una cita?',
      respuesta: 'Dentro del detalle de la cita encontrarás el selector de estado: Pendiente, Confirmada, Completada o Cancelada. Cámbialo según el avance de la consulta.',
      icono: 'checkmark-circle-outline',
      abierta: false,
    },
    // ── Pacientes ─────────────────────────────────────────────────────────
    {
      pregunta: '¿Cómo agregar un paciente?',
      respuesta: 'En la sección "Pacientes", usa el botón "+ Agregar paciente". Completa el formulario con nombre, contacto y datos básicos del paciente.',
      icono: 'person-add-outline',
      abierta: false,
    },
    {
      pregunta: '¿Cómo ver el historial de un paciente?',
      respuesta: 'Desde "Pacientes", haz clic en el nombre del paciente para abrir su ficha. Ahí encontrarás todas sus citas, sesiones y notas registradas.',
      icono: 'document-text-outline',
      abierta: false,
    },
    {
      pregunta: '¿Cómo editar los datos de un paciente?',
      respuesta: 'Abre la ficha del paciente y presiona el botón "Editar". Puedes actualizar nombre, teléfono, correo, dirección y notas clínicas.',
      icono: 'create-outline',
      abierta: false,
    },
    // ── Sesiones ──────────────────────────────────────────────────────────
    {
      pregunta: '¿Qué es una sesión y cómo se crea?',
      respuesta: 'Una sesión es el registro de la consulta realizada. Se crea desde el detalle de una cita confirmada, usando el botón "Registrar sesión". Puedes agregar notas, diagnóstico y seguimiento.',
      icono: 'pulse-outline',
      abierta: false,
    },
    // ── Equipo y permisos ─────────────────────────────────────────────────
    {
      pregunta: '¿Cómo vincular un recepcionista?',
      respuesta: 'Desde "Configuración > Equipo de trabajo", copia el código de vinculación y compártelo con tu recepcionista para que pueda unirse al consultorio.',
      icono: 'link-outline',
      abierta: false,
    },
    {
      pregunta: '¿Cómo controlar qué puede hacer un recepcionista?',
      respuesta: 'En "Configuración > Equipo de trabajo", selecciona al recepcionista y ajusta sus permisos: puede tener acceso a citas, pacientes, sesiones, estadísticas y configuración de forma independiente.',
      icono: 'shield-checkmark-outline',
      abierta: false,
    },
    // ── Cuenta y seguridad ────────────────────────────────────────────────
    {
      pregunta: '¿Cómo cambiar mi contraseña?',
      respuesta: 'Ve a "Mi perfil > Seguridad" y usa la opción de cambio de contraseña. Necesitarás ingresar tu contraseña actual para confirmar el cambio.',
      icono: 'lock-closed-outline',
      abierta: false,
    },
    {
      pregunta: '¿Cómo cerrar sesión de forma segura?',
      respuesta: 'Haz clic en tu nombre en la esquina superior derecha y selecciona "Cerrar sesión" al final del menú. Confirma la acción en el diálogo que aparece.',
      icono: 'log-out-outline',
      abierta: false,
    },
  ];

  toggleFaq(index: number) {
    this.faqs[index].abierta = !this.faqs[index].abierta;
  }

  enviarCorreo() {
    window.location.href = 'mailto:soporte@agendify.app';
  }
}

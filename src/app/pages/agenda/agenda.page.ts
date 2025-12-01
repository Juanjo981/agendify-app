import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-agenda', templateUrl: './agenda.page.html', imports: [IonicModule], styleUrls: ['./agenda.page.scss'],
})
export class AgendaPage {
  nombreUsuario = 'Juanjo';
  today: string = new Date().toISOString().split('T')[0];

  resumen = {
    total: 5,
    confirmadas: 3,
    pendientes: 2,
  };

  citas = [
    {
      hora: '09:00 AM',
      paciente: 'Ana López',
      motivo: 'Consulta general',
      estado: 'confirmada',
    },
    {
      hora: '10:30 AM',
      paciente: 'Carlos Pérez',
      motivo: 'Terapia de seguimiento',
      estado: 'pendiente',
    },
    {
      hora: '01:00 PM',
      paciente: 'María Torres',
      motivo: 'Evaluación psicológica',
      estado: 'confirmada',
    },
    {
      hora: '03:15 PM',
      paciente: 'Luis Ortega',
      motivo: 'Control de ansiedad',
      estado: 'pendiente',
    },
    {
      hora: '05:00 PM',
      paciente: 'Laura Campos',
      motivo: 'Consulta nutricional',
      estado: 'confirmada',
    },
  ];

  onDateChange(date: string) {
    console.log('Fecha seleccionada:', date);
    // Aquí puedes cambiar las citas según la fecha
  }

  getDateValue(value: string | string[] | null | undefined): string {
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
  }

}

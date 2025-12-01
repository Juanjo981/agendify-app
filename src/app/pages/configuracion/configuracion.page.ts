import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss']
})
export class ConfiguracionPage {
  config = {
    boletines: true,
    encuestas: false,
    idioma: 'es',
    zonaHoraria: 'GMT-6'
  };

  guardar() {
    console.log('Configuración guardada:', this.config);
    // Aquí podrías guardar en backend
  }

  restablecer() {
    this.config = {
      boletines: true,
      encuestas: false,
      idioma: 'es',
      zonaHoraria: 'GMT-6'
    };
  }
}

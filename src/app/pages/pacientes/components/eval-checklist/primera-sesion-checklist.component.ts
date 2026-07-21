import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EvalChecklistItemComponent } from './eval-checklist-item.component';
import { EvalRiskLevelComponent } from './eval-risk-level.component';
import { EvalChecklistItem, EvalRiskLevel } from './eval-checklist.models';

@Component({
  selector: 'app-primera-sesion-checklist',
  standalone: true,
  imports: [CommonModule, IonicModule, EvalChecklistItemComponent, EvalRiskLevelComponent],
  templateUrl: './primera-sesion-checklist.component.html',
  styleUrls: ['./primera-sesion-checklist.component.scss'],
})
export class PrimeraSesionChecklistComponent {
  @Input() title = 'Primera sesión';
  @Input() subtitle = 'Checklist visual de admisión · no se guarda';

  /** Items reutilizables; se pueden reemplazar por datos dinámicos después. */
  @Input() items: EvalChecklistItem[] = [
    { id: 'consentimiento', label: 'Consentimiento informado', checked: false },
    { id: 'motivo', label: 'Motivo de consulta', checked: false },
    { id: 'antecedentes', label: 'Antecedentes', checked: false },
    { id: 'red-apoyo', label: 'Red de apoyo', checked: false },
    { id: 'riesgo-suicida', label: 'Riesgo suicida', checked: false },
    { id: 'sustancias', label: 'Consumo de sustancias', checked: false },
    { id: 'violencia', label: 'Violencia', checked: false },
    { id: 'enfermedades', label: 'Enfermedades', checked: false },
    { id: 'medicacion', label: 'Medicación actual', checked: false },
    { id: 'firma', label: 'Firma digital', checked: false },
  ];

  @Input() riskLevel: EvalRiskLevel | null = 'bajo';

  onItemToggle(index: number, checked: boolean): void {
    const current = this.items[index];
    if (!current) return;
    this.items = this.items.map((item, i) => (i === index ? { ...item, checked } : item));
  }

  onRiskChange(level: EvalRiskLevel): void {
    this.riskLevel = level;
  }

  get completedCount(): number {
    return this.items.filter(item => item.checked).length;
  }
}

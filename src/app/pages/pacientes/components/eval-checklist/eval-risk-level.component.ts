import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvalRiskLevel, EvalRiskOption } from './eval-checklist.models';
import { NIVELES_INICIALES } from '../../models/primera-sesion.models';

@Component({
  selector: 'app-eval-risk-level',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eval-risk-level.component.html',
  styleUrls: ['./eval-risk-level.component.scss'],
})
export class EvalRiskLevelComponent {
  @Input() title = 'Nivel inicial';
  @Input() selected: EvalRiskLevel | null = null;
  @Input() disabled = false;
  @Input() options: EvalRiskOption[] = NIVELES_INICIALES.map(n => ({
    value: n.value,
    label: n.label,
  }));
  @Output() selectedChange = new EventEmitter<EvalRiskLevel>();

  select(level: EvalRiskLevel): void {
    if (this.disabled) return;
    this.selectedChange.emit(level);
  }
}

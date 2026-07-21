import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvalRiskLevel, EvalRiskOption } from './eval-checklist.models';

@Component({
  selector: 'app-eval-risk-level',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eval-risk-level.component.html',
  styleUrls: ['./eval-risk-level.component.scss'],
})
export class EvalRiskLevelComponent {
  @Input() title = 'Nivel inicial';
  @Input() selected: EvalRiskLevel | null = 'bajo';
  @Input() options: EvalRiskOption[] = [
    { value: 'bajo', label: 'Bajo' },
    { value: 'medio', label: 'Medio' },
    { value: 'alto', label: 'Alto' },
  ];
  @Output() selectedChange = new EventEmitter<EvalRiskLevel>();

  select(level: EvalRiskLevel): void {
    this.selectedChange.emit(level);
  }
}

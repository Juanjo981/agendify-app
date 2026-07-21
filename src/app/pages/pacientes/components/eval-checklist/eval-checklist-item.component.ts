import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-eval-checklist-item',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './eval-checklist-item.component.html',
  styleUrls: ['./eval-checklist-item.component.scss'],
})
export class EvalChecklistItemComponent {
  @Input() id = '';
  @Input() label = '';
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  toggle(): void {
    this.checkedChange.emit(!this.checked);
  }
}

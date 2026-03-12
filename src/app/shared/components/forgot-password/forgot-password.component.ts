import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  @Output() closed = new EventEmitter<void>();

  state: 'form' | 'success' = 'form';
  enviando = false;
  emailForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async enviar() {
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid || this.enviando) return;

    this.enviando = true;
    try {
      await this.authService.forgotPassword(this.emailForm.value.email);
    } catch {
      // Always transition to success — never reveal if email exists (security)
    } finally {
      this.enviando = false;
      this.state = 'success';
    }
  }

  close() {
    this.closed.emit();
  }
}

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SesionAdjunto } from '../../models/sesion.model';

const ALLOWED_MIME = new Set([
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
]);
const ALLOWED_EXT = ['.txt', '.doc', '.docx', '.pdf', '.jpg', '.jpeg', '.png', '.webp'];

@Component({
  selector: 'app-archivo-adjunto',
  templateUrl: './archivo-adjunto.component.html',
  styleUrls: ['./archivo-adjunto.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ArchivoAdjuntoComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Input() adjunto?: SesionAdjunto;
  @Output() archivoSeleccionado = new EventEmitter<SesionAdjunto>();
  @Output() archivoEliminado = new EventEmitter<void>();

  error = '';
  isDragOver = false;

  triggerPicker() { this.fileInput?.nativeElement.click(); }

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver = true; }
  onDragLeave() { this.isDragOver = false; }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
    (event.target as HTMLInputElement).value = '';
  }

  private processFile(file: File) {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.includes(ext)) {
      this.error = `Formato no permitido. Usa: ${ALLOWED_EXT.join(', ')}`;
      return;
    }
    this.error = '';
    const isImage = file.type.startsWith('image/');
    const adjunto: SesionAdjunto = {
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    };
    this.archivoSeleccionado.emit(adjunto);
  }

  eliminar() {
    if (this.adjunto?.previewUrl) URL.revokeObjectURL(this.adjunto.previewUrl);
    this.archivoEliminado.emit();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getIcon(type: string): string {
    if (type.startsWith('image/')) return 'image-outline';
    if (type === 'application/pdf') return 'document-outline';
    if (type === 'text/plain') return 'document-text-outline';
    return 'attach-outline';
  }

  verAdjunto() {
    if (this.adjunto?.previewUrl) window.open(this.adjunto.previewUrl, '_blank');
  }
}

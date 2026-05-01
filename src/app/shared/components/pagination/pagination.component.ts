import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationComponent {
  @Input() page = 0;
  @Input() pageSize = 10;
  @Input() total = 0;

  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() showPageSizeSelector = true;
  @Input() compact = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get safePage(): number {
    return Number.isFinite(this.page) && this.page >= 0 ? Math.floor(this.page) : 0;
  }

  get safePageSize(): number {
    return Number.isFinite(this.pageSize) && this.pageSize > 0 ? Math.floor(this.pageSize) : 10;
  }

  get safeTotal(): number {
    return Number.isFinite(this.total) && this.total > 0 ? Math.floor(this.total) : 0;
  }

  get pageDisplay(): number {
    return this.safePage + 1;
  }

  get totalPages(): number {
    if (this.safeTotal === 0) return 0;
    return Math.max(Math.ceil(this.safeTotal / this.safePageSize), 1);
  }

  get rangeStart(): number {
    if (this.safeTotal === 0) return 0;
    return this.safePage * this.safePageSize + 1;
  }

  get rangeEnd(): number {
    if (this.safeTotal === 0) return 0;
    return Math.min(this.rangeStart + this.safePageSize - 1, this.safeTotal);
  }

  get isFirstPage(): boolean {
    return this.safePage <= 0 || this.safeTotal === 0;
  }

  get isLastPage(): boolean {
    if (this.safeTotal === 0) return true;
    return this.safePage >= this.totalPages - 1;
  }

  onPreviousPage() {
    if (this.isFirstPage) return;
    this.pageChange.emit(this.safePage - 1);
  }

  onNextPage() {
    if (this.isLastPage) return;
    this.pageChange.emit(this.safePage + 1);
  }

  onPageSizeSelect(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const nextSize = Number(target?.value);
    if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === this.safePageSize) return;
    this.pageSizeChange.emit(nextSize);
  }
}


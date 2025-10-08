import { Card, Initiative } from './types';

export class DragDropHandler {
  private onMoveCard: (cardId: string, newColumnId: string) => Promise<void>;
  private onMoveInitiative: (initiativeId: string, newColumnId: string) => Promise<void>;
  private onDragEnd: () => void;
  private draggedElement: HTMLElement | null = null;
  private dragOverColumn: HTMLElement | null = null;

  constructor(
    onMoveCard: (cardId: string, newColumnId: string) => Promise<void>,
    onMoveInitiative: (initiativeId: string, newColumnId: string) => Promise<void>,
    onDragEnd: () => void
  ) {
    this.onMoveCard = onMoveCard;
    this.onMoveInitiative = onMoveInitiative;
    this.onDragEnd = onDragEnd;
  }

  addDragAndDropListeners(container: HTMLElement): void {
    // Use event delegation for better performance
    container.addEventListener('dragstart', this.handleDragStart.bind(this));
    container.addEventListener('dragend', this.handleDragEnd.bind(this));
    container.addEventListener('dragover', this.handleDragOver.bind(this));
    container.addEventListener('dragleave', this.handleDragLeave.bind(this));
    container.addEventListener('drop', this.handleDrop.bind(this));
  }

  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('draggable-item')) return;

    this.draggedElement = target;
    target.classList.add('dragging');
    
    // Set drag data
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', target.dataset.id || '');
      e.dataTransfer.setData('item-type', target.dataset.type || '');
    }
  }

  private handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('draggable-item')) return;

    // Clean up drag state
    target.classList.remove('dragging');
    this.clearDragOverStates();
    this.draggedElement = null;
    this.dragOverColumn = null;
    
    // Refresh board
    this.onDragEnd();
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    
    const target = e.target as HTMLElement;
    const column = target.closest('.simple-kanban-column') as HTMLElement;
    
    if (!column) return;

    // Update drag over state
    if (this.dragOverColumn !== column) {
      this.clearDragOverStates();
      this.dragOverColumn = column;
      column.classList.add('drag-over');
    }

    // Set drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  private handleDragLeave(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const column = target.closest('.simple-kanban-column') as HTMLElement;
    
    if (column && !column.contains(e.relatedTarget as Node)) {
      column.classList.remove('drag-over');
      if (this.dragOverColumn === column) {
        this.dragOverColumn = null;
      }
    }
  }

  private async handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    
    const target = e.target as HTMLElement;
    const column = target.closest('.simple-kanban-column') as HTMLElement;
    
    if (!column || !this.draggedElement) return;
    
    const draggedId = e.dataTransfer?.getData('text/plain');
    const itemType = e.dataTransfer?.getData('item-type') as 'card' | 'initiative';
    const columnId = column.dataset.columnId;
    
    if (!draggedId || !itemType || !columnId) return;
    
    // Clean up drag states
    this.clearDragOverStates();
    
    // Move the item
    try {
      if (itemType === 'card') {
        await this.onMoveCard(draggedId, columnId);
      } else if (itemType === 'initiative') {
        await this.onMoveInitiative(draggedId, columnId);
      }
    } catch (error) {
      console.error('Error moving item:', error);
    }
  }

  private clearDragOverStates(): void {
    const container = this.draggedElement?.closest('.simple-kanban');
    if (container) {
      container.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    }
  }
}
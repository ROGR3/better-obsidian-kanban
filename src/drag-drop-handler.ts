import { Card, Initiative } from './types';
import { DOMUtils } from './dom-utils';

export class DragDropHandler {
  private onMoveCard: (cardId: string, newColumnId: string, sourceColumnId: string) => Promise<void>;
  private onMoveInitiative: (initiativeId: string, newColumnId: string, sourceColumnId: string) => Promise<void>;
  private draggedElement: HTMLElement | null = null;
  private dragOverColumn: HTMLElement | null = null;
  private sourceColumnId: string | null = null;

  constructor(
    onMoveCard: (cardId: string, newColumnId: string, sourceColumnId: string) => Promise<void>,
    onMoveInitiative: (initiativeId: string, newColumnId: string, sourceColumnId: string) => Promise<void>
  ) {
    this.onMoveCard = onMoveCard;
    this.onMoveInitiative = onMoveInitiative;
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
    
    // Store source column ID
    const sourceColumn = target.closest('.simple-kanban-column') as HTMLElement;
    this.sourceColumnId = sourceColumn?.dataset.columnId || null;
    
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
    this.sourceColumnId = null;
    
    // No need to refresh board - DOM updates happen in handleDrop
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
    const targetColumn = target.closest('.simple-kanban-column') as HTMLElement;
    
    if (!targetColumn || !this.draggedElement) return;
    
    const draggedId = e.dataTransfer?.getData('text/plain');
    const itemType = e.dataTransfer?.getData('item-type') as 'card' | 'initiative';
    const targetColumnId = targetColumn.dataset.columnId;
    
    if (!draggedId || !itemType || !targetColumnId || !this.sourceColumnId) return;
    
    // Don't do anything if dropped in the same column
    if (this.sourceColumnId === targetColumnId) {
      this.clearDragOverStates();
      return;
    }
    
    // Get the container for DOM manipulation
    const container = targetColumn.closest('.better-kanban-board') as HTMLElement;
    if (!container) return;
    
    // Move the item in the DOM first (optimistic update)
    const moved = DOMUtils.moveItemBetweenColumns(
      draggedId,
      itemType,
      this.sourceColumnId,
      targetColumnId,
      container
    );
    
    if (!moved) {
      console.warn('Failed to move item in DOM');
      this.clearDragOverStates();
      return;
    }
    
    // Clean up drag states
    this.clearDragOverStates();
    
    // Update the backend
    try {
      if (itemType === 'card') {
        await this.onMoveCard(draggedId, targetColumnId, this.sourceColumnId);
      } else if (itemType === 'initiative') {
        await this.onMoveInitiative(draggedId, targetColumnId, this.sourceColumnId);
      }
    } catch (error) {
      console.error('Error saving item move:', error);
      // Could implement rollback here if needed
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
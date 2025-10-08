import { Card, Initiative } from './types';

export class DragDropHandler {
  private onMoveCard: (cardId: string, newColumnId: string) => Promise<void>;
  private onMoveInitiative: (initiativeId: string, newColumnId: string) => Promise<void>;
  private onReorderItem: (draggedId: string, targetId: string, isBefore: boolean, itemType: 'card' | 'initiative') => Promise<void>;

  constructor(
    onMoveCard: (cardId: string, newColumnId: string) => Promise<void>,
    onMoveInitiative: (initiativeId: string, newColumnId: string) => Promise<void>,
    onReorderItem: (draggedId: string, targetId: string, isBefore: boolean, itemType: 'card' | 'initiative') => Promise<void>
  ) {
    this.onMoveCard = onMoveCard;
    this.onMoveInitiative = onMoveInitiative;
    this.onReorderItem = onReorderItem;
  }

  addDragAndDropListeners(container: HTMLElement): void {
    let draggedItem: HTMLElement | null = null;

    // Drag start
    container.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.draggable) {
        draggedItem = target;
        target.style.opacity = '0.5';
        console.log('Started dragging:', target.dataset.type, target.dataset.id);
      }
    });

    // Drag end
    container.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      if (target.draggable) {
        target.style.opacity = '1';
        draggedItem = null;
        
        // Remove all drag-over classes
        container.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => {
          el.classList.remove('drag-over-before', 'drag-over-after');
        });
      }
    });

    // Drag over
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const column = target.closest('.simple-kanban-column') as HTMLElement;
      const card = target.closest('.simple-kanban-card, .simple-kanban-initiative') as HTMLElement;
      
      if (column && draggedItem) {
        // Remove previous drag-over classes
        container.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => {
          el.classList.remove('drag-over-before', 'drag-over-after');
        });
        
        if (card && card !== draggedItem) {
          // Determine if we're before or after the target card
          const rect = card.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (e.clientY < midY) {
            card.classList.add('drag-over-before');
          } else {
            card.classList.add('drag-over-after');
          }
        }
      }
    });

    // Drag leave
    container.addEventListener('dragleave', (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.simple-kanban-card, .simple-kanban-initiative') as HTMLElement;
      
      if (card) {
        card.classList.remove('drag-over-before', 'drag-over-after');
      }
    });

    // Drop
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const column = target.closest('.simple-kanban-column') as HTMLElement;
      const card = target.closest('.simple-kanban-card, .simple-kanban-initiative') as HTMLElement;
      
      if (!draggedItem || !column) return;
      
      const draggedId = draggedItem.dataset.id;
      const draggedType = draggedItem.dataset.type as 'card' | 'initiative';
      const columnId = column.dataset.columnId;
      
      console.log('Drop event triggered');
      console.log('Target column:', column);
      console.log('Dragged item ID:', draggedId);
      console.log('Dragged item type:', draggedType);
      console.log('Column ID:', columnId);
      
      if (card && card !== draggedItem) {
        // Reordering within the same column or different column
        const targetId = card.dataset.id;
        const isBefore = card.classList.contains('drag-over-before');
        
        await this.onReorderItem(draggedId, targetId, isBefore, draggedType);
      } else if (columnId) {
        // Moving to a different column
        if (draggedType === 'card') {
          await this.onMoveCard(draggedId, columnId);
        } else if (draggedType === 'initiative') {
          await this.onMoveInitiative(draggedId, columnId);
        }
      }
      
      // Clean up
      container.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => {
        el.classList.remove('drag-over-before', 'drag-over-after');
      });
    });
  }
}

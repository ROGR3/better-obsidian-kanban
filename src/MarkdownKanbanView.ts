import { ItemView, WorkspaceLeaf, TFile, App } from 'obsidian';
import { BoardData, Card, Initiative } from './types';
import { BoardManager } from './board-manager';
import { BoardRenderer } from './board-renderer';
import { DragDropHandler } from './drag-drop-handler';

export const MARKDOWN_KANBAN_VIEW_TYPE = 'markdown-kanban-view';

export class MarkdownKanbanView extends ItemView {
  private app: App;
  private containerEl: HTMLElement;
  private boardManager: BoardManager;
  private dragDropHandler: DragDropHandler;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.app = this.app;
    this.boardManager = new BoardManager(this.app);
    this.dragDropHandler = new DragDropHandler(
      (cardId, newColumnId) => this.boardManager.moveCardToColumn(cardId, newColumnId),
      (initiativeId, newColumnId) => this.boardManager.moveInitiativeToColumn(initiativeId, newColumnId),
      (draggedId, targetId, isBefore, itemType) => this.boardManager.reorderItem(draggedId, targetId, isBefore, itemType)
    );
  }

  getViewType(): string {
    return MARKDOWN_KANBAN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Kanban Board';
  }

  getIcon(): string {
    return 'kanban';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    if (!this.boardManager.getFilePath()) {
      BoardRenderer.showNoBoardMessage(container);
    }
  }

  async onClose(): Promise<void> {
    // Clean up if needed
  }

  async setState(state: any): Promise<void> {
    console.log('MarkdownKanbanView setState - state:', state);
    
    if (state.file) {
      await this.loadBoardFromFile(state.file);
    } else {
      console.log('No file in state, showing no board message');
      const container = this.containerEl.children[1];
      BoardRenderer.showNoBoardMessage(container);
    }
  }

  getState(): any {
    return {
      file: this.boardManager.getFilePath()
    };
  }

  private async loadBoardFromFile(filePath: string): Promise<void> {
    try {
      await this.boardManager.loadBoardFromFile(filePath);
      const container = this.containerEl.children[1];
      this.renderBoard(container);
    } catch (error) {
      console.error('Error loading board from file:', error);
      const container = this.containerEl.children[1];
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
          <h2 style="color: var(--text-error); margin-bottom: 1rem;">Error Loading Board</h2>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">An error occurred while loading the board: ${error.message}</p>
          <button id="retry-btn" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;">
            Retry
          </button>
        </div>
      `;
      
      // Add retry button listener
      const retryBtn = container.querySelector('#retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.loadBoardFromFile(filePath);
        });
      }
    }
  }

  private renderBoard(container: HTMLElement): void {
    const boardData = this.boardManager.getBoardData();
    const cards = this.boardManager.getCards();
    const initiatives = this.boardManager.getInitiatives();

    BoardRenderer.renderBoard(container, boardData, cards, initiatives);
    this.addEventListeners(container);
    this.addClickListeners(container);
    this.dragDropHandler.addDragAndDropListeners(container);
  }

  private addEventListeners(container: HTMLElement): void {
    // Add listeners for column add buttons
    container.querySelectorAll('[data-action="add-card"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const columnId = (e.target as HTMLElement).dataset.columnId;
        if (columnId) {
          await this.boardManager.addCardToColumn(columnId);
          this.renderBoard(container);
        }
      });
    });

    container.querySelectorAll('[data-action="add-initiative"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const columnId = (e.target as HTMLElement).dataset.columnId;
        if (columnId) {
          await this.boardManager.addInitiativeToColumn(columnId);
          this.renderBoard(container);
        }
      });
    });

    // Add listeners for swimlane toggles
    container.querySelectorAll('.swimlane-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSwimlane(e.target as HTMLElement);
      });
    });
  }

  private addClickListeners(container: HTMLElement): void {
    // Add click listeners for cards and initiatives
    container.querySelectorAll('.clickable-card, .clickable-initiative').forEach(element => {
      element.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const type = (e.currentTarget as HTMLElement).dataset.type;
        
        if (id && type) {
          if (type === 'card') {
            await this.boardManager.editCard(id);
          } else if (type === 'initiative') {
            await this.boardManager.editInitiative(id);
          }
          this.renderBoard(container);
        }
      });
    });

    // Add listeners for edit buttons
    container.querySelectorAll('[data-action="edit-card"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          await this.boardManager.editCard(id);
          this.renderBoard(container);
        }
      });
    });

    container.querySelectorAll('[data-action="edit-initiative"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          await this.boardManager.editInitiative(id);
          this.renderBoard(container);
        }
      });
    });

    // Add listeners for delete buttons
    container.querySelectorAll('[data-action="delete-card"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          await this.boardManager.deleteCard(id);
          this.renderBoard(container);
        }
      });
    });

    container.querySelectorAll('[data-action="delete-initiative"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          await this.boardManager.deleteInitiative(id);
          this.renderBoard(container);
        }
      });
    });
  }

  private toggleSwimlane(header: HTMLElement): void {
    const swimlane = header.getAttribute('data-swimlane');
    if (!swimlane) return;

    const content = document.querySelector(`[data-swimlane="${swimlane}"]`);
    if (!content) return;

    const isCollapsed = content.style.display === 'none';
    content.style.display = isCollapsed ? 'block' : 'none';
    header.querySelector('.swimlane-toggle').textContent = isCollapsed ? '▼' : '▶';
  }
}
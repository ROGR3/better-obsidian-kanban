import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { BoardManager } from './board-manager';
import { DragDropHandler } from './drag-drop-handler';
import { EventService } from './services/EventService';
import { ContextMenuService } from './services/ContextMenuService';
import { BoardService } from './services/BoardService';
import { ModalService } from './services/ModalService';
import { ValidationService } from './services/ValidationService';
import { 
  IBoardManager, 
  ContextAction, 
  ItemType, 
  ContextMenuData
} from './types';

export const MARKDOWN_KANBAN_VIEW_TYPE = 'markdown-kanban-view';

export class MarkdownKanbanView extends ItemView {
  public app: App;
  public containerEl: HTMLElement;
  
  // Services
  private boardManager: IBoardManager;
  private eventService: EventService;
  private contextMenuService: ContextMenuService;
  private boardService: BoardService;
  private dragDropHandler: DragDropHandler | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.initializeServices();
  }

  private initializeServices(): void {
    this.boardManager = new BoardManager(this.app);
    this.boardService = new BoardService();
    
    this.contextMenuService = new ContextMenuService(
      (action: ContextAction, id?: string, columnId?: string) => 
        this.handleContextAction(action, id, columnId)
    );

    this.eventService = new EventService(
      (id: string) => this.handleCardClick(id),
      (id: string) => this.handleInitiativeClick(id),
      (columnId: string, event: MouseEvent) => this.handleColumnRightClick(columnId, event),
      (type: ItemType, id: string, event: MouseEvent) => this.handleItemRightClick(type, id, event),
      (header: HTMLElement) => this.toggleSwimlane(header)
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
    const container = this.boardService.getContainer(this.containerEl);
    if (!this.boardManager.getFilePath()) {
      this.boardService.showNoBoardMessage(container);
    }
  }

  async onClose(): Promise<void> {
    // Clean up if needed
  }

  async setState(state: any): Promise<void> {
    try {
    if (state.file) {
      await this.loadBoardFromFile(state.file);
    } else {
        const container = this.boardService.getContainer(this.containerEl);
        this.boardService.showNoBoardMessage(container);
      }
    } catch (error) {
      console.error('Error in setState:', error);
      this.showError('Failed to load board state');
    }
  }

  getState(): any {
    return {
      file: this.boardManager.getFilePath()
    };
  }

  private async loadBoardFromFile(filePath: string): Promise<void> {
    try {
      ValidationService.validateFilePath(filePath);
      await this.boardManager.loadBoardFromFile(filePath);
      const container = this.boardService.getContainer(this.containerEl);
      this.renderBoard(container);
    } catch (error) {
      console.error('Error loading board from file:', error);
      this.showError(`Failed to load board: ${error.message}`, filePath);
    }
  }

  private renderBoard(container: HTMLElement): void {
    try {
    const boardData = this.boardManager.getBoardData();
    const cards = this.boardManager.getCards();
    const initiatives = this.boardManager.getInitiatives();

      ValidationService.validateBoardData(boardData);
      this.boardService.renderBoard(container, boardData, cards, initiatives);
    
    // Add a small delay to ensure DOM is fully rendered before attaching listeners
    setTimeout(() => {
        this.initializeBoard();
    }, 10);
    } catch (error) {
      console.error('Error rendering board:', error);
      this.showError('Failed to render board');
    }
  }

  private initializeBoard(): void {
    try {
      // Get the current container from the DOM (it might have been replaced)
      const currentContainer = this.boardService.getContainer(this.containerEl);
      
      // Initialize drag drop (this might replace the container)
      const updatedContainer = this.initializeDragDrop(currentContainer);
      
      // Attach event listeners to the updated container
      this.eventService.attachEventListeners(updatedContainer);
    } catch (error) {
      console.error('Error initializing board:', error);
    }
  }

  private refreshBoard(): void {
    const container = this.boardService.getContainer(this.containerEl);
    this.renderBoard(container);
  }

  private refreshBoardContent(): void {
    try {
      const container = this.boardService.getContainer(this.containerEl);
      const boardData = this.boardManager.getBoardData();
      const cards = this.boardManager.getCards();
      const initiatives = this.boardManager.getInitiatives();

      this.boardService.refreshBoardContent(container, boardData, cards, initiatives);
      
      // Re-attach event listeners after content refresh
      setTimeout(() => {
        this.eventService.attachEventListeners(container);
      }, 10);
    } catch (error) {
      console.error('Error refreshing board content:', error);
    }
  }

  // Event handlers
  private async handleCardClick(id: string): Promise<void> {
    try {
      await this.boardManager.editCard(id);
      this.refreshBoardContent();
    } catch (error) {
      console.error('Error handling card click:', error);
      this.showError('Failed to edit card');
    }
  }

  private async handleInitiativeClick(id: string): Promise<void> {
    try {
            await this.boardManager.editInitiative(id);
      this.refreshBoardContent();
    } catch (error) {
      console.error('Error handling initiative click:', error);
      this.showError('Failed to edit initiative');
    }
  }

  private handleColumnRightClick(columnId: string, event: MouseEvent): void {
    const data: ContextMenuData = {
      type: 'column',
      columnId,
      position: { x: event.pageX, y: event.pageY }
    };
    this.contextMenuService.show(event, data);
  }

  private handleItemRightClick(type: ItemType, id: string, event: MouseEvent): void {
    const data: ContextMenuData = {
      type,
      id,
      position: { x: event.pageX, y: event.pageY }
    };
    this.contextMenuService.show(event, data);
  }

  private async handleContextAction(action: ContextAction, id?: string, columnId?: string): Promise<void> {
    try {
    switch (action) {
      case 'edit-card':
        if (id) {
          await this.boardManager.editCard(id);
            this.refreshBoardContent();
        }
        break;
      case 'edit-initiative':
        if (id) {
          await this.boardManager.editInitiative(id);
            this.refreshBoardContent();
        }
        break;
      case 'delete-card':
        if (id) {
          await this.boardManager.deleteCard(id);
            this.refreshBoardContent();
        }
        break;
      case 'delete-initiative':
        if (id) {
          await this.boardManager.deleteInitiative(id);
            this.refreshBoardContent();
        }
        break;
      case 'archive-card':
        if (id) {
          await this.boardManager.archiveCard(id);
            this.refreshBoardContent();
        }
        break;
      case 'archive-initiative':
        if (id) {
          await this.boardManager.archiveInitiative(id);
            this.refreshBoardContent();
        }
        break;
      case 'add-card':
        if (columnId) {
          await this.boardManager.addCardToColumn(columnId);
            this.refreshBoardContent();
        }
        break;
      case 'add-initiative':
        if (columnId) {
          await this.boardManager.addInitiativeToColumn(columnId);
            this.refreshBoardContent();
        }
        break;
      case 'move-card':
        if (id) {
          await this.showMoveModal(id, 'card');
        }
        break;
      case 'move-initiative':
        if (id) {
          await this.showMoveModal(id, 'initiative');
        }
        break;
    }
    } catch (error) {
      console.error('Error handling context action:', error);
      this.showError(`Failed to ${action.replace('-', ' ')}`);
  }
  }

  private async showMoveModal(itemId: string, itemType: 'card' | 'initiative'): Promise<void> {
    try {
    const boardData = this.boardManager.getBoardData();
      const newColumnId = await ModalService.showMoveModal(itemId, itemType, boardData);
      
      if (newColumnId) {
        if (itemType === 'card') {
          await this.boardManager.moveCardToColumn(itemId, newColumnId);
        } else {
          await this.boardManager.moveInitiativeToColumn(itemId, newColumnId);
        }
        this.refreshBoardContent();
      }
    } catch (error) {
      console.error('Error showing move modal:', error);
      this.showError('Failed to move item');
    }
  }

  private toggleSwimlane(header: HTMLElement): void {
    try {
      const swimlaneContainer = header.closest('.simple-kanban-swimlane');
      if (!swimlaneContainer) return;

      const content = swimlaneContainer.querySelector('.swimlane-content') as HTMLElement;
      const toggleButton = header.querySelector('.swimlane-toggle') as HTMLElement;
      if (!content || !toggleButton) return;

      const isCollapsed = content.style.display === 'none';
      content.style.display = isCollapsed ? 'block' : 'none';
      toggleButton.textContent = isCollapsed ? '▼' : '▶';
    } catch (error) {
      console.error('Error toggling swimlane:', error);
    }
  }

  private showError(message: string, filePath?: string): void {
    const container = this.boardService.getContainer(this.containerEl);
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
        <h2 style="color: var(--text-error); margin-bottom: 1rem;">Error</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">${message}</p>
        ${filePath ? `<p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem;">File: ${filePath}</p>` : ''}
        <button id="retry-btn" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;">
          Retry
        </button>
      </div>
    `;
    
    // Add retry button listener
    const retryBtn = container.querySelector('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (filePath) {
          this.loadBoardFromFile(filePath);
        } else {
        this.refreshBoard();
        }
      });
    }
  }

  private initializeDragDrop(container: HTMLElement): HTMLElement {
    try {
      // Clean up existing drag drop handler
      if (this.dragDropHandler) {
        // Remove old event listeners by creating a new container
        const newContainer = container.cloneNode(true) as HTMLElement;
        container.parentNode?.replaceChild(newContainer, container);
        container = newContainer;
      }

      // Create new drag drop handler
      this.dragDropHandler = new DragDropHandler(
        (cardId: string, newColumnId: string) => this.boardManager.moveCardToColumn(cardId, newColumnId),
        (initiativeId: string, newColumnId: string) => this.boardManager.moveInitiativeToColumn(initiativeId, newColumnId),
        () => this.refreshBoard()
      );

      // Add drag and drop listeners
      this.dragDropHandler.addDragAndDropListeners(container);
      
      return container;
    } catch (error) {
      console.error('Error initializing drag drop:', error);
      return container;
    }
  }
}
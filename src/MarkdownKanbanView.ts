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
  private contextMenu: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.app = this.app;
    this.boardManager = new BoardManager(this.app);
    this.dragDropHandler = new DragDropHandler(
      async (cardId, newColumnId) => {
        await this.boardManager.moveCardToColumn(cardId, newColumnId);
        this.refreshBoard();
      },
      async (initiativeId, newColumnId) => {
        await this.boardManager.moveInitiativeToColumn(initiativeId, newColumnId);
        this.refreshBoard();
      },
      async (draggedId, targetId, isBefore, itemType) => {
        await this.boardManager.reorderItem(draggedId, targetId, isBefore, itemType);
        this.refreshBoard();
      }
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

  private refreshBoard(): void {
    const container = this.containerEl.children[1];
    this.renderBoard(container);
  }

  private addEventListeners(container: HTMLElement): void {
    // Add listeners for column right-click context menus
    container.querySelectorAll('.simple-kanban-column').forEach(column => {
      column.addEventListener('contextmenu', (e) => {
        const columnId = (e.currentTarget as HTMLElement).dataset.columnId;
        if (columnId) {
          this.showContextMenu(e as MouseEvent, 'column', undefined, columnId);
        }
      });
    });

    // Add listeners for swimlane toggles
    container.querySelectorAll('.swimlane-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSwimlane(header as HTMLElement);
      });
    });
  }

  private addClickListeners(container: HTMLElement): void {
    // Add click listeners for cards and initiatives (left click to edit)
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
          this.refreshBoard();
        }
      });

      // Add right-click context menu listeners
      element.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const type = (e.currentTarget as HTMLElement).dataset.type;
        
        if (id && type) {
          this.showContextMenu(e as MouseEvent, type as 'card' | 'initiative', id);
        }
      });
    });
  }

  private toggleSwimlane(header: HTMLElement): void {
    // Find the swimlane container
    const swimlaneContainer = header.closest('.simple-kanban-swimlane');
    if (!swimlaneContainer) return;

    const content = swimlaneContainer.querySelector('.swimlane-content') as HTMLElement;
    const toggleButton = header.querySelector('.swimlane-toggle') as HTMLElement;
    if (!content || !toggleButton) return;

    const isCollapsed = content.style.display === 'none';
    content.style.display = isCollapsed ? 'block' : 'none';
    toggleButton.textContent = isCollapsed ? '▼' : '▶';
  }

  private createContextMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.display = 'block';
    menu.style.visibility = 'visible';
    menu.style.opacity = '1';
    menu.style.position = 'fixed';
    menu.style.zIndex = '999999';
    
    // Try appending to the view container first, fallback to document.body
    const viewContainer = this.containerEl.closest('.view-content') || document.body;
    viewContainer.appendChild(menu);
    return menu;
  }

  private showContextMenu(event: MouseEvent, type: 'card' | 'initiative' | 'column', id?: string, columnId?: string): void {
    event.preventDefault();
    event.stopPropagation();

    // Hide existing context menu
    this.hideContextMenu();

    // Create new context menu
    this.contextMenu = this.createContextMenu();
    
    let menuItems = '';
    
    if (type === 'card' && id) {
      const card = this.boardManager.getCards().get(id);
      const isDoneColumn = card && this.normalizeStatus(card.metadata.status) === 'done';
      
      menuItems = `
        <div class="context-menu-item" data-action="edit-card" data-id="${id}">
          <span class="context-menu-icon">✏️</span>
          Edit Card
        </div>
        ${isDoneColumn ? `
        <div class="context-menu-item" data-action="archive-card" data-id="${id}">
          <span class="context-menu-icon">📦</span>
          Archive Card
        </div>
        ` : ''}
        <div class="context-menu-item danger" data-action="delete-card" data-id="${id}">
          <span class="context-menu-icon">🗑️</span>
          Delete Card
        </div>
      `;
    } else if (type === 'initiative' && id) {
      const initiative = this.boardManager.getInitiatives().get(id);
      const isDoneColumn = initiative && this.normalizeStatus(initiative.metadata.status) === 'done';
      
      menuItems = `
        <div class="context-menu-item" data-action="edit-initiative" data-id="${id}">
          <span class="context-menu-icon">✏️</span>
          Edit Initiative
        </div>
        ${isDoneColumn ? `
        <div class="context-menu-item" data-action="archive-initiative" data-id="${id}">
          <span class="context-menu-icon">📦</span>
          Archive Initiative
        </div>
        ` : ''}
        <div class="context-menu-item danger" data-action="delete-initiative" data-id="${id}">
          <span class="context-menu-icon">🗑️</span>
          Delete Initiative
        </div>
      `;
    } else if (type === 'column' && columnId) {
      // Determine which swimlane this column belongs to by checking the event target
      const targetElement = event.target as HTMLElement;
      const initiativeSwimlane = targetElement.closest('[data-swimlane="initiatives"]');
      
      if (initiativeSwimlane) {
        menuItems = `
          <div class="context-menu-item" data-action="add-initiative" data-column-id="${columnId}">
            <span class="context-menu-icon">📋</span>
            Add Initiative
          </div>
        `;
      } else {
        menuItems = `
          <div class="context-menu-item" data-action="add-card" data-column-id="${columnId}">
            <span class="context-menu-icon">➕</span>
            Add Card
          </div>
        `;
      }
    }

    this.contextMenu.innerHTML = menuItems;
    this.contextMenu.style.left = `${event.pageX}px`;
    this.contextMenu.style.top = `${event.pageY}px`;
    this.contextMenu.style.display = 'block';
    this.contextMenu.style.visibility = 'visible';
    this.contextMenu.style.opacity = '1';

    // Add event listeners
    this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).dataset.action;
        const itemId = (e.currentTarget as HTMLElement).dataset.id;
        const itemColumnId = (e.currentTarget as HTMLElement).dataset.columnId;

        await this.handleContextAction(action, itemId, itemColumnId);
        this.hideContextMenu();
      });
    });

    // Hide menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    }, 0);
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  private async handleContextAction(action: string, id?: string, columnId?: string): Promise<void> {
    switch (action) {
      case 'edit-card':
        if (id) {
          await this.boardManager.editCard(id);
          this.refreshBoard();
        }
        break;
      case 'edit-initiative':
        if (id) {
          await this.boardManager.editInitiative(id);
          this.refreshBoard();
        }
        break;
      case 'delete-card':
        if (id) {
          await this.boardManager.deleteCard(id);
          this.refreshBoard();
        }
        break;
      case 'delete-initiative':
        if (id) {
          await this.boardManager.deleteInitiative(id);
          this.refreshBoard();
        }
        break;
      case 'archive-card':
        if (id) {
          await this.boardManager.archiveCard(id);
          this.refreshBoard();
        }
        break;
      case 'archive-initiative':
        if (id) {
          await this.boardManager.archiveInitiative(id);
          this.refreshBoard();
        }
        break;
      case 'add-card':
        if (columnId) {
          await this.boardManager.addCardToColumn(columnId);
          this.refreshBoard();
        }
        break;
      case 'add-initiative':
        if (columnId) {
          await this.boardManager.addInitiativeToColumn(columnId);
          this.refreshBoard();
        }
        break;
    }
  }

  private normalizeStatus(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

}
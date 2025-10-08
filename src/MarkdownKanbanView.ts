import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { BoardManager } from './board-manager';
import { BoardRenderer } from './board-renderer';
import { DragDropHandler } from './drag-drop-handler';

export const MARKDOWN_KANBAN_VIEW_TYPE = 'markdown-kanban-view';

export class MarkdownKanbanView extends ItemView {
  public app: App;
  public containerEl: HTMLElement;
  private boardManager: BoardManager;
  private contextMenu: HTMLElement | null = null;
  private dragDropHandler: DragDropHandler | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.boardManager = new BoardManager(this.app);
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
    const container = this.containerEl.children[1] as HTMLElement;
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
      const container = this.containerEl.children[1] as HTMLElement;
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
      const container = this.containerEl.children[1] as HTMLElement;
      this.renderBoard(container);
    } catch (error) {
      console.error('Error loading board from file:', error);
      const container = this.containerEl.children[1] as HTMLElement;
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
    
    // Add a small delay to ensure DOM is fully rendered before attaching listeners
    setTimeout(() => {
      this.addEventListeners(container);
      this.addClickListeners(container);
      this.initializeDragDrop(container);
      this.addTestButton(container);
    }, 10);
  }

  private refreshBoard(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    this.renderBoard(container);
  }

  private initializeDragDrop(container: HTMLElement): void {
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
  }

  private addEventListeners(container: HTMLElement): void {
    console.log('Adding event listeners to container:', container);
    
    // Add listeners for column right-click context menus
    const columns = container.querySelectorAll('.simple-kanban-column');
    console.log('Found columns:', columns.length);
    
    columns.forEach((column, index) => {
      console.log(`Adding contextmenu listener to column ${index}:`, column);
      column.addEventListener('contextmenu', (e) => {
        console.log('Column contextmenu event triggered:', e);
        e.preventDefault();
        e.stopPropagation();
        const columnId = (e.currentTarget as HTMLElement).dataset.columnId;
        console.log('Column ID:', columnId);
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
    const clickableElements = container.querySelectorAll('.clickable-card, .clickable-initiative');
    console.log('Found clickable elements:', clickableElements.length);
    
    clickableElements.forEach(element => {
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
        console.log('Element contextmenu event triggered:', e);
        e.preventDefault();
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const type = (e.currentTarget as HTMLElement).dataset.type;
        console.log('Element ID:', id, 'Type:', type);
        
        if (id && type) {
          this.showContextMenu(e as MouseEvent, type as 'card' | 'initiative', id);
        }
      });
    });
  }

  private addTestButton(_container: HTMLElement): void {
    // Add a test button to debug context menu functionality
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Context Menu';
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '1000000';
    testButton.style.padding = '10px';
    testButton.style.background = 'var(--interactive-accent)';
    testButton.style.color = 'var(--text-on-accent)';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Test button clicked, showing context menu');
      this.showContextMenu(e as MouseEvent, 'column', undefined, 'test-column');
    });
    
    document.body.appendChild(testButton);
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
    
    // Always append to document.body to ensure proper positioning
    document.body.appendChild(menu);
    return menu;
  }

  private showContextMenu(event: MouseEvent, type: 'card' | 'initiative' | 'column', id?: string, columnId?: string): void {
    console.log('showContextMenu called:', { type, id, columnId, event });
    
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
        <div class="context-menu-item" data-action="move-card" data-id="${id}">
          <span class="context-menu-icon">↔️</span>
          Move Card
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
        <div class="context-menu-item" data-action="move-initiative" data-id="${id}">
          <span class="context-menu-icon">↔️</span>
          Move Initiative
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
    
    console.log('Context menu positioned at:', { 
      left: event.pageX, 
      top: event.pageY, 
      menuItems: menuItems.length,
      menuElement: this.contextMenu,
      menuHTML: this.contextMenu.innerHTML
    });
    
    // Force a reflow to ensure the menu is rendered
    this.contextMenu.offsetHeight;

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
  }

  private normalizeStatus(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  private async showMoveModal(itemId: string, itemType: 'card' | 'initiative'): Promise<void> {
    const boardData = this.boardManager.getBoardData();
    const columns = boardData.columns.sort((a, b) => a.order - b.order);
    
    const columnOptions = columns.map(column => 
      `<option value="${column.id}">${column.title}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-panel">
        <div class="modal-header">
          <h3>Move ${itemType === 'card' ? 'Card' : 'Initiative'}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Column:</label>
            <select class="modal-select" id="move-column-select">
              ${columnOptions}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="move-cancel">Cancel</button>
          <button class="btn-primary" id="move-confirm">Move</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
      const closeModal = () => {
        modal.remove();
        resolve();
      };

      modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
      modal.querySelector('#move-cancel')?.addEventListener('click', closeModal);
      modal.querySelector('#move-confirm')?.addEventListener('click', async () => {
        const select = modal.querySelector('#move-column-select') as HTMLSelectElement;
        const newColumnId = select.value;
        
        if (itemType === 'card') {
          await this.boardManager.moveCardToColumn(itemId, newColumnId);
        } else {
          await this.boardManager.moveInitiativeToColumn(itemId, newColumnId);
        }
        
        this.refreshBoard();
        closeModal();
      });

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    });
  }

}
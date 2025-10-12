import { IContextMenuService, ContextMenuData, ContextAction, ItemType } from '../types';

export class ContextMenuService implements IContextMenuService {
  private contextMenu: HTMLElement | null = null;
  private onAction: (action: ContextAction, id?: string, columnId?: string) => Promise<void>;

  constructor(onAction: (action: ContextAction, id?: string, columnId?: string) => Promise<void>) {
    this.onAction = onAction;
  }

  show(event: MouseEvent, data: ContextMenuData): void {
    event.preventDefault();
    event.stopPropagation();

    this.hide();
    this.createContextMenu(data);
    this.positionContextMenu(event);
    this.attachMenuEventListeners();
  }

  hide(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  isVisible(): boolean {
    return this.contextMenu !== null;
  }

  private createContextMenu(data: ContextMenuData): void {
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'context-menu kanban-context-menu';
    
    // Use inline styles to ensure visibility
    this.contextMenu.style.cssText = `
      position: fixed !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 10000 !important;
      background: var(--background-primary) !important;
      border: 1px solid var(--background-modifier-border) !important;
      border-radius: 8px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
      padding: 0.5rem 0 !important;
      min-width: 180px !important;
      backdrop-filter: blur(10px) !important;
      width: auto !important;
      height: auto !important;
      max-width: none !important;
      max-height: none !important;
      overflow: visible !important;
      clip: none !important;
      clip-path: none !important;
      transform: none !important;
      filter: none !important;
      pointer-events: auto !important;
    `;
    
    const menuItems = this.generateMenuItems(data);
    this.contextMenu.innerHTML = menuItems;
    document.body.appendChild(this.contextMenu);
  }

  private positionContextMenu(event: MouseEvent): void {
    if (!this.contextMenu) return;

    this.contextMenu.style.left = `${event.pageX}px`;
    this.contextMenu.style.top = `${event.pageY}px`;
    
    // Force a reflow to ensure the menu is rendered
    this.contextMenu.offsetHeight;
  }

  private generateMenuItems(data: ContextMenuData): string {
    const { type, id, columnId } = data;

    switch (type) {
      case 'card':
        return this.generateCardMenuItems(id!);
      case 'initiative':
        return this.generateInitiativeMenuItems(id!);
      case 'column':
        return this.generateColumnMenuItems(columnId!);
      default:
        return '';
    }
  }

  private generateCardMenuItems(cardId: string): string {
    return `
      <div class="context-menu-item" data-action="edit-card" data-id="${cardId}">
        <span class="context-menu-icon">✏️</span>
        Edit Card
      </div>
      <div class="context-menu-item" data-action="move-card" data-id="${cardId}">
        <span class="context-menu-icon">↔️</span>
        Move Card
      </div>
      <div class="context-menu-item" data-action="archive-card" data-id="${cardId}">
        <span class="context-menu-icon">📦</span>
        Archive Card
      </div>
      <div class="context-menu-item danger" data-action="delete-card" data-id="${cardId}">
        <span class="context-menu-icon">🗑️</span>
        Delete Card
      </div>
    `;
  }

  private generateInitiativeMenuItems(initiativeId: string): string {
    return `
      <div class="context-menu-item" data-action="edit-initiative" data-id="${initiativeId}">
        <span class="context-menu-icon">✏️</span>
        Edit Initiative
      </div>
      <div class="context-menu-item" data-action="move-initiative" data-id="${initiativeId}">
        <span class="context-menu-icon">↔️</span>
        Move Initiative
      </div>
      <div class="context-menu-item" data-action="archive-initiative" data-id="${initiativeId}">
        <span class="context-menu-icon">📦</span>
        Archive Initiative
      </div>
      <div class="context-menu-item danger" data-action="delete-initiative" data-id="${initiativeId}">
        <span class="context-menu-icon">🗑️</span>
        Delete Initiative
      </div>
    `;
  }

  private generateColumnMenuItems(columnId: string): string {
    return `
      <div class="context-menu-item" data-action="add-card" data-column-id="${columnId}">
        <span class="context-menu-icon">➕</span>
        Add Card
      </div>
      <div class="context-menu-item" data-action="add-initiative" data-column-id="${columnId}">
        <span class="context-menu-icon">📋</span>
        Add Initiative
      </div>
    `;
  }

  private attachMenuEventListeners(): void {
    if (!this.contextMenu) return;

    this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).dataset.action as ContextAction;
        const itemId = (e.currentTarget as HTMLElement).dataset.id;
        const itemColumnId = (e.currentTarget as HTMLElement).dataset.columnId;

        await this.onAction(action, itemId, itemColumnId);
        this.hide();
      });
    });

    // Hide menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', this.hide.bind(this), { once: true });
    }, 0);
  }
}

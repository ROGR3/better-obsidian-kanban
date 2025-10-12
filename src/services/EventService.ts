import { IEventService, ItemType } from '../types';

export class EventService implements IEventService {
  private eventHandlers: Map<string, EventListener> = new Map();
  private container: HTMLElement | null = null;

  constructor(
    private onCardClick: (id: string) => Promise<void>,
    private onInitiativeClick: (id: string) => Promise<void>,
    private onColumnRightClick: (columnId: string, event: MouseEvent) => void,
    private onItemRightClick: (type: ItemType, id: string, event: MouseEvent) => void,
    private onSwimlaneToggle: (header: HTMLElement) => void
  ) {}

  attachEventListeners(container: HTMLElement): void {
    if (this.container === container && container.dataset.listenersAttached === 'true') {
      return;
    }

    this.container = container;
    this.detachEventListeners(container);

    // Mark that listeners have been attached
    container.dataset.listenersAttached = 'true';

    // Handle column right-click context menus (only when not clicking on items)
    this.addEventHandler(container, 'contextmenu', (e: Event) => {
      const target = (e.target as HTMLElement);
      const column = target.closest('.simple-kanban-column');
      const item = target.closest('.clickable-card, .clickable-initiative');
      
      // Only show column menu if clicking on column but not on an item
      if (column && !item) {
        e.preventDefault();
        e.stopPropagation();
        const columnId = (column as HTMLElement).dataset.columnId;
        if (columnId) {
          this.onColumnRightClick(columnId, e as MouseEvent);
        }
      }
    });

    // Handle swimlane toggles
    this.addEventHandler(container, 'click', (e: Event) => {
      const target = (e.target as HTMLElement);
      const header = target.closest('.swimlane-header');
      if (header) {
        e.stopPropagation();
        this.onSwimlaneToggle(header as HTMLElement);
      }
    });

    // Handle card and initiative clicks (left click to edit)
    this.addEventHandler(container, 'click', (e: Event) => {
      const target = (e.target as HTMLElement);
      const clickableElement = target.closest('.clickable-card, .clickable-initiative');
      if (clickableElement) {
        e.stopPropagation();
        const id = (clickableElement as HTMLElement).dataset.id;
        const type = (clickableElement as HTMLElement).dataset.type;
        
        if (id && type) {
          if (type === 'card') {
            this.onCardClick(id);
          } else if (type === 'initiative') {
            this.onInitiativeClick(id);
          }
        }
      }
    });

    // Handle card and initiative right-click context menus
    this.addEventHandler(container, 'contextmenu', (e: Event) => {
      const target = (e.target as HTMLElement);
      const clickableElement = target.closest('.clickable-card, .clickable-initiative');
      if (clickableElement) {
        e.preventDefault();
        e.stopPropagation();
        const id = (clickableElement as HTMLElement).dataset.id;
        const type = (clickableElement as HTMLElement).dataset.type;
        
        if (id && type) {
          this.onItemRightClick(type as ItemType, id, e as MouseEvent);
        }
      }
    });
  }

  detachEventListeners(container: HTMLElement): void {
    this.eventHandlers.forEach((handler, eventType) => {
      container.removeEventListener(eventType, handler);
    });
    this.eventHandlers.clear();
    container.dataset.listenersAttached = 'false';
  }

  private addEventHandler(container: HTMLElement, eventType: string, handler: EventListener): void {
    container.addEventListener(eventType, handler);
    this.eventHandlers.set(eventType, handler);
  }
}

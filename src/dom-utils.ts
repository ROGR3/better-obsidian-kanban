/**
 * DOM utility functions for efficient, targeted updates
 * Preserves scroll position and avoids full re-renders
 */

export class DOMUtils {
  /**
   * Save scroll position for a container
   */
  static saveScrollPosition(container: HTMLElement): { x: number; y: number } {
    const scrollableEl = container.querySelector('.simple-kanban-swimlanes') as HTMLElement;
    return {
      x: scrollableEl?.scrollLeft || 0,
      y: scrollableEl?.scrollTop || 0
    };
  }

  /**
   * Restore scroll position for a container
   */
  static restoreScrollPosition(container: HTMLElement, position: { x: number; y: number }): void {
    const scrollableEl = container.querySelector('.simple-kanban-swimlanes') as HTMLElement;
    if (scrollableEl) {
      scrollableEl.scrollLeft = position.x;
      scrollableEl.scrollTop = position.y;
    }
  }

  /**
   * Update card count badge for a column
   */
  static updateColumnCardCount(columnElement: HTMLElement, count: number): void {
    const countBadge = columnElement.querySelector('.card-count');
    if (countBadge) {
      countBadge.textContent = count.toString();
    }
  }

  /**
   * Update swimlane count badge
   */
  static updateSwimlaneCount(swimlaneElement: HTMLElement, count: number): void {
    const countBadge = swimlaneElement.querySelector('.swimlane-count');
    if (countBadge) {
      countBadge.textContent = count.toString();
    }
  }

  /**
   * Move a DOM element from one column to another
   */
  static moveItemBetweenColumns(
    itemId: string,
    itemType: 'card' | 'initiative',
    sourceColumnId: string,
    targetColumnId: string,
    container: HTMLElement
  ): boolean {
    try {
      const className = itemType === 'card' ? 'simple-kanban-card' : 'simple-kanban-initiative';
      const itemElement = container.querySelector(`[data-id="${itemId}"].${className}`) as HTMLElement;
      
      if (!itemElement) {
        console.warn(`Item not found: ${itemId}`);
        return false;
      }

      // Determine which swimlane this item type belongs to
      const swimlaneType = itemType === 'card' ? 'tasks' : 'initiatives';
      
      // Find the correct swimlane
      const swimlanes = container.querySelectorAll('.simple-kanban-swimlane');
      let targetSwimlane: HTMLElement | null = null;
      
      for (const swimlane of Array.from(swimlanes)) {
        const swimlaneDataType = swimlane.querySelector('[data-swimlane]')?.getAttribute('data-swimlane');
        if (swimlaneDataType === swimlaneType) {
          targetSwimlane = swimlane as HTMLElement;
          break;
        }
      }
      
      if (!targetSwimlane) {
        console.warn(`Target swimlane not found for type: ${swimlaneType}`);
        return false;
      }

      // Find target column within the correct swimlane
      const targetColumn = targetSwimlane.querySelector(`[data-column-id="${targetColumnId}"]`) as HTMLElement;
      if (!targetColumn) {
        console.warn(`Target column not found: ${targetColumnId} in swimlane: ${swimlaneType}`);
        return false;
      }

      const targetContent = targetColumn.querySelector('.simple-kanban-column-content');
      if (!targetContent) {
        console.warn('Target column content not found');
        return false;
      }

      // Find source column within the same swimlane for count update
      const sourceColumn = targetSwimlane.querySelector(`[data-column-id="${sourceColumnId}"]`) as HTMLElement;

      // Move the element
      targetContent.appendChild(itemElement);

      // Update counts
      if (sourceColumn) {
        const sourceCount = sourceColumn.querySelectorAll(`.${className}`).length;
        DOMUtils.updateColumnCardCount(sourceColumn, sourceCount);
      }

      const targetCount = targetColumn.querySelectorAll(`.${className}`).length;
      DOMUtils.updateColumnCardCount(targetColumn, targetCount);

      // Update swimlane count
      if (itemType === 'card') {
        const cardCount = targetSwimlane.querySelectorAll('.simple-kanban-card').length;
        DOMUtils.updateSwimlaneCount(targetSwimlane, cardCount);
      } else {
        const initiativeCount = targetSwimlane.querySelectorAll('.simple-kanban-initiative').length;
        DOMUtils.updateSwimlaneCount(targetSwimlane, initiativeCount);
      }

      return true;
    } catch (error) {
      console.error('Error moving item between columns:', error);
      return false;
    }
  }

  /**
   * Replace an existing card/initiative element with updated content
   */
  static updateItemInPlace(
    itemId: string,
    itemType: 'card' | 'initiative',
    newHTML: string,
    container: HTMLElement
  ): boolean {
    try {
      const className = itemType === 'card' ? 'simple-kanban-card' : 'simple-kanban-initiative';
      const itemElement = container.querySelector(`[data-id="${itemId}"].${className}`) as HTMLElement;
      
      if (!itemElement) {
        console.warn(`Item not found for update: ${itemId}`);
        return false;
      }

      // Create a temporary container to parse the new HTML
      const temp = document.createElement('div');
      temp.innerHTML = newHTML;
      const newElement = temp.firstElementChild as HTMLElement;

      if (!newElement) {
        console.warn('Invalid HTML provided for update');
        return false;
      }

      // Replace the old element with the new one
      itemElement.parentNode?.replaceChild(newElement, itemElement);

      return true;
    } catch (error) {
      console.error('Error updating item in place:', error);
      return false;
    }
  }

  /**
   * Execute a DOM update while preserving scroll position
   */
  static async withScrollPreservation(
    container: HTMLElement,
    updateFn: () => void | Promise<void>
  ): Promise<void> {
    const scrollPos = DOMUtils.saveScrollPosition(container);
    
    await updateFn();
    
    // Restore scroll position after DOM update
    requestAnimationFrame(() => {
      DOMUtils.restoreScrollPosition(container, scrollPos);
    });
  }
}


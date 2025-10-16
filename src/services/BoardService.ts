import { IBoardRenderer, BoardData, Card, Initiative } from '../types';
import { BoardRenderer } from '../board-renderer';
import { DOMUtils } from '../dom-utils';

export class BoardService {
  private renderer: IBoardRenderer;

  constructor(renderer: IBoardRenderer = new BoardRenderer()) {
    this.renderer = renderer;
  }

  renderBoard(container: HTMLElement, boardData: BoardData, cards: Map<string, Card>, initiatives: Map<string, Initiative>): void {
    this.renderer.render(container, boardData, cards, initiatives);
  }

  showNoBoardMessage(container: HTMLElement): void {
    this.renderer.showNoBoardMessage(container);
  }

  refreshBoardContent(container: HTMLElement, boardData: BoardData, cards: Map<string, Card>, initiatives: Map<string, Initiative>): void {
    // Preserve scroll position during refresh
    DOMUtils.withScrollPreservation(container, () => {
      this.renderer.render(container, boardData, cards, initiatives);
    });
  }

  /**
   * Update a single card in the DOM without full refresh
   */
  updateCard(cardId: string, card: Card, allCards: Map<string, Card>, container: HTMLElement): boolean {
    if (!(this.renderer instanceof BoardRenderer)) {
      return false;
    }
    const newHTML = this.renderer.renderCardHTML(card, allCards);
    return DOMUtils.updateItemInPlace(cardId, 'card', newHTML, container);
  }

  /**
   * Update a single initiative in the DOM without full refresh
   */
  updateInitiative(initiativeId: string, initiative: Initiative, container: HTMLElement): boolean {
    if (!(this.renderer instanceof BoardRenderer)) {
      return false;
    }
    const newHTML = this.renderer.renderInitiativeHTML(initiative);
    return DOMUtils.updateItemInPlace(initiativeId, 'initiative', newHTML, container);
  }

  /**
   * Move an item between columns in the DOM without full refresh
   */
  moveItemBetweenColumns(
    itemId: string,
    itemType: 'card' | 'initiative',
    sourceColumnId: string,
    targetColumnId: string,
    container: HTMLElement
  ): boolean {
    return DOMUtils.moveItemBetweenColumns(itemId, itemType, sourceColumnId, targetColumnId, container);
  }

  getContainer(containerEl: HTMLElement): HTMLElement {
    return containerEl.children[1] as HTMLElement;
  }
}

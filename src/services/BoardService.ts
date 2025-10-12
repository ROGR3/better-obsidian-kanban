import { IBoardRenderer, BoardData, Card, Initiative } from '../types';
import { BoardRenderer } from '../board-renderer';

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
    // Just update the content without re-attaching event listeners
    this.renderer.render(container, boardData, cards, initiatives);
  }

  getContainer(containerEl: HTMLElement): HTMLElement {
    return containerEl.children[1] as HTMLElement;
  }
}

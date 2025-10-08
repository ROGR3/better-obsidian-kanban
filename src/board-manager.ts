import { App, TFile } from 'obsidian';
import { BoardData, Card, Initiative, ModalData } from './types';
import { FrontmatterParser } from './frontmatter-parser';
import { ModalManager } from './modal-manager';

export class BoardManager {
  private app: App;
  private filePath: string | null = null;
  private boardData: BoardData | null = null;
  private cards: Map<string, Card> = new Map();
  private initiatives: Map<string, Initiative> = new Map();

  constructor(app: App) {
    this.app = app;
  }

  async loadBoardFromFile(filePath: string): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!file || !(file instanceof TFile)) {
        throw new Error('File not found');
      }

      this.filePath = filePath;
      const content = await this.app.vault.read(file);
      const frontmatter = FrontmatterParser.parseFrontmatter(content);

      if (!frontmatter) {
        throw new Error('No valid frontmatter found');
      }

      this.boardData = {
        columns: frontmatter.columns || [],
        items: frontmatter.items || [],
        settings: frontmatter.settings || {
          allowMarkdown: true,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm'
        }
      };

      // Clear existing data
      this.cards.clear();
      this.initiatives.clear();

      // Load items from frontmatter
      if (frontmatter.items) {
        for (const item of frontmatter.items) {
          if (item.type === 'card') {
            this.cards.set(item.id, {
              id: item.id,
              content: item.note || '',
              metadata: {
                title: item.name,
                status: item.status,
                initiative: item.initiative || '',
                predecessors: item.predecessors || [],
                successors: item.successors || [],
                date: item.date,
                priority: 'medium'
              }
            });
          } else if (item.type === 'initiative') {
            this.initiatives.set(item.id, {
              id: item.id,
              content: item.note || '',
              metadata: {
                title: item.name,
                status: item.status,
                description: item.description || '',
                date: item.date,
                priority: 'medium'
              }
            });
          }
        }
      }

    } catch (error) {
      console.error('Error loading board from file:', error);
      throw error;
    }
  }

  async saveBoardToFile(): Promise<void> {
    if (!this.filePath) return;

    try {
      const file = this.app.vault.getAbstractFileByPath(this.filePath);
      if (!file || !(file instanceof TFile)) return;

      const content = await this.app.vault.read(file);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');

      // Create new items array
      const items: any[] = [];
      
      // Add cards
      this.cards.forEach(card => {
        items.push({
          id: card.id,
          name: card.metadata.title,
          note: card.content,
          status: card.metadata.status,
          date: card.metadata.date,
          type: 'card',
          initiative: card.metadata.initiative,
          predecessors: card.metadata.predecessors,
          successors: card.metadata.successors
        });
      });

      // Add initiatives
      this.initiatives.forEach(initiative => {
        items.push({
          id: initiative.id,
          name: initiative.metadata.title,
          note: initiative.content,
          status: initiative.metadata.status,
          date: initiative.metadata.date,
          type: 'initiative',
          description: initiative.metadata.description
        });
      });

      // Create new frontmatter
      const newFrontmatter = `---
kanban-plugin: board
columns: ${JSON.stringify(this.boardData?.columns || [])}
items: ${JSON.stringify(items)}
settings: ${JSON.stringify(this.boardData?.settings || {})}
---`;

      const newContent = newFrontmatter + '\n' + bodyContent;
      await this.app.vault.modify(file, newContent);

    } catch (error) {
      console.error('Error saving board to file:', error);
    }
  }

  async addCardToColumn(columnId: string): Promise<void> {
    const cardData = await ModalManager.showCardModal('Add Card', {
      title: '',
      description: '',
      initiative: '',
      priority: 'medium'
    });
    if (!cardData) return;

    const cardId = 'card_' + Date.now();
    const newCard: Card = {
      id: cardId,
      content: cardData.description,
      metadata: {
        title: cardData.title,
        status: columnId,
        initiative: cardData.initiative,
        predecessors: [],
        successors: [],
        date: new Date().toISOString().split('T')[0],
        priority: cardData.priority
      }
    };

    this.cards.set(cardId, newCard);
    await this.saveBoardToFile();
  }

  async addInitiativeToColumn(columnId: string): Promise<void> {
    const initiativeData = await ModalManager.showInitiativeModal('Add Initiative', {
      title: '',
      description: '',
      priority: 'medium'
    });
    if (!initiativeData) return;

    const initiativeId = 'init_' + Date.now();
    const newInitiative: Initiative = {
      id: initiativeId,
      content: initiativeData.description,
      metadata: {
        title: initiativeData.title,
        status: columnId,
        description: initiativeData.description,
        date: new Date().toISOString().split('T')[0],
        priority: initiativeData.priority
      }
    };

    this.initiatives.set(initiativeId, newInitiative);
    await this.saveBoardToFile();
  }

  async editCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) return;

    const cardData = await ModalManager.showCardModal('Edit Card', {
      title: card.metadata.title,
      description: card.content,
      initiative: card.metadata.initiative,
      priority: card.metadata.priority
    });
    if (!cardData) return;

    card.metadata.title = cardData.title;
    card.content = cardData.description;
    card.metadata.initiative = cardData.initiative;
    card.metadata.priority = cardData.priority;

    await this.saveBoardToFile();
  }

  async editInitiative(initiativeId: string): Promise<void> {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return;

    const initiativeData = await ModalManager.showInitiativeModal('Edit Initiative', {
      title: initiative.metadata.title,
      description: initiative.content,
      priority: initiative.metadata.priority
    });
    if (!initiativeData) return;

    initiative.metadata.title = initiativeData.title;
    initiative.content = initiativeData.description;
    initiative.metadata.priority = initiativeData.priority;

    await this.saveBoardToFile();
  }

  async deleteCard(cardId: string): Promise<void> {
    const confirmed = await ModalManager.showConfirmModal('Delete Card', 'Are you sure you want to delete this card?');
    if (!confirmed) return;

    this.cards.delete(cardId);
    await this.saveBoardToFile();
  }

  async deleteInitiative(initiativeId: string): Promise<void> {
    const confirmed = await ModalManager.showConfirmModal('Delete Initiative', 'Are you sure you want to delete this initiative?');
    if (!confirmed) return;

    this.initiatives.delete(initiativeId);
    await this.saveBoardToFile();
  }

  async moveCardToColumn(cardId: string, newColumnId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) return;

    card.metadata.status = newColumnId;
    await this.saveBoardToFile();
  }

  async moveInitiativeToColumn(initiativeId: string, newColumnId: string): Promise<void> {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return;

    initiative.metadata.status = newColumnId;
    await this.saveBoardToFile();
  }

  async reorderItem(draggedId: string, targetId: string, isBefore: boolean, itemType: 'card' | 'initiative'): Promise<void> {
    console.log(`Reordering ${itemType}: ${draggedId} ${isBefore ? 'before' : 'after'} ${targetId}`);
    // For now, just reload the board to show visual feedback
    // TODO: Implement actual reordering logic
  }

  // Getters
  getBoardData(): BoardData | null {
    return this.boardData;
  }

  getCards(): Map<string, Card> {
    return this.cards;
  }

  getInitiatives(): Map<string, Initiative> {
    return this.initiatives;
  }

  getFilePath(): string | null {
    return this.filePath;
  }
}

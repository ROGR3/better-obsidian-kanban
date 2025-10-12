import { App, TFile } from 'obsidian';
import { BoardData, Card, Initiative, IBoardManager, StatusHistoryEntry } from './types';
import { FrontmatterParser } from './frontmatter-parser';
import { ModalManager } from './modal-manager';
import { HistoryService } from './services/HistoryService';

export class BoardManager implements IBoardManager {
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
            const card: Card = {
              id: item.id,
              content: item.note || '',
              metadata: {
                title: item.name,
                status: item.status,
                initiative: item.initiative || '',
                predecessors: item.predecessors || [],
                successors: item.successors || [],
                date: item.date,
                tags: item.tags || [],
                archived: item.archived || false,
                history: item.history || []
              }
            };
            
            // Initialize history for existing cards if they don't have it
            if (!card.metadata.history || card.metadata.history.length === 0) {
              HistoryService.initializeCardHistory(card);
            }
            
            this.cards.set(item.id, card);
          } else if (item.type === 'initiative') {
            this.initiatives.set(item.id, {
              id: item.id,
              content: item.note || '',
              metadata: {
                title: item.name,
                status: item.status,
                description: item.description || '',
                date: item.date,
                tags: item.tags || [],
                archived: item.archived || false
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
          successors: card.metadata.successors,
          history: card.metadata.history || []
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
    const availableCards = Array.from(this.cards.values()).map(card => ({
      id: card.id,
      title: card.metadata.title
    }));

    const availableInitiatives = Array.from(this.initiatives.values()).map(initiative => ({
      id: initiative.id,
      title: initiative.metadata.title
    }));

    const cardData = await ModalManager.showCardModal('Add Card', {
      title: '',
      description: '',
      initiative: '',
      tags: []
    }, availableCards, availableInitiatives);
    if (!cardData) return;

    const cardId = 'card_' + Date.now();
    
    // Handle relationships
    let predecessors: string[] = [];
    let successors: string[] = [];
    
    if (cardData.linkedCard && cardData.relationshipType) {
      if (cardData.relationshipType === 'predecessor') {
        predecessors = [cardData.linkedCard];
        // Add this card as successor to the linked card
        const linkedCard = this.cards.get(cardData.linkedCard);
        if (linkedCard) {
          if (!linkedCard.metadata.successors) {
            linkedCard.metadata.successors = [];
          }
          linkedCard.metadata.successors.push(cardId);
        }
      } else if (cardData.relationshipType === 'successor') {
        successors = [cardData.linkedCard];
        // Add this card as predecessor to the linked card
        const linkedCard = this.cards.get(cardData.linkedCard);
        if (linkedCard) {
          if (!linkedCard.metadata.predecessors) {
            linkedCard.metadata.predecessors = [];
          }
          linkedCard.metadata.predecessors.push(cardId);
        }
      }
      // For sibling relationships, we don't need to modify the linked card
    }

    const newCard: Card = {
      id: cardId,
      content: cardData.description,
      metadata: {
        title: cardData.title,
        status: columnId,
        initiative: cardData.initiative,
        predecessors: predecessors,
        successors: successors,
        date: new Date().toISOString().split('T')[0],
        tags: cardData.tags,
        archived: false,
        history: []
      }
    };

    // Initialize history for the new card
    HistoryService.initializeCardHistory(newCard);

    this.cards.set(cardId, newCard);
    await this.saveBoardToFile();
  }

  async addInitiativeToColumn(columnId: string): Promise<void> {
    const initiativeData = await ModalManager.showInitiativeModal('Add Initiative', {
      title: '',
      description: '',
      tags: []
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
        tags: initiativeData.tags,
        archived: false
      }
    };

    this.initiatives.set(initiativeId, newInitiative);
    await this.saveBoardToFile();
  }

  async editCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) return;

    const availableCards = Array.from(this.cards.values())
      .filter(c => c.id !== cardId) // Exclude current card from available cards
      .map(card => ({
        id: card.id,
        title: card.metadata.title
      }));

    const availableInitiatives = Array.from(this.initiatives.values()).map(initiative => ({
      id: initiative.id,
      title: initiative.metadata.title
    }));

    const cardData = await ModalManager.showCardModal('Edit Card', {
      title: card.metadata.title,
      description: card.content,
      initiative: card.metadata.initiative,
      tags: card.metadata.tags,
      linkedCard: card.metadata.predecessors?.[0] || card.metadata.successors?.[0] || undefined,
      relationshipType: card.metadata.predecessors?.length ? 'predecessor' : 
                      card.metadata.successors?.length ? 'successor' : undefined
    }, availableCards, availableInitiatives);
    if (!cardData) return;

    // Handle relationship changes
    const oldPredecessors = card.metadata.predecessors || [];
    const oldSuccessors = card.metadata.successors || [];

    // Remove old relationships
    oldPredecessors.forEach(predId => {
      const predCard = this.cards.get(predId);
      if (predCard && predCard.metadata.successors) {
        predCard.metadata.successors = predCard.metadata.successors.filter(id => id !== cardId);
      }
    });
    oldSuccessors.forEach(succId => {
      const succCard = this.cards.get(succId);
      if (succCard && succCard.metadata.predecessors) {
        succCard.metadata.predecessors = succCard.metadata.predecessors.filter(id => id !== cardId);
      }
    });

    // Add new relationships
    let predecessors: string[] = [];
    let successors: string[] = [];
    
    if (cardData.linkedCard && cardData.relationshipType) {
      if (cardData.relationshipType === 'predecessor') {
        predecessors = [cardData.linkedCard];
        const linkedCard = this.cards.get(cardData.linkedCard);
        if (linkedCard) {
          if (!linkedCard.metadata.successors) {
            linkedCard.metadata.successors = [];
          }
          if (!linkedCard.metadata.successors.includes(cardId)) {
            linkedCard.metadata.successors.push(cardId);
          }
        }
      } else if (cardData.relationshipType === 'successor') {
        successors = [cardData.linkedCard];
        const linkedCard = this.cards.get(cardData.linkedCard);
        if (linkedCard) {
          if (!linkedCard.metadata.predecessors) {
            linkedCard.metadata.predecessors = [];
          }
          if (!linkedCard.metadata.predecessors.includes(cardId)) {
            linkedCard.metadata.predecessors.push(cardId);
          }
        }
      }
    }

    card.metadata.title = cardData.title;
    card.content = cardData.description;
    card.metadata.initiative = cardData.initiative;
    card.metadata.tags = cardData.tags;
    card.metadata.predecessors = predecessors;
    card.metadata.successors = successors;

    await this.saveBoardToFile();
  }

  async editInitiative(initiativeId: string): Promise<void> {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return;

    const initiativeData = await ModalManager.showInitiativeModal('Edit Initiative', {
      title: initiative.metadata.title,
      description: initiative.content,
      tags: initiative.metadata.tags
    });
    if (!initiativeData) return;

    initiative.metadata.title = initiativeData.title;
    initiative.content = initiativeData.description;
    initiative.metadata.tags = initiativeData.tags;

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

  async archiveCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) return;

    card.metadata.archived = true;
    await this.saveBoardToFile();
  }

  async unarchiveCard(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) return;

    card.metadata.archived = false;
    await this.saveBoardToFile();
  }

  async archiveInitiative(initiativeId: string): Promise<void> {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return;

    initiative.metadata.archived = true;
    await this.saveBoardToFile();
  }

  async unarchiveInitiative(initiativeId: string): Promise<void> {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return;

    initiative.metadata.archived = false;
    await this.saveBoardToFile();
  }

  // History-related methods
  getCardHistory(cardId: string): StatusHistoryEntry[] {
    const card = this.cards.get(cardId);
    return card?.metadata.history || [];
  }

  getCardTimeInStatus(cardId: string, status: string): number {
    const card = this.cards.get(cardId);
    if (!card) return 0;
    return HistoryService.getTimeInStatus(card, status);
  }

  getCardCurrentStatusDuration(cardId: string): number {
    const card = this.cards.get(cardId);
    if (!card) return 0;
    return HistoryService.getCurrentStatusDuration(card);
  }

  getCardStatusSummary(cardId: string): { [status: string]: number } {
    const card = this.cards.get(cardId);
    if (!card) return {};
    return HistoryService.getStatusSummary(card);
  }

  async moveCardToColumn(cardId: string, newColumnId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card) return;

    // Update history when moving cards
    HistoryService.updateCardHistory(card, newColumnId);
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

import { App, TFile } from 'obsidian';
import { FileManager } from './FileManager';
import { DependencyManager } from './DependencyManager';
import { BoardState, BoardConfig, CardFile, InitiativeFile, CardMetadata, InitiativeMetadata, ValidationResult } from '../types/board';

export class EnhancedBoardManager {
  private app: App;
  private fileManager: FileManager;
  private dependencyManager: DependencyManager;
  private boardState: BoardState | null = null;
  private stateReceivers: Array<(state: BoardState) => void> = [];

  constructor(app: App, boardPath: string) {
    this.app = app;
    this.fileManager = new FileManager(app, boardPath);
    this.dependencyManager = new DependencyManager();
  }

  /**
   * Initialize the board manager
   */
  async initialize(): Promise<void> {
    console.log('EnhancedBoardManager: Initializing with board path:', this.boardPath);
    await this.fileManager.ensureBoardStructure();
    console.log('EnhancedBoardManager: Board structure ensured');
    await this.loadBoardState();
    console.log('EnhancedBoardManager: Board state loaded');
  }

  /**
   * Load the current board state
   */
  async loadBoardState(): Promise<BoardState | null> {
    try {
      console.log('EnhancedBoardManager: Loading board state from:', this.boardPath);
      this.boardState = await this.fileManager.loadBoardState();
      console.log('EnhancedBoardManager: Board state loaded:', this.boardState);
      if (this.boardState) {
        console.log('EnhancedBoardManager: Building dependency graph with', this.boardState.cards.size, 'cards');
        this.dependencyManager.buildDependencyGraph(this.boardState.cards);
        this.notifyStateReceivers();
        console.log('EnhancedBoardManager: State receivers notified');
      } else {
        console.log('EnhancedBoardManager: No board state loaded');
      }
      return this.boardState;
    } catch (error) {
      console.error('EnhancedBoardManager: Failed to load board state:', error);
      return null;
    }
  }

  /**
   * Get the current board state
   */
  getBoardState(): BoardState | null {
    return this.boardState;
  }

  /**
   * Get board configuration
   */
  getBoardConfig(): BoardConfig | null {
    return this.boardState?.config || null;
  }

  /**
   * Get all cards
   */
  getCards(): Map<string, CardFile> {
    return this.boardState?.cards || new Map();
  }

  /**
   * Get all initiatives
   */
  getInitiatives(): Map<string, InitiativeFile> {
    return this.boardState?.initiatives || new Map();
  }

  /**
   * Get a specific card
   */
  getCard(cardId: string): CardFile | null {
    return this.boardState?.cards.get(cardId) || null;
  }

  /**
   * Get a specific initiative
   */
  getInitiative(initiativeId: string): InitiativeFile | null {
    return this.boardState?.initiatives.get(initiativeId) || null;
  }

  /**
   * Create a new card
   */
  async createCard(metadata: CardMetadata, content: string = ''): Promise<string> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    // Generate unique card ID
    const cardId = this.generateCardId();
    
    // Set default values
    const cardMetadata: CardMetadata = {
      title: metadata.title || 'New Card',
      status: metadata.status || 'backlog',
      predecessors: metadata.predecessors || [],
      successors: metadata.successors || [],
      created_date: new Date().toISOString().split('T')[0],
      updated_date: new Date().toISOString().split('T')[0],
      ...metadata
    };

    try {
      await this.fileManager.saveCard(cardId, cardMetadata, content);
      await this.loadBoardState(); // Reload to get the new card
      return cardId;
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }

  /**
   * Update a card
   */
  async updateCard(cardId: string, metadata: Partial<CardMetadata>, content?: string): Promise<void> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    const existingCard = this.boardState.cards.get(cardId);
    if (!existingCard) {
      throw new Error(`Card ${cardId} not found`);
    }

    const updatedMetadata: CardMetadata = {
      ...existingCard.metadata,
      ...metadata,
      updated_date: new Date().toISOString().split('T')[0]
    };

    const updatedContent = content !== undefined ? content : existingCard.content;

    try {
      await this.fileManager.saveCard(cardId, updatedMetadata, updatedContent);
      await this.loadBoardState(); // Reload to get the updated card
    } catch (error) {
      console.error('Failed to update card:', error);
      throw error;
    }
  }

  /**
   * Delete a card
   */
  async deleteCard(cardId: string): Promise<void> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    try {
      await this.fileManager.deleteCard(cardId);
      await this.loadBoardState(); // Reload to reflect the deletion
    } catch (error) {
      console.error('Failed to delete card:', error);
      throw error;
    }
  }

  /**
   * Create a new initiative
   */
  async createInitiative(metadata: InitiativeMetadata, content: string = ''): Promise<string> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    // Generate unique initiative ID
    const initiativeId = this.generateInitiativeId();
    
    // Set default values
    const initiativeMetadata: InitiativeMetadata = {
      title: metadata.title || 'New Initiative',
      status: metadata.status || 'planning',
      created_date: new Date().toISOString().split('T')[0],
      updated_date: new Date().toISOString().split('T')[0],
      ...metadata
    };

    try {
      await this.fileManager.saveInitiative(initiativeId, initiativeMetadata, content);
      await this.loadBoardState(); // Reload to get the new initiative
      return initiativeId;
    } catch (error) {
      console.error('Failed to create initiative:', error);
      throw error;
    }
  }

  /**
   * Update an initiative
   */
  async updateInitiative(initiativeId: string, metadata: Partial<InitiativeMetadata>, content?: string): Promise<void> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    const existingInitiative = this.boardState.initiatives.get(initiativeId);
    if (!existingInitiative) {
      throw new Error(`Initiative ${initiativeId} not found`);
    }

    const updatedMetadata: InitiativeMetadata = {
      ...existingInitiative.metadata,
      ...metadata,
      updated_date: new Date().toISOString().split('T')[0]
    };

    const updatedContent = content !== undefined ? content : existingInitiative.content;

    try {
      await this.fileManager.saveInitiative(initiativeId, updatedMetadata, updatedContent);
      await this.loadBoardState(); // Reload to get the updated initiative
    } catch (error) {
      console.error('Failed to update initiative:', error);
      throw error;
    }
  }

  /**
   * Delete an initiative
   */
  async deleteInitiative(initiativeId: string): Promise<void> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    try {
      await this.fileManager.deleteInitiative(initiativeId);
      await this.loadBoardState(); // Reload to reflect the deletion
    } catch (error) {
      console.error('Failed to delete initiative:', error);
      throw error;
    }
  }

  /**
   * Update board configuration
   */
  async updateBoardConfig(config: BoardConfig): Promise<void> {
    try {
      await this.fileManager.saveBoardConfig(config);
      await this.loadBoardState(); // Reload to get the updated config
    } catch (error) {
      console.error('Failed to update board config:', error);
      throw error;
    }
  }

  /**
   * Move a card to a different status/column
   */
  async moveCard(cardId: string, newStatus: string): Promise<ValidationResult> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    const card = this.boardState.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    // Validate the move
    const validationResult = this.dependencyManager.validateCardDependencies({
      card: { ...card, metadata: { ...card.metadata, status: newStatus } },
      allCards: this.boardState.cards,
      boardConfig: this.boardState.config
    });

    if (validationResult.isValid) {
      await this.updateCard(cardId, { status: newStatus });
    }

    return validationResult;
  }

  /**
   * Add a dependency between two cards
   */
  async addDependency(fromCardId: string, toCardId: string): Promise<void> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    const fromCard = this.boardState.cards.get(fromCardId);
    const toCard = this.boardState.cards.get(toCardId);

    if (!fromCard || !toCard) {
      throw new Error('One or both cards not found');
    }

    // Add to successors of fromCard
    const fromSuccessors = [...fromCard.metadata.successors];
    if (!fromSuccessors.includes(toCardId)) {
      fromSuccessors.push(toCardId);
    }

    // Add to predecessors of toCard
    const toPredecessors = [...toCard.metadata.predecessors];
    if (!toPredecessors.includes(fromCardId)) {
      toPredecessors.push(fromCardId);
    }

    // Update both cards
    await Promise.all([
      this.updateCard(fromCardId, { successors: fromSuccessors }),
      this.updateCard(toCardId, { predecessors: toPredecessors })
    ]);
  }

  /**
   * Remove a dependency between two cards
   */
  async removeDependency(fromCardId: string, toCardId: string): Promise<void> {
    if (!this.boardState) {
      throw new Error('Board not initialized');
    }

    const fromCard = this.boardState.cards.get(fromCardId);
    const toCard = this.boardState.cards.get(toCardId);

    if (!fromCard || !toCard) {
      throw new Error('One or both cards not found');
    }

    // Remove from successors of fromCard
    const fromSuccessors = fromCard.metadata.successors.filter(id => id !== toCardId);

    // Remove from predecessors of toCard
    const toPredecessors = toCard.metadata.predecessors.filter(id => id !== fromCardId);

    // Update both cards
    await Promise.all([
      this.updateCard(fromCardId, { successors: fromSuccessors }),
      this.updateCard(toCardId, { predecessors: toPredecessors })
    ]);
  }

  /**
   * Get cards grouped by status
   */
  getCardsByStatus(): Map<string, CardFile[]> {
    const cardsByStatus = new Map<string, CardFile[]>();
    
    if (!this.boardState) {
      return cardsByStatus;
    }

    for (const card of this.boardState.cards.values()) {
      const status = card.metadata.status;
      if (!cardsByStatus.has(status)) {
        cardsByStatus.set(status, []);
      }
      cardsByStatus.get(status)!.push(card);
    }

    return cardsByStatus;
  }

  /**
   * Get cards for a specific initiative
   */
  getCardsForInitiative(initiativeId: string): CardFile[] {
    if (!this.boardState) {
      return [];
    }

    return Array.from(this.boardState.cards.values()).filter(
      card => card.metadata.initiative === initiativeId
    );
  }

  /**
   * Get dependency manager
   */
  getDependencyManager(): DependencyManager {
    return this.dependencyManager;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: BoardState) => void): () => void {
    this.stateReceivers.push(callback);
    return () => {
      const index = this.stateReceivers.indexOf(callback);
      if (index > -1) {
        this.stateReceivers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all state receivers
   */
  private notifyStateReceivers(): void {
    if (this.boardState) {
      this.stateReceivers.forEach(callback => callback(this.boardState!));
    }
  }

  /**
   * Generate a unique card ID
   */
  private generateCardId(): string {
    if (!this.boardState) {
      return '0001';
    }

    const existingIds = Array.from(this.boardState.cards.keys());
    let counter = 1;
    
    while (true) {
      const id = counter.toString().padStart(4, '0');
      if (!existingIds.includes(id)) {
        return id;
      }
      counter++;
    }
  }

  /**
   * Generate a unique initiative ID
   */
  private generateInitiativeId(): string {
    if (!this.boardState) {
      return 'InitiativeA';
    }

    const existingIds = Array.from(this.boardState.initiatives.keys());
    let counter = 1;
    
    while (true) {
      const id = `Initiative${String.fromCharCode(64 + counter)}`;
      if (!existingIds.includes(id)) {
        return id;
      }
      counter++;
    }
  }
}

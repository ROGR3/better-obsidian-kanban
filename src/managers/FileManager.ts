import { App, TFile, TFolder, normalizePath } from 'obsidian';
import { BoardConfig, BoardState, CardFile, InitiativeFile, CardMetadata, InitiativeMetadata } from '../types/board';

export class FileManager {
  private app: App;
  private boardPath: string;

  constructor(app: App, boardPath: string) {
    this.app = app;
    this.boardPath = boardPath;
  }

  /**
   * Get the board folder path
   */
  getBoardPath(): string {
    return this.boardPath;
  }

  /**
   * Get the cards folder path
   */
  getCardsPath(): string {
    return normalizePath(`${this.boardPath}/cards`);
  }

  /**
   * Get the initiatives folder path
   */
  getInitiativesPath(): string {
    return normalizePath(`${this.boardPath}/initiatives`);
  }

  /**
   * Get the board config file path
   */
  getBoardConfigPath(): string {
    return normalizePath(`${this.boardPath}/board.json`);
  }

  /**
   * Load board configuration from board.json
   */
  async loadBoardConfig(): Promise<BoardConfig | null> {
    try {
      const configFile = this.app.vault.getAbstractFileByPath(this.getBoardConfigPath());
      if (!configFile || !(configFile instanceof TFile)) {
        return null;
      }

      const content = await this.app.vault.read(configFile);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load board config:', error);
      return null;
    }
  }

  /**
   * Save board configuration to board.json
   */
  async saveBoardConfig(config: BoardConfig): Promise<void> {
    try {
      const content = JSON.stringify(config, null, 2);
      await this.app.vault.adapter.write(this.getBoardConfigPath(), content);
    } catch (error) {
      console.error('Failed to save board config:', error);
      throw error;
    }
  }

  /**
   * Load all card files from the cards folder
   */
  async loadCards(): Promise<Map<string, CardFile>> {
    const cards = new Map<string, CardFile>();
    
    try {
      const cardsFolder = this.app.vault.getAbstractFileByPath(this.getCardsPath());
      if (!cardsFolder || !(cardsFolder instanceof TFolder)) {
        return cards;
      }

      const cardFiles = cardsFolder.children.filter((file): file is TFile => 
        file instanceof TFile && file.extension === 'md'
      );

      for (const file of cardFiles) {
        try {
          const content = await this.app.vault.read(file);
          const metadata = this.parseCardMetadata(content);
          const cardId = file.basename;

          cards.set(cardId, {
            path: file.path,
            metadata,
            content,
            lastModified: file.stat.mtime
          });
        } catch (error) {
          console.error(`Failed to load card ${file.path}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
    }

    return cards;
  }

  /**
   * Load all initiative files from the initiatives folder
   */
  async loadInitiatives(): Promise<Map<string, InitiativeFile>> {
    const initiatives = new Map<string, InitiativeFile>();
    
    try {
      const initiativesFolder = this.app.vault.getAbstractFileByPath(this.getInitiativesPath());
      if (!initiativesFolder || !(initiativesFolder instanceof TFolder)) {
        return initiatives;
      }

      const initiativeFiles = initiativesFolder.children.filter((file): file is TFile => 
        file instanceof TFile && file.extension === 'md'
      );

      for (const file of initiativeFiles) {
        try {
          const content = await this.app.vault.read(file);
          const metadata = this.parseInitiativeMetadata(content);
          const initiativeId = file.basename;

          initiatives.set(initiativeId, {
            path: file.path,
            metadata,
            content,
            lastModified: file.stat.mtime
          });
        } catch (error) {
          console.error(`Failed to load initiative ${file.path}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load initiatives:', error);
    }

    return initiatives;
  }

  /**
   * Load complete board state
   */
  async loadBoardState(): Promise<BoardState | null> {
    try {
      console.log('FileManager: Loading board state from:', this.boardPath);
      const config = await this.loadBoardConfig();
      console.log('FileManager: Board config loaded:', config);
      if (!config) {
        console.log('FileManager: No board config found');
        return null;
      }

      const [cards, initiatives] = await Promise.all([
        this.loadCards(),
        this.loadInitiatives()
      ]);

      console.log('FileManager: Loaded', cards.size, 'cards and', initiatives.size, 'initiatives');

      return {
        config,
        cards,
        initiatives,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('FileManager: Failed to load board state:', error);
      return null;
    }
  }

  /**
   * Save a card file
   */
  async saveCard(cardId: string, metadata: CardMetadata, content: string): Promise<void> {
    try {
      const filePath = normalizePath(`${this.getCardsPath()}/${cardId}.md`);
      const frontmatter = this.generateFrontmatter(metadata);
      const fullContent = `${frontmatter}\n\n${content}`;
      
      await this.app.vault.adapter.write(filePath, fullContent);
    } catch (error) {
      console.error(`Failed to save card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Save an initiative file
   */
  async saveInitiative(initiativeId: string, metadata: InitiativeMetadata, content: string): Promise<void> {
    try {
      const filePath = normalizePath(`${this.getInitiativesPath()}/${initiativeId}.md`);
      const frontmatter = this.generateFrontmatter(metadata);
      const fullContent = `${frontmatter}\n\n${content}`;
      
      await this.app.vault.adapter.write(filePath, fullContent);
    } catch (error) {
      console.error(`Failed to save initiative ${initiativeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a card file
   */
  async deleteCard(cardId: string): Promise<void> {
    try {
      const filePath = normalizePath(`${this.getCardsPath()}/${cardId}.md`);
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await this.app.vault.delete(file);
      }
    } catch (error) {
      console.error(`Failed to delete card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an initiative file
   */
  async deleteInitiative(initiativeId: string): Promise<void> {
    try {
      const filePath = normalizePath(`${this.getInitiativesPath()}/${initiativeId}.md`);
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await this.app.vault.delete(file);
      }
    } catch (error) {
      console.error(`Failed to delete initiative ${initiativeId}:`, error);
      throw error;
    }
  }

  /**
   * Create the board folder structure if it doesn't exist
   */
  async ensureBoardStructure(): Promise<void> {
    try {
      // Create board folder
      if (!this.app.vault.getAbstractFileByPath(this.boardPath)) {
        await this.app.vault.createFolder(this.boardPath);
      }

      // Create cards folder
      if (!this.app.vault.getAbstractFileByPath(this.getCardsPath())) {
        await this.app.vault.createFolder(this.getCardsPath());
      }

      // Create initiatives folder
      if (!this.app.vault.getAbstractFileByPath(this.getInitiativesPath())) {
        await this.app.vault.createFolder(this.getInitiativesPath());
      }

      // Create default board config if it doesn't exist
      if (!this.app.vault.getAbstractFileByPath(this.getBoardConfigPath())) {
        const defaultConfig: BoardConfig = {
          columns: [
            { id: 'backlog', title: 'Backlog', color: '#8b5cf6', order: 0 },
            { id: 'in-progress', title: 'In Progress', color: '#3b82f6', order: 1 },
            { id: 'review', title: 'Review', color: '#f59e0b', order: 2 },
            { id: 'done', title: 'Done', color: '#10b981', order: 3 }
          ],
          settings: {
            wip_limits: {
              'in-progress': 5,
              'review': 3
            },
            dependency_rules: {
              enforce_predecessors: true,
              allow_parallel_work: false
            }
          }
        };
        await this.saveBoardConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to create board structure:', error);
      throw error;
    }
  }

  /**
   * Parse card metadata from markdown content
   */
  private parseCardMetadata(content: string): CardMetadata {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found in card file');
    }

    const frontmatter = frontmatterMatch[1];
    const metadata: CardMetadata = {
      title: '',
      status: 'backlog',
      predecessors: [],
      successors: []
    };

    // Parse YAML frontmatter
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        let parsedValue: any = value;

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            parsedValue = JSON.parse(value);
          } catch {
            // If JSON parsing fails, treat as comma-separated string
            parsedValue = value.slice(1, -1).split(',').map(s => s.trim()).filter(s => s);
          }
        }

        metadata[key] = parsedValue;
      }
    }

    return metadata;
  }

  /**
   * Parse initiative metadata from markdown content
   */
  private parseInitiativeMetadata(content: string): InitiativeMetadata {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found in initiative file');
    }

    const frontmatter = frontmatterMatch[1];
    const metadata: InitiativeMetadata = {
      title: '',
      status: 'planning'
    };

    // Parse YAML frontmatter
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        let parsedValue: any = value;

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            parsedValue = JSON.parse(value);
          } catch {
            // If JSON parsing fails, treat as comma-separated string
            parsedValue = value.slice(1, -1).split(',').map(s => s.trim()).filter(s => s);
          }
        }

        metadata[key] = parsedValue;
      }
    }

    return metadata;
  }

  /**
   * Generate frontmatter from metadata
   */
  private generateFrontmatter(metadata: CardMetadata | InitiativeMetadata): string {
    const lines = ['---'];
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          lines.push(`${key}: ${JSON.stringify(value)}`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      }
    }
    
    lines.push('---');
    return lines.join('\n');
  }
}

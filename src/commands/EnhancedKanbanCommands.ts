import { App, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { SimpleKanbanView, simpleKanbanViewType } from '../SimpleKanbanView';

export class EnhancedKanbanCommands {
  constructor(private app: App) {}

  /**
   * Create a new simple Kanban board
   */
  async createEnhancedKanbanBoard(folder?: TFolder): Promise<void> {
    try {
      const targetFolder = folder || this.app.fileManager.getNewFileParent(
        this.app.workspace.getActiveFile()?.path || ''
      );

      // Generate board name
      const boardName = this.generateBoardName(targetFolder);
      const boardPath = `${targetFolder.path}/${boardName}`;

      // Create the board structure
      await this.createBoardStructure(boardPath);

      // Open the board in a new leaf
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({
        type: simpleKanbanViewType,
        state: {}
      });

      // Show success message
      this.showNotice(`Created simple Kanban board: ${boardName}`);
    } catch (error) {
      console.error('Failed to create simple Kanban board:', error);
      this.showNotice('Failed to create simple Kanban board', true);
    }
  }

  /**
   * Open an existing simple Kanban board
   */
  async openEnhancedKanbanBoard(boardPath: string): Promise<void> {
    try {
      // Verify the board exists
      const boardFolder = this.app.vault.getAbstractFileByPath(boardPath);
      if (!boardFolder || !(boardFolder instanceof TFolder)) {
        this.showNotice('Board folder not found', true);
        return;
      }

      // Check if board.json exists
      const boardConfigPath = `${boardPath}/board.json`;
      const boardConfig = this.app.vault.getAbstractFileByPath(boardConfigPath);
      if (!boardConfig) {
        this.showNotice('Not a valid simple Kanban board', true);
        return;
      }

      // Open the board in a new leaf
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({
        type: simpleKanbanViewType,
        state: {}
      });

      this.showNotice(`Opened simple Kanban board: ${boardPath.split('/').pop()}`);
    } catch (error) {
      console.error('Failed to open simple Kanban board:', error);
      this.showNotice('Failed to open simple Kanban board', true);
    }
  }

  /**
   * Convert a folder to a simple Kanban board
   */
  async convertFolderToEnhancedKanban(folder: TFolder): Promise<void> {
    try {
      const boardPath = folder.path;

      // Check if already a board
      const boardConfigPath = `${boardPath}/board.json`;
      const existingConfig = this.app.vault.getAbstractFileByPath(boardConfigPath);
      if (existingConfig) {
        this.showNotice('Folder is already a simple Kanban board');
        return;
      }

      // Create the board structure
      await this.createBoardStructure(boardPath);

      // Open the board
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({
        type: simpleKanbanViewType,
        state: {}
      });

      this.showNotice(`Converted folder to simple Kanban board: ${folder.name}`);
    } catch (error) {
      console.error('Failed to convert folder to simple Kanban board:', error);
      this.showNotice('Failed to convert folder to simple Kanban board', true);
    }
  }

  /**
   * Find all enhanced Kanban boards in the vault
   */
  findEnhancedKanbanBoards(): string[] {
    const boards: string[] = [];
    
    const findBoards = (folder: TFolder) => {
      // Check if this folder is a board
      const boardConfigPath = `${folder.path}/board.json`;
      const boardConfig = this.app.vault.getAbstractFileByPath(boardConfigPath);
      if (boardConfig) {
        boards.push(folder.path);
      }

      // Recursively check subfolders
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          findBoards(child);
        }
      }
    };

    const rootFolder = this.app.vault.getRoot();
    if (rootFolder instanceof TFolder) {
      findBoards(rootFolder);
    }

    return boards;
  }

  /**
   * Create the basic board structure
   */
  private async createBoardStructure(boardPath: string): Promise<void> {
    // Create board.json
    const boardConfig = {
      columns: [
        { id: 'backlog', title: 'Backlog', order: 0, color: '#8B5CF6' },
        { id: 'in-progress', title: 'In Progress', order: 1, color: '#3B82F6' },
        { id: 'review', title: 'Review', order: 2, color: '#F59E0B' },
        { id: 'done', title: 'Done', order: 3, color: '#10B981' }
      ],
      settings: {
        allowMarkdown: true,
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm'
      }
    };

    await this.app.vault.create(`${boardPath}/board.json`, JSON.stringify(boardConfig, null, 2));

    // Create cards folder
    await this.app.vault.createFolder(`${boardPath}/cards`);

    // Create initiatives folder
    await this.app.vault.createFolder(`${boardPath}/initiatives`);
  }

  /**
   * Generate a unique board name
   */
  private generateBoardName(parentFolder: TFolder): string {
    const baseName = 'Simple Kanban Board';
    let counter = 1;
    let name = baseName;

    while (this.app.vault.getAbstractFileByPath(`${parentFolder.path}/${name}`)) {
      name = `${baseName} ${counter}`;
      counter++;
    }

    return name;
  }

  /**
   * Show a notice to the user
   */
  private showNotice(message: string, isError: boolean = false): void {
    if (isError) {
      console.error(message);
    } else {
      console.log(message);
    }
    
    // You could integrate with Obsidian's notification system here
    // For now, we'll just log to console
  }
}

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { EnhancedKanbanView } from './EnhancedKanbanView';
import { FileManager } from './managers/FileManager';

export const enhancedKanbanViewType = 'enhanced-kanban';
export const enhancedKanbanIcon = 'lucide-trello';

export class EnhancedKanbanViewType extends ItemView {
  private boardPath: string = '';
  private component: any;

  constructor(leaf: WorkspaceLeaf, boardPath: string) {
    super(leaf);
    this.boardPath = boardPath;
  }

  getViewType() {
    return enhancedKanbanViewType;
  }

  getIcon() {
    return enhancedKanbanIcon;
  }

  getDisplayText() {
    return `Enhanced Kanban - ${this.boardPath ? this.boardPath.split('/').pop() : 'No Board'}`;
  }

  async setState(state: any, result: any): Promise<void> {
    if (state.boardPath) {
      this.boardPath = state.boardPath;
    }
    await super.setState(state, result);
  }

  getState() {
    return {
      boardPath: this.boardPath
    };
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('enhanced-kanban-container');

    // Import the CSS
    this.addStyles();

    // If no board path is set, try to find one automatically
    if (!this.boardPath) {
      this.boardPath = this.findBoardInVault();
      console.log('EnhancedKanbanViewType: Found board path:', this.boardPath);
    }

    // Show loading state first
    container.innerHTML = `
      <div class="enhanced-kanban-loading">
        <div class="sk-pulse"></div>
        <p>Loading Enhanced Kanban Board...</p>
      </div>
    `;

    // Wait for the next tick to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.renderBoard(container);
  }

  private async renderBoard(container: HTMLElement) {
    try {
      // Only render if we have a board path
      if (this.boardPath) {
        // Try to load the board data first
        const fileManager = new FileManager(this.app, this.boardPath);
        const boardState = await fileManager.loadBoardState();
        
        if (boardState) {
          // Render a simple HTML version first
          this.renderSimpleBoard(container, boardState);
          
          // Then try to upgrade to React after a delay
          setTimeout(() => {
            this.tryReactUpgrade(container, boardState);
          }, 1000);
        } else {
          container.innerHTML = `
            <div class="enhanced-kanban-error">
              <h3>Failed to Load Board</h3>
              <p>Could not load board data from ${this.boardPath}</p>
              <p>Please check that the board.json file exists and is valid.</p>
            </div>
          `;
        }
      } else {
        // Show a message to create a board
        container.innerHTML = `
          <div class="enhanced-kanban-error">
            <h3>No Enhanced Kanban Board Found</h3>
            <p>Create your first Enhanced Kanban board using the command palette:</p>
            <p><strong>Commands available:</strong></p>
            <ul>
              <li><strong>Create new Enhanced Kanban board</strong> - Create a new board</li>
              <li><strong>Convert folder to Enhanced Kanban board</strong> - Convert existing folder</li>
            </ul>
            <p>Or right-click a folder and select "Convert folder to Enhanced Kanban board"</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('EnhancedKanbanViewType: Error rendering board:', error);
      container.innerHTML = `
        <div class="enhanced-kanban-error">
          <h3>Error Loading Board</h3>
          <p>An error occurred while loading the board: ${error.message}</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      `;
    }
  }

  private renderSimpleBoard(container: HTMLElement, boardState: any) {
    container.innerHTML = `
      <div class="enhanced-kanban">
        <div class="enhanced-kanban-header">
          <h2>Enhanced Kanban Board</h2>
          <div class="enhanced-kanban-actions">
            <button onclick="alert('Create Initiative - Coming Soon')">New Initiative</button>
            <button onclick="alert('Dependencies - Coming Soon')">Show Dependencies</button>
          </div>
        </div>
        <div class="enhanced-kanban-board">
          ${boardState.config.columns
            .sort((a: any, b: any) => a.order - b.order)
            .map((column: any) => `
              <div class="enhanced-kanban-column" style="background-color: ${column.color}20; border-left: 4px solid ${column.color}">
                <div class="enhanced-kanban-column-header">
                  <h3>${column.title}</h3>
                  <span class="enhanced-kanban-column-count">${this.getCardsInColumn(boardState, column.id).length}</span>
                </div>
                <div class="enhanced-kanban-column-content">
                  ${this.getCardsInColumn(boardState, column.id)
                    .map((card: any) => `
                      <div class="enhanced-kanban-card" onclick="this.openCard('${card.id}')">
                        <div class="enhanced-kanban-card-title">${card.metadata.title}</div>
                        <div class="enhanced-kanban-card-meta">
                          ${card.metadata.initiative ? `<span class="initiative-tag">${card.metadata.initiative}</span>` : ''}
                          ${card.metadata.predecessors?.length > 0 ? `<span class="dependency-indicator">📋</span>` : ''}
                        </div>
                      </div>
                    `).join('')}
                </div>
              </div>
            `).join('')}
        </div>
        <div class="enhanced-kanban-footer">
          <p>Simple HTML version - React upgrade coming...</p>
        </div>
      </div>
    `;
  }

  private getCardsInColumn(boardState: any, columnId: string) {
    return Array.from(boardState.cards.values()).filter((card: any) => card.metadata.status === columnId);
  }

  private tryReactUpgrade(container: HTMLElement, boardState: any) {
    try {
      // Create a fresh container for React
      const reactContainer = document.createElement('div');
      reactContainer.className = 'enhanced-kanban-react-container';
      container.appendChild(reactContainer);
      
      // Try to render React component
      this.component = render(
        EnhancedKanbanView({
          app: this.app,
          leaf: this.leaf,
          boardPath: this.boardPath
        }),
        reactContainer
      );
      
      // If successful, hide the simple version
      const simpleBoard = container.querySelector('.enhanced-kanban');
      if (simpleBoard) {
        simpleBoard.style.display = 'none';
      }
    } catch (error) {
      console.log('EnhancedKanbanViewType: React upgrade failed, keeping simple version:', error);
    }
  }

  private findBoardInVault(): string {
    // Look for folders that contain board.json
    const rootFolder = this.app.vault.getRoot();
    if (!rootFolder) {
      console.log('EnhancedKanbanViewType: No root folder found');
      return '';
    }

    console.log('EnhancedKanbanViewType: Searching for boards in vault...');

    const findBoard = (folder: any): string => {
      // Check if this folder has a board.json
      const boardConfigPath = `${folder.path}/board.json`;
      const boardConfig = this.app.vault.getAbstractFileByPath(boardConfigPath);
      
      if (boardConfig) {
        console.log('EnhancedKanbanViewType: Found board at:', folder.path);
        return folder.path;
      }

      // Recursively check subfolders (only if no board found yet)
      for (const child of folder.children) {
        if (child.children) { // It's a folder
          const result = findBoard(child);
          if (result) return result; // Stop searching once we find a board
        }
      }
      return '';
    };

    const result = findBoard(rootFolder);
    console.log('EnhancedKanbanViewType: Board search result:', result);
    return result;
  }

  async onClose() {
    if (this.component) {
      unmountComponentAtNode(this.containerEl.children[1]);
      this.component = null;
    }
  }

  private addStyles() {
    // Add the enhanced kanban styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .enhanced-kanban-container {
        height: 100%;
        overflow: hidden;
      }
      
      .enhanced-kanban {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--background-primary);
        color: var(--text-normal);
      }
      
      .enhanced-kanban-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 1rem;
      }
      
      .enhanced-kanban-loading .sk-pulse {
        width: 40px;
        height: 40px;
        background: var(--interactive-accent);
        border-radius: 50%;
        animation: sk-pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes sk-pulse {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
      }
      
      .enhanced-kanban-error {
        padding: 2rem;
        text-align: center;
      }
      
      .enhanced-kanban-error h3 {
        color: var(--text-error);
        margin-bottom: 1rem;
      }
      
      .enhanced-kanban-error button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .enhanced-kanban-error button:hover {
        background: var(--interactive-accent-hover);
      }
      
      .enhanced-kanban-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
      }
      
      .enhanced-kanban-header h2 {
        margin: 0;
        color: var(--text-normal);
      }
      
      .enhanced-kanban-actions {
        display: flex;
        gap: 0.5rem;
      }
      
      .enhanced-kanban-actions button {
        padding: 0.5rem 1rem;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      .enhanced-kanban-actions button:hover {
        background: var(--interactive-accent-hover);
      }
      
      .enhanced-kanban-board {
        display: flex;
        flex: 1;
        overflow-x: auto;
        padding: 1rem;
        gap: 1rem;
        min-height: 0;
      }
      
      .enhanced-kanban-column {
        flex: 1;
        min-width: 300px;
        max-width: 400px;
        background: var(--background-secondary);
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }
      
      .enhanced-kanban-column.over-wip-limit {
        border-color: var(--text-error);
        box-shadow: 0 0 0 2px rgba(var(--text-error-rgb), 0.2);
      }
      
      .enhanced-kanban-column-header {
        padding: 1rem;
        border-bottom: 2px solid var(--background-modifier-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .enhanced-kanban-column-header h3 {
        margin: 0;
        color: var(--text-normal);
        font-size: 1.1rem;
        font-weight: 600;
      }
      
      .enhanced-kanban-column-header .card-count {
        background: var(--background-modifier-border);
        color: var(--text-muted);
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }
      
      .enhanced-kanban-column-header button {
        padding: 0.4rem 0.8rem;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        white-space: nowrap;
      }
      
      .enhanced-kanban-column-header button:hover {
        background: var(--interactive-accent-hover);
      }
      
      .enhanced-kanban-column-cards {
        flex: 1;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
        min-height: 0;
      }
      
      .enhanced-kanban-card {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .enhanced-kanban-card:hover {
        border-color: var(--interactive-accent);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
      }
      
      .card-header h4 {
        margin: 0;
        color: var(--text-normal);
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.3;
        flex: 1;
      }
      
      .priority {
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        margin-left: 0.5rem;
      }
      
      .priority.priority-low {
        background: rgba(34, 197, 94, 0.2);
        color: rgb(34, 197, 94);
      }
      
      .priority.priority-medium {
        background: rgba(251, 191, 36, 0.2);
        color: rgb(251, 191, 36);
      }
      
      .priority.priority-high {
        background: rgba(249, 115, 22, 0.2);
        color: rgb(249, 115, 22);
      }
      
      .priority.priority-critical {
        background: rgba(239, 68, 68, 0.2);
        color: rgb(239, 68, 68);
      }
      
      .card-initiative {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: var(--background-modifier-border);
        border-radius: 4px;
      }
      
      .card-dependencies {
        margin: 0.5rem 0;
        padding: 0.5rem;
        background: var(--background-modifier-border);
        border-radius: 4px;
        font-size: 0.8rem;
      }
      
      .card-dependencies .dependencies-predecessors,
      .card-dependencies .dependencies-successors {
        margin-bottom: 0.25rem;
      }
      
      .card-dependencies .dependencies-predecessors:last-child,
      .card-dependencies .dependencies-successors:last-child {
        margin-bottom: 0;
      }
      
      .card-dependencies strong {
        color: var(--text-normal);
        display: block;
        margin-bottom: 0.25rem;
      }
      
      .dependency-tag {
        display: inline-block;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-size: 0.7rem;
        margin-right: 0.25rem;
        margin-bottom: 0.25rem;
      }
      
      .card-assignee,
      .card-due-date {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-bottom: 0.25rem;
      }
      
      .card-assignee:last-child,
      .card-due-date:last-child {
        margin-bottom: 0;
      }
      
      .enhanced-kanban-dependency-view {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--background-secondary);
        border-top: 1px solid var(--background-modifier-border);
      }
      
      .enhanced-kanban-dependency-view h3 {
        margin: 0 0 1rem 0;
        color: var(--text-normal);
      }
      
      .dependency-warning {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 6px;
        padding: 1rem;
        margin-bottom: 1rem;
      }
      
      .dependency-warning h4 {
        margin: 0 0 0.5rem 0;
        color: var(--text-error);
        font-size: 0.9rem;
      }
      
      .circular-dependency {
        font-family: var(--font-monospace);
        font-size: 0.8rem;
        color: var(--text-error);
        margin-bottom: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 3px;
      }
      
      .circular-dependency:last-child {
        margin-bottom: 0;
      }
      
      .dependency-stats {
        display: flex;
        gap: 2rem;
      }
      
      .dependency-stats .stat {
        font-size: 0.9rem;
        color: var(--text-normal);
      }
      
      .dependency-stats .stat strong {
        color: var(--text-accent);
      }
      
      @media (max-width: 768px) {
        .enhanced-kanban-header {
          flex-direction: column;
          gap: 1rem;
          align-items: stretch;
        }
        
        .enhanced-kanban-header .enhanced-kanban-actions {
          justify-content: center;
        }
        
        .enhanced-kanban-board {
          flex-direction: column;
          overflow-x: visible;
          overflow-y: auto;
        }
        
        .enhanced-kanban-column {
          min-width: unset;
          max-width: unset;
        }
        
        .enhanced-kanban-dependency-view .dependency-stats {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
    `;
    
    document.head.appendChild(styleEl);
  }
}

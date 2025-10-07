import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';

export const simpleKanbanViewType = 'simple-kanban';
export const simpleKanbanIcon = 'lucide-trello';

export class SimpleKanbanView extends ItemView {
  private boardPath: string = '';
  private boardData: any = null;
  private cards: Map<string, any> = new Map();
  private initiatives: Map<string, any> = new Map();

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return simpleKanbanViewType;
  }

  getDisplayText(): string {
    return 'Simple Kanban Board';
  }

  getIcon(): string {
    return simpleKanbanIcon;
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('simple-kanban-container');

    // Find the board
    this.boardPath = this.findBoardInVault();
    if (!this.boardPath) {
      this.showNoBoardMessage(container);
      return;
    }

    // Load board data
    await this.loadBoardData();
    
    // Render the board
    this.renderBoard(container);
  }

  private findBoardInVault(): string {
    const rootFolder = this.app.vault.getRoot();
    if (!rootFolder) return '';

    const findBoard = (folder: any): string => {
      const boardConfigPath = `${folder.path}/board.json`;
      const boardConfig = this.app.vault.getAbstractFileByPath(boardConfigPath);
      if (boardConfig) return folder.path;
      
      for (const child of folder.children) {
        if (child.children) {
          const result = findBoard(child);
          if (result) return result;
        }
      }
      return '';
    };

    return findBoard(rootFolder);
  }

  private async loadBoardData() {
    try {
      // Load board config
      const boardConfigFile = this.app.vault.getAbstractFileByPath(`${this.boardPath}/board.json`);
      if (!boardConfigFile) return;

      const boardConfigContent = await this.app.vault.read(boardConfigFile as TFile);
      this.boardData = JSON.parse(boardConfigContent);

      // Load cards
      const cardsFolder = this.app.vault.getAbstractFileByPath(`${this.boardPath}/cards`);
      if (cardsFolder && cardsFolder.children) {
        for (const file of cardsFolder.children) {
          if (file instanceof TFile && file.extension === 'md') {
            const content = await this.app.vault.read(file);
            const frontmatter = this.parseFrontmatter(content);
            this.cards.set(file.basename, {
              id: file.basename,
              path: file.path,
              metadata: frontmatter,
              content: content
            });
          }
        }
      }

      // Load initiatives
      const initiativesFolder = this.app.vault.getAbstractFileByPath(`${this.boardPath}/initiatives`);
      if (initiativesFolder && initiativesFolder.children) {
        for (const file of initiativesFolder.children) {
          if (file instanceof TFile && file.extension === 'md') {
            const content = await this.app.vault.read(file);
            const frontmatter = this.parseFrontmatter(content);
            this.initiatives.set(file.basename, {
              id: file.basename,
              path: file.path,
              metadata: frontmatter,
              content: content
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading board data:', error);
    }
  }

  private parseFrontmatter(content: string): any {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};

    // Simple YAML-like parsing for basic key-value pairs
    const lines = frontmatterMatch[1].split('\n');
    const result: any = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmedLine.substring(0, colonIndex).trim();
      let value = trimmedLine.substring(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Handle arrays (basic format like [0002, 0003])
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  private normalizeStatus(status: string): string {
    if (!status) return 'backlog';
    
    // Map common status variations to column IDs
    const statusMap: { [key: string]: string } = {
      'backlog': 'backlog',
      'Backlog': 'backlog',
      'todo': 'backlog',
      'To Do': 'backlog',
      'in-progress': 'in-progress',
      'In Progress': 'in-progress',
      'in progress': 'in-progress',
      'doing': 'in-progress',
      'active': 'in-progress',
      'review': 'review',
      'Review': 'review',
      'testing': 'review',
      'test': 'review',
      'done': 'done',
      'Done': 'done',
      'completed': 'done',
      'Complete': 'done',
      'finished': 'done'
    };

    return statusMap[status] || 'backlog';
  }

  private renderBoard(container: HTMLElement) {
    if (!this.boardData) {
      this.showError(container, 'No board data found');
      return;
    }

    const columns = this.boardData.columns.sort((a: any, b: any) => a.order - b.order);
    
    container.innerHTML = `
      <div class="simple-kanban">
        <div class="simple-kanban-header">
          <h2>Simple Kanban Board</h2>
          <div class="simple-kanban-actions">
            <button data-action="createCard">+ New Task</button>
            <button data-action="createInitiative">+ New Initiative</button>
          </div>
        </div>
        <div class="simple-kanban-swimlanes">
          <div class="simple-kanban-swimlane">
            <div class="swimlane-header">
              <h3>Initiatives</h3>
              <span class="swimlane-count">${this.initiatives.size}</span>
            </div>
            <div class="simple-kanban-board">
              ${columns.map((column: any) => this.renderInitiativeColumn(column)).join('')}
            </div>
          </div>
          <div class="simple-kanban-swimlane">
            <div class="swimlane-header">
              <h3>Tasks</h3>
              <span class="swimlane-count">${this.cards.size}</span>
            </div>
            <div class="simple-kanban-board">
              ${columns.map((column: any) => this.renderTaskColumn(column)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.addEventListeners(container);
  }

  private renderInitiativeColumn(column: any): string {
    const initiativesInColumn = Array.from(this.initiatives.values())
      .filter(initiative => this.normalizeStatus(initiative.metadata.status) === column.id);

    return `
      <div class="simple-kanban-column" style="border-left: 4px solid ${column.color}">
        <div class="simple-kanban-column-header">
          <h3>${column.title}</h3>
          <span class="card-count">${initiativesInColumn.length}</span>
        </div>
        <div class="simple-kanban-column-content" data-column="${column.id}">
          ${initiativesInColumn.map(initiative => this.renderInitiative(initiative)).join('')}
        </div>
        <div class="simple-kanban-column-footer">
          <button data-action="addInitiativeToColumn" data-column-id="${column.id}" class="add-card-btn">+ Add Initiative</button>
        </div>
      </div>
    `;
  }

  private renderTaskColumn(column: any): string {
    const cardsInColumn = Array.from(this.cards.values())
      .filter(card => this.normalizeStatus(card.metadata.status) === column.id);

    return `
      <div class="simple-kanban-column" style="border-left: 4px solid ${column.color}">
        <div class="simple-kanban-column-header">
          <h3>${column.title}</h3>
          <span class="card-count">${cardsInColumn.length}</span>
        </div>
        <div class="simple-kanban-column-content" data-column="${column.id}">
          ${cardsInColumn.map(card => this.renderCard(card)).join('')}
        </div>
        <div class="simple-kanban-column-footer">
          <button data-action="addCardToColumn" data-column-id="${column.id}" class="add-card-btn">+ Add Task</button>
        </div>
      </div>
    `;
  }

  private renderInitiative(initiative: any): string {
    const description = initiative.metadata.description ? 
      `<div class="initiative-description">${initiative.metadata.description}</div>` : '';

    return `
      <div class="simple-kanban-initiative" data-initiative-id="${initiative.id}">
        <div class="initiative-title">${initiative.metadata.title || 'Untitled Initiative'}</div>
        ${description}
        <div class="initiative-actions">
          <button data-action="editInitiative" class="edit-btn">✏️</button>
          <button data-action="deleteInitiative" class="delete-btn">🗑️</button>
        </div>
      </div>
    `;
  }

  private renderCard(card: any): string {
    const initiative = card.metadata.initiative ? 
      `<span class="initiative-tag">${card.metadata.initiative}</span>` : '';
    
    const dependencies = card.metadata.predecessors?.length > 0 ? 
      `<span class="dependency-indicator" title="Has dependencies">📋</span>` : '';

    return `
      <div class="simple-kanban-card" data-card-id="${card.id}">
        <div class="card-title">${card.metadata.title || 'Untitled'}</div>
        <div class="card-meta">
          ${initiative}
          ${dependencies}
        </div>
        <div class="card-actions">
          <button data-action="editCard" class="edit-btn">✏️</button>
          <button data-action="deleteCard" class="delete-btn">🗑️</button>
        </div>
      </div>
    `;
  }

  private addEventListeners(container: HTMLElement) {
    // Remove all onclick attributes and use proper event listeners
    const buttons = container.querySelectorAll('button[onclick]');
    buttons.forEach(btn => {
      btn.removeAttribute('onclick');
    });

    // Add event listeners directly to buttons
    const createCardBtn = container.querySelector('button[data-action="createCard"]');
    if (createCardBtn) {
      createCardBtn.addEventListener('click', () => this.createCard());
    }

    const createInitiativeBtn = container.querySelector('button[data-action="createInitiative"]');
    if (createInitiativeBtn) {
      createInitiativeBtn.addEventListener('click', () => this.createInitiative());
    }

    // Add listeners for column add buttons
    const addCardBtns = container.querySelectorAll('button[data-action="addCardToColumn"]');
    addCardBtns.forEach(btn => {
      const columnId = btn.getAttribute('data-column-id');
      if (columnId) {
        btn.addEventListener('click', () => this.addCardToColumn(columnId));
      }
    });

    const addInitiativeBtns = container.querySelectorAll('button[data-action="addInitiativeToColumn"]');
    addInitiativeBtns.forEach(btn => {
      const columnId = btn.getAttribute('data-column-id');
      if (columnId) {
        btn.addEventListener('click', () => this.addInitiativeToColumn(columnId));
      }
    });

    // Add listeners for card actions
    const cardElements = container.querySelectorAll('[data-card-id]');
    cardElements.forEach(card => {
      const cardId = card.getAttribute('data-card-id');
      if (cardId) {
        card.addEventListener('click', () => this.openCard(cardId));
        
        const editBtn = card.querySelector('button[data-action="editCard"]');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editCard(cardId);
          });
        }

        const deleteBtn = card.querySelector('button[data-action="deleteCard"]');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCard(cardId);
          });
        }
      }
    });

    // Add listeners for initiative actions
    const initiativeElements = container.querySelectorAll('[data-initiative-id]');
    initiativeElements.forEach(initiative => {
      const initiativeId = initiative.getAttribute('data-initiative-id');
      if (initiativeId) {
        initiative.addEventListener('click', () => this.openInitiative(initiativeId));
        
        const editBtn = initiative.querySelector('button[data-action="editInitiative"]');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editInitiative(initiativeId);
          });
        }

        const deleteBtn = initiative.querySelector('button[data-action="deleteInitiative"]');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteInitiative(initiativeId);
          });
        }
      }
    });
  }

  private async createCard() {
    const result = await this.showCardModal('Create Task', 'Create a new task');
    if (!result) return;

    const cardId = `card_${Date.now()}`;
    const cardPath = `${this.boardPath}/cards/${cardId}.md`;
    
    const content = `---
title: "${result.title}"
status: "${result.status}"
initiative: "${result.initiative || ''}"
predecessors: ${JSON.stringify(result.predecessors || [])}
successors: ${JSON.stringify(result.successors || [])}
---

# ${result.title}

${result.description || 'Task description goes here...'}
`;

    try {
      await this.app.vault.create(cardPath, content);
      await this.loadBoardData();
      this.renderBoard(this.containerEl.children[1]);
    } catch (error) {
      alert('Error creating card: ' + error.message);
    }
  }

  private async createInitiative() {
    const result = await this.showInitiativeModal('Create Initiative', 'Create a new initiative');
    if (!result) return;

    const initiativeId = result.title.replace(/\s+/g, '');
    const initiativePath = `${this.boardPath}/initiatives/${initiativeId}.md`;
    
    const content = `---
title: "${result.title}"
status: "${result.status}"
description: "${result.description || ''}"
---

# ${result.title}

${result.description || 'Initiative description goes here...'}
`;

    try {
      await this.app.vault.create(initiativePath, content);
      await this.loadBoardData();
      this.renderBoard(this.containerEl.children[1]);
    } catch (error) {
      alert('Error creating initiative: ' + error.message);
    }
  }

  private async addCardToColumn(columnId: string) {
    const result = await this.showCardModal('Add Task', 'Add a new task', columnId);
    if (!result) return;

    const cardId = `card_${Date.now()}`;
    const cardPath = `${this.boardPath}/cards/${cardId}.md`;
    
    const content = `---
title: "${result.title}"
status: "${result.status}"
initiative: "${result.initiative || ''}"
predecessors: ${JSON.stringify(result.predecessors || [])}
successors: ${JSON.stringify(result.successors || [])}
---

# ${result.title}

${result.description || 'Task description goes here...'}
`;

    try {
      await this.app.vault.create(cardPath, content);
      await this.loadBoardData();
      this.renderBoard(this.containerEl.children[1]);
    } catch (error) {
      alert('Error creating card: ' + error.message);
    }
  }

  private async addInitiativeToColumn(columnId: string) {
    const result = await this.showInitiativeModal('Add Initiative', 'Add a new initiative', columnId);
    if (!result) return;

    const initiativeId = result.title.replace(/\s+/g, '');
    const initiativePath = `${this.boardPath}/initiatives/${initiativeId}.md`;
    
    const content = `---
title: "${result.title}"
status: "${result.status}"
description: "${result.description || ''}"
---

# ${result.title}

${result.description || 'Initiative description goes here...'}
`;

    try {
      await this.app.vault.create(initiativePath, content);
      await this.loadBoardData();
      this.renderBoard(this.containerEl.children[1]);
    } catch (error) {
      alert('Error creating initiative: ' + error.message);
    }
  }

  private openCard(cardId: string) {
    const card = this.cards.get(cardId);
    if (card) {
      const file = this.app.vault.getAbstractFileByPath(card.path);
      if (file) {
        this.app.workspace.openLinkText(card.path, '');
      }
    }
  }

  private openInitiative(initiativeId: string) {
    const initiative = this.initiatives.get(initiativeId);
    if (initiative) {
      const file = this.app.vault.getAbstractFileByPath(initiative.path);
      if (file) {
        this.app.workspace.openLinkText(initiative.path, '');
      }
    }
  }

  private async editCard(cardId: string) {
    const card = this.cards.get(cardId);
    if (card) {
      const newTitle = await this.showInputModal('Edit Card', 'Enter new title:', card.metadata.title);
      if (newTitle && newTitle !== card.metadata.title) {
        const newContent = card.content.replace(
          /title: ".*?"/,
          `title: "${newTitle}"`
        );
        try {
          await this.app.vault.modify(card.path, newContent);
          await this.loadBoardData();
          this.renderBoard(this.containerEl.children[1]);
        } catch (error) {
          alert('Error updating card: ' + error.message);
        }
      }
    }
  }

  private async deleteCard(cardId: string) {
    const card = this.cards.get(cardId);
    if (card && confirm('Are you sure you want to delete this card?')) {
      try {
        await this.app.vault.delete(card.path);
        await this.loadBoardData();
        this.renderBoard(this.containerEl.children[1]);
      } catch (error) {
        alert('Error deleting card: ' + error.message);
      }
    }
  }

  private async editInitiative(initiativeId: string) {
    const initiative = this.initiatives.get(initiativeId);
    if (initiative) {
      const result = await this.showInitiativeModal('Edit Initiative', 'Edit initiative details', initiative.metadata.status);
      if (result && result.title !== initiative.metadata.title) {
        const newContent = initiative.content.replace(
          /title: ".*?"/,
          `title: "${result.title}"`
        ).replace(
          /status: ".*?"/,
          `status: "${result.status}"`
        ).replace(
          /description: ".*?"/,
          `description: "${result.description || ''}"`
        );
        try {
          await this.app.vault.modify(initiative.path, newContent);
          await this.loadBoardData();
          this.renderBoard(this.containerEl.children[1]);
        } catch (error) {
          alert('Error updating initiative: ' + error.message);
        }
      }
    }
  }

  private async deleteInitiative(initiativeId: string) {
    const initiative = this.initiatives.get(initiativeId);
    if (initiative && confirm('Are you sure you want to delete this initiative?')) {
      try {
        await this.app.vault.delete(initiative.path);
        await this.loadBoardData();
        this.renderBoard(this.containerEl.children[1]);
      } catch (error) {
        alert('Error deleting initiative: ' + error.message);
      }
    }
  }

  private showNoBoardMessage(container: HTMLElement) {
    container.innerHTML = `
      <div class="simple-kanban-error">
        <h3>No Kanban Board Found</h3>
        <p>Create a board using the command palette:</p>
        <p><strong>Commands available:</strong></p>
        <ul>
          <li><strong>Create new Enhanced Kanban board</strong> - Create a new board</li>
          <li><strong>Convert folder to Enhanced Kanban board</strong> - Convert existing folder</li>
        </ul>
      </div>
    `;
  }

  private showError(container: HTMLElement, message: string) {
    container.innerHTML = `
      <div class="simple-kanban-error">
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  private async showInputModal(title: string, message: string, defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>${title}</h3>
          <p>${message}</p>
          <input type="text" id="input-field" value="${defaultValue}" placeholder="Enter text here...">
          <div class="modal-actions">
            <button id="ok-btn">OK</button>
            <button id="cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector('#input-field') as HTMLInputElement;
      const okBtn = modal.querySelector('#ok-btn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleOk = () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleOk();
        } else if (e.key === 'Escape') {
          handleCancel();
        }
      });

      // Focus the input
      setTimeout(() => input.focus(), 100);
    });
  }

  private async showCardModal(title: string, message: string, defaultStatus?: string): Promise<any> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      
      const statusOptions = this.boardData?.columns.map((col: any) => 
        `<option value="${col.id}" ${col.id === defaultStatus ? 'selected' : ''}>${col.title}</option>`
      ).join('') || '';
      
      const initiativeOptions = Array.from(this.initiatives.values()).map(init => 
        `<option value="${init.metadata.title}">${init.metadata.title}</option>`
      ).join('');

      modal.innerHTML = `
        <div class="modal-content enhanced-modal">
          <h3>${title}</h3>
          <p>${message}</p>
          
          <div class="form-group">
            <label for="title-field">Title:</label>
            <input type="text" id="title-field" placeholder="Enter task title...">
          </div>
          
          <div class="form-group">
            <label for="status-field">Status:</label>
            <select id="status-field">
              ${statusOptions}
            </select>
          </div>
          
          <div class="form-group">
            <label for="initiative-field">Initiative (optional):</label>
            <select id="initiative-field">
              <option value="">No initiative</option>
              ${initiativeOptions}
            </select>
          </div>
          
          <div class="form-group">
            <label for="description-field">Description (optional):</label>
            <textarea id="description-field" placeholder="Enter task description..."></textarea>
          </div>
          
          <div class="modal-actions">
            <button id="ok-btn">Create</button>
            <button id="cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const titleInput = modal.querySelector('#title-field') as HTMLInputElement;
      const statusSelect = modal.querySelector('#status-field') as HTMLSelectElement;
      const initiativeSelect = modal.querySelector('#initiative-field') as HTMLSelectElement;
      const descriptionTextarea = modal.querySelector('#description-field') as HTMLTextAreaElement;
      const okBtn = modal.querySelector('#ok-btn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleOk = () => {
        const result = {
          title: titleInput.value.trim(),
          status: statusSelect.value,
          initiative: initiativeSelect.value,
          description: descriptionTextarea.value.trim()
        };
        cleanup();
        resolve(result.title ? result : null);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
      
      // Focus the title input
      setTimeout(() => titleInput.focus(), 100);
    });
  }

  private async showInitiativeModal(title: string, message: string, defaultStatus?: string): Promise<any> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      
      const statusOptions = this.boardData?.columns.map((col: any) => 
        `<option value="${col.id}" ${col.id === defaultStatus ? 'selected' : ''}>${col.title}</option>`
      ).join('') || '';

      modal.innerHTML = `
        <div class="modal-content enhanced-modal">
          <h3>${title}</h3>
          <p>${message}</p>
          
          <div class="form-group">
            <label for="title-field">Title:</label>
            <input type="text" id="title-field" placeholder="Enter initiative title...">
          </div>
          
          <div class="form-group">
            <label for="status-field">Status:</label>
            <select id="status-field">
              ${statusOptions}
            </select>
          </div>
          
          <div class="form-group">
            <label for="description-field">Description (optional):</label>
            <textarea id="description-field" placeholder="Enter initiative description..."></textarea>
          </div>
          
          <div class="modal-actions">
            <button id="ok-btn">Create</button>
            <button id="cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const titleInput = modal.querySelector('#title-field') as HTMLInputElement;
      const statusSelect = modal.querySelector('#status-field') as HTMLSelectElement;
      const descriptionTextarea = modal.querySelector('#description-field') as HTMLTextAreaElement;
      const okBtn = modal.querySelector('#ok-btn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleOk = () => {
        const result = {
          title: titleInput.value.trim(),
          status: statusSelect.value,
          description: descriptionTextarea.value.trim()
        };
        cleanup();
        resolve(result.title ? result : null);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
      
      // Focus the title input
      setTimeout(() => titleInput.focus(), 100);
    });
  }
}

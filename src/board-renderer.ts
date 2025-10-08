import { BoardData, BoardColumn, Card, Initiative } from './types';

export class BoardRenderer {
  static showNoBoardMessage(container: HTMLElement): void {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
        <h2 style="color: var(--text-muted); margin-bottom: 1rem;">No Kanban Board Selected</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Create a new kanban board or open an existing one.</p>
        <button id="create-board-btn" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;">
          Create New Board
        </button>
      </div>
    `;
  }

  static renderBoard(container: HTMLElement, boardData: BoardData, cards: Map<string, Card>, initiatives: Map<string, Initiative>): void {
    if (!boardData) {
      this.showNoBoardMessage(container);
      return;
    }

    console.log('Rendering board with columns:', boardData.columns);
    console.log('Cards:', cards.size);
    console.log('Initiatives:', initiatives.size);

    const columnsHtml = boardData.columns
      .sort((a, b) => a.order - b.order)
      .map(column => this.renderColumn(column, cards, initiatives))
      .join('');

    container.innerHTML = `
      <div class="simple-kanban">
        <div class="simple-kanban-swimlanes">
          <div class="simple-kanban-swimlane">
            <div class="swimlane-header" data-swimlane="initiatives">
              <div class="swimlane-title">
                <span class="swimlane-icon">📋</span>
                <h3>Initiatives</h3>
                <span class="swimlane-count">${initiatives.size}</span>
              </div>
              <button class="swimlane-toggle" data-swimlane="initiatives">▼</button>
            </div>
            <div class="swimlane-content" data-swimlane="initiatives">
              <div class="simple-kanban-columns">
                ${boardData.columns
                  .sort((a, b) => a.order - b.order)
                  .map(column => this.renderInitiativeColumn(column, initiatives))
                  .join('')}
              </div>
            </div>
          </div>
          
          <div class="simple-kanban-swimlane">
            <div class="swimlane-header" data-swimlane="tasks">
              <div class="swimlane-title">
                <span class="swimlane-icon">📝</span>
                <h3>Tasks</h3>
                <span class="swimlane-count">${cards.size}</span>
              </div>
              <button class="swimlane-toggle" data-swimlane="tasks">▼</button>
            </div>
            <div class="swimlane-content" data-swimlane="tasks">
              <div class="simple-kanban-columns">
                ${boardData.columns
                  .sort((a, b) => a.order - b.order)
                  .map(column => this.renderTaskColumn(column, cards))
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private static renderColumn(column: BoardColumn, cards: Map<string, Card>, initiatives: Map<string, Initiative>): string {
    return `
      <div class="simple-kanban-column" data-column-id="${column.id}">
        <div class="simple-kanban-column-header">
          <h3>${column.title}</h3>
          <span class="column-count">${this.getColumnCount(column.id, cards, initiatives)}</span>
        </div>
        <div class="simple-kanban-column-content">
          <!-- Content will be filled by specific column renderers -->
        </div>
        <div class="simple-kanban-column-footer">
          <div class="column-footer-hint">Right-click to add items</div>
        </div>
      </div>
    `;
  }

  private static renderInitiativeColumn(column: BoardColumn, initiatives: Map<string, Initiative>): string {
    const initiativesInColumn = Array.from(initiatives.values())
      .filter(initiative => this.normalizeStatus(initiative.metadata.status) === column.id && !initiative.metadata.archived);

    console.log(`Rendering initiative column ${column.id} with ${initiativesInColumn.length} initiatives`);

    const initiativesHtml = initiativesInColumn
      .map(initiative => this.renderInitiative(initiative))
      .join('');

    return `
      <div class="simple-kanban-column" data-column-id="${column.id}">
        <div class="simple-kanban-column-header">
          <h3>${column.title}</h3>
          <span class="column-count">${initiativesInColumn.length}</span>
        </div>
        <div class="simple-kanban-column-content">
          ${initiativesHtml}
        </div>
        <div class="simple-kanban-column-footer">
          <div class="column-footer-hint">Right-click to add items</div>
        </div>
      </div>
    `;
  }

  private static renderTaskColumn(column: BoardColumn, cards: Map<string, Card>): string {
    const cardsInColumn = Array.from(cards.values())
      .filter(card => this.normalizeStatus(card.metadata.status) === column.id && !card.metadata.archived);

    console.log(`Rendering task column ${column.id} with ${cardsInColumn.length} cards`);

    const cardsHtml = cardsInColumn
      .map(card => this.renderCard(card, cards))
      .join('');

    return `
      <div class="simple-kanban-column" data-column-id="${column.id}">
        <div class="simple-kanban-column-header">
          <h3>${column.title}</h3>
          <span class="column-count">${cardsInColumn.length}</span>
        </div>
        <div class="simple-kanban-column-content">
          ${cardsHtml}
        </div>
        <div class="simple-kanban-column-footer">
          <div class="column-footer-hint">Right-click to add items</div>
        </div>
      </div>
    `;
  }

  private static renderInitiative(initiative: Initiative): string {
    const description = initiative.metadata.description ? 
      `<div class="initiative-description">${initiative.metadata.description}</div>` : '';
    
    // Add archive button for initiatives in "done" column
    const isDoneColumn = this.normalizeStatus(initiative.metadata.status) === 'done';
    const archiveButton = isDoneColumn ? 
      `<button class="archive-btn" data-action="archive-initiative" data-id="${initiative.id}">📦</button>` : '';

    return `
      <div class="simple-kanban-initiative clickable-initiative" 
           data-id="${initiative.id}" 
           data-type="initiative" 
           draggable="true">
        <div class="initiative-header">
          <h4>${initiative.metadata.title}</h4>
        </div>
        ${description}
        <div class="initiative-meta">
          <div class="tags">
            ${initiative.metadata.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
          </div>
          <span class="date">${initiative.metadata.date}</span>
        </div>
      </div>
    `;
  }

  private static renderCard(card: Card, allCards: Map<string, Card>): string {
    const initiative = card.metadata.initiative ? 
      `<div class="card-initiative">📋 ${card.metadata.initiative}</div>` : '';
    
    const description = card.content ? 
      `<div class="card-description">${card.content}</div>` : '';

    // Relationship indicators
    const predecessors = card.metadata.predecessors || [];
    const successors = card.metadata.successors || [];
    
    let relationshipInfo = '';
    if (predecessors.length > 0) {
      const predTitles = predecessors.map(id => {
        const predCard = allCards.get(id);
        return predCard ? predCard.metadata.title : 'Unknown';
      }).join(', ');
      relationshipInfo += `<div class="card-relationship predecessors">⬅️ Depends on: ${predTitles}</div>`;
    }
    if (successors.length > 0) {
      const succTitles = successors.map(id => {
        const succCard = allCards.get(id);
        return succCard ? succCard.metadata.title : 'Unknown';
      }).join(', ');
      relationshipInfo += `<div class="card-relationship successors">➡️ Blocks: ${succTitles}</div>`;
    }

    // Add archive button for cards in "done" column
    const isDoneColumn = this.normalizeStatus(card.metadata.status) === 'done';
    const archiveButton = isDoneColumn ? 
      `<button class="archive-btn" data-action="archive-card" data-id="${card.id}">📦</button>` : '';

    return `
      <div class="simple-kanban-card clickable-card" 
           data-id="${card.id}" 
           data-type="card" 
           draggable="true">
        <div class="card-header">
          <h4>${card.metadata.title}</h4>
        </div>
        ${initiative}
        ${description}
        ${relationshipInfo}
        <div class="card-meta">
          <div class="tags">
            ${card.metadata.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
          </div>
          <span class="date">${card.metadata.date}</span>
        </div>
      </div>
    `;
  }

  private static getColumnCount(columnId: string, cards: Map<string, Card>, initiatives: Map<string, Initiative>): number {
    const cardCount = Array.from(cards.values())
      .filter(card => this.normalizeStatus(card.metadata.status) === columnId).length;
    const initiativeCount = Array.from(initiatives.values())
      .filter(initiative => this.normalizeStatus(initiative.metadata.status) === columnId).length;
    return cardCount + initiativeCount;
  }

  private static normalizeStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'backlog': 'backlog',
      'Backlog': 'backlog',
      'in-progress': 'in-progress',
      'In Progress': 'in-progress',
      'review': 'review',
      'Review': 'review',
      'done': 'done',
      'Done': 'done',
      'completed': 'done',
      'Completed': 'done'
    };
    
    return statusMap[status] || status.toLowerCase().replace(/\s+/g, '-');
  }
}

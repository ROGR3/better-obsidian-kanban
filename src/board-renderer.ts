import { BoardData, BoardColumn, Card, Initiative, IBoardRenderer } from './types';

export class BoardRenderer implements IBoardRenderer {
  showNoBoardMessage(container: HTMLElement): void {
    container.innerHTML = `
      <div class="better-kanban-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
        <h2 style="color: var(--text-muted); margin-bottom: 1rem;">No Kanban Board Selected</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Create a new kanban board or open an existing one.</p>
        <button id="create-board-btn" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;">
          Create New Board
        </button>
      </div>
    `;
  }

  render(container: HTMLElement, boardData: BoardData, cards: Map<string, Card>, initiatives: Map<string, Initiative>): void {
    if (!boardData) {
      this.showNoBoardMessage(container);
      return;
    }

    // Columns are rendered within each swimlane
    container.innerHTML = `
      <div class="better-kanban-board simple-kanban">
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

  private renderColumn(column: BoardColumn, cards: Map<string, Card>, initiatives: Map<string, Initiative>): string {
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

  private renderInitiativeColumn(column: BoardColumn, initiatives: Map<string, Initiative>): string {
    const initiativesInColumn = Array.from(initiatives.values())
      .filter(initiative => this.normalizeStatus(initiative.metadata.status) === column.id && !initiative.metadata.archived);


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

  private renderTaskColumn(column: BoardColumn, cards: Map<string, Card>): string {
    const cardsInColumn = Array.from(cards.values())
      .filter(card => this.normalizeStatus(card.metadata.status) === column.id && !card.metadata.archived);


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

  private renderInitiative(initiative: Initiative): string {
    const description = initiative.metadata.description ? 
      `<div class="initiative-description">${initiative.metadata.description}</div>` : '';
    
    // Archive button is handled in the context menu

    // Calculate days since creation
    const daysSinceCreation = this.calculateDaysSinceCreation(initiative.metadata.date);

    return `
      <div class="simple-kanban-initiative clickable-initiative draggable-item" 
           data-id="${initiative.id}" 
           data-type="initiative"
           draggable="true">
        <div class="initiative-header">
          <h4>${initiative.metadata.title}</h4>
          <div class="initiative-age">
            <span class="age-icon">🕒</span>
            <span class="age-days">${daysSinceCreation}d</span>
          </div>
        </div>
        ${description}
        <div class="initiative-meta">
          <div class="tags">
            ${initiative.metadata.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderCard(card: Card, allCards: Map<string, Card>): string {
    const initiative = card.metadata.initiative ? 
      `<div class="card-initiative">📋 ${card.metadata.initiative}</div>` : '';
    
    const description = card.content ? 
      `<div class="card-description">${card.content}</div>` : '';

    // Relationship indicators - only show if there are relationships
    const predecessors = card.metadata.predecessors || [];
    const successors = card.metadata.successors || [];
    
    let relationshipInfo = '';
    if (predecessors.length > 0) {
      const predTitles = predecessors.slice(0, 2).map(id => {
        const predCard = allCards.get(id);
        return predCard ? predCard.metadata.title : 'Unknown';
      }).join(', ');
      const moreCount = predecessors.length > 2 ? ` +${predecessors.length - 2} more` : '';
      relationshipInfo += `<div class="card-relationship predecessors">⬅️ Depends on: ${predTitles}${moreCount}</div>`;
    }
    if (successors.length > 0) {
      const succTitles = successors.slice(0, 2).map(id => {
        const succCard = allCards.get(id);
        return succCard ? succCard.metadata.title : 'Unknown';
      }).join(', ');
      const moreCount = successors.length > 2 ? ` +${successors.length - 2} more` : '';
      relationshipInfo += `<div class="card-relationship successors">➡️ Blocks: ${succTitles}${moreCount}</div>`;
    }

    // Calculate days since creation
    const daysSinceCreation = this.calculateDaysSinceCreation(card.metadata.date);

    // Limit tags display for performance
    const displayTags = card.metadata.tags?.slice(0, 5) || [];
    const moreTagsCount = (card.metadata.tags?.length || 0) - displayTags.length;
    const moreTagsText = moreTagsCount > 0 ? `<span class="tag-more">+${moreTagsCount}</span>` : '';

    return `
      <div class="simple-kanban-card clickable-card draggable-item" 
           data-id="${card.id}" 
           data-type="card"
           draggable="true">
        <div class="card-header">
          <h4>${card.metadata.title}</h4>
          <div class="card-age">
            <span class="age-icon">🕒</span>
            <span class="age-days">${daysSinceCreation}d</span>
          </div>
        </div>
        ${initiative}
        ${description}
        ${relationshipInfo}
        <div class="card-meta">
          <div class="tags">
            ${displayTags.map(tag => `<span class="tag">${tag}</span>`).join('')}${moreTagsText}
          </div>
        </div>
      </div>
    `;
  }

  private getColumnCount(columnId: string, cards: Map<string, Card>, initiatives: Map<string, Initiative>): number {
    const cardCount = Array.from(cards.values())
      .filter(card => this.normalizeStatus(card.metadata.status) === columnId).length;
    const initiativeCount = Array.from(initiatives.values())
      .filter(initiative => this.normalizeStatus(initiative.metadata.status) === columnId).length;
    return cardCount + initiativeCount;
  }

  private normalizeStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'backlog': 'backlog',
      'Backlog': 'backlog',
      'committed': 'committed',
      'Committed': 'committed',
      'in-progress': 'in-progress',
      'In Progress': 'in-progress',
      'done': 'done',
      'Done': 'done',
      'completed': 'done',
      'Completed': 'done'
    };
    
    return statusMap[status] || status.toLowerCase().replace(/\s+/g, '-');
  }

  private calculateDaysSinceCreation(dateString: string): number {
    try {
      const creationDate = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - creationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  }

  // Public methods for targeted updates
  renderCardHTML(card: Card, allCards: Map<string, Card>): string {
    return this.renderCard(card, allCards);
  }

  renderInitiativeHTML(initiative: Initiative): string {
    return this.renderInitiative(initiative);
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/compat';
import { App, TFile, WorkspaceLeaf } from 'obsidian';
import { EnhancedBoardManager } from './managers/EnhancedBoardManager';
import { BoardState, CardFile, InitiativeFile, BoardConfig } from './types/board';
import { DependencyManager } from './managers/DependencyManager';

export interface EnhancedKanbanViewProps {
  app: App;
  leaf: WorkspaceLeaf;
  boardPath: string;
}

export const EnhancedKanbanView = ({ app, leaf, boardPath }: EnhancedKanbanViewProps) => {
  const [boardManager] = useState(() => {
    console.log('EnhancedKanbanView: Creating board manager with path:', boardPath);
    return new EnhancedBoardManager(app, boardPath);
  });
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDependencyView, setShowDependencyView] = useState(false);

  // Initialize the board manager
  useEffect(() => {
    const init = async () => {
      try {
        console.log('EnhancedKanbanView: Initializing with boardPath:', boardPath);
        setIsLoading(true);
        setError(null);
        await boardManager.initialize();
        const state = boardManager.getBoardState();
        console.log('EnhancedKanbanView: Board state loaded:', state);
        setBoardState(state);
      } catch (err) {
        console.error('EnhancedKanbanView: Error initializing board:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize board');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [boardManager, boardPath]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = boardManager.subscribe((newState) => {
      setBoardState(newState);
    });

    return unsubscribe;
  }, [boardManager]);

  // Get cards grouped by status
  const cardsByStatus = useMemo(() => {
    if (!boardState) return new Map();
    return boardManager.getCardsByStatus();
  }, [boardState, boardManager]);

  // Get dependency manager
  const dependencyManager = useMemo(() => {
    return boardManager.getDependencyManager();
  }, [boardManager]);

  // Handle card status change
  const handleCardStatusChange = useCallback(async (cardId: string, newStatus: string) => {
    try {
      const result = await boardManager.moveCard(cardId, newStatus);
      if (!result.isValid) {
        // Show validation errors
        console.warn('Cannot move card:', result.errors);
        // You could show a toast notification here
      }
    } catch (err) {
      console.error('Failed to move card:', err);
    }
  }, [boardManager]);

  // Handle card click
  const handleCardClick = useCallback((cardId: string) => {
    const card = boardManager.getCard(cardId);
    if (card) {
      // Open the card file in Obsidian
      const file = app.vault.getAbstractFileByPath(card.path);
      if (file instanceof TFile) {
        app.workspace.openLinkText(file.path, '', true);
      }
    }
  }, [app, boardManager]);

  // Handle creating new card
  const handleCreateCard = useCallback(async (status: string) => {
    try {
      const cardId = await boardManager.createCard({
        title: 'New Card',
        status,
        predecessors: [],
        successors: []
      });
      setSelectedCard(cardId);
    } catch (err) {
      console.error('Failed to create card:', err);
    }
  }, [boardManager]);

  // Handle creating new initiative
  const handleCreateInitiative = useCallback(async () => {
    try {
      await boardManager.createInitiative({
        title: 'New Initiative',
        status: 'planning'
      });
    } catch (err) {
      console.error('Failed to create initiative:', err);
    }
  }, [boardManager]);

  // Handle adding dependency
  const handleAddDependency = useCallback(async (fromCardId: string, toCardId: string) => {
    try {
      await boardManager.addDependency(fromCardId, toCardId);
    } catch (err) {
      console.error('Failed to add dependency:', err);
    }
  }, [boardManager]);

  // Handle removing dependency
  const handleRemoveDependency = useCallback(async (fromCardId: string, toCardId: string) => {
    try {
      await boardManager.removeDependency(fromCardId, toCardId);
    } catch (err) {
      console.error('Failed to remove dependency:', err);
    }
  }, [boardManager]);

  console.log('EnhancedKanbanView: Rendering with state:', { isLoading, error, boardState: !!boardState, boardPath });

  if (isLoading) {
    return (
      <div className="enhanced-kanban-loading">
        <div className="sk-pulse"></div>
        <p>Loading board...</p>
        <p>Board path: {boardPath}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-kanban-error">
        <h3>Error loading board</h3>
        <p>{error}</p>
        <p>Board path: {boardPath}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!boardState) {
    return (
      <div className="enhanced-kanban-error">
        <h3>No board found</h3>
        <p>Could not load board at {boardPath}</p>
        <p>Please check that the board.json file exists in this folder.</p>
      </div>
    );
  }

  return (
    <div className="enhanced-kanban">
      <div className="enhanced-kanban-header">
        <h2>Enhanced Kanban Board</h2>
        <div className="enhanced-kanban-actions">
          <button onClick={handleCreateInitiative}>New Initiative</button>
          <button onClick={() => setShowDependencyView(!showDependencyView)}>
            {showDependencyView ? 'Hide' : 'Show'} Dependencies
          </button>
        </div>
      </div>

      <div className="enhanced-kanban-board">
        {boardState.config.columns
          .sort((a, b) => a.order - b.order)
          .map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={cardsByStatus.get(column.id) || []}
              onCardStatusChange={handleCardStatusChange}
              onCardClick={handleCardClick}
              onCreateCard={handleCreateCard}
              dependencyManager={dependencyManager}
              showDependencies={showDependencyView}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
            />
          ))}
      </div>

      {showDependencyView && (
        <DependencyView
          cards={Array.from(boardState.cards.values())}
          dependencyManager={dependencyManager}
        />
      )}
    </div>
  );
};

// Column component
interface ColumnProps {
  column: any; // BoardColumn type
  cards: CardFile[];
  onCardStatusChange: (cardId: string, newStatus: string) => void;
  onCardClick: (cardId: string) => void;
  onCreateCard: (status: string) => void;
  dependencyManager: DependencyManager;
  showDependencies: boolean;
  onAddDependency: (fromCardId: string, toCardId: string) => void;
  onRemoveDependency: (fromCardId: string, toCardId: string) => void;
}

const Column = ({
  column,
  cards,
  onCardStatusChange,
  onCardClick,
  onCreateCard,
  dependencyManager,
  showDependencies,
  onAddDependency,
  onRemoveDependency
}: ColumnProps) => {
  const wipLimit = column.wip_limit;
  const isOverLimit = wipLimit && cards.length > wipLimit;

  return (
    <div className={`enhanced-kanban-column ${isOverLimit ? 'over-wip-limit' : ''}`}>
      <div className="enhanced-kanban-column-header" style={{ borderColor: column.color }}>
        <h3>{column.title}</h3>
        <span className="card-count">
          {cards.length}
          {wipLimit && ` / ${wipLimit}`}
        </span>
        <button onClick={() => onCreateCard(column.id)}>+ Add Card</button>
      </div>

      <div className="enhanced-kanban-column-cards">
        {cards.map((card) => (
          <Card
            key={card.path}
            card={card}
            onStatusChange={onCardStatusChange}
            onClick={onCardClick}
            dependencyManager={dependencyManager}
            showDependencies={showDependencies}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
          />
        ))}
      </div>
    </div>
  );
};

// Card component
interface CardProps {
  card: CardFile;
  onStatusChange: (cardId: string, newStatus: string) => void;
  onClick: (cardId: string) => void;
  dependencyManager: DependencyManager;
  showDependencies: boolean;
  onAddDependency: (fromCardId: string, toCardId: string) => void;
  onRemoveDependency: (fromCardId: string, toCardId: string) => void;
}

const Card = ({
  card,
  onStatusChange,
  onClick,
  dependencyManager,
  showDependencies,
  onAddDependency,
  onRemoveDependency
}: CardProps) => {
  const cardId = card.path.split('/').pop()?.replace('.md', '') || '';
  const predecessors = dependencyManager.getPredecessors(cardId);
  const successors = dependencyManager.getSuccessors(cardId);

  return (
    <div className="enhanced-kanban-card" onClick={() => onClick(cardId)}>
      <div className="card-header">
        <h4>{card.metadata.title}</h4>
        {card.metadata.priority && (
          <span className={`priority priority-${card.metadata.priority.toLowerCase()}`}>
            {card.metadata.priority}
          </span>
        )}
      </div>

      {card.metadata.initiative && (
        <div className="card-initiative">
          Initiative: {card.metadata.initiative}
        </div>
      )}

      {showDependencies && (predecessors.size > 0 || successors.size > 0) && (
        <div className="card-dependencies">
          {predecessors.size > 0 && (
            <div className="dependencies-predecessors">
              <strong>Depends on:</strong>
              {Array.from(predecessors).map((predId) => (
                <span key={predId} className="dependency-tag">
                  {predId}
                </span>
              ))}
            </div>
          )}
          {successors.size > 0 && (
            <div className="dependencies-successors">
              <strong>Blocks:</strong>
              {Array.from(successors).map((succId) => (
                <span key={succId} className="dependency-tag">
                  {succId}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {card.metadata.assignee && (
        <div className="card-assignee">
          Assignee: {card.metadata.assignee}
        </div>
      )}

      {card.metadata.due_date && (
        <div className="card-due-date">
          Due: {card.metadata.due_date}
        </div>
      )}
    </div>
  );
};

// Dependency view component
interface DependencyViewProps {
  cards: CardFile[];
  dependencyManager: DependencyManager;
}

const DependencyView = ({ cards, dependencyManager }: DependencyViewProps) => {
  const circularDependencies = dependencyManager.getAllCircularDependencies();
  const readyCards = dependencyManager.getReadyCards(new Map(cards.map(card => [card.path.split('/').pop()?.replace('.md', '') || '', card])));
  const blockingCards = dependencyManager.getBlockingCards(new Map(cards.map(card => [card.path.split('/').pop()?.replace('.md', '') || '', card])));

  return (
    <div className="enhanced-kanban-dependency-view">
      <h3>Dependency Analysis</h3>
      
      {circularDependencies.length > 0 && (
        <div className="dependency-warning">
          <h4>⚠️ Circular Dependencies Detected</h4>
          {circularDependencies.map((cycle, index) => (
            <div key={index} className="circular-dependency">
              {cycle.join(' → ')}
            </div>
          ))}
        </div>
      )}

      <div className="dependency-stats">
        <div className="stat">
          <strong>Ready to Start:</strong> {readyCards.length} cards
        </div>
        <div className="stat">
          <strong>Blocking Others:</strong> {blockingCards.length} cards
        </div>
      </div>
    </div>
  );
};

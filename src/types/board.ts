// New data types for the enhanced Kanban system

export interface CardMetadata {
  title: string;
  status: string;
  initiative?: string;
  predecessors: string[];
  successors: string[];
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee?: string;
  due_date?: string;
  created_date?: string;
  updated_date?: string;
  tags?: string[];
  [key: string]: any; // Allow additional custom fields
}

export interface InitiativeMetadata {
  title: string;
  status: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  start_date?: string;
  end_date?: string;
  created_date?: string;
  updated_date?: string;
  tags?: string[];
  [key: string]: any; // Allow additional custom fields
}

export interface BoardColumn {
  id: string;
  title: string;
  color: string;
  wip_limit?: number;
  order: number;
}

export interface BoardConfig {
  columns: BoardColumn[];
  settings: {
    wip_limits?: Record<string, number>;
    dependency_rules?: {
      enforce_predecessors: boolean;
      allow_parallel_work: boolean;
    };
    [key: string]: any;
  };
}

export interface CardFile {
  path: string;
  metadata: CardMetadata;
  content: string;
  lastModified: number;
}

export interface InitiativeFile {
  path: string;
  metadata: InitiativeMetadata;
  content: string;
  lastModified: number;
}

export interface BoardState {
  config: BoardConfig;
  cards: Map<string, CardFile>;
  initiatives: Map<string, InitiativeFile>;
  lastUpdated: number;
}

export interface DependencyGraph {
  predecessors: Map<string, Set<string>>; // cardId -> set of predecessor cardIds
  successors: Map<string, Set<string>>;   // cardId -> set of successor cardIds
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CardValidationContext {
  card: CardFile;
  allCards: Map<string, CardFile>;
  boardConfig: BoardConfig;
}

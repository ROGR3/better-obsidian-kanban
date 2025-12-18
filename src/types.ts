// Core domain types
export interface BoardColumn {
  id: string;
  title: string;
  order: number;
  color: string;
}

export interface BoardSettings {
  allowMarkdown: boolean;
  dateFormat: string;
  timeFormat: string;
}

export interface BoardData {
  columns: BoardColumn[];
  items: BoardItem[];
  settings: BoardSettings;
}

export interface BoardItem {
  id: string;
  name: string;
  note: string;
  status: string;
  date: string;
  type: 'card' | 'initiative';
  initiative?: string;
  predecessors?: string[];
  successors?: string[];
  description?: string;
}

// Item metadata interfaces
export interface StatusHistoryEntry {
  status: string;
  enteredAt: string; // ISO timestamp
  leftAt?: string; // ISO timestamp, undefined if still in this status
  duration?: number; // Duration in milliseconds, calculated when left
}

export interface CardMetadata {
  title: string;
  status: string;
  initiative: string;
  predecessors: string[];
  successors: string[];
  date: string;
  tags: string[];
  archived: boolean;
  wontdo: boolean;
  history: StatusHistoryEntry[];
}

export interface InitiativeMetadata {
  title: string;
  status: string;
  description: string;
  date: string;
  tags: string[];
  archived: boolean;
  wontdo: boolean;
}

// Core item interfaces
export interface Card {
  id: string;
  content: string;
  metadata: CardMetadata;
}

export interface Initiative {
  id: string;
  content: string;
  metadata: InitiativeMetadata;
}

// Modal and UI types
export interface ModalData {
  title: string;
  description: string;
  initiative?: string;
  tags: string[];
  linkedCard?: string;
  relationshipType?: 'sibling' | 'predecessor' | 'successor';
}

// Event handling types
export type ItemType = 'card' | 'initiative' | 'column';
export type ContextAction = 
  | 'edit-card' 
  | 'edit-initiative' 
  | 'delete-card' 
  | 'delete-initiative' 
  | 'archive-card' 
  | 'archive-initiative' 
  | 'unarchive-card' 
  | 'unarchive-initiative' 
  | 'add-card' 
  | 'add-initiative' 
  | 'move-card' 
  | 'move-initiative';

export interface ContextMenuData {
  type: ItemType;
  id?: string;
  columnId?: string;
  position: { x: number; y: number };
}

// Service interfaces
export interface IEventService {
  attachEventListeners(container: HTMLElement): void;
  detachEventListeners(container: HTMLElement): void;
}

export interface IContextMenuService {
  show(event: MouseEvent, data: ContextMenuData): void;
  hide(): void;
  isVisible(): boolean;
}

export interface IBoardRenderer {
  render(container: HTMLElement, boardData: BoardData, cards: Map<string, Card>, initiatives: Map<string, Initiative>): void;
  showNoBoardMessage(container: HTMLElement): void;
}

export interface IBoardManager {
  loadBoardFromFile(filePath: string): Promise<void>;
  saveBoardToFile(): Promise<void>;
  getBoardData(): BoardData;
  getCards(): Map<string, Card>;
  getInitiatives(): Map<string, Initiative>;
  getFilePath(): string | null;
  editCard(cardId: string): Promise<void>;
  editInitiative(initiativeId: string): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  deleteInitiative(initiativeId: string): Promise<void>;
  archiveCard(cardId: string): Promise<void>;
  archiveInitiative(initiativeId: string): Promise<void>;
  addCardToColumn(columnId: string): Promise<void>;
  addInitiativeToColumn(columnId: string): Promise<void>;
  moveCardToColumn(cardId: string, columnId: string): Promise<void>;
  moveInitiativeToColumn(initiativeId: string, columnId: string): Promise<void>;
}

// Error types
export class KanbanError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'KanbanError';
  }
}

export class ValidationError extends KanbanError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class FileError extends KanbanError {
  constructor(message: string, public filePath?: string) {
    super(message, 'FILE_ERROR');
    this.name = 'FileError';
  }
}

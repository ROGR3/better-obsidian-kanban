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

export interface CardMetadata {
  title: string;
  status: string;
  initiative: string;
  predecessors: string[];
  successors: string[];
  date: string;
  priority: string;
}

export interface InitiativeMetadata {
  title: string;
  status: string;
  description: string;
  date: string;
  priority: string;
}

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

export interface ModalData {
  title: string;
  description: string;
  initiative?: string;
  priority: string;
}

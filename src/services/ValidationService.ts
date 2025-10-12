import { ValidationError, Card, Initiative, BoardData } from '../types';

export class ValidationService {
  static validateCard(card: Card): void {
    if (!card.id || card.id.trim() === '') {
      throw new ValidationError('Card ID is required', 'id');
    }

    if (!card.metadata.title || card.metadata.title.trim() === '') {
      throw new ValidationError('Card title is required', 'title');
    }

    if (!card.metadata.status || card.metadata.status.trim() === '') {
      throw new ValidationError('Card status is required', 'status');
    }

    if (!card.metadata.date || card.metadata.date.trim() === '') {
      throw new ValidationError('Card date is required', 'date');
    }
  }

  static validateInitiative(initiative: Initiative): void {
    if (!initiative.id || initiative.id.trim() === '') {
      throw new ValidationError('Initiative ID is required', 'id');
    }

    if (!initiative.metadata.title || initiative.metadata.title.trim() === '') {
      throw new ValidationError('Initiative title is required', 'title');
    }

    if (!initiative.metadata.status || initiative.metadata.status.trim() === '') {
      throw new ValidationError('Initiative status is required', 'status');
    }

    if (!initiative.metadata.date || initiative.metadata.date.trim() === '') {
      throw new ValidationError('Initiative date is required', 'date');
    }
  }

  static validateBoardData(boardData: BoardData): void {
    if (!boardData.columns || boardData.columns.length === 0) {
      throw new ValidationError('Board must have at least one column');
    }

    if (!boardData.settings) {
      throw new ValidationError('Board settings are required');
    }

    // Validate columns
    boardData.columns.forEach((column, index) => {
      if (!column.id || column.id.trim() === '') {
        throw new ValidationError(`Column ${index + 1} ID is required`);
      }
      if (!column.title || column.title.trim() === '') {
        throw new ValidationError(`Column ${index + 1} title is required`);
      }
      if (typeof column.order !== 'number') {
        throw new ValidationError(`Column ${index + 1} order must be a number`);
      }
    });
  }

  static validateFilePath(filePath: string): void {
    if (!filePath || filePath.trim() === '') {
      throw new ValidationError('File path is required');
    }

    if (!filePath.endsWith('.md')) {
      throw new ValidationError('File must be a markdown file (.md)');
    }
  }

  static normalizeStatus(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static validateTags(tags: string[]): string[] {
    return tags
      .map(tag => this.sanitizeString(tag))
      .filter(tag => tag.length > 0)
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }
}

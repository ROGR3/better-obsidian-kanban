import { Card, StatusHistoryEntry } from '../types';

export class HistoryService {
  /**
   * Update card history when status changes
   */
  static updateCardHistory(card: Card, newStatus: string): void {
    const now = new Date().toISOString();
    
    // Initialize history if it doesn't exist
    if (!card.metadata.history) {
      card.metadata.history = [];
    }

    // If status hasn't changed, don't update history
    if (card.metadata.status === newStatus) {
      return;
    }

    // Close the current status entry if there is one
    const currentEntry = card.metadata.history.find(entry => !entry.leftAt);
    if (currentEntry) {
      const leftAt = new Date(now);
      const enteredAt = new Date(currentEntry.enteredAt);
      currentEntry.leftAt = now;
      currentEntry.duration = leftAt.getTime() - enteredAt.getTime();
    }

    // Add new status entry
    const newEntry: StatusHistoryEntry = {
      status: newStatus,
      enteredAt: now
    };
    
    card.metadata.history.push(newEntry);
    card.metadata.status = newStatus;
  }

  /**
   * Get total time spent in a specific status
   */
  static getTimeInStatus(card: Card, status: string): number {
    if (!card.metadata.history) return 0;

    return card.metadata.history
      .filter(entry => entry.status === status)
      .reduce((total, entry) => {
        if (entry.duration) {
          return total + entry.duration;
        }
        // If still in this status, calculate current duration
        if (!entry.leftAt) {
          const now = new Date().getTime();
          const enteredAt = new Date(entry.enteredAt).getTime();
          return total + (now - enteredAt);
        }
        return total;
      }, 0);
  }

  /**
   * Get current time in current status
   */
  static getCurrentStatusDuration(card: Card): number {
    if (!card.metadata.history) return 0;

    const currentEntry = card.metadata.history.find(entry => !entry.leftAt);
    if (!currentEntry) return 0;

    const now = new Date().getTime();
    const enteredAt = new Date(currentEntry.enteredAt).getTime();
    return now - enteredAt;
  }

  /**
   * Get formatted duration string
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get status history summary
   */
  static getStatusSummary(card: Card): { [status: string]: number } {
    if (!card.metadata.history) return {};

    const summary: { [status: string]: number } = {};
    
    card.metadata.history.forEach(entry => {
      if (!summary[entry.status]) {
        summary[entry.status] = 0;
      }
      
      if (entry.duration) {
        summary[entry.status] += entry.duration;
      } else if (!entry.leftAt) {
        // Currently in this status
        const now = new Date().getTime();
        const enteredAt = new Date(entry.enteredAt).getTime();
        summary[entry.status] += (now - enteredAt);
      }
    });

    return summary;
  }

  /**
   * Initialize history for a new card
   */
  static initializeCardHistory(card: Card): void {
    if (!card.metadata.history) {
      card.metadata.history = [{
        status: card.metadata.status,
        enteredAt: card.metadata.date
      }];
    }
  }
}

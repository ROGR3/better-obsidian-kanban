import { Card, Initiative } from '../types';

export class TagService {
  /**
   * Get all unique tags from all cards and initiatives
   */
  static getAllTags(cards: Map<string, Card>, initiatives: Map<string, Initiative>): string[] {
    const allTags = new Set<string>();
    
    // Collect tags from cards
    cards.forEach(card => {
      if (card.metadata.tags) {
        card.metadata.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Collect tags from initiatives
    initiatives.forEach(initiative => {
      if (initiative.metadata.tags) {
        initiative.metadata.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    return Array.from(allTags).sort();
  }

  /**
   * Get tags that match a given prefix (for autocomplete)
   */
  static getMatchingTags(cards: Map<string, Card>, initiatives: Map<string, Initiative>, prefix: string): string[] {
    const allTags = this.getAllTags(cards, initiatives);
    const lowerPrefix = prefix.toLowerCase();
    
    return allTags.filter(tag => 
      tag.toLowerCase().startsWith(lowerPrefix)
    );
  }

  /**
   * Get most frequently used tags (for suggestions)
   */
  static getPopularTags(cards: Map<string, Card>, initiatives: Map<string, Initiative>, limit: number = 10): string[] {
    const tagCounts = new Map<string, number>();
    
    // Count tag usage
    cards.forEach(card => {
      if (card.metadata.tags) {
        card.metadata.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    initiatives.forEach(initiative => {
      if (initiative.metadata.tags) {
        initiative.metadata.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    // Sort by frequency and return top tags
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  /**
   * Validate and clean tag input
   */
  static validateTagInput(input: string): string[] {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => {
        // Remove leading # if present (Obsidian style)
        if (tag.startsWith('#')) {
          tag = tag.substring(1);
        }
        return tag;
      })
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }

  /**
   * Format tag for display (add # prefix if not present)
   */
  static formatTagForDisplay(tag: string): string {
    return tag.startsWith('#') ? tag : `#${tag}`;
  }

  /**
   * Get cards filtered by tags
   */
  static filterCardsByTags(cards: Map<string, Card>, tags: string[]): Card[] {
    if (tags.length === 0) return Array.from(cards.values());
    
    return Array.from(cards.values()).filter(card => {
      if (!card.metadata.tags) return false;
      return tags.some(tag => card.metadata.tags.includes(tag));
    });
  }

  /**
   * Get initiatives filtered by tags
   */
  static filterInitiativesByTags(initiatives: Map<string, Initiative>, tags: string[]): Initiative[] {
    if (tags.length === 0) return Array.from(initiatives.values());
    
    return Array.from(initiatives.values()).filter(initiative => {
      if (!initiative.metadata.tags) return false;
      return tags.some(tag => initiative.metadata.tags.includes(tag));
    });
  }
}

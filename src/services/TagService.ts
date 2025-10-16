import { Card, Initiative } from '../types';

export class TagService {
  private static tagCache = new Map<string, string[]>();
  private static popularTagsCache = new Map<string, string[]>();
  private static cacheKey = '';

  /**
   * Generate cache key from cards and initiatives
   */
  private static generateCacheKey(cards: Map<string, Card>, initiatives: Map<string, Initiative>): string {
    return `${cards.size}-${initiatives.size}`;
  }

  /**
   * Get all unique tags from all cards and initiatives (cached)
   */
  static getAllTags(cards: Map<string, Card>, initiatives: Map<string, Initiative>): string[] {
    const cacheKey = this.generateCacheKey(cards, initiatives);
    
    if (this.tagCache.has(cacheKey)) {
      return this.tagCache.get(cacheKey) || [];
    }

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
    
    const result = Array.from(allTags).sort();
    this.tagCache.set(cacheKey, result);
    
    // Clean old cache entries (keep only last 5)
    if (this.tagCache.size > 5) {
      const keys = Array.from(this.tagCache.keys());
      keys.slice(0, -5).forEach(key => this.tagCache.delete(key));
    }
    
    return result;
  }

  /**
   * Get tags that match a given prefix (for autocomplete) - optimized
   */
  static getMatchingTags(cards: Map<string, Card>, initiatives: Map<string, Initiative>, prefix: string): string[] {
    if (!prefix || prefix.length < 1) return [];
    
    const allTags = this.getAllTags(cards, initiatives);
    const lowerPrefix = prefix.toLowerCase();
    
    // Use filter for better performance on small datasets
    const result: string[] = [];
    for (const tag of allTags) {
      if (tag.toLowerCase().startsWith(lowerPrefix)) {
        result.push(tag);
        if (result.length >= 8) break; // Limit results for performance
      }
    }
    
    return result;
  }

  /**
   * Get most frequently used tags (for suggestions) - cached
   */
  static getPopularTags(cards: Map<string, Card>, initiatives: Map<string, Initiative>, limit: number = 10): string[] {
    const cacheKey = `${cards.size}-${initiatives.size}-${limit}`;
    
    if (this.popularTagsCache.has(cacheKey)) {
      return this.popularTagsCache.get(cacheKey) || [];
    }

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
    const result = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
    
    this.popularTagsCache.set(cacheKey, result);
    
    // Clean old cache entries
    if (this.popularTagsCache.size > 5) {
      const keys = Array.from(this.popularTagsCache.keys());
      keys.slice(0, -5).forEach(key => this.popularTagsCache.delete(key));
    }
    
    return result;
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

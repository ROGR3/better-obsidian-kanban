import { DependencyGraph, CardFile, ValidationResult, CardValidationContext } from '../types/board';

export class DependencyManager {
  private dependencyGraph: DependencyGraph;

  constructor() {
    this.dependencyGraph = {
      predecessors: new Map(),
      successors: new Map()
    };
  }

  /**
   * Build dependency graph from cards
   */
  buildDependencyGraph(cards: Map<string, CardFile>): void {
    this.dependencyGraph.predecessors.clear();
    this.dependencyGraph.successors.clear();

    // Initialize maps for all cards
    for (const cardId of cards.keys()) {
      this.dependencyGraph.predecessors.set(cardId, new Set());
      this.dependencyGraph.successors.set(cardId, new Set());
    }

    // Build relationships
    for (const [cardId, card] of cards) {
      // Add predecessors
      for (const predecessorId of card.metadata.predecessors) {
        if (cards.has(predecessorId)) {
          this.dependencyGraph.predecessors.get(cardId)?.add(predecessorId);
          this.dependencyGraph.successors.get(predecessorId)?.add(cardId);
        }
      }

      // Add successors
      for (const successorId of card.metadata.successors) {
        if (cards.has(successorId)) {
          this.dependencyGraph.successors.get(cardId)?.add(successorId);
          this.dependencyGraph.predecessors.get(successorId)?.add(cardId);
        }
      }
    }
  }

  /**
   * Get all predecessors of a card
   */
  getPredecessors(cardId: string): Set<string> {
    return this.dependencyGraph.predecessors.get(cardId) || new Set();
  }

  /**
   * Get all successors of a card
   */
  getSuccessors(cardId: string): Set<string> {
    return this.dependencyGraph.successors.get(cardId) || new Set();
  }

  /**
   * Get all cards that depend on this card (transitive)
   */
  getAllDependents(cardId: string): Set<string> {
    const dependents = new Set<string>();
    const visited = new Set<string>();

    const collectDependents = (currentCardId: string) => {
      if (visited.has(currentCardId)) return;
      visited.add(currentCardId);

      const successors = this.getSuccessors(currentCardId);
      for (const successorId of successors) {
        dependents.add(successorId);
        collectDependents(successorId);
      }
    };

    collectDependents(cardId);
    return dependents;
  }

  /**
   * Get all cards that this card depends on (transitive)
   */
  getAllDependencies(cardId: string): Set<string> {
    const dependencies = new Set<string>();
    const visited = new Set<string>();

    const collectDependencies = (currentCardId: string) => {
      if (visited.has(currentCardId)) return;
      visited.add(currentCardId);

      const predecessors = this.getPredecessors(currentCardId);
      for (const predecessorId of predecessors) {
        dependencies.add(predecessorId);
        collectDependencies(predecessorId);
      }
    };

    collectDependencies(cardId);
    return dependencies;
  }

  /**
   * Check if there's a circular dependency
   */
  hasCircularDependency(cardId: string): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (currentCardId: string): boolean => {
      if (recursionStack.has(currentCardId)) {
        return true; // Found a cycle
      }
      if (visited.has(currentCardId)) {
        return false; // Already processed
      }

      visited.add(currentCardId);
      recursionStack.add(currentCardId);

      const successors = this.getSuccessors(currentCardId);
      for (const successorId of successors) {
        if (hasCycle(successorId)) {
          return true;
        }
      }

      recursionStack.delete(currentCardId);
      return false;
    };

    return hasCycle(cardId);
  }

  /**
   * Get all circular dependencies in the graph
   */
  getAllCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const findCycles = (currentCardId: string, path: string[]): void => {
      if (recursionStack.has(currentCardId)) {
        // Found a cycle
        const cycleStart = path.indexOf(currentCardId);
        cycles.push(path.slice(cycleStart).concat([currentCardId]));
        return;
      }
      if (visited.has(currentCardId)) {
        return;
      }

      visited.add(currentCardId);
      recursionStack.add(currentCardId);

      const successors = this.getSuccessors(currentCardId);
      for (const successorId of successors) {
        findCycles(successorId, [...path, currentCardId]);
      }

      recursionStack.delete(currentCardId);
    };

    for (const cardId of this.dependencyGraph.predecessors.keys()) {
      if (!visited.has(cardId)) {
        findCycles(cardId, []);
      }
    }

    return cycles;
  }

  /**
   * Validate card dependencies
   */
  validateCardDependencies(context: CardValidationContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const { card, allCards, boardConfig } = context;

    // Check if predecessors exist
    for (const predecessorId of card.metadata.predecessors) {
      if (!allCards.has(predecessorId)) {
        errors.push(`Predecessor card '${predecessorId}' does not exist`);
      }
    }

    // Check if successors exist
    for (const successorId of card.metadata.successors) {
      if (!allCards.has(successorId)) {
        errors.push(`Successor card '${successorId}' does not exist`);
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(card.metadata.title)) {
      errors.push('Circular dependency detected');
    }

    // Check if predecessors are completed (if rule is enabled)
    if (boardConfig.settings.dependency_rules?.enforce_predecessors) {
      for (const predecessorId of card.metadata.predecessors) {
        const predecessor = allCards.get(predecessorId);
        if (predecessor && predecessor.metadata.status !== 'done') {
          errors.push(`Predecessor '${predecessorId}' must be completed before this card can be moved to '${card.metadata.status}'`);
        }
      }
    }

    // Check WIP limits
    const currentStatus = card.metadata.status;
    const wipLimit = boardConfig.settings.wip_limits?.[currentStatus];
    if (wipLimit) {
      const cardsInStatus = Array.from(allCards.values()).filter(
        c => c.metadata.status === currentStatus
      ).length;
      
      if (cardsInStatus >= wipLimit) {
        warnings.push(`WIP limit for '${currentStatus}' (${wipLimit}) would be exceeded`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get topological sort of cards (for dependency ordering)
   */
  getTopologicalSort(cards: Map<string, CardFile>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const tempMarked = new Set<string>();

    const visit = (cardId: string): void => {
      if (tempMarked.has(cardId)) {
        throw new Error('Circular dependency detected');
      }
      if (visited.has(cardId)) {
        return;
      }

      tempMarked.add(cardId);

      const predecessors = this.getPredecessors(cardId);
      for (const predecessorId of predecessors) {
        visit(predecessorId);
      }

      tempMarked.delete(cardId);
      visited.add(cardId);
      result.push(cardId);
    };

    for (const cardId of cards.keys()) {
      if (!visited.has(cardId)) {
        visit(cardId);
      }
    }

    return result;
  }

  /**
   * Get cards that can be started (no incomplete predecessors)
   */
  getReadyCards(cards: Map<string, CardFile>): string[] {
    const readyCards: string[] = [];

    for (const [cardId, card] of cards) {
      const predecessors = this.getPredecessors(cardId);
      const allPredecessorsComplete = Array.from(predecessors).every(
        predId => {
          const pred = cards.get(predId);
          return pred?.metadata.status === 'done';
        }
      );

      if (allPredecessorsComplete && card.metadata.status !== 'done') {
        readyCards.push(cardId);
      }
    }

    return readyCards;
  }

  /**
   * Get cards that are blocking others
   */
  getBlockingCards(cards: Map<string, CardFile>): string[] {
    const blockingCards: string[] = [];

    for (const [cardId, card] of cards) {
      if (card.metadata.status !== 'done') {
        const dependents = this.getAllDependents(cardId);
        if (dependents.size > 0) {
          blockingCards.push(cardId);
        }
      }
    }

    return blockingCards;
  }
}

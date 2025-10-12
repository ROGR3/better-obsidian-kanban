# Card History Tracking Example

This document demonstrates how the history tracking system works for cards in the kanban board.

## How It Works

When a card is created or moved between columns, the system automatically tracks:

1. **Status Changes**: Each time a card moves from one status to another
2. **Timestamps**: When the card entered and left each status
3. **Duration**: How long the card spent in each status
4. **Current Status**: Real-time tracking of time spent in the current status

## Data Structure

Each card now has a `history` field in its metadata:

```typescript
interface StatusHistoryEntry {
  status: string;           // The status name (e.g., "backlog", "committed", "in progress", "done")
  enteredAt: string;        // ISO timestamp when entered this status
  leftAt?: string;          // ISO timestamp when left this status (undefined if still in this status)
  duration?: number;        // Duration in milliseconds (calculated when left)
}

interface CardMetadata {
  // ... other fields
  history: StatusHistoryEntry[];
}
```

## Example History

Here's what a card's history might look like after being moved through the workflow:

```json
{
  "history": [
    {
      "status": "backlog",
      "enteredAt": "2024-01-15T10:00:00.000Z",
      "leftAt": "2024-01-16T09:30:00.000Z",
      "duration": 84600000
    },
    {
      "status": "committed",
      "enteredAt": "2024-01-16T09:30:00.000Z",
      "leftAt": "2024-01-17T14:20:00.000Z",
      "duration": 105000000
    },
    {
      "status": "in progress",
      "enteredAt": "2024-01-17T14:20:00.000Z",
      "leftAt": "2024-01-19T16:45:00.000Z",
      "duration": 191100000
    },
    {
      "status": "done",
      "enteredAt": "2024-01-19T16:45:00.000Z"
    }
  ]
}
```

## Available Methods

The `BoardManager` now provides these history-related methods:

- `getCardHistory(cardId)`: Get full history array for a card
- `getCardTimeInStatus(cardId, status)`: Get total time spent in a specific status
- `getCardCurrentStatusDuration(cardId)`: Get time spent in current status
- `getCardStatusSummary(cardId)`: Get summary of time spent in each status

## Usage Example

```typescript
// Get how long a card has been in "in progress"
const timeInProgress = boardManager.getCardTimeInStatus('card-123', 'in progress');
console.log(`Time in progress: ${HistoryService.formatDuration(timeInProgress)}`);

// Get current status duration
const currentDuration = boardManager.getCardCurrentStatusDuration('card-123');
console.log(`Current status duration: ${HistoryService.formatDuration(currentDuration)}`);

// Get full status summary
const summary = boardManager.getCardStatusSummary('card-123');
console.log('Status summary:', summary);
```

## Benefits

1. **Analytics**: Understand how long tasks spend in each stage
2. **Process Improvement**: Identify bottlenecks in your workflow
3. **Team Insights**: See patterns in task completion times
4. **Future Planning**: Better estimate task durations based on historical data

The history is automatically saved to the markdown file's frontmatter, so it persists across sessions and can be version controlled.

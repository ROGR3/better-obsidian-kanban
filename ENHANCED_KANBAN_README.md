# Enhanced Kanban Plugin

This is an enhanced version of the Obsidian Kanban plugin that adds Kanbanize-like features including initiatives (epics), card relationships, and file-based storage.

## Features

### 🎯 **Initiatives (Epics)**
- Create parent cards that group related tasks
- Track initiative status and progress
- Link cards to initiatives

### 🔗 **Card Relationships**
- **Predecessors**: Cards that must be completed before this card
- **Successors**: Cards that depend on this card
- **Dependency Validation**: Prevents moving cards if predecessors aren't done
- **Circular Dependency Detection**: Warns about dependency loops

### 📁 **File-Based Storage**
- Each board is stored in a folder structure
- Cards and initiatives are individual Markdown files
- Full Git compatibility and vault sync support
- Human-readable YAML frontmatter

### 🎨 **Enhanced UI**
- Visual dependency indicators
- WIP limit warnings
- Priority indicators
- Assignee and due date display
- Dependency analysis view

## File Structure

```
MyBoard/
├── board.json           # Board configuration
├── cards/
│   ├── 0001.md         # Card files
│   ├── 0002.md
│   └── ...
└── initiatives/
    ├── InitiativeA.md  # Initiative files
    └── ...
```

## Card File Format

Each card is a Markdown file with YAML frontmatter:

```markdown
---
title: Implement API
status: In Progress
initiative: InitiativeA
predecessors: [0001, 0002]
successors: [0003]
priority: High
assignee: john.doe
due_date: 2024-01-15
---

## Description
Detailed card description here...

## Acceptance Criteria
- [ ] API endpoint returns correct data
- [ ] Error handling implemented
```

## Initiative File Format

Each initiative is a Markdown file with YAML frontmatter:

```markdown
---
title: User Authentication System
status: Planning
description: Complete user authentication and authorization system
priority: High
start_date: 2024-01-01
end_date: 2024-03-31
---

## Overview
This initiative covers all aspects of user authentication...

## Cards
- [[0001]] - Implement API
- [[0002]] - Design database schema
```

## Board Configuration

The `board.json` file defines columns and settings:

```json
{
  "columns": [
    { "id": "backlog", "title": "Backlog", "color": "#8b5cf6", "order": 0 },
    { "id": "in-progress", "title": "In Progress", "color": "#3b82f6", "order": 1 },
    { "id": "review", "title": "Review", "color": "#f59e0b", "order": 2 },
    { "id": "done", "title": "Done", "color": "#10b981", "order": 3 }
  ],
  "settings": {
    "wip_limits": {
      "in-progress": 5,
      "review": 3
    },
    "dependency_rules": {
      "enforce_predecessors": true,
      "allow_parallel_work": false
    }
  }
}
```

## Usage

### Creating a New Board

1. Use the command palette: `Create new Enhanced Kanban board`
2. Or right-click a folder and select "Convert folder to Enhanced Kanban board"

### Managing Cards

- **Create**: Click the "+ Add Card" button in any column
- **Edit**: Click on a card to open its Markdown file
- **Move**: Drag and drop cards between columns
- **Dependencies**: Use the dependency view to manage relationships

### Managing Initiatives

- **Create**: Use the "New Initiative" button
- **Link Cards**: Set the `initiative` field in card frontmatter
- **Track Progress**: View initiative status and linked cards

### Dependency Management

- **Add Dependencies**: Use the dependency view to connect cards
- **Validation**: The system prevents invalid moves based on dependencies
- **Analysis**: View circular dependencies and blocking cards

## Commands

- `Create new Enhanced Kanban board` - Create a new board
- `Convert folder to Enhanced Kanban board` - Convert existing folder
- `Open Enhanced Kanban board` - Open an existing board

## Migration from Original Kanban

The enhanced system is designed to work alongside the original Kanban plugin:

1. **Coexistence**: Both systems can be used simultaneously
2. **No Breaking Changes**: Original Kanban boards continue to work
3. **Gradual Migration**: Convert boards when ready

## Technical Architecture

### Core Components

- **FileManager**: Handles file operations and parsing
- **DependencyManager**: Manages card relationships and validation
- **EnhancedBoardManager**: Coordinates board state and operations
- **EnhancedKanbanView**: React-based UI component

### Data Flow

1. **Load**: FileManager reads board.json and card/initiative files
2. **Parse**: YAML frontmatter is parsed into structured data
3. **Build**: DependencyManager builds relationship graph
4. **Render**: EnhancedKanbanView displays the board
5. **Update**: Changes are saved back to files

### Validation Rules

- **Predecessor Completion**: Cards can't move to "done" if predecessors aren't done
- **WIP Limits**: Column limits are enforced with warnings
- **Circular Dependencies**: Detected and reported
- **Required Fields**: Title and status are required

## Development

### Adding New Features

1. **Data Model**: Extend types in `src/types/board.ts`
2. **File Operations**: Add methods to `FileManager`
3. **UI Components**: Create React components in `src/components/`
4. **Validation**: Add rules to `DependencyManager`

### Testing

- Create test boards with various dependency patterns
- Test WIP limit enforcement
- Verify file-based persistence
- Check Git compatibility

## Future Enhancements

- **Timeline View**: Gantt chart for dependencies
- **Burndown Charts**: Progress tracking
- **Custom Fields**: User-defined metadata
- **Templates**: Predefined board configurations
- **Import/Export**: Integration with other tools
- **Collaboration**: Real-time updates
- **Mobile Support**: Touch-friendly interface

## Troubleshooting

### Common Issues

1. **Cards not loading**: Check file permissions and YAML syntax
2. **Dependencies not working**: Verify card IDs match exactly
3. **WIP limits not enforced**: Check board.json configuration
4. **Circular dependencies**: Use dependency view to identify loops

### Debug Mode

Enable debug logging by opening the browser console and looking for:
- File loading errors
- Dependency validation messages
- Board state updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Same as the original Obsidian Kanban plugin.

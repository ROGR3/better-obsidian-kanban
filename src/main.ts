import { around } from 'monkey-around';
import {
  Plugin,
  TFile,
  TFolder,
  ViewState,
  WorkspaceLeaf,
} from 'obsidian';
import { MarkdownKanbanView, MARKDOWN_KANBAN_VIEW_TYPE } from './MarkdownKanbanView';

export default class KanbanPlugin extends Plugin {
  // leafid => view mode
  kanbanFileModes: Record<string, string> = {};
  _loaded: boolean = false;

  onunload() {
    this.kanbanFileModes = {};
  }

  async onload() {
    this.registerView(MARKDOWN_KANBAN_VIEW_TYPE, (leaf) => new MarkdownKanbanView(leaf));
    this.registerMonkeyPatches();
    this.registerCommands();
    this.registerEvents();

    this.addRibbonIcon('kanban', 'Create new Kanban Board', () => {
      this.newKanbanBoardMd();
    });

    this._loaded = true;
  }


  async newKanbanBoardMd(folder?: TFolder) {
    const targetFolder = folder
      ? folder
      : this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path || '');

    try {
      const kanban: TFile = await (this.app.fileManager as any).createNewMarkdownFile(
        targetFolder,
        'kanban-board'
      );

      const frontmatter = `---
kanban-plugin: board
columns: [
  {"id": "backlog", "title": "Backlog", "order": 0, "color": "#8B5CF6"},
  {"id": "committed", "title": "Committed", "order": 1, "color": "#6366F1"},
  {"id": "in-progress", "title": "In Progress", "order": 2, "color": "#3B82F6"},
  {"id": "done", "title": "Done", "order": 3, "color": "#10B981"}
]
items: []
settings: {
  "allowMarkdown": true,
  "dateFormat": "YYYY-MM-DD",
  "timeFormat": "HH:mm"
}
---

# Kanban Board

This is your kanban board. Tasks and initiatives will appear here when you add them.`;

      await this.app.vault.modify(kanban, frontmatter);
      await this.app.workspace.getLeaf().setViewState({
        type: MARKDOWN_KANBAN_VIEW_TYPE,
        state: { file: kanban.path },
      } as any);
    } catch (e) {
      console.error('Error creating kanban board:', e);
    }
  }

  registerEvents() {
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file, source) => {
        if (source === 'link-context-menu') return;

        const fileIsFolder = file instanceof TFolder;

        // Add a menu item to the folder context menu to create a board
        if (fileIsFolder) {
          menu.addItem((item) => {
            item
              .setSection('action-primary')
              .setTitle('New Kanban Board')
              .setIcon('kanban')
              .onClick(() => this.newKanbanBoardMd(file));
          });
          return;
        }
      })
    );
  }

  registerCommands() {
    this.addCommand({
      id: 'create-kanban-board-md',
      name: 'Create new Kanban Board',
      callback: () => this.newKanbanBoardMd(),
    });
  }


  registerMonkeyPatches() {
    const self = this;

    // Monkey patch WorkspaceLeaf to open kanban-board.md files with MarkdownKanbanView
    this.register(
      around(WorkspaceLeaf.prototype, {
        detach(next) {
          return function () {
            const state = this.view?.getState();

            if (state?.file && self.kanbanFileModes[this.id || state.file]) {
              delete self.kanbanFileModes[this.id || state.file];
            }

            return next.apply(this);
          };
        },

        setViewState(next) {
          return function (state: ViewState, ...rest: any[]) {
            if (
              // Don't force kanban mode during shutdown
              self._loaded &&
              // If we have a markdown file
              state.type === 'markdown' &&
              state.state?.file
            ) {
              // Check for kanban-board.md files or files with kanban frontmatter
              const filePath = state.state.file as string;
              
              if (self.kanbanFileModes[this.id || filePath] !== 'markdown') {
                const cache = self.app.metadataCache.getCache(filePath);
                const isKanbanBoardFile = filePath.endsWith('kanban-board.md');
                const hasNewKanbanFrontmatter = cache?.frontmatter && cache.frontmatter['kanban-plugin'] === 'board';

                if (isKanbanBoardFile || hasNewKanbanFrontmatter) {
                  // If we have a kanban-board.md file or new frontmatter, force the view type to markdown kanban
                  const newState = {
                    ...state,
                    type: MARKDOWN_KANBAN_VIEW_TYPE,
                  };

                  self.kanbanFileModes[filePath] = MARKDOWN_KANBAN_VIEW_TYPE;

                  return next.apply(this, [newState, ...rest]);
                }
              }
            }

            return next.apply(this, [state, ...rest]);
          };
        },
      })
    );
  }
}

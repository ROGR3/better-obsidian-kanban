import { ModalData } from './types';
import { TagService } from './services/TagService';

export class ModalManager {
  static async showInputModal(title: string, message: string, defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay kanban-modal-overlay';
      modal.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>${message}</p>
            <input type="text" class="modal-input" id="modal-input" value="${defaultValue}" placeholder="Enter value">
          </div>
          <div class="modal-footer">
            <button class="btn-secondary modal-cancel">Cancel</button>
            <button class="btn-primary modal-confirm">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector('#modal-input') as HTMLInputElement;
      const confirmBtn = modal.querySelector('.modal-confirm') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('.modal-cancel') as HTMLButtonElement;
      const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleConfirm = () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleCancel();
      });

      // Focus input after a short delay
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);

      // Handle Enter key
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });
    });
  }

  static async showConfirmModal(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay kanban-modal-overlay';
      modal.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary modal-cancel">Cancel</button>
            <button class="btn-primary modal-confirm">Confirm</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const confirmBtn = modal.querySelector('.modal-confirm') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('.modal-cancel') as HTMLButtonElement;
      const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleCancel();
      });

      // Focus confirm button
      setTimeout(() => confirmBtn.focus(), 100);
    });
  }

  static async showCardModal(title: string, initialData: ModalData, availableCards: Array<{id: string, title: string}> = [], availableInitiatives: Array<{id: string, title: string}> = [], allCards?: Map<string, any>, allInitiatives?: Map<string, any>): Promise<ModalData | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay kanban-modal-overlay';
      modal.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Title *</label>
              <input type="text" class="modal-input" id="card-title" value="${initialData.title}" placeholder="Enter task title">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="modal-textarea" id="card-description" placeholder="Enter description">${initialData.description}</textarea>
            </div>
            <div class="form-group">
              <label>Initiative</label>
              <select class="modal-select" id="card-initiative">
                <option value="">None</option>
                ${availableInitiatives.map(initiative => 
                  `<option value="${initiative.title}" ${initialData.initiative === initiative.title ? 'selected' : ''}>${initiative.title}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Tags</label>
              <div class="tag-input-container">
                <input type="text" class="modal-input" id="card-tags" value="${initialData.tags?.join(', ') || ''}" placeholder="Enter tags separated by commas (e.g., work, urgent)">
                <div class="tag-suggestions" id="tag-suggestions" style="display: none;"></div>
              </div>
            </div>
            <div class="form-group">
              <label>Link to Task</label>
              <select class="modal-select" id="card-linked-card">
                <option value="">None</option>
                ${availableCards.map(card => 
                  `<option value="${card.id}" ${initialData.linkedCard === card.id ? 'selected' : ''}>${card.title}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Relationship Type</label>
              <select class="modal-select" id="card-relationship-type">
                <option value="">None</option>
                <option value="sibling" ${initialData.relationshipType === 'sibling' ? 'selected' : ''}>Sibling</option>
                <option value="predecessor" ${initialData.relationshipType === 'predecessor' ? 'selected' : ''}>Predecessor</option>
                <option value="successor" ${initialData.relationshipType === 'successor' ? 'selected' : ''}>Successor</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary modal-cancel">Cancel</button>
            <button class="btn-primary modal-confirm">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Setup tag autocomplete
      const tagsInput = modal.querySelector('#card-tags') as HTMLInputElement;
      const suggestionsDiv = modal.querySelector('#tag-suggestions') as HTMLDivElement;
      
      if (tagsInput && suggestionsDiv && allCards && allInitiatives) {
        this.setupTagAutocomplete(tagsInput, suggestionsDiv, allCards, allInitiatives);
      }

      const titleInput = modal.querySelector('#card-title') as HTMLInputElement;
      const descriptionInput = modal.querySelector('#card-description') as HTMLTextAreaElement;
      const initiativeSelect = modal.querySelector('#card-initiative') as HTMLSelectElement;
      const linkedCardSelect = modal.querySelector('#card-linked-card') as HTMLSelectElement;
      const relationshipTypeSelect = modal.querySelector('#card-relationship-type') as HTMLSelectElement;
      const confirmBtn = modal.querySelector('.modal-confirm') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('.modal-cancel') as HTMLButtonElement;
      const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleConfirm = () => {
        const title = titleInput.value.trim();
        if (!title) {
          titleInput.focus();
          return;
        }
        
        const tags = tagsInput.value.trim()
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);

        const data = {
          title: title,
          description: descriptionInput.value.trim(),
          initiative: initiativeSelect.value || undefined,
          tags: tags,
          linkedCard: linkedCardSelect.value || undefined,
          relationshipType: relationshipTypeSelect.value || undefined
        };
        
        cleanup();
        resolve(data);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleCancel();
      });

      // Focus title input after a short delay
      setTimeout(() => {
        titleInput.focus();
        titleInput.select();
      }, 100);

      // Handle Enter key
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });
    });
  }

  static async showInitiativeModal(title: string, initialData: ModalData): Promise<ModalData | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay kanban-modal-overlay';
      modal.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Title *</label>
              <input type="text" class="modal-input" id="initiative-title" value="${initialData.title}" placeholder="Enter initiative title">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="modal-textarea" id="initiative-description" placeholder="Enter description">${initialData.description}</textarea>
            </div>
            <div class="form-group">
              <label>Tags</label>
              <input type="text" class="modal-input" id="initiative-tags" value="${initialData.tags?.join(', ') || ''}" placeholder="Enter tags separated by commas (e.g., #work, #urgent)">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary modal-cancel">Cancel</button>
            <button class="btn-primary modal-confirm">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const titleInput = modal.querySelector('#initiative-title') as HTMLInputElement;
      const descriptionInput = modal.querySelector('#initiative-description') as HTMLTextAreaElement;
      const tagsInput = modal.querySelector('#initiative-tags') as HTMLInputElement;
      const confirmBtn = modal.querySelector('.modal-confirm') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('.modal-cancel') as HTMLButtonElement;
      const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleConfirm = () => {
        const title = titleInput.value.trim();
        if (!title) {
          titleInput.focus();
          return;
        }
        
        const tags = tagsInput.value.trim()
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);

        const data = {
          title: title,
          description: descriptionInput.value.trim(),
          tags: tags
        };
        
        cleanup();
        resolve(data);
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleCancel();
      });

      // Focus title input after a short delay
      setTimeout(() => {
        titleInput.focus();
        titleInput.select();
      }, 100);

      // Handle Enter key
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });
    });
  }

  private static setupTagAutocomplete(input: HTMLInputElement, suggestionsDiv: HTMLDivElement, allCards: Map<string, any>, allInitiatives: Map<string, any>): void {
    let currentSuggestions: string[] = [];
    let selectedIndex = -1;

    const showSuggestions = (query: string) => {
      if (query.length === 0) {
        // Show popular tags when no query
        currentSuggestions = TagService.getPopularTags(allCards, allInitiatives, 8);
      } else {
        // Show matching tags
        currentSuggestions = TagService.getMatchingTags(allCards, allInitiatives, query);
      }

      if (currentSuggestions.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
      }

      suggestionsDiv.innerHTML = currentSuggestions
        .map((tag, index) => `
          <div class="tag-suggestion ${index === selectedIndex ? 'selected' : ''}" data-tag="${tag}">
            ${TagService.formatTagForDisplay(tag)}
          </div>
        `).join('');
      
      suggestionsDiv.style.display = 'block';
      selectedIndex = -1;
    };

    const hideSuggestions = () => {
      setTimeout(() => {
        suggestionsDiv.style.display = 'none';
        selectedIndex = -1;
      }, 150);
    };

    const selectSuggestion = (tag: string) => {
      const currentValue = input.value;
      const cursorPos = input.selectionStart || 0;
      
      // Find the current tag being typed (before cursor)
      const beforeCursor = currentValue.substring(0, cursorPos);
      const afterCursor = currentValue.substring(cursorPos);
      
      // Find the start of the current tag
      const lastComma = beforeCursor.lastIndexOf(',');
      const tagStart = lastComma === -1 ? 0 : lastComma + 1;
      
      // Replace the current tag with the selected one
      const newValue = 
        currentValue.substring(0, tagStart) + 
        tag + 
        (afterCursor.startsWith(',') ? '' : ', ') + 
        afterCursor;
      
      input.value = newValue;
      input.focus();
      hideSuggestions();
    };

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const cursorPos = target.selectionStart || 0;
      const beforeCursor = target.value.substring(0, cursorPos);
      const lastComma = beforeCursor.lastIndexOf(',');
      const currentTag = beforeCursor.substring(lastComma + 1).trim();
      
      showSuggestions(currentTag);
    });

    input.addEventListener('keydown', (e) => {
      if (suggestionsDiv.style.display === 'none') return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
          updateSelection();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          updateSelection();
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (selectedIndex >= 0 && currentSuggestions[selectedIndex]) {
            selectSuggestion(currentSuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          hideSuggestions();
          break;
      }
    });

    input.addEventListener('blur', hideSuggestions);
    input.addEventListener('focus', () => {
      const currentTag = input.value.split(',').pop()?.trim() || '';
      showSuggestions(currentTag);
    });

    suggestionsDiv.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tag-suggestion')) {
        const tag = target.getAttribute('data-tag');
        if (tag) {
          selectSuggestion(tag);
        }
      }
    });

    const updateSelection = () => {
      const suggestions = suggestionsDiv.querySelectorAll('.tag-suggestion');
      suggestions.forEach((suggestion, index) => {
        suggestion.classList.toggle('selected', index === selectedIndex);
      });
    };
  }
}

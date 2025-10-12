import { ModalData } from './types';

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

  static async showCardModal(title: string, initialData: ModalData, availableCards: Array<{id: string, title: string}> = [], availableInitiatives: Array<{id: string, title: string}> = []): Promise<ModalData | null> {
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
              <input type="text" class="modal-input" id="card-tags" value="${initialData.tags?.join(', ') || ''}" placeholder="Enter tags separated by commas (e.g., #work, #urgent)">
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

      const titleInput = modal.querySelector('#card-title') as HTMLInputElement;
      const descriptionInput = modal.querySelector('#card-description') as HTMLTextAreaElement;
      const initiativeSelect = modal.querySelector('#card-initiative') as HTMLSelectElement;
      const tagsInput = modal.querySelector('#card-tags') as HTMLInputElement;
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
}

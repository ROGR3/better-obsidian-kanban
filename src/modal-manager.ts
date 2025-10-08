import { ModalData } from './types';

export class ModalManager {
  static async showInputModal(title: string, message: string, defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
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
      modal.className = 'modal-overlay';
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

  static async showCardModal(title: string, initialData: ModalData): Promise<ModalData | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Title *</label>
              <input type="text" class="modal-input" id="card-title" value="${initialData.title}" placeholder="Enter card title">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="modal-textarea" id="card-description" placeholder="Enter description">${initialData.description}</textarea>
            </div>
            <div class="form-group">
              <label>Initiative</label>
              <input type="text" class="modal-input" id="card-initiative" value="${initialData.initiative || ''}" placeholder="Enter initiative name">
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select class="modal-select" id="card-priority">
                <option value="low" ${initialData.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${initialData.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${initialData.priority === 'high' ? 'selected' : ''}>High</option>
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
      const initiativeInput = modal.querySelector('#card-initiative') as HTMLInputElement;
      const prioritySelect = modal.querySelector('#card-priority') as HTMLSelectElement;
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
        
        const data = {
          title: title,
          description: descriptionInput.value.trim(),
          initiative: initiativeInput.value.trim(),
          priority: prioritySelect.value
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
      modal.className = 'modal-overlay';
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
              <label>Priority</label>
              <select class="modal-select" id="initiative-priority">
                <option value="low" ${initialData.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${initialData.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${initialData.priority === 'high' ? 'selected' : ''}>High</option>
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

      const titleInput = modal.querySelector('#initiative-title') as HTMLInputElement;
      const descriptionInput = modal.querySelector('#initiative-description') as HTMLTextAreaElement;
      const prioritySelect = modal.querySelector('#initiative-priority') as HTMLSelectElement;
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
        
        const data = {
          title: title,
          description: descriptionInput.value.trim(),
          priority: prioritySelect.value
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

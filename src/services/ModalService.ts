import { ModalData, BoardData } from '../types';

export class ModalService {
  static async showMoveModal(
    itemId: string, 
    itemType: 'card' | 'initiative', 
    boardData: BoardData
  ): Promise<string | null> {
    const columns = boardData.columns.sort((a, b) => a.order - b.order);
    
    const columnOptions = columns.map(column => 
      `<option value="${column.id}">${column.title}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-panel">
        <div class="modal-header">
          <h3>Move ${itemType === 'card' ? 'Card' : 'Initiative'}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Column:</label>
            <select class="modal-select" id="move-column-select">
              ${columnOptions}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="move-cancel">Cancel</button>
          <button class="btn-primary" id="move-confirm">Move</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
      const closeModal = () => {
        modal.remove();
        resolve(null);
      };

      const confirmMove = () => {
        const select = modal.querySelector('#move-column-select') as HTMLSelectElement;
        const newColumnId = select.value;
        modal.remove();
        resolve(newColumnId);
      };

      modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
      modal.querySelector('#move-cancel')?.addEventListener('click', closeModal);
      modal.querySelector('#move-confirm')?.addEventListener('click', confirmMove);

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    });
  }

  static async showConfirmModal(title: string, message: string): Promise<boolean> {
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
          <button class="btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn-primary" id="confirm-ok">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
      const closeModal = () => {
        modal.remove();
        resolve(false);
      };

      const confirmAction = () => {
        modal.remove();
        resolve(true);
      };

      modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
      modal.querySelector('#confirm-cancel')?.addEventListener('click', closeModal);
      modal.querySelector('#confirm-ok')?.addEventListener('click', confirmAction);

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    });
  }
}

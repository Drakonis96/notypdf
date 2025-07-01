import React, { useEffect, useState } from 'react';
import { Folder, X } from 'lucide-react';
import { fileService } from '../services/fileService';

interface MoveFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (destination: string) => void;
}

const MoveFilesModal: React.FC<MoveFilesModalProps> = ({ isOpen, onClose, onMove }) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [destination, setDestination] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchFolders = async () => {
      try {
        const list = await fileService.listFolders();
        setFolders(list);
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    };
    fetchFolders();
    setDestination('');
  }, [isOpen]);

  const handleMove = () => {
    onMove(destination);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-container">
            <Folder size={24} />
            <h2>Move Files</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <select
            className="search-input"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            {folders.map((f) => (
              <option key={f} value={f}>
                {f === '' ? 'Home' : f}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleMove} className="btn btn-primary" disabled={destination === undefined}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveFilesModal;

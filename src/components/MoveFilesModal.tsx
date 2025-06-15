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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const all = await fileService.listAllFolders();
      setFolders(all);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-container">
            <Folder size={24} />
            <h2>Select Destination</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p>Loading folders...</p>
          ) : (
            <ul className="folder-list">
              {folders.map((f) => (
                <li key={f}>
                  <button className="folder-choice" onClick={() => onMove(f)}>
                    {f || '/'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default MoveFilesModal;

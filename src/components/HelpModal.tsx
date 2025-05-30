import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="translation-modal-overlay" onClick={onClose}>
      <div 
        className="translation-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        ref={modalRef}
        tabIndex={-1}
        style={{ maxWidth: '800px', width: '90vw' }}
      >
        <div className="translation-modal-header">
          <h3>
            📖 NotyPDF Help Guide
          </h3>
          <button className="close-button" onClick={onClose} aria-label="Close help modal">
            <X size={18} />
          </button>
        </div>
        
        <div className="translation-modal-content" style={{ 
          maxHeight: '70vh', 
          overflowY: 'auto',
          padding: '20px 24px'
        }}>
          <div style={{ 
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#333'
          }}>
            <h3>📋 Overview</h3>
            <p>
              NotyPDF helps you extract and save text from PDF documents to your Notion database, with flexible configuration options for organizing your notes and references.
            </p>

            <h3>🗄️ Database Configuration</h3>
            <p>
              Configure the connection to your Notion database with appropriate columns for storing your references.
            </p>
            <ul>
              <li><strong>Database ID</strong> - Your Notion database's unique identifier</li>
              <li><strong>Identifier Column</strong> - Where each entry's unique identifier will be stored</li>
              <li><strong>Text Column</strong> - Where the selected text will be saved</li>
              <li><strong>Annotation Column</strong> - For your notes about the extracted text</li>
              <li><strong>Page Column</strong> - Where page numbers will be stored</li>
            </ul>

            <h3>🔑 Identifier Pattern</h3>
            <p>
              The identifier pattern is essential for organizing your references. It follows a structure using the underscore character as separator:
            </p>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '14px',
              overflow: 'auto'
            }}>BOOKID_REFID</pre>
            <p>For example: <code>LV001_RF025</code> where:</p>
            <ul>
              <li><strong>BOOKID (LV001)</strong> - Represents your document's unique identifier, like a book code</li>
              <li><strong>REFID (RF025)</strong> - Represents the specific reference/note's unique identifier</li>
            </ul>
            
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              padding: '12px', 
              borderRadius: '6px',
              marginTop: '10px',
              borderLeft: '4px solid #4caf50'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>⚙️ Automatic Reference Numbering</p>
              <p style={{ margin: '0' }}>
                If you enter an identifier that already exists in your database, the system will automatically increment the reference number. 
                For example, if you specify <code>LV001_RF001</code> and that already exists, the system will create <code>LV001_RF002</code> instead.
                If that one exists as well, it will create <code>LV001_RF003</code>, and so on.
              </p>
            </div>
            
            <h3>📌 Document Identifier Insertion</h3>
            <p>
              Enabling this feature allows you to filter easily between different documents in your Notion database.
            </p>
            <ol>
              <li>Select a <strong>multi-select</strong> column type in your Notion database for this purpose</li>
              <li>Choose this column as your <strong>Document identifier insertion column</strong></li>
              <li>Check <strong>Enable document ID insertion</strong></li>
            </ol>
            <p>
              When enabled, the BOOKID part of your identifier pattern will be automatically added as a tag in the specified column, making it easy to filter all references from the same document.
            </p>

            <h3>🔍 Using the App Effectively</h3>
            <p>
              <strong>Workflow:</strong>
            </p>
            <ol>
              <li>Load your PDF document</li>
              <li>Configure your database connection and columns</li>
              <li>Select text from the document</li>
              <li>Add optional annotation and page number</li>
              <li>Save to your Notion database</li>
            </ol>

            <h3>💡 Tips & Tricks</h3>
            <ul>
              <li>Use standardized naming conventions for your document IDs (like LV001, BK002)</li>
              <li>Number your references sequentially (RF001, RF002) or by page (P045-1, P045-2)</li>
              <li>You can use a pattern like <code>LV001_RF001</code> as a starting point - the system will automatically handle sequential numbering</li>
              <li>Enable document ID insertion to organize references by source</li>
              <li>Use the annotation field to add your own thoughts or categories</li>
              <li>When using the multi-select column for document IDs, you can easily filter your database by document</li>
              <li>You can sort your references by their reference ID if you follow a consistent numbering convention</li>
            </ul>
          </div>
        </div>
        
        <div className="translation-modal-actions">
          <button 
            className="btn btn-primary"
            onClick={onClose}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelpModal;

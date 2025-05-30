import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TranslationConfig } from '../types';
import SuccessMessage from './SuccessMessage';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  translatedText: string;
  onAddEverything: () => void;
  onAddSelection: (selectedText: string) => void;
  translationConfig: TranslationConfig;
  annotation?: string;
  pageNumber?: string;
  onAddEverythingWithAnnotation?: (annotation: string, pageNumber?: string) => void;
  onAddSelectionWithAnnotation?: (selectedText: string, annotation: string, pageNumber?: string) => void;
}

const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  originalText,
  translatedText,
  onAddEverything,
  onAddSelection,
  translationConfig,
  annotation = '',
  pageNumber = '',
  onAddEverythingWithAnnotation,
  onAddSelectionWithAnnotation
}) => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [modalAnnotation, setModalAnnotation] = useState<string>(annotation);
  const [modalPageNumber, setModalPageNumber] = useState<string>(pageNumber);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setModalAnnotation(annotation);
  }, [annotation]);
  
  useEffect(() => {
    setModalPageNumber(pageNumber);
  }, [pageNumber]);

  // Clear selectedText, annotation, and page number when modal is opened or closed
  useEffect(() => {
    setSelectedText('');
    setModalAnnotation('');
    setModalPageNumber('');
  }, [isOpen]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  // Handle touch events for mobile text selection
  const handleTouchEnd = () => {
    // Small delay to allow selection to complete
    setTimeout(() => {
      handleTextSelection();
    }, 100);
  };

  const handleClose = () => {
    // Clear any text selection in the window
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    setSelectedText(''); // Limpiar selectedText solo al cerrar
    onClose();
  };

  const handleAddEverything = () => {
    if (onAddEverythingWithAnnotation) {
      if (modalAnnotation.trim() || modalPageNumber.trim()) {
        onAddEverythingWithAnnotation(modalAnnotation, modalPageNumber);
      } else {
        onAddEverything();
      }
    } else {
      onAddEverything();
    }
    setModalAnnotation('');
    setModalPageNumber('');
    setSuccessMessage('Text saved');
    // NO limpiar selectedText aquí
  };

  const handleAddSelection = () => {
    if (selectedText.trim()) {
      if (onAddSelectionWithAnnotation && (modalAnnotation.trim() || modalPageNumber.trim())) {
        onAddSelectionWithAnnotation(selectedText, modalAnnotation, modalPageNumber);
      } else {
        onAddSelection(selectedText);
      }
      setModalAnnotation('');
      setModalPageNumber('');
      setSuccessMessage('Text saved');
      // NO limpiar selectedText aquí
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  // Show translated text when translation is enabled, original text otherwise
  const textToShow = translationConfig.enabled ? translatedText : originalText;
  
  // Check if translation is enabled but not fully configured
  const isTranslationIncomplete = translationConfig.enabled && (
    !translationConfig.targetLanguage || 
    !translationConfig.provider || 
    !translationConfig.model
  );

  return createPortal(
    <div className="translation-modal-overlay" onClick={handleClose}>
      <div 
        className="translation-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="translation-modal-header">
          <h3>
            {translationConfig.enabled 
              ? (translationConfig.targetLanguage 
                  ? `Translation to ${translationConfig.targetLanguage}` 
                  : 'Translation Configuration Required')
              : 'Selected Text'
            }
          </h3>
          <button className="close-button" onClick={handleClose} aria-label="Close modal">
            ×
          </button>
        </div>
        
        <div className="translation-modal-content">
          {successMessage && (
            <SuccessMessage message={successMessage} duration={2500} onClose={() => setSuccessMessage('')} />
          )}
          {isTranslationIncomplete && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#856404'
            }}>
              <strong>Translation Configuration Required:</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                {!translationConfig.targetLanguage && <li>Select a target language</li>}
                {!translationConfig.provider && <li>Select a translation provider</li>}
                {!translationConfig.model && <li>Select a model</li>}
              </ul>
              <p style={{ margin: '8px 0 0 0' }}>
                Configure these settings in the Translation Options panel to enable automatic translation.
              </p>
            </div>
          )}
          <div 
            className="text-display"
            ref={textRef}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTouchEnd}
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {textToShow}
          </div>
          
          {selectedText && (
            <div className="selection-preview">
              <h4>Selected Text:</h4>
              <p className="selected-text-preview">{selectedText}</p>
            </div>
          )}
          
          <div className="annotation-section" style={{ marginTop: '20px' }}>
            <label htmlFor="modal-annotation" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Annotation (optional):
            </label>
            <textarea
              id="modal-annotation"
              value={modalAnnotation}
              onChange={(e) => setModalAnnotation(e.target.value)}
              placeholder="Add your annotation here..."
              rows={3}
              style={{
                width: '100%',
                minHeight: '60px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '14px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div className="page-number-section" style={{ marginTop: '20px' }}>
            <label htmlFor="modal-page-number" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Page Number (optional):
            </label>
            <input
              id="modal-page-number"
              type="text"
              value={modalPageNumber}
              onChange={(e) => setModalPageNumber(e.target.value)}
              placeholder="Enter page number..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
        
        <div className="translation-modal-actions">
          <button 
            className="btn btn-primary"
            onClick={handleAddEverything}
          >
            Add Everything
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleAddSelection}
            disabled={!selectedText.trim()}
          >
            Add Selection
          </button>
          <button 
            className="btn btn-tertiary"
            onClick={handleClose}
          >
            Return
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TranslationModal;
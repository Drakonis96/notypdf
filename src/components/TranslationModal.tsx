import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { MessageCircle } from 'lucide-react';
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
  isStreaming?: boolean;
  streamingText?: string;
  portalContainer?: Element | null;
  success?: string;
  saving?: boolean;
  error?: string;
  onSendToChat?: (text: string) => void;
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
  onAddSelectionWithAnnotation,
  isStreaming = false,
  streamingText = '',
  portalContainer = null,
  success = '',
  saving = false,
  error = '',
  onSendToChat
}) => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [modalAnnotation, setModalAnnotation] = useState<string>(annotation);
  const [modalPageNumber, setModalPageNumber] = useState<string>(pageNumber);
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
      // NO limpiar selectedText aquí
    }
  };

  const handleSendToChat = () => {
    const text = selectedText.trim() || originalText.trim();
    if (onSendToChat && text) {
      onSendToChat(`[${text}]`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  // Show streaming text when actively streaming, otherwise show translated or original text
  const textToShow = isStreaming && streamingText 
    ? streamingText 
    : (translationConfig.enabled ? translatedText : originalText);
  
  // Check if translation is enabled but not fully configured
  const isTranslationIncomplete = translationConfig.enabled && (
    !translationConfig.targetLanguage || 
    !translationConfig.provider || 
    !translationConfig.model
  );

  return createPortal(
    <div 
      className={`translation-modal-overlay ${portalContainer ? 'fullscreen-modal' : ''}`} 
      onClick={handleClose}
      style={{
        // Increase z-index when rendered inside fullscreen container or when no specific portal container is given (implies it's a root modal)
        zIndex: (portalContainer || !portalContainer) ? 10001 : 9999 
      }}
    >
      <div 
        className="translation-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="translation-modal-header">
          <h3>
            {isStreaming 
              ? `Translating to ${translationConfig.targetLanguage}...`
              : (translationConfig.enabled 
                  ? (translationConfig.targetLanguage 
                      ? `Translation to ${translationConfig.targetLanguage}` 
                      : 'Translation Configuration Required')
                  : 'Selected Text'
                )
            }
          </h3>
          <button className="close-button" onClick={handleClose} aria-label="Close modal">
            ×
          </button>
        </div>
        
        <div className="translation-modal-content">
          {success && (
            <SuccessMessage message={success} duration={3000} onClose={() => {}} />
          )}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee',
              border: '1px solid #f66',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#c44'
            }}>
              {error}
            </div>
          )}
          {isStreaming && (
            <div style={{
              padding: '12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#1976d2',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #2196f3',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span><strong>Translating...</strong> Receiving translation from server</span>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
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
              fontFamily: 'system-ui, -apple-system, sans-serif',
              position: 'relative'
            }}
          >
            {translationConfig.enabled && (translatedText || (isStreaming && streamingText)) ? (
              <ReactMarkdown
                components={{
                  // Custom styles for markdown elements
                  h1: ({children}) => <h1 style={{fontSize: '18px', fontWeight: 'bold', margin: '16px 0 8px 0'}}>{children}</h1>,
                  h2: ({children}) => <h2 style={{fontSize: '16px', fontWeight: 'bold', margin: '14px 0 6px 0'}}>{children}</h2>,
                  h3: ({children}) => <h3 style={{fontSize: '15px', fontWeight: 'bold', margin: '12px 0 4px 0'}}>{children}</h3>,
                  p: ({children}) => <p style={{margin: '8px 0', lineHeight: '1.6'}}>{children}</p>,
                  ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ul>,
                  ol: ({children}) => <ol style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ol>,
                  li: ({children}) => <li style={{margin: '2px 0'}}>{children}</li>,
                  strong: ({children}) => <strong style={{fontWeight: 'bold'}}>{children}</strong>,
                  em: ({children}) => <em style={{fontStyle: 'italic'}}>{children}</em>,
                  blockquote: ({children}) => (
                    <blockquote style={{
                      margin: '8px 0',
                      paddingLeft: '12px',
                      borderLeft: '3px solid #ddd',
                      fontStyle: 'italic',
                      color: '#666'
                    }}>
                      {children}
                    </blockquote>
                  ),
                  code: ({children, ...props}) => {
                    // Check if it's inline code by looking at the node properties
                    const isInline = !props.className || !props.className.includes('language-');
                    return isInline ? 
                      <code style={{
                        backgroundColor: '#f5f5f5',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>{children}</code> :
                      <pre style={{
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}><code>{children}</code></pre>;
                  }
                }}
              >
                {textToShow}
              </ReactMarkdown>
            ) : (
              textToShow
            )}
            {isStreaming && (
              <span style={{
                display: 'inline-block',
                width: '2px',
                height: '1.2em',
                backgroundColor: '#2196f3',
                marginLeft: '2px',
                animation: 'blink 1s infinite'
              }}>
                <style>{`
                  @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                  }
                `}</style>
              </span>
            )}
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
            disabled={isStreaming || saving}
          >
            {saving ? 'Saving...' : 'Add Everything'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleAddSelection}
            disabled={!selectedText.trim() || isStreaming || saving}
          >
            {saving ? 'Saving...' : 'Add Selection'}
          </button>
          {onSendToChat && (
            <button className="btn btn-chat" onClick={handleSendToChat} disabled={isStreaming || saving}>
              <MessageCircle size={16} />
              <span style={{ marginLeft: '4px' }}>Send to chat</span>
            </button>
          )}
          <button
            className="btn btn-tertiary"
            onClick={handleClose}
          >
            Return
          </button>
        </div>
      </div>
    </div>,
    portalContainer || document.body
  );
};

export default TranslationModal;
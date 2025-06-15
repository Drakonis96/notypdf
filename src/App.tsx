import React, { useState, useCallback, useEffect } from 'react';
import PDFViewer from './components/PDFViewer';
import ConfigModal from './components/ConfigModal';
import FloatingActionButton from './components/FloatingActionButton';
import DocumentManagerModal from './components/DocumentManagerModal';
import TranslationModal from './components/TranslationModal'; // Import TranslationModal
import ChatModal from './components/ChatModal';
import { NotionConfig, TranslationConfig, SavedDatabaseId } from './types';
import configService from './services/configService';
import notionService from './services/notionService';
import translationService from './services/translationService';
import apiKeyService from './services/apiKeyService';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showDocumentManager, setShowDocumentManager] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenContainer, setFullscreenContainer] = useState<HTMLElement | null>(null);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [savedDatabaseIds, setSavedDatabaseIds] = useState<SavedDatabaseId[]>([]);
  const [notionConfig, setNotionConfig] = useState<NotionConfig>({
    databaseId: '',
    identifierColumn: '',
    textColumn: '',
    annotationColumn: '',
    pageColumn: '',
    identifierPattern: '',
    annotation: '',
    pageNumber: '',
    documentIdInsertionColumn: '', 
    enableDocumentIdInsertion: false
  });
  const [translationConfig, setTranslationConfig] = useState<TranslationConfig>({
    enabled: false,
    provider: '',
    model: '',
    targetLanguage: '',
    sendMode: 'original',
  });

  // State for App-level Translation Modal
  const [isAppTranslationModalOpen, setIsAppTranslationModalOpen] = useState<boolean>(false);
  const [appModalTranslatedText, setAppModalTranslatedText] = useState<string>('');
  const [appModalIsStreaming, setAppModalIsStreaming] = useState<boolean>(false);
  const [appModalStreamingText, setAppModalStreamingText] = useState<string>('');
  const [appModalSaving, setAppModalSaving] = useState<boolean>(false);
  const [appModalSuccessMessage, setAppModalSuccessMessage] = useState<string>('');
  const [appModalError, setAppModalError] = useState<string>('');

  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);

  // Load configuration from server on component mount
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const config = await configService.getConfig();
        
        // Load saved database IDs
        if (config.savedDatabaseIds) {
          const withDates = config.savedDatabaseIds.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          }));
          setSavedDatabaseIds(withDates);
        }
        
        // Load column mappings (if any stored configuration exists)
        if (config.columnMappings && Object.keys(config.columnMappings).length > 0) {
          // For now, we could load the most recent mapping or let user select
          // This is a placeholder for future column mapping persistence
        }
      } catch (err) {
        console.error('Error loading configuration from server:', err);
        
        // Fallback to localStorage for migration
        const savedDbIds = localStorage.getItem('savedDatabaseIds');
        if (savedDbIds) {
          try {
            const parsed = JSON.parse(savedDbIds);
            const withDates = parsed.map((item: any) => ({
              ...item,
              createdAt: new Date(item.createdAt)
            }));
            setSavedDatabaseIds(withDates);
            
            // Migrate to server
            await configService.updateConfig({ savedDatabaseIds: withDates });
            localStorage.removeItem('savedDatabaseIds');
          } catch (migrationErr) {
            console.error('Error migrating data to server:', migrationErr);
          }
        }
      }
    };
    
    loadConfiguration();
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    setPdfFile(file);
  }, []);

  const handleCloseFile = useCallback(() => {
    setPdfFile(null);
  }, []);

  const handleTextSelection = useCallback(async (text: string) => {
    setSelectedText(text);
    if (text.trim()) {
      setIsAppTranslationModalOpen(true);
      setAppModalError('');
      
      // Implement translation logic if translation is enabled
      if (translationConfig.enabled) {
        // Check if translation is fully configured
        if (
          translationConfig.targetLanguage &&
          translationConfig.provider &&
          translationConfig.model
        ) {
          // Translation is fully configured - auto-translate
          try {
            // Clear visual selection before showing modal
            if (window.getSelection) {
              window.getSelection()?.removeAllRanges();
            }

            const apiKey = await apiKeyService.getApiKey(translationConfig.provider);
            if (!apiKey) {
              throw new Error('Missing API key for selected translation provider');
            }

            // Use streaming for OpenAI, OpenRouter, Gemini, and DeepSeek
            if (translationConfig.provider === 'openai' || translationConfig.provider === 'openrouter' || translationConfig.provider === 'gemini' || translationConfig.provider === 'deepseek') {
              setAppModalIsStreaming(true);
              setAppModalStreamingText('');
              setAppModalTranslatedText('');

              await translationService.translateTextStreaming(text, {
                provider: translationConfig.provider,
                model: translationConfig.model,
                apiKey,
                targetLanguage: translationConfig.targetLanguage,
                onProgress: (partialText: string) => {
                  setAppModalStreamingText(partialText);
                },
                onComplete: (fullText: string) => {
                  setAppModalTranslatedText(fullText);
                  setAppModalIsStreaming(false);
                  setAppModalStreamingText('');
                },
                onError: (error: Error) => {
                  setAppModalError('Translation failed: ' + error.message);
                  setAppModalIsStreaming(false);
                  setAppModalStreamingText('');
                }
              });
            } else {
              // Fallback to regular translation for other providers
              const translated = await translationService.translateText(text, {
                provider: translationConfig.provider,
                model: translationConfig.model,
                apiKey,
                targetLanguage: translationConfig.targetLanguage,
              });
              setAppModalTranslatedText(translated);
            }
          } catch (err: any) {
            setAppModalError('Translation failed: ' + (err.message || ''));
            setAppModalIsStreaming(false);
            setAppModalStreamingText('');
          }
        } else {
          // Translation is enabled but not fully configured - show modal with original text
          setAppModalTranslatedText(text);
        }
      } else {
        // Translation is disabled - just show the original text
        setAppModalTranslatedText('');
      }
    } else {
      setIsAppTranslationModalOpen(false);
    }
  }, [translationConfig]);

  const handlePageTextExtracted = useCallback(async (text: string, pageNumber: number) => {
    // For page text extraction, we can use the same logic as text selection
    await handleTextSelection(text);
    // TODO: use pageNumber if needed for specific functionality
  }, [handleTextSelection]);

  const handleClearSelection = useCallback(() => {
    setSelectedText('');
    setIsAppTranslationModalOpen(false);
  }, []);

  const handleConfigChange = useCallback((config: NotionConfig) => {
    setNotionConfig(config);
  }, []);

  const handleDatabaseIdSave = useCallback(async (databaseId: SavedDatabaseId) => {
    // Refresh the local state from server when a new database ID is saved
    try {
      const config = await configService.getConfig();
      if (config.savedDatabaseIds) {
        const withDates = config.savedDatabaseIds.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
        setSavedDatabaseIds(withDates);
      }
    } catch (err) {
      console.error('Error refreshing database IDs from server:', err);
    }
  }, []);
  
  // Función para refrescar las Database IDs desde el servidor
  const refreshDatabaseIds = useCallback(async () => {
    try {
      console.log("Refreshing database IDs from server");
      const config = await configService.getConfig();
      if (config.savedDatabaseIds) {
        const withDates = config.savedDatabaseIds.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
        setSavedDatabaseIds(withDates);
      }
    } catch (err) {
      console.error('Error refreshing database IDs from server:', err);
    }
  }, []);

  const handleFullscreenChange = useCallback((isFS: boolean, container: HTMLElement | null) => {
    setIsFullscreen(isFS);
    setFullscreenContainer(container);
  }, []);

  const handleAppModalClose = () => {
    setIsAppTranslationModalOpen(false);
    setAppModalError('');
    setAppModalSuccessMessage('');
    setAppModalIsStreaming(false);
    setAppModalStreamingText('');
    // Optionally clear selectedText if it should not persist for ConfigModal
    // setSelectedText(''); 
  };

  // App-level modal "Add to Notion" handlers with actual implementation
  const handleAppModalAddEverything = async (annotation: string, pageNum?: string) => {
    if (!notionConfig.identifierColumn || !notionConfig.textColumn) {
      setAppModalError('Please configure the required database columns first');
      return;
    }

    setAppModalSaving(true);
    setAppModalError('');
    
    try {
      const textToSave = translationConfig.sendMode === 'translated' ? appModalTranslatedText : selectedText;
      const configToSave = {
        ...notionConfig,
        annotation: annotation || notionConfig.annotation,
        pageNumber: pageNum || notionConfig.pageNumber,
      };
      
      const result = await notionService.saveTextWithIdentifier(configToSave, textToSave);
      if (result.success) {
        setAppModalSuccessMessage(`Text saved with identifier: ${result.identifier}`);
        // Clear the success message after 3 seconds
        setTimeout(() => {
          setAppModalSuccessMessage('');
        }, 3000);
      } else {
        setAppModalError('Failed to save text to Notion');
      }
    } catch (err: any) {
      setAppModalError('An error occurred while saving to Notion: ' + (err.message || ''));
    } finally {
      setAppModalSaving(false);
    }
  };

  const handleAppModalAddSelection = async (textInModal: string, annotation: string, pageNum?: string) => {
    if (!notionConfig.identifierColumn || !notionConfig.textColumn) {
      setAppModalError('Please configure the required database columns first');
      return;
    }

    setAppModalSaving(true);
    setAppModalError('');
    
    try {
      const configToSave = {
        ...notionConfig,
        annotation: annotation || notionConfig.annotation,
        pageNumber: pageNum || notionConfig.pageNumber,
      };
      
      const result = await notionService.saveTextWithIdentifier(configToSave, textInModal);
      if (result.success) {
        setAppModalSuccessMessage(`Text saved with identifier: ${result.identifier}`);
        // Clear the success message after 3 seconds
        setTimeout(() => {
          setAppModalSuccessMessage('');
        }, 3000);
      } else {
        setAppModalError('Failed to save text to Notion');
      }
    } catch (err: any) {
      setAppModalError('An error occurred while saving to Notion: ' + (err.message || ''));
    } finally {
      setAppModalSaving(false);
    }
  };


  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <img src="/logo.png" alt="Logo" className="header-logo" />
            <div className="header-text">
              <h1>NotyPDF</h1>
              <p>Seamlessly read PDFs and save selected text and annotations to your Notion database.</p>
            </div>
          </div>
        </header>
        
        <div className="main-content">
          <main className="pdf-viewer">
            <PDFViewer
              file={pdfFile}
              onFileUpload={handleFileUpload}
              onTextSelection={handleTextSelection}
              translationConfig={translationConfig}
              onFullscreenChange={handleFullscreenChange}
              onPageTextExtracted={handlePageTextExtracted}
              onPageChange={setCurrentPageNumber}
              onFileClose={handleCloseFile}
            />
          </main>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onSettingsClick={() => setShowConfigModal(true)}
        onDocumentManagerClick={() => setShowDocumentManager(true)}
        onChatClick={() => {
          setChatInitialMessage(undefined);
          setShowChatModal(true);
        }}
      />

      {/* Document Manager Modal */}
      <DocumentManagerModal
        isOpen={showDocumentManager}
        onClose={() => setShowDocumentManager(false)}
        onFileUpload={handleFileUpload}
        currentFile={pdfFile}
      />

      {/* Config Modal */}
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={notionConfig}
        onConfigChange={handleConfigChange}
        selectedText={selectedText} // ConfigModal can still receive selectedText
        translationConfig={translationConfig}
        setTranslationConfig={setTranslationConfig}
        onClearSelection={handleClearSelection} // Pass clear selection
        fullscreenContainer={fullscreenContainer}
        savedDatabaseIds={savedDatabaseIds}
        onDatabaseIdSave={handleDatabaseIdSave}
        refreshDatabaseIds={refreshDatabaseIds}
        onSendToChat={(text) => {
          setChatInitialMessage(text);
          setShowChatModal(true);
        }}
      />

      {/* App-level Translation Modal */}
      {isAppTranslationModalOpen && selectedText && (
        <TranslationModal
          isOpen={isAppTranslationModalOpen}
          onClose={handleAppModalClose}
          originalText={selectedText}
          translatedText={appModalTranslatedText}
          isStreaming={appModalIsStreaming}
          streamingText={appModalStreamingText}
          translationConfig={translationConfig}
          onAddEverythingWithAnnotation={handleAppModalAddEverything}
          onAddSelectionWithAnnotation={handleAppModalAddSelection}
          onAddEverything={() => handleAppModalAddEverything('', '')}
          onAddSelection={(txt) => handleAppModalAddSelection(txt, '', '')}
          portalContainer={fullscreenContainer || document.body}
          saving={appModalSaving}
          success={appModalSuccessMessage}
          error={appModalError}
          onSendToChat={(text) => {
            setChatInitialMessage(text);
            setShowChatModal(true);
          }}
        />
      )}

      {showChatModal && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          initialMessage={chatInitialMessage}
          currentFile={pdfFile}
          currentPage={currentPageNumber}
        />
      )}
    </div>
  );
}

export default App;


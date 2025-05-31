import React, { useState, useCallback } from 'react';
import PDFViewer from './components/PDFViewer';
import ConfigPanel from './components/ConfigPanel';
import { NotionConfig, TranslationConfig } from './types';
import { ChevronRight } from 'lucide-react';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  // Set config panel default visibility based on device width
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true; // fallback for SSR
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenContainer, setFullscreenContainer] = useState<HTMLElement | null>(null);
  const [notionConfig, setNotionConfig] = useState<NotionConfig>({
    databaseId: '',
    identifierColumn: '',
    textColumn: '',
    annotationColumn: '',
    pageColumn: '',
    identifierPattern: '',
    annotation: '',
    pageNumber: '',
    documentIdInsertionColumn: '', // required for NotionConfig
    enableDocumentIdInsertion: false // required for NotionConfig
  });
  const [translationConfig, setTranslationConfig] = useState<TranslationConfig>({
    enabled: false,
    provider: '',
    model: '',
    targetLanguage: '',
    sendMode: 'original',
  });

  const handleFileUpload = useCallback((file: File) => {
    setPdfFile(file);
  }, []);

  const handleTextSelection = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  const handlePageTextExtracted = useCallback((text: string, pageNumber: number) => {
    // When text is extracted from a page, set it as selected text
    // This will trigger the translation modal if configured
    setSelectedText(text);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedText('');
  }, []);

  const handleConfigChange = useCallback((config: NotionConfig) => {
    setNotionConfig(config);
  }, []);

  const handleFullscreenChange = useCallback((isFS: boolean, container: HTMLElement | null) => {
    setIsFullscreen(isFS);
    setFullscreenContainer(container);
  }, []);

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <img src="/static/logo.png" alt="Logo" className="header-logo" />
            <div className="header-text">
              <h1>NotyPDF</h1>
              <p>Seamlessly read PDFs and save selected text and annotations to your Notion database.</p>
            </div>
            {/* Config toggle button removed from header */}
          </div>
        </header>
        
        <div className="main-content">
          {/* Mobile backdrop overlay */}
          <div 
            className={`sidebar-backdrop ${showConfigPanel ? 'visible' : ''}`}
            onClick={() => setShowConfigPanel(false)}
          />

          {/* Sidebar and config panels */}
          <aside className={`sidebar ${showConfigPanel ? 'sidebar-visible' : 'sidebar-hidden'}`}>
            <ConfigPanel
              config={notionConfig}
              onConfigChange={handleConfigChange}
              selectedText={selectedText}
              translationConfig={translationConfig}
              setTranslationConfig={setTranslationConfig}
              onClearSelection={handleClearSelection}
              onClose={() => setShowConfigPanel(false)}
              fullscreenContainer={fullscreenContainer}
            />
          </aside>

          {/* Sidebar toggle button always visible, centered on sidebar's right edge */}
          {!showConfigPanel && (
            <button
              className="sidebar-toggle-btn-fixed"
              onClick={() => setShowConfigPanel(true)}
              aria-label="Mostrar panel de configuración"
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                transform: 'translateY(-50%)',
                zIndex: 1200,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#fff',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(0,0,0,0.12)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          <main className="pdf-viewer">
            <PDFViewer
              file={pdfFile}
              onFileUpload={handleFileUpload}
              onTextSelection={handleTextSelection}
              translationConfig={translationConfig}
              onFullscreenChange={handleFullscreenChange}
              onPageTextExtracted={handlePageTextExtracted}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

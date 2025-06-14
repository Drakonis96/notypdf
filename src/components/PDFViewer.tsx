import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js';
import { Upload, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Lightbulb, Maximize, Minimize, BookOpen, FileIcon, Layout, Languages, Bookmark, X } from 'lucide-react';
import DocumentManagerPanel from './DocumentManagerPanel';
import { TranslationConfig } from '../types';
import configService from '../services/configService';
import { translateTextStreaming } from '../services/translationService';
import { fileService } from '../services/fileService';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PDFViewerProps {
  file: File | null;
  onFileUpload: (file: File) => void;
  onTextSelection: (text: string) => void;
  translationConfig: TranslationConfig;
  onFullscreenChange?: (isFullscreen: boolean, container: HTMLElement | null) => void;
  onPageTextExtracted?: (text: string, pageNumber: number) => void;
  onPageChange?: (pageNumber: number) => void;
  onFileClose?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, onFileUpload, onTextSelection, translationConfig, onFullscreenChange, onPageTextExtracted, onPageChange, onFileClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [scale, setScale] = useState<number>(1.0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isContinuousView, setIsContinuousView] = useState<boolean>(false);
  const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('top');
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [skipPageInput, setSkipPageInput] = useState<string>("");
  const [bookmarkedPage, setBookmarkedPage] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const documentRef = useRef<any>(null);

  useEffect(() => {
    if (onPageChange) onPageChange(pageNumber);
  }, [pageNumber, onPageChange]);

  // Load bookmarked page when a new file is opened
  React.useEffect(() => {
    const loadBookmark = async () => {
      if (file) {
        try {
          const cfg = await configService.getConfig();
          const serverPage = cfg.bookmarks ? cfg.bookmarks[file.name] : undefined;
          const saved = serverPage ?? localStorage.getItem(`bookmark_${file.name}`);
          if (saved) {
            const page = parseInt(saved as any, 10);
            if (!isNaN(page)) {
              setPageNumber(page);
              setBookmarkedPage(page);
              return;
            }
          }
          setPageNumber(1);
          setBookmarkedPage(null);
        } catch (err) {
          console.error('Error loading bookmark:', err);
        }
      }
    };
    loadBookmark();
  }, [file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError('');
  }

  function onDocumentLoadError(error: Error) {
    setError('Failed to load PDF file');
    console.error('PDF load error:', error);
  }

  async function uploadAndLoadFile(selectedFile: File) {
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }
    try {
      await fileService.uploadFile(selectedFile);
      setError('');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file to server');
    }
    onFileUpload(selectedFile);
  }

  // Helper used by DocumentManagerPanel which already uploaded the file
  function loadFileOnly(selectedFile: File) {
    onFileUpload(selectedFile);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      uploadAndLoadFile(selectedFile);
    }
  }

  function handleTextSelection() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onTextSelection(selection.toString().trim());
    }
  }

  function handleTouchEnd() {
    // Small delay to allow selection to complete on mobile
    setTimeout(() => {
      handleTextSelection();
    }, 100);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      uploadAndLoadFile(droppedFile);
    }
  }

  function handleZoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.05, 3.0));
  }

  function handleZoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.05, 0.5));
  }

  function handleResetZoom() {
    setScale(1.0);
  }

  function toggleFocusMode() {
    setIsFocusMode(!isFocusMode);
  }

  function toggleContinuousView() {
    const wasInContinuousView = isContinuousView;
    const currentPage = pageNumber;

    setIsContinuousView(!isContinuousView);

    // If switching from single page to continuous view, scroll to the current page
    if (!wasInContinuousView) {
      // Use setTimeout to ensure the pages are rendered before scrolling
      setTimeout(() => {
        const targetPageRef = pageRefs.current[currentPage - 1];
        if (targetPageRef && pdfContainerRef.current) {
          const container = pdfContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const pageRect = targetPageRef.getBoundingClientRect();
          
          // Calculate scroll position to center the target page
          const scrollTop = container.scrollTop + (pageRect.top - containerRect.top) - 50;
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }, 100);
    } else {
      // Switching from continuous view back to single page view.
      // Reset the scroll position so the current page is visible.
      if (pdfContainerRef.current) {
        pdfContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }

  function toggleToolbarPosition() {
    setToolbarPosition(current => {
      switch (current) {
        case 'top':
          return 'bottom';
        case 'bottom':
          return 'top';
        default:
          return 'top';
      }
    });
  }

  function toggleFullscreen() {
    if (!isFullscreen && pdfContainerRef.current) {
      if (pdfContainerRef.current.requestFullscreen) {
        pdfContainerRef.current.requestFullscreen();
      }
    } else if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleCloseFile() {
    setNumPages(0);
    setPageNumber(1);
    setError('');
    setBookmarkedPage(null);
    if (onFileClose) {
      onFileClose();
    }
  }

  async function extractCurrentPageText() {
    if (!file || !translationConfig.enabled || isExtractingText) {
      return;
    }

    try {
      setIsExtractingText(true);
      
      // Load the PDF document
      const loadingTask = pdfjs.getDocument(URL.createObjectURL(file));
      const pdf = await loadingTask.promise;
      
      // Get the current page
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      // Extract text from text items
      const extractedText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (extractedText && onPageTextExtracted) {
        onPageTextExtracted(extractedText, pageNumber);
      } else if (extractedText) {
        // If no callback provided, send text to translation selection
        onTextSelection(extractedText);
      }
      
    } catch (error) {
      console.error('Error extracting text from page:', error);
      setError('Failed to extract text from current page');
    } finally {
      setIsExtractingText(false);
    }
  }

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Notify parent component about fullscreen change
      if (onFullscreenChange) {
        onFullscreenChange(
          isCurrentlyFullscreen, 
          isCurrentlyFullscreen ? pdfContainerRef.current : null
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  function handleBookmarkPage() {
    if (file) {
      const bookmarkKey = `bookmark_${file.name}`;
      const isBookmarked = bookmarkedPage === pageNumber;

      if (isBookmarked) {
        localStorage.removeItem(bookmarkKey);
        setBookmarkedPage(null);
        configService.removeBookmark(file.name).catch(err =>
          console.error('Error removing bookmark:', err)
        );
      } else {
        localStorage.setItem(bookmarkKey, pageNumber.toString());
        setBookmarkedPage(pageNumber);
        configService.saveBookmark(file.name, pageNumber).catch(err =>
          console.error('Error saving bookmark:', err)
        );
      }
    }
  }

  // Scroll handler to update pageNumber in continuous view
  React.useEffect(() => {
    if (!isContinuousView || numPages === 0) return;
    const container = pdfContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      let closestPage = 1;
      let minDistance = Infinity;
      const containerRect = container.getBoundingClientRect();
      const viewportCenter = containerRect.top + containerRect.height / 2;
      
      pageRefs.current.forEach((ref, idx) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const pageCenter = rect.top + rect.height / 2;
          // Distance from center of viewport to center of page
          const distance = Math.abs(pageCenter - viewportCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestPage = idx + 1;
          }
        }
      });
      setPageNumber(closestPage);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isContinuousView, numPages]);

  // Effect to handle view mode changes and maintain page position
  React.useEffect(() => {
    // This effect ensures that page numbers are properly maintained
    // when switching between view modes. The actual scrolling is handled
    // in the toggleContinuousView function for better control.
  }, [isContinuousView, pageNumber]);

  if (!file) {
    return (
      <div className="pdf-container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <DocumentManagerPanel onFileUpload={loadFileOnly} currentFile={null} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="file-input"
          style={{ display: 'none' }}
        />
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  // Calculate the PDF width (same as <Page width=...>)
  const pdfWidth = window.innerWidth > 768 ? window.innerWidth - 380 : window.innerWidth - 40;

  return (
    <div className="pdf-container" ref={pdfContainerRef}>
      {/* Focus mode overlay */}
      {isFocusMode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 998,
            pointerEvents: 'none'
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: isFocusMode ? 999 : 'auto' }}>
        {error && <div className="error">{error}</div>}
        <div className="pdf-centered-container" style={{ width: pdfWidth, maxWidth: '100%', margin: '0' }}>
          <div className={`pdf-layout pdf-layout-${toolbarPosition}`}
            style={{ width: '100%' }}
          >
            {/* Navigation and zoom controls */}
            <div className={`pdf-controls-bar pdf-controls-${toolbarPosition}`} style={{ width: '100%' }}>
              {/* Document title - centered at top con page info */}
              <div className="document-title-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
                <div className="file-info-centered" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} />
                  <span className="file-name-centered">{file.name}</span>
                </div>
                <span style={{ color: '#888', fontWeight: 500, fontSize: '15px', margin: '0 6px' }}>–</span>
                <span className="page-info-title" style={{ color: '#888', fontWeight: 500, fontSize: '15px' }}>Page {pageNumber} of {numPages}</span>
              </div>
              
              {/* Reorganized controls grid with navigation buttons in center */}
              <div className="controls-grid buttons-row" style={{ display: 'flex', justifyContent: 'center', gap: '2px', alignItems: 'center' }}>
                {/* Left section */}
                <div className="controls-left pastel-section pastel-blue" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {/* View mode toggle */}
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={toggleContinuousView}
                    title={isContinuousView ? "Single page view" : "Continuous view"}
                  >
                    {isContinuousView ? <FileIcon size={14} /> : <BookOpen size={14} />}
                  </button>
                  {/* Zoom controls */}
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={handleZoomOut}
                    disabled={scale <= 0.5}
                    title="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="zoom-indicator" style={{ minWidth: 32, textAlign: 'center', fontWeight: 500 }}>
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={handleZoomIn}
                    disabled={scale >= 3.0}
                    title="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    className="btn btn-compact btn-secondary btn-reset-zoom btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={handleResetZoom}
                    title="Reset zoom"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
                {/* Center section - Navigation controls */}
                <div className="controls-center pastel-section pastel-pink" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    disabled={pageNumber <= 1 || isContinuousView}
                    onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {/* Skip to page input */}
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={skipPageInput}
                    onChange={e => setSkipPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !isContinuousView) {
                        const page = parseInt(skipPageInput, 10);
                        if (!isNaN(page) && page >= 1 && page <= numPages) {
                          setPageNumber(page);
                          setSkipPageInput("");
                        }
                      }
                    }}
                    className="btn btn-compact btn-same-size"
                    style={{ width: 180, minHeight: 32, textAlign: 'center' }}
                    placeholder="#"
                    disabled={isContinuousView || numPages === 0}
                    title={isContinuousView ? "No disponible en vista continua" : "Ir a página"}
                  />
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={() => {
                      if (!isContinuousView) {
                        const page = parseInt(skipPageInput, 10);
                        if (!isNaN(page) && page >= 1 && page <= numPages) {
                          setPageNumber(page);
                          setSkipPageInput("");
                        }
                      }
                    }}
                    disabled={isContinuousView || !skipPageInput || isNaN(Number(skipPageInput)) || Number(skipPageInput) < 1 || Number(skipPageInput) > numPages}
                    title={isContinuousView ? "No disponible en vista continua" : "Ir a página"}
                  >
                    Ir
                  </button>
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    disabled={pageNumber >= numPages || isContinuousView}
                    onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
                    title="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                {/* Right section */}
                <div className="controls-right pastel-section pastel-green" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {/* Focus mode and fullscreen controls */}
                  <button
                    className={`btn btn-compact btn-same-size ${isFocusMode ? 'btn-active' : ''}`}
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={toggleFocusMode}
                    title={isFocusMode ? "Exit focus mode" : "Focus mode"}
                  >
                    <Lightbulb size={14} />
                  </button>
                  {/* Extract page text for translation */}
                  {translationConfig.enabled && (
                    <button
                      className={`btn btn-compact btn-same-size ${isExtractingText ? 'btn-loading' : ''}`}
                      style={{ minWidth: 32, minHeight: 32 }}
                      onClick={extractCurrentPageText}
                      disabled={isExtractingText || !file}
                      title={isExtractingText ? "Extracting text..." : "Extract page text for translation"}
                    >
                      <Languages size={14} />
                    </button>
                  )}
                  <button
                    className={`btn btn-compact btn-same-size ${bookmarkedPage === pageNumber ? 'btn-active' : ''}`}
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={handleBookmarkPage}
                    title="Bookmark page"
                  >
                    <Bookmark size={14} />
                  </button>
                  <button
                    className="btn btn-compact btn-fullscreen btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                  </button>
                  <button
                    className="btn btn-compact btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={toggleToolbarPosition}
                    title="Change toolbar position"
                  >
                    <Layout size={14} />
                  </button>
                  <button
                    className="btn btn-compact btn-secondary btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={handleCloseFile}
                    title="Close File"
                  >
                    <X size={14} />
                  </button>
                  <button
                    className="btn btn-compact btn-secondary btn-same-size"
                    style={{ minWidth: 32, minHeight: 32 }}
                    onClick={openFileDialog}
                    title="Change File"
                  >
                    <Upload size={14} />
                  </button>
                </div>
              </div>
              {/* CSS pastel-section styles */}
              <style>{`
                .pastel-section {
                  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
                  border: 1.5px solid rgba(0,0,0,0.07);
                  border-radius: 10px;
                  padding: 4px 6px;
                  margin: 0 1px;
                  transition: box-shadow 0.2s, border 0.2s;
                  display: flex;
                  align-items: center;
                  background-clip: padding-box;
                }
                .pastel-blue {
                  background: linear-gradient(135deg, #e0f7fa 80%, #b2ebf2 100%);
                }
                .pastel-pink {
                  background: linear-gradient(135deg, #ffe0f0 80%, #ffc1e3 100%);
                }
                .pastel-green {
                  background: linear-gradient(135deg, #e6ffe6 80%, #b2f2b2 100%);
                }
                .pastel-section:hover {
                  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.10);
                  border: 1.5px solid rgba(0,0,0,0.13);
                }
                .btn-same-size {
                  min-width: 32px !important;
                  min-height: 32px !important;
                  max-width: 32px !important;
                  max-height: 32px !important;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 15px;
                  padding: 0;
                }
                .btn-compact input[type='number'] {
                  min-width: 32px;
                  min-height: 32px;
                  max-width: 60px;
                  max-height: 32px;
                  text-align: center;
                  font-size: 15px;
                }
              `}</style>
            </div>
            {/* PDF Document */}
            <div 
              className="pdf-document-container" 
              style={{ 
                flex: 1, 
                overflow: 'auto', 
                width: '100%',
                position: 'relative',
                zIndex: 1,
                padding: '0', /* Eliminado todo padding para alinear con la barra de herramientas */
                marginTop: '0'
              }}
            >
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="loading">Loading PDF...</div>}
              >
                <div
                  onMouseUp={handleTextSelection}
                  onTouchEnd={handleTouchEnd}
                  className="text-selection-active"
                  title="Select text to send to Notion"
                  style={{ userSelect: 'text' }}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <div
                      key={`page_${index + 1}`}
                      ref={el => (pageRefs.current[index] = el)}
                      style={{
                        marginBottom: '20px',
                        display:
                          isContinuousView || pageNumber === index + 1
                            ? 'block'
                            : 'none'
                      }}
                    >
                      <Page
                        pageNumber={index + 1}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        scale={scale}
                        width={pdfWidth}
                      />
                      <div
                        style={{
                          textAlign: 'center',
                          marginTop: '10px',
                          fontSize: '12px',
                          color: '#666'
                        }}
                      >
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </Document>
            </div>
          </div> {/* Close pdf-centered-container */}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="file-input"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default PDFViewer;

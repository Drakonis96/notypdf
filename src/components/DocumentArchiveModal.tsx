import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Trash2, Download, Calendar, Search, Play, Archive, ArchiveRestore } from 'lucide-react';
import './DocumentManagerModal.css';
import { fileService, FileInfo } from '../services/fileService';
import ConfirmationModal from './ConfirmationModal';

interface DocumentArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (file: File) => void;
  currentFile?: File | null;
}

const DocumentArchiveModal: React.FC<DocumentArchiveModalProps> = ({
  isOpen,
  onClose,
  onFileUpload,
  currentFile,
}) => {
  const [documents, setDocuments] = useState<FileInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadDetails, setUploadDetails] = useState<{
    current: number;
    total: number;
    currentFileName: string;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load documents from server on component mount
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      testBackendConnection();
    }
  }, [isOpen]);

  const testBackendConnection = async () => {
    try {
      const testResult = await fileService.testConnection();
      console.log('Backend connection test:', testResult);
    } catch (error) {
      console.error('Backend connection failed:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const files = await fileService.listArchivedFiles();
      setDocuments(files);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      await handleMultipleFiles(fileArray);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleMultipleFiles = async (files: File[]) => {
    console.log(`Starting upload of ${files.length} file(s):`, files.map(f => `${f.name} (${formatFileSize(f.size)})`));
    
    try {
      setIsLoading(true);
      setUploadProgress(`Preparing to upload ${files.length} file(s)...`);
      setUploadDetails(null);
      
      // Upload files sequentially with detailed progress tracking
      const results = await fileService.uploadMultipleFiles(files, (current, total, fileName) => {
        const progress = `Uploading ${current}/${total}: ${fileName}`;
        setUploadProgress(progress);
        setUploadDetails({ current, total, currentFileName: fileName });
        console.log(`📤 Progress: ${progress}`);
      });
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      console.log(`Upload summary: ${successCount} successful, ${failureCount} failed`);
      
      if (failureCount > 0) {
        const failedFiles = results
          .filter(r => !r.success)
          .map(r => r.error?.includes('Failed to upload') ? 
            r.error.split('Failed to upload ')[1]?.split(':')[0] || 'Unknown file' : 
            'Unknown file')
          .join(', ');
        
        const errorDetails = results
          .filter(r => !r.success)
          .map(r => r.error)
          .join('\n');
        
        console.error('Upload failures:', errorDetails);
        
        const message = `${successCount} file(s) uploaded successfully.\nFailed to upload: ${failedFiles}\n\nDetails:\n${errorDetails}`;
        alert(message);
      } else {
        setUploadProgress(`Successfully uploaded ${successCount} file(s)!`);
        console.log(`✅ All ${successCount} files uploaded successfully`);
        setTimeout(() => {
          setUploadProgress('');
          setUploadDetails(null);
        }, 3000);
      }
      
      await loadDocuments(); // Refresh the list
      
      // If only one file was uploaded successfully, call onFileUpload
      if (successCount === 1 && files.length === 1) {
        onFileUpload(files[0]);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Critical error during file upload process:', error);
      console.error('Error details:', {
        message: errorMessage,
        files: files.map(f => f.name),
        timestamp: new Date().toISOString()
      });
      
      alert(`Failed to upload files: ${errorMessage}\n\nPlease check the console for detailed error information and try again.`);
    } finally {
      setIsLoading(false);
      setUploadProgress('');
      setUploadDetails(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await handleMultipleFiles(files);
    }
  };

  const handleNewFile = async (file: File) => {
    await handleMultipleFiles([file]);
  };

  const handleLoadDocument = async (doc: FileInfo) => {
    try {
      setIsLoading(true);
      const url = fileService.getArchivedDownloadUrl(doc.name);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], doc.name, { type: doc.type || 'application/pdf' });
      
      onFileUpload(file);
      onClose();
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Failed to load file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: FileInfo, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await fileService.downloadAndOpenArchivedFile(doc.name);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleDeleteDocument = (filename: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFileToDelete(filename);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      setIsLoading(true);
      await fileService.deleteArchivedFile(fileToDelete);
      await loadDocuments(); // Refresh the list
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchiveDocument = async (filename: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      setIsLoading(true);
      await fileService.unarchiveFile(filename);
      await loadDocuments();
    } catch (error) {
      console.error('Error unarchiving file:', error);
      alert('Failed to unarchive file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setFileToDelete(null);
  };

  const handleClearAllFiles = () => {
    if (documents.length === 0) {
      alert('No archived files to clear.');
      return;
    }
    setShowClearAllConfirm(true);
  };

  const confirmClearAll = async () => {
    try {
      setIsLoading(true);
      const result = await fileService.clearArchivedFiles();
      
      if (result.success) {
        await loadDocuments(); // Refresh the list
        setShowClearAllConfirm(false);
        alert(`Successfully cleared ${result.deletedCount} archived file(s).`);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error clearing all files:', error);
      alert(`Failed to clear files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelClearAll = () => {
    setShowClearAllConfirm(false);
  };

  const handleDownloadAllPdfs = async () => {
    const pdfCount = documents.filter(d => d.name.toLowerCase().endsWith('.pdf')).length;
    if (pdfCount === 0) {
      alert('No PDF files to download.');
      return;
    }
    try {
      setIsLoading(true);
      const blob = await fileService.downloadAllPdfsZip();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_pdfs.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDFs:', error);
      alert('Failed to download PDFs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents
    .filter(
      doc =>
        !doc.name.toLowerCase().endsWith('.md') &&
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    }));

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="document-manager-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="document-manager-header">
          <div className="header-title">
            <FileText size={24} />
            <h2>Archived Documents</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close document manager"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-buttons">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isLoading}
              multiple
            />
          <label
            htmlFor="file-upload"
            className={`upload-button ${isLoading ? 'disabled' : ''}`}
            title={isLoading ? uploadProgress || 'Upload Documents' : 'Upload Documents'}
          >
            <Upload size={20} />
          </label>
          <button
            className="clear-all-button"
            onClick={handleClearAllFiles}
            disabled={isLoading || documents.length === 0}
            title={documents.length === 0 ? 'No archived files to clear' : `Clear all ${documents.length} archived files`}
          >
            <Trash2 size={20} />
          </button>
          <button
            className="download-all-button"
            onClick={handleDownloadAllPdfs}
            disabled={isLoading || documents.filter(d => d.name.toLowerCase().endsWith('.pdf')).length === 0}
            title="Download all PDFs as ZIP"
          >
            <Download size={20} />
          </button>
          <div
            className={`drop-area ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            Drop files here
          </div>
        </div>
          {uploadProgress && (
            <div className="upload-progress">
              {uploadProgress}
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="documents-section">
          <div className="section-header">
            <h3>Documents ({filteredDocuments.length})</h3>
          </div>
          
          {isLoading ? (
            <div className="loading-state">
              <p>Loading documents...</p>
            </div>
          ) : (
            <div className="documents-list">
              {filteredDocuments.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <p>No documents found</p>
                  <span>Upload a document to get started</span>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.name}
                    className={`document-item ${currentFile?.name === doc.name ? 'current' : ''}`}
                  >
                    <div className="document-icon">
                      <FileText size={20} />
                    </div>
                    <div className="document-info">
                      <div className="document-name" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="document-meta">
                        <span className="document-size">{fileService.formatFileSize(doc.size)}</span>
                        <span className="document-date">
                          <Calendar size={12} />
                          {fileService.formatLastModified(doc.lastModified)}
                        </span>
                      </div>
                    </div>
                    <div className="document-actions">
                      <button
                        className="action-btn load-btn"
                        onClick={() => handleLoadDocument(doc)}
                        aria-label="Load document"
                        title="Load document into reader"
                        disabled={isLoading}
                      >
                        <Play size={16} />
                      </button>
                      <button
                        className="action-btn download-btn"
                        onClick={(e) => handleDownloadDocument(doc, e)}
                        aria-label="Download document"
                        title="Download document"
                        disabled={isLoading}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => handleDeleteDocument(doc.name, e)}
                        aria-label="Delete document"
                        title="Delete document"
                        disabled={isLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        className="action-btn archive-btn"
                        onClick={(e) => handleUnarchiveDocument(doc.name, e)}
                        aria-label="Unarchive document"
                        title="Unarchive document"
                        disabled={isLoading}
                      >
                        <ArchiveRestore size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onConfirm={confirmDelete}
          onClose={cancelDelete}
          title="Delete Document"
          message={`Are you sure you want to delete "${fileToDelete}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
        <ConfirmationModal
          isOpen={showClearAllConfirm}
          onConfirm={confirmClearAll}
          onClose={cancelClearAll}
          title="Clear All Archived Documents"
          message={`Are you sure you want to delete ${documents.length} file${documents.length !== 1 ? 's' : ''} from the archive? This action cannot be undone.`}
          confirmText="Clear All"
          cancelText="Cancel"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default DocumentArchiveModal;

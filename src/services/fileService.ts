// File service for managing document operations
export interface FileInfo {
  name: string;
  size: number;
  lastModified: string;
  type: string;
}

export interface FileUploadResponse {
  success: boolean;
  file?: FileInfo;
  error?: string;
}

export interface FileListResponse {
  files: FileInfo[];
}

class FileService {
  private baseUrl = '/api';

  /**
   * Upload a file to the server
   */
  async uploadFile(file: File): Promise<FileUploadResponse> {
    console.log(`Uploading file: ${file.name} (${this.formatFileSize(file.size)}, ${file.type})`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (jsonError) {
          console.warn('Could not parse error response as JSON:', jsonError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`Upload successful for ${file.name}:`, data);
      return data;
    } catch (error) {
      console.error(`Upload failed for ${file.name}:`, error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = 'Cannot connect to server. Please check if the backend is running.';
        console.error('Network error:', networkError);
        throw new Error(networkError);
      }
      
      throw error;
    }
  }

  /**
   * Upload multiple files to the server sequentially (one by one)
   */
  async uploadMultipleFiles(files: File[], onProgress?: (current: number, total: number, fileName: string) => void): Promise<FileUploadResponse[]> {
    console.log(`Starting sequential upload of ${files.length} file(s)`);
    const results: FileUploadResponse[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Uploading file ${i + 1}/${files.length}: ${file.name} (${this.formatFileSize(file.size)})`);
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(i + 1, files.length, file.name);
      }
      
      try {
        const result = await this.uploadFile(file);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Successfully uploaded: ${file.name}`);
        } else {
          console.error(`❌ Failed to upload: ${file.name} - ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error uploading ${file.name}:`, error);
        results.push({
          success: false,
          error: `Failed to upload ${file.name}: ${errorMessage}`
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`Upload completed: ${successCount} successful, ${failureCount} failed out of ${files.length} total`);
    
    return results;
  }

  /**
   * Get list of all files from the server
   */
  async listFiles(): Promise<FileInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/files`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data: FileListResponse = await response.json();
      return data.files;
    } catch (error) {
      console.error('Error listing files:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  async createFolder(folderName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files/create-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create folder');
    }
  }

  /**
   * Get list of archived files
   */
  async listArchivedFiles(): Promise<FileInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/files/archived`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data: FileListResponse = await response.json();
      return data.files;
    } catch (error) {
      console.error('Error listing archived files:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  /**
   * Delete a file from the server
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async deleteArchivedFile(filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/files/archived/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting archived file:', error);
      throw error;
    }
  }

  async clearArchivedFiles(): Promise<{ success: boolean; deletedCount: number; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/archived/clear`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete archived files');
      }

      const data = await response.json();
      return {
        success: data.success,
        deletedCount: data.deleted_count || 0,
        message: data.message || ''
      };
    } catch (error) {
      console.error('Error clearing archived files:', error);
      throw error;
    }
  }

  /**
   * Archive a file on the server
   */
  async archiveFile(filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/files/archive/${encodeURIComponent(filename)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive file');
      }
    } catch (error) {
      console.error('Error archiving file:', error);
      throw error;
    }
  }

  /**
   * Unarchive a file on the server
   */
  async unarchiveFile(filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/files/unarchive/${encodeURIComponent(filename)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unarchive file');
      }
    } catch (error) {
      console.error('Error unarchiving file:', error);
      throw error;
    }
  }

  /**
   * Delete all files from the server
   */
  async deleteAllFiles(): Promise<{ success: boolean; deletedCount: number; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/clear`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete all files');
      }

      const data = await response.json();
      console.log('All files deleted successfully:', data);
      return {
        success: data.success,
        deletedCount: data.deleted_count || 0,
        message: data.message || 'All files deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting all files:', error);
      throw error;
    }
  }

  /**
   * Download all PDF files as a ZIP archive
   */
  async downloadAllPdfsZip(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/files/download/all`);
    if (!response.ok) {
      throw new Error(`Failed to download PDFs: ${response.status} ${response.statusText}`);
    }
    return await response.blob();
  }

  /**
   * Get the download URL for a file
   */
  getDownloadUrl(filename: string): string {
    return `${this.baseUrl}/files/${encodeURIComponent(filename)}`;
  }

  /**
   * Get the download URL for an archived file
   */
  getArchivedDownloadUrl(filename: string): string {
    return `${this.baseUrl}/files/archived/${encodeURIComponent(filename)}`;
  }

  /**
   * Download a file and open it
   */
  async downloadAndOpenFile(filename: string): Promise<void> {
    try {
      const url = this.getDownloadUrl(filename);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening file:', error);
      throw error;
    }
  }

  async downloadAndOpenArchivedFile(filename: string): Promise<void> {
    try {
      const url = this.getArchivedDownloadUrl(filename);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening archived file:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format last modified date for display
   */
  formatLastModified(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  /**
   * Test backend connectivity and file system
   */
  async testConnection(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/files/test`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Backend test results:', data);
      return data;
    } catch (error) {
      console.error('Error testing backend connection:', error);
      throw error;
    }
  }
}

export const fileService = new FileService();

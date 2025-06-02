import { SavedDatabaseId, NotionConfig, TagMapping } from '../types';

export interface AppConfig {
  savedDatabaseIds: SavedDatabaseId[];
  columnMappings: Record<string, Partial<NotionConfig>>;
  tagMappings?: Record<string, TagMapping>;
  lastUpdated: string;
}

class ConfigService {
  private baseUrl: string;

  constructor() {
    // Use relative path with /api prefix for nginx proxy
    this.baseUrl = '/api';
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config`);
      if (!response.ok) {
        throw new Error(`Failed to get config: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching config:', error);
      // Return default config if server is not available
      return {
        savedDatabaseIds: [],
        columnMappings: {},
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async updateConfig(config: Partial<AppConfig>): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update config: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating config:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async saveDatabaseIds(databaseIds: SavedDatabaseId[]): Promise<{ success: boolean; message?: string }> {
    return this.updateConfig({ savedDatabaseIds: databaseIds });
  }

  async saveColumnMapping(databaseId: string, columnMapping: Partial<NotionConfig>): Promise<{ success: boolean; message?: string }> {
    try {
      const currentConfig = await this.getConfig();
      const updatedMappings = {
        ...currentConfig.columnMappings,
        [databaseId]: columnMapping
      };
      
      return this.updateConfig({ columnMappings: updatedMappings });
    } catch (error) {
      console.error('Error saving column mapping:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async downloadBackup(): Promise<Blob> {
    try {
      // Log base URL for debugging
      console.log('Using base URL:', this.baseUrl);
      const url = `${this.baseUrl}/config/backup`;
      console.log('Fetching backup from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Backup response not OK:', response.status, response.statusText);
        throw new Error(`Failed to download backup: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Error downloading backup:', error);
      throw error;
    }
  }

  async restoreBackup(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/config/restore`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to restore backup: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async clearConfig(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/config/clear`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to clear config: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing config:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

const configService = new ConfigService();
export default configService;
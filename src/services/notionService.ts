import axios from 'axios';
import { NotionConfig, NotionProperty, NotionPage } from '../types';

const NOTION_VERSION = '2022-06-28';
const API_BASE_URL = '/api';

class NotionService {
  private apiKeyCache: string | null = null;

  private async getNotionApiKey(): Promise<string> {
    // Return cached API key if available
    if (this.apiKeyCache) {
      return this.apiKeyCache;
    }

    try {
      console.log('=== Fetching API Key from Backend ===');
      const response = await axios.get(`${API_BASE_URL}/notion/api-key`);
      const apiKey = response.data.apiKey;
      
      console.log('API key obtained from backend:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
      
      // Additional validation for API key format
      if (apiKey && !apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_')) {
        console.warn('⚠️ API key format warning: Notion API keys should start with "secret_" or "ntn_"');
      }
      
      // Cache the API key
      this.apiKeyCache = apiKey;
      console.log('=== End API Key Fetch ===');
      
      return apiKey;
    } catch (error: any) {
      console.error('Error fetching Notion API key from backend:', error);
      throw new Error('Failed to obtain Notion API key from backend. Please check server configuration.');
    }
  }

  async getDatabaseProperties(config: NotionConfig): Promise<NotionProperty[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/notion/databases/${config.databaseId}`
      );
      const properties = response.data.properties;
      return Object.keys(properties).map(key => ({
        id: properties[key].id,
        name: key,
        type: properties[key].type
      }));
    } catch (error: any) {
      console.error('Error fetching database properties:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('Invalid Notion API key. Please check your API key format - it should start with "secret_". Get it from https://www.notion.so/my-integrations');
        } else if (error.response.status === 404) {
          throw new Error('Database not found. Please check your database ID and ensure the integration has access to it. Database ID should be 32 characters long.');
        } else if (error.response.status === 403) {
          throw new Error('Access denied. Make sure you have shared the database with your Notion integration.');
        } else {
          throw new Error(`Notion API error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error('No response from Notion API. Please check your internet connection.');
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        throw new Error(`Request configuration error: ${error.message}`);
      }
    }
  }

  async queryDatabase(config: NotionConfig, filter?: any): Promise<NotionPage[]> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notion/databases/${config.databaseId}/query`,
        { filter }
      );
      return response.data.results;
    } catch (error) {
      console.error('Error querying database:', error);
      throw new Error('Failed to query database');
    }
  }

  async createPage(config: NotionConfig, properties: Record<string, any>): Promise<NotionPage> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notion/pages`,
        {
          parent: { database_id: config.databaseId },
          properties
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating page:', error);
      throw new Error('Failed to create page');
    }
  }

  async updatePage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/notion/pages/${pageId}`,
        { properties }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating page:', error);
      throw new Error('Failed to update page');
    }
  }

  async saveTextWithIdentifier(
    config: NotionConfig,
    text: string
  ): Promise<{ identifier: string; success: boolean }> {
    try {
      // Now handled by backend
      const response = await axios.post(
        `${API_BASE_URL}/notion/save-text-with-identifier`,
        { config, text }
      );
      if (response.data.success) {
        return { identifier: response.data.identifier, success: true };
      } else {
        return { identifier: '', success: false };
      }
    } catch (error) {
      console.error('Error saving text with identifier (backend):', error);
      return { identifier: '', success: false };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Use backend endpoint instead of direct Notion API call
      const response = await axios.get(`${API_BASE_URL}/notion/test-connection`);
      if (response.data.success) {
        return { success: true, message: response.data.message };
      } else {
        return { success: false, message: response.data.message || 'Unknown error' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async addMultiSelectOption(config: { databaseId: string }, propertyName: string, optionName: string): Promise<void> {
    // This will PATCH the database schema to add a new multi_select option
    try {
      // Fetch current schema
      const dbRes = await axios.get(`${API_BASE_URL}/notion/databases/${config.databaseId}`);
      const dbProps = dbRes.data.properties;
      const prop = dbProps[propertyName];
      if (!prop || prop.type !== 'multi_select') throw new Error('Property is not multi_select');
      const currentOptions = prop.multi_select.options || [];
      // Check if already exists
      if (currentOptions.some((opt: any) => opt.name.toLowerCase() === optionName.toLowerCase())) return;
      const newOptions = [...currentOptions, { name: optionName }];
      // Patch the database schema
      await axios.patch(`${API_BASE_URL}/notion/databases/${config.databaseId}`, {
        properties: {
          [propertyName]: {
            multi_select: { options: newOptions }
          }
        }
      });
    } catch (err) {
      throw new Error('Failed to add multi_select option: ' + (err as any).message);
    }
  }
}

// Create service instance
const notionService = new NotionService();
export default notionService;

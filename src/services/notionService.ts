import axios from 'axios';
import { NotionConfig, NotionProperty, NotionPage } from '../types';

const NOTION_VERSION = '2022-06-28';
const API_BASE_URL = process.env.API_BASE_URL || '/api';

type NotionHeadersType = Record<string, string>;

class NotionService {
  private getNotionApiKey(): string {
    const envKey = process.env.NOTION_API_KEY;
    const windowReactKey = typeof window !== 'undefined' ? window._env_?.NOTION_API_KEY : undefined;
    
    console.log('=== API Key Debug Info ===');
    console.log('Environment key (NOTION_API_KEY) exists:', !!envKey);
    console.log('Environment key preview:', envKey ? envKey.substring(0, 10) + '...' : 'None');
    console.log('Window React key exists:', !!windowReactKey);
    console.log('Window React key preview:', windowReactKey ? windowReactKey.substring(0, 10) + '...' : 'None');
    console.log('Window._env_ object:', typeof window !== 'undefined' ? window._env_ : 'Not available');
    
    const apiKey = envKey || windowReactKey || '';
    console.log('Final key selected:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    console.log('=== End API Key Debug ===');
    
    // Additional validation for API key format
    if (apiKey && !apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_')) {
      console.warn('⚠️ API key format warning: Notion API keys should start with "secret_" or "ntn_"');
    }
    
    return apiKey;
  }

  private getHeaders(): NotionHeadersType {
    const apiKey = this.getNotionApiKey();
    if (!apiKey) {
      throw new Error('Notion API key is not configured. Please set NOTION_API_KEY environment variable.');
    }
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    };
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

  generateNextIdentifier(pattern: string, existingIdentifiers: string[]): string {
    // Handle patterns like "LV001_RF001" where we need to match "LV001_" and increment "RF001"
    if (pattern.includes('_')) {
      const parts = pattern.split('_');
      if (parts.length === 2) {
        const basePattern = parts[0]; // e.g., "LV001"
        const incrementPart = parts[1]; // e.g., "RF001"
        
        // Extract the incrementing pattern (prefix + number)
        const incrementMatch = incrementPart.match(/^(.+?)(\d+)$/);
        if (incrementMatch) {
          const [, incrementPrefix, incrementNumberStr] = incrementMatch;
          
          // Find all existing identifiers that match the base pattern
          const matchingIdentifiers = existingIdentifiers.filter(id => {
            return id.startsWith(basePattern + '_' + incrementPrefix);
          });
          
          // Extract numbers from matching identifiers and find the maximum
          let maxNumber = 0; // Start from 0, not from pattern number - 1
          matchingIdentifiers.forEach(id => {
            const idParts = id.split('_');
            if (idParts.length === 2 && idParts[0] === basePattern) {
              const numberMatch = idParts[1].match(new RegExp(`^${incrementPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
              if (numberMatch) {
                const num = parseInt(numberMatch[1], 10);
                if (num > maxNumber) {
                  maxNumber = num;
                }
              }
            }
          });
          
          // Generate next identifier
          const nextNumber = maxNumber + 1;
          const paddedNumber = nextNumber.toString().padStart(incrementNumberStr.length, '0');
          return `${basePattern}_${incrementPrefix}${paddedNumber}`;
        }
      }
    }
    
    // Fallback to original logic for patterns without underscore
    const match = pattern.match(/^(.+?)(\d+)(.*)$/);
    if (!match) {
      return pattern;
    }

    const [, prefix, numberStr, suffix] = match;
    
    // Find the highest existing number for this pattern
    let maxNumber = 0; // Start from 0, not from pattern number - 1
    const patternRegex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    
    existingIdentifiers.forEach(id => {
      const match = id.match(patternRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    // Generate next identifier
    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(numberStr.length, '0');
    return `${prefix}${paddedNumber}${suffix}`;
  }

  async saveTextWithIdentifier(
    config: NotionConfig,
    text: string
  ): Promise<{ identifier: string; success: boolean }> {
    try {
      // First, get existing identifiers
      const existingPages = await this.queryDatabase(config);
      const existingIdentifiers = existingPages
        .map(page => {
          const prop = page.properties[config.identifierColumn];
          if (prop && prop.type === 'rich_text' && prop.rich_text.length > 0) {
            return prop.rich_text[0].plain_text;
          } else if (prop && prop.type === 'title' && prop.title.length > 0) {
            return prop.title[0].plain_text;
          }
          return null;
        })
        .filter(Boolean) as string[];

      // Generate next identifier
      const identifier = this.generateNextIdentifier(config.identifierPattern, existingIdentifiers);

      // Prepare properties for the new page
      const properties: Record<string, any> = {};

      // Set identifier
      const identifierProp = await this.getPropertyType(config, config.identifierColumn);
      if (identifierProp?.type === 'title') {
        properties[config.identifierColumn] = {
          title: [{ text: { content: identifier } }]
        };
      } else if (identifierProp?.type === 'rich_text') {
        properties[config.identifierColumn] = {
          rich_text: [{ text: { content: identifier } }]
        };
      }

      // Set text
      const textProp = await this.getPropertyType(config, config.textColumn);
      if (textProp?.type === 'rich_text') {
        properties[config.textColumn] = {
          rich_text: [{ text: { content: text } }]
        };
      } else if (textProp?.type === 'title') {
        properties[config.textColumn] = {
          title: [{ text: { content: text } }]
        };
      }

      // Set annotation if provided and column is configured
      if (config.annotationColumn && config.annotation.trim()) {
        const annotationProp = await this.getPropertyType(config, config.annotationColumn);
        if (annotationProp?.type === 'rich_text') {
          properties[config.annotationColumn] = {
            rich_text: [{ text: { content: config.annotation } }]
          };
        } else if (annotationProp?.type === 'title') {
          properties[config.annotationColumn] = {
            title: [{ text: { content: config.annotation } }]
          };
        }
      }
      
      // Set page number if provided and column is configured
      if (config.pageColumn && config.pageNumber?.trim()) {
        const pageProp = await this.getPropertyType(config, config.pageColumn);
        if (pageProp?.type === 'rich_text') {
          properties[config.pageColumn] = {
            rich_text: [{ text: { content: config.pageNumber } }]
          };
        } else if (pageProp?.type === 'title') {
          properties[config.pageColumn] = {
            title: [{ text: { content: config.pageNumber } }]
          };
        }
      }

      // New: Document identifier insertion logic
      if (config.enableDocumentIdInsertion && config.documentIdInsertionColumn) {
        // Only insert if pattern contains '_'
        if (config.identifierPattern && config.identifierPattern.includes('_')) {
          const prefix = identifier.split('_')[0];
          const docIdProp = await this.getPropertyType(config, config.documentIdInsertionColumn);
          if (docIdProp?.type === 'multi_select') {
            properties[config.documentIdInsertionColumn] = {
              multi_select: [{ name: prefix }]
            };
          } else if (docIdProp?.type === 'rich_text') {
            properties[config.documentIdInsertionColumn] = {
              rich_text: [{ text: { content: prefix } }]
            };
          } else if (docIdProp?.type === 'title') {
            properties[config.documentIdInsertionColumn] = {
              title: [{ text: { content: prefix } }]
            };
          }
        }
      }

      await this.createPage(config, properties);

      return { identifier, success: true };
    } catch (error) {
      console.error('Error saving text with identifier:', error);
      return { identifier: '', success: false };
    }
  }

  private async getPropertyType(config: NotionConfig, propertyName: string): Promise<NotionProperty | null> {
    try {
      const properties = await this.getDatabaseProperties(config);
      return properties.find(prop => prop.name === propertyName) || null;
    } catch (error) {
      return null;
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
}

// Create service instance
const notionService = new NotionService();
export default notionService;

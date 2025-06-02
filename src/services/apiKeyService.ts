import axios from 'axios';

const API_BASE_URL = '/api';

class ApiKeyService {
  private cache: Map<string, string> = new Map();

  async getApiKey(provider: string): Promise<string> {
    // Return cached API key if available
    if (this.cache.has(provider)) {
      return this.cache.get(provider)!;
    }

    try {
      console.log(`=== Fetching ${provider.toUpperCase()} API Key from Backend ===`);
      const response = await axios.get(`${API_BASE_URL}/${provider}/api-key`);
      const apiKey = response.data.apiKey;
      
      console.log(`${provider.toUpperCase()} API key obtained from backend:`, apiKey ? apiKey.substring(0, 10) + '...' : 'None');
      
      // Cache the API key
      this.cache.set(provider, apiKey);
      console.log(`=== End ${provider.toUpperCase()} API Key Fetch ===`);
      
      return apiKey;
    } catch (error: any) {
      console.error(`Error fetching ${provider.toUpperCase()} API key from backend:`, error);
      throw new Error(`Failed to obtain ${provider.toUpperCase()} API key from backend. Please check server configuration.`);
    }
  }

  // Clear cache for all keys
  clearCache(): void {
    this.cache.clear();
  }

  // Clear cache for specific provider
  clearProviderCache(provider: string): void {
    this.cache.delete(provider);
  }
}

// Create service instance
const apiKeyService = new ApiKeyService();
export default apiKeyService;

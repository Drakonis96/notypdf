import axios from 'axios';
import { NotionConfig } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function saveTextWithIdentifier(config: NotionConfig, text: string): Promise<{success: boolean; identifier: string}> {
  const response = await axios.post(`${API_BASE_URL}/notion/save-text-with-identifier`, { config, text });
  return response.data;
}

export default { saveTextWithIdentifier };

import axios from 'axios';

const API_BASE_URL = '/tts';

export async function listVoices(): Promise<string[]> {
  const res = await axios.get(`${API_BASE_URL}/voices`);
  return res.data.voices || [];
}

export async function speak(text: string, voice: string, speed = 1): Promise<Blob> {
  const res = await axios.post(`${API_BASE_URL}/speak`, { text, voice, speed }, { responseType: 'blob' });
  return res.data as Blob;
}

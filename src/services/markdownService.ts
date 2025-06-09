class MarkdownService {
  private baseUrl = '/api';

  async getMarkdown(filename: string): Promise<string> {
    const url = `${this.baseUrl}/files/${encodeURIComponent(filename)}/markdown`;
    const response = await fetch(url);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch markdown');
    }
    const data = await response.json();
    return data.markdown as string;
  }
}

export const markdownService = new MarkdownService();

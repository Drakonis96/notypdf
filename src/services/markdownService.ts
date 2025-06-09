import axios from "axios";

class MarkdownService {
  private cache = new Map<string, string>();

  async getMarkdown(fileName: string): Promise<string> {
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName)!;
    }
    const encoded = encodeURIComponent(fileName);
    const response = await axios.get(`/api/files/${encoded}/markdown`);
    const md = response.data.markdown as string;
    this.cache.set(fileName, md);
    return md;
  }

  clear() {
    this.cache.clear();
  }
}

export default new MarkdownService();

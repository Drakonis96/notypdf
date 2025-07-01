import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.js`;

export async function extractPageText(file: File, pageNumber: number): Promise<string> {
  const loadingTask = pdfjs.getDocument(URL.createObjectURL(file));
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  return textContent.items.map((item: any) => item.str).join(' ').trim();
}

export async function getNumPages(file: File): Promise<number> {
  const loadingTask = pdfjs.getDocument(URL.createObjectURL(file));
  const pdf = await loadingTask.promise;
  return pdf.numPages;
}

export async function renderPageToImage(
  file: File,
  pageNumber: number,
  scale = 2
): Promise<string> {
  const loadingTask = pdfjs.getDocument(URL.createObjectURL(file));
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context!, viewport }).promise;
  return canvas.toDataURL('image/png');
}

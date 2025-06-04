async function getSelectionText(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getSelection().toString()
  });
  return result || '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const text = tab ? await getSelectionText(tab.id) : '';
  document.getElementById('selection').value = text;
});

document.getElementById('send').addEventListener('click', () => {
  const text = document.getElementById('selection').value.trim();
  const statusEl = document.getElementById('status');
  if (!text) {
    statusEl.textContent = 'No text to send.';
    return;
  }
  statusEl.textContent = 'Sending...';
  chrome.storage.sync.get(['backendUrl'], async ({ backendUrl }) => {
    const base = backendUrl || 'http://localhost:3000';
    try {
      const cfgRes = await fetch(`${base}/api/config`);
      const cfg = await cfgRes.json();
      if (!cfg.savedDatabaseIds || cfg.savedDatabaseIds.length === 0) {
        statusEl.textContent = 'No database configured.';
        return;
      }
      const dbId = cfg.savedDatabaseIds[0].databaseId;
      const mapping = cfg.columnMappings[dbId];
      if (!mapping) {
        statusEl.textContent = 'Missing column mapping.';
        return;
      }
      const notionConfig = {
        databaseId: dbId,
        ...mapping
      };
      const res = await fetch(`${base}/api/notion/save-text-with-identifier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: notionConfig, text })
      });
      const result = await res.json();
      if (result.success) {
        statusEl.textContent = `Saved with ID ${result.identifier}`;
      } else {
        statusEl.textContent = 'Error: ' + (result.error || 'Failed');
      }
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  });
});

async function getSelectionText(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => window.getSelection().toString()
  });
  for (const { result } of results) {
    if (result) return result;
  }
  return '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const text = tab ? await getSelectionText(tab.id) : '';
  document.getElementById('selection').value = text;
  if (tab && /\.pdf($|\?)/i.test(tab.url || '')) {
    document.getElementById('status').textContent = 'PDF detected';
  }

  chrome.storage.sync.get(['backendUrl', 'backendUser', 'backendPass'], async ({ backendUrl, backendUser, backendPass }) => {
    const base = backendUrl || 'http://localhost:3000';
    const headers = {};
    if (backendUser && backendPass) {
      headers['Authorization'] = 'Basic ' + btoa(`${backendUser}:${backendPass}`);
    }
    try {
      const cfgRes = await fetch(`${base}/api/config`, { headers });
      const cfg = await cfgRes.json();
      if (cfg.savedDatabaseIds && cfg.savedDatabaseIds.length > 0) {
        const dbId = cfg.savedDatabaseIds[0].databaseId;
        const mapping = cfg.columnMappings[dbId];
        if (mapping && mapping.identifierPattern) {
          document.getElementById('identifierPattern').value = mapping.identifierPattern;
        }
      }
    } catch (e) {
      console.error('Error fetching config', e);
    }
  });
});

document.getElementById('send').addEventListener('click', () => {
  const text = document.getElementById('selection').value.trim();
  const overridePattern = document.getElementById('identifierPattern').value.trim();
  const statusEl = document.getElementById('status');
  if (!text) {
    statusEl.textContent = 'No text to send.';
    return;
  }
  statusEl.textContent = 'Sending...';
  chrome.storage.sync.get(['backendUrl','backendUser','backendPass'], async ({ backendUrl, backendUser, backendPass }) => {
    const base = backendUrl || 'http://localhost:3000';
    const headers = { 'Content-Type': 'application/json' };
    if (backendUser && backendPass) {
      headers['Authorization'] = 'Basic ' + btoa(`${backendUser}:${backendPass}`);
    }
    try {
      const cfgRes = await fetch(`${base}/api/config`, { headers });
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
      const notionConfig = { databaseId: dbId, ...mapping };
      if (overridePattern) {
        notionConfig.identifierPattern = overridePattern;
      }
      const res = await fetch(`${base}/api/notion/save-text-with-identifier`, {
        method: 'POST',
        headers,
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

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

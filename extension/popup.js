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
  let text = tab ? await getSelectionText(tab.id) : '';
  if (!text) {
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      /* ignore */
    }
  }
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

function showScreen(id) {
  document.getElementById('mainScreen').style.display = id === 'main' ? 'block' : 'none';
  document.getElementById('optionsScreen').style.display = id === 'options' ? 'block' : 'none';
  document.getElementById('helpScreen').style.display = id === 'help' ? 'block' : 'none';
}

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.storage.sync.get(['backendUrl','backendUser','backendPass'], ({ backendUrl, backendUser, backendPass }) => {
    document.getElementById('backendUrl').value = backendUrl || 'http://localhost:3000';
    document.getElementById('backendUser').value = backendUser || '';
    document.getElementById('backendPass').value = backendPass || '';
    document.getElementById('optionsStatus').textContent = '';
    showScreen('options');
  });
});

document.getElementById('backFromOptions').addEventListener('click', () => {
  showScreen('main');
});

document.getElementById('saveOptions').addEventListener('click', () => {
  const url = document.getElementById('backendUrl').value;
  const user = document.getElementById('backendUser').value;
  const pass = document.getElementById('backendPass').value;
  chrome.storage.sync.set({ backendUrl: url, backendUser: user, backendPass: pass }, () => {
    const status = document.getElementById('optionsStatus');
    status.textContent = 'Saved!';
    setTimeout(() => { status.textContent = ''; }, 1000);
  });
});

document.getElementById('testConnection').addEventListener('click', async () => {
  const url = document.getElementById('backendUrl').value;
  const user = document.getElementById('backendUser').value;
  const pass = document.getElementById('backendPass').value;
  const headers = {};
  if (user && pass) {
    headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
  }
  try {
    const res = await fetch(`${url}/api/notion/test-connection`, { headers });
    const data = await res.json();
    const status = document.getElementById('optionsStatus');
    if (data.success) {
      status.textContent = 'Connection successful';
    } else {
      status.textContent = 'Failed: ' + (data.message || 'Error');
    }
  } catch (e) {
    document.getElementById('optionsStatus').textContent = 'Error: ' + e.message;
  }
});

document.getElementById('openHelp').addEventListener('click', () => {
  const help = `
<p><b>How it works</b></p>
<ol>
  <li>Open <b>Settings</b> and enter the URL where NotyPDF is running. If you started the app with Docker Compose use <code>http://localhost:5026</code>. Add the proxy username and password if you use a reverse proxy.</li>
  <li>Select text on any web page and open the popup to send it directly to Notion. If nothing is selected the popup tries to use the text you copied to the clipboard.</li>
  <li>If a PDF is viewed with Chrome's built-in reader, select the text and use the right-click menu item <i>Send selection to NotyPDF</i>, or copy the text first and open the popup.</li>
  <li>A reverse proxy (for example NGINX Proxy Manager) lets the extension connect from any browser even when the server isn't local.</li>
</ol>
<p>Use the arrows to move back after visiting Settings or this Help page.</p>`;
  document.getElementById('helpContent').innerHTML = help;
  showScreen('help');
});

document.getElementById('backFromHelp').addEventListener('click', () => {
  showScreen('main');
});

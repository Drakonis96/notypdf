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

async function getPdfSelectionViaClipboard(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.execCommand('copy');
      }
    });
    return await navigator.clipboard.readText();
  } catch (err) {
    console.error('Failed to read PDF selection', err);
    return '';
  }
}

function showScreen(id) {
  document.getElementById('main-screen').style.display = id === 'main' ? 'block' : 'none';
  document.getElementById('settings-screen').style.display = id === 'settings' ? 'block' : 'none';
  document.getElementById('help-screen').style.display = id === 'help' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isPdf = tab && /\.pdf($|\?)/i.test(tab.url || '');
  let text = tab ? await getSelectionText(tab.id) : '';
  if (!text && isPdf) {
    text = await getPdfSelectionViaClipboard(tab.id);
  }
  document.getElementById('selection').value = text;
  if (isPdf) {
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

  showScreen('main');
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


document.getElementById('openSettings').addEventListener('click', () => {
  chrome.storage.sync.get(['backendUrl','backendUser','backendPass'], ({ backendUrl, backendUser, backendPass }) => {
    document.getElementById('backendUrl').value = backendUrl || 'http://localhost:3000';
    document.getElementById('backendUser').value = backendUser || '';
    document.getElementById('backendPass').value = backendPass || '';
    document.getElementById('settingsStatus').textContent = '';
    showScreen('settings');
  });
});

document.getElementById('backFromSettings').addEventListener('click', () => {
  showScreen('main');
});

document.getElementById('openHelp').addEventListener('click', () => {
  showScreen('help');
});

document.getElementById('backFromHelp').addEventListener('click', () => {
  showScreen('main');
});

document.getElementById('saveSettings').addEventListener('click', () => {
  const url = document.getElementById('backendUrl').value;
  const user = document.getElementById('backendUser').value;
  const pass = document.getElementById('backendPass').value;
  chrome.storage.sync.set({ backendUrl: url, backendUser: user, backendPass: pass }, () => {
    const status = document.getElementById('settingsStatus');
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
    const status = document.getElementById('settingsStatus');
    if (data.success) {
      status.textContent = 'Connection successful';
    } else {
      status.textContent = 'Failed: ' + (data.message || 'Error');
    }
  } catch (e) {
    document.getElementById('settingsStatus').textContent = 'Error: ' + e.message;
  }
});

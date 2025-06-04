chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-selection',
    title: 'Send selection to NotyPDF',
    contexts: ['selection']
  });
});

async function sendText(text) {
  const { backendUrl, backendUser, backendPass } = await chrome.storage.sync.get([
    'backendUrl',
    'backendUser',
    'backendPass'
  ]);
  const base = backendUrl || 'http://localhost:3000';
  const headers = { 'Content-Type': 'application/json' };
  if (backendUser && backendPass) {
    headers['Authorization'] = 'Basic ' + btoa(`${backendUser}:${backendPass}`);
  }
  try {
    const cfgRes = await fetch(`${base}/api/config`, { headers });
    const cfg = await cfgRes.json();
    if (!cfg.savedDatabaseIds || cfg.savedDatabaseIds.length === 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'NotyPDF',
        message: 'No database configured.'
      });
      return;
    }
    const dbId = cfg.savedDatabaseIds[0].databaseId;
    const mapping = cfg.columnMappings[dbId];
    if (!mapping) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'NotyPDF',
        message: 'Missing column mapping.'
      });
      return;
    }
    const notionConfig = { databaseId: dbId, ...mapping };
    const res = await fetch(`${base}/api/notion/save-text-with-identifier`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ config: notionConfig, text })
    });
    const result = await res.json();
    if (result.success) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'NotyPDF',
        message: `Saved with ID ${result.identifier}`
      });
    } else {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'NotyPDF',
        message: 'Error saving text.'
      });
    }
  } catch (err) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'logo.png',
      title: 'NotyPDF',
      message: 'Connection error.'
    });
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'send-selection' && info.selectionText) {
    sendText(info.selectionText);
  }
});

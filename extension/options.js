document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['backendUrl','backendUser','backendPass'], ({ backendUrl, backendUser, backendPass }) => {
    document.getElementById('backendUrl').value = backendUrl || 'http://localhost:3000';
    document.getElementById('backendUser').value = backendUser || '';
    document.getElementById('backendPass').value = backendPass || '';
  });

  document.getElementById('save').addEventListener('click', () => {
    const url = document.getElementById('backendUrl').value;
    const user = document.getElementById('backendUser').value;
    const pass = document.getElementById('backendPass').value;
    chrome.storage.sync.set({ backendUrl: url, backendUser: user, backendPass: pass }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Saved!';
      setTimeout(() => { status.textContent = ''; }, 1000);
    });
  });

  document.getElementById('test').addEventListener('click', async () => {
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
      const status = document.getElementById('status');
      if (data.success) {
        status.textContent = 'Connection successful';
      } else {
        status.textContent = 'Failed: ' + (data.message || 'Error');
      }
    } catch (e) {
      document.getElementById('status').textContent = 'Error: ' + e.message;
    }
  });
});

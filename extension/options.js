document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['backendUrl'], ({ backendUrl }) => {
    document.getElementById('backendUrl').value = backendUrl || 'http://localhost:3000';
  });

  document.getElementById('save').addEventListener('click', () => {
    const url = document.getElementById('backendUrl').value;
    chrome.storage.sync.set({ backendUrl: url }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Saved!';
      setTimeout(() => { status.textContent = ''; }, 1000);
    });
  });
});

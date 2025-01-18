// Handle any background tasks
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage
  chrome.storage.local.set({ jobs: [] });
});

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['jobs'], function(result) {
    if (!result.jobs) {
      chrome.storage.local.set({ jobs: [] });
    }
  });
});

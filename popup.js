// Update total jobs counter
function updateTotalJobs() {
  chrome.storage.local.get(['jobs'], function(result) {
    const jobs = result.jobs || [];
    document.getElementById('total-jobs').textContent = `Total Jobs Saved: ${jobs.length}`;
  });
}

// Update current page display
function updateCurrentPage(url) {
  const pageParam = new URL(url).searchParams.get('page') || '1';
  document.getElementById('current-page').textContent = `Current Page: ${pageParam}`;
}

// Navigate to a specific page
function navigateToPage(direction) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    if (!tab.url.includes('upwork.com/nx/search/jobs')) {
      document.getElementById('status').textContent = 'Please navigate to the Upwork jobs search page';
      return;
    }

    const url = new URL(tab.url);
    const currentPage = parseInt(url.searchParams.get('page')) || 1;
    const newPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
    
    url.searchParams.set('page', newPage);
    chrome.tabs.update(tab.id, { url: url.toString() });
  });
}

// Initialize popup
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs[0].url.includes('upwork.com/nx/search/jobs')) {
    updateCurrentPage(tabs[0].url);
  }
});

document.getElementById('nextPage').addEventListener('click', () => navigateToPage('next'));
document.getElementById('prevPage').addEventListener('click', () => navigateToPage('prev'));

document.getElementById('saveJob').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  
  if (!tab.url.includes('upwork.com/nx/search/jobs')) {
    status.textContent = 'Please navigate to the Upwork jobs search page';
    return;
  }

  status.textContent = 'Saving jobs...';
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }, () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeJobs' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      
      if (response && response.success) {
        const newJobs = response.count;
        const totalJobs = response.totalCount;
        const duplicates = Math.max(0, newJobs - (totalJobs - (response.previousCount || 0)));
        
        status.textContent = `Saved ${newJobs} jobs! (${duplicates} duplicates removed)`;
        updateTotalJobs();
      } else {
        status.textContent = 'No jobs found on this page';
      }
    });
  });
});

document.getElementById('downloadJobs').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Preparing download...';
  
  chrome.storage.local.get(['jobs'], function(result) {
    const jobs = result.jobs || [];
    if (jobs.length === 0) {
      status.textContent = 'No jobs saved yet';
      return;
    }
    
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    chrome.downloads.download({
      url: url,
      filename: `upwork_jobs_${timestamp}.json`,
      saveAs: true
    }, () => {
      status.textContent = `Downloaded ${jobs.length} jobs`;
    });
  });
});

document.getElementById('clearJobs').addEventListener('click', async () => {
  const status = document.getElementById('status');
  
  if (confirm('Are you sure you want to clear all saved jobs? This cannot be undone.')) {
    chrome.storage.local.set({ jobs: [] }, function() {
      status.textContent = 'All jobs cleared';
      updateTotalJobs();
    });
  }
});

document.getElementById('startAutoScrape').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  const maxPages = parseInt(document.getElementById('maxPages').value);
  
  if (!tab.url.includes('upwork.com/nx/search/jobs')) {
    status.textContent = 'Please navigate to the Upwork jobs search page';
    return;
  }
  
  // Disable button while scraping
  document.getElementById('startAutoScrape').disabled = true;
  status.textContent = 'Auto-scraping started...';
  
  // Start auto-scraping
  chrome.tabs.sendMessage(tab.id, {
    action: 'startAutoScrape',
    pages: maxPages
  }, (response) => {
    if (!response || !response.success) {
      status.textContent = 'Failed to start auto-scraping';
      document.getElementById('startAutoScrape').disabled = false;
    }
  });
});

// Listen for auto-scrape completion
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autoScrapeComplete') {
    const status = document.getElementById('status');
    status.textContent = `Auto-scrape complete! Scraped ${request.pagesScraped} pages`;
    document.getElementById('startAutoScrape').disabled = false;
    updateTotalJobs();
  }
});

// Call on popup open
updateTotalJobs();

function scrapeJobData() {
  const jobData = {
    title: document.querySelector('h1.app-title')?.textContent?.trim(),
    company: 'Gemini',
    location: document.querySelector('.location')?.textContent?.trim(),
    description: document.querySelector('#content')?.textContent?.trim(),
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  chrome.storage.local.get(['jobs'], function(result) {
    const jobs = result.jobs || [];
    jobs.push(jobData);
    chrome.storage.local.set({ jobs: jobs }, function() {
      document.getElementById('status').textContent = 'Job saved successfully!';
    });
  });
}

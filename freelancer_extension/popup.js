// Update total jobs counter
function updateTotalJobs() {
  chrome.storage.local.get(['jobs'], function(result) {
    const jobs = result.jobs || [];
    const upworkCount = jobs.filter(job => job.source === 'upwork.com').length;
    const freelancerCount = jobs.filter(job => job.source === 'freelancer.com').length;
    
    document.getElementById('total-jobs').textContent = 
      `Total Jobs: ${jobs.length} (Upwork: ${upworkCount}, Freelancer: ${freelancerCount})`;
  });
}

// Update current page display
function updateCurrentPage(url) {
  let pageNum = '1';
  if (url.includes('upwork.com')) {
    pageNum = new URL(url).searchParams.get('page') || '1';
  } else if (url.includes('freelancer.com')) {
    // Freelancer.com uses /jobs/[category]/[page] format
    const matches = url.match(/\/jobs(?:\/[^\/]+)?\/(\d+)/);
    pageNum = matches ? matches[1] : '1';
  }
  document.getElementById('current-page').textContent = `Current Page: ${pageNum}`;
}

// Navigate to a specific page
function navigateToPage(direction) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    const url = new URL(tab.url);
    
    if (!tab.url.includes('upwork.com') && !tab.url.includes('freelancer.com')) {
      document.getElementById('status').textContent = 'Please navigate to Upwork or Freelancer jobs page';
      return;
    }

    let newUrl;
    if (url.hostname.includes('upwork.com')) {
      const currentPage = parseInt(url.searchParams.get('page')) || 1;
      const newPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
      url.searchParams.set('page', newPage);
      newUrl = url.toString();
    } else {
      // Freelancer.com pagination
      const matches = tab.url.match(/\/jobs(?:\/[^\/]+)?(?:\/(\d+))?/);
      const currentPage = matches && matches[1] ? parseInt(matches[1]) : 1;
      const newPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
      newUrl = tab.url.replace(/\/jobs(\/[^\/]+)?(?:\/\d+)?/, `/jobs$1/${newPage}`);
    }
    
    chrome.tabs.update(tab.id, { url: newUrl });
  });
}

// Initialize popup
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  const url = tabs[0].url;
  if (url.includes('upwork.com') || url.includes('freelancer.com')) {
    updateCurrentPage(url);
  }
});

document.getElementById('nextPage').addEventListener('click', () => navigateToPage('next'));
document.getElementById('prevPage').addEventListener('click', () => navigateToPage('prev'));

document.getElementById('saveJob').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  
  if (!tab.url.includes('upwork.com') && !tab.url.includes('freelancer.com')) {
    status.textContent = 'Please navigate to Upwork or Freelancer jobs page';
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
    
    // Create downloadable content
    const jsonStr = JSON.stringify(jobs, null, 2);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    
    // Create and trigger download
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `freelancer_jobs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    
    status.textContent = `Downloaded ${jobs.length} jobs`;
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

// Initialize
updateTotalJobs();

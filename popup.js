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
        updateTotalJobs(); // Update counter after saving
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

// Update total jobs counter
function updateTotalJobs() {
  chrome.storage.local.get(['jobs'], function(result) {
    const jobs = result.jobs || [];
    document.getElementById('total-jobs').textContent = `Total Jobs Saved: ${jobs.length}`;
  });
}

// Call on popup open
updateTotalJobs();

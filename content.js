// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJobs') {
    const jobs = [];
    // Each job is in an article element with class job-tile
    const jobArticles = document.querySelectorAll('article.job-tile');
    
    jobArticles.forEach(article => {
      // Title is in h2 with class job-tile-title > a
      const titleElement = article.querySelector('h2.job-tile-title a');
      // Description is in p with class mb-0 text-body-sm
      const descriptionElement = article.querySelector('p.mb-0.text-body-sm');
      // Budget is in the JobInfo list
      const budgetElement = article.querySelector('[data-test="JobInfo"] [data-test="is-fixed-price"] strong:last-child');
      // Posted time is in small element
      const postedElement = article.querySelector('[data-test="job-pubilshed-date"] span:last-child');
      // Skills are in air3-token elements
      const skillElements = article.querySelectorAll('.air3-token span');
      
      if (titleElement) {
        // Get job ID from URL or data attribute
        const jobUrl = titleElement.href;
        const jobId = jobUrl.match(/~([^?]+)/)?.[1] || jobUrl;
        
        const jobData = {
          id: jobId, // Add unique ID for deduplication
          title: titleElement.textContent.trim(),
          url: jobUrl,
          description: descriptionElement ? descriptionElement.textContent.trim() : '',
          budget: budgetElement ? budgetElement.textContent.trim() : '',
          posted: postedElement ? postedElement.textContent.trim() : '',
          skills: Array.from(skillElements).map(el => el.textContent.trim()),
          timestamp: new Date().toISOString()
        };
        
        // Additional metadata
        const location = article.querySelector('[data-test="location"] .air3-badge-tagline');
        const experience = article.querySelector('[data-test="experience-level"] strong');
        const proposals = article.querySelector('[data-test="proposals-tier"] strong');
        
        jobData.metadata = {
          location: location ? location.textContent.trim() : '',
          experience: experience ? experience.textContent.trim() : '',
          proposals: proposals ? proposals.textContent.trim() : ''
        };
        
        jobs.push(jobData);
      }
    });
    
    // Save to storage with deduplication
    chrome.storage.local.get(['jobs'], function(result) {
      const existingJobs = result.jobs || [];
      // Create a Map using job IDs for deduplication
      const jobMap = new Map();
      
      // Add existing jobs to map (older jobs will be overwritten by newer ones)
      existingJobs.forEach(job => jobMap.set(job.id, job));
      // Add new jobs to map
      jobs.forEach(job => jobMap.set(job.id, job));
      
      // Convert map back to array
      const updatedJobs = Array.from(jobMap.values());
      
      chrome.storage.local.set({ jobs: updatedJobs }, function() {
        sendResponse({ 
          success: true, 
          count: jobs.length,
          totalCount: updatedJobs.length
        });
      });
    });
    
    return true; // Required for async sendResponse
  }
});

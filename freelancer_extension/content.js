// Site-specific configurations
const SITE_CONFIGS = {
  'upwork.com': {
    selectors: {
      jobTile: 'article.job-tile',
      title: 'h2.job-tile-title a',
      description: 'p.mb-0.text-body-sm',
      budget: '[data-test="JobInfo"] [data-test="is-fixed-price"] strong:last-child',
      posted: '[data-test="job-pubilshed-date"] span:last-child',
      skills: '.air3-token span',
      location: '[data-test="location"] .air3-badge-tagline',
      experience: '[data-test="experience-level"] strong',
      proposals: '[data-test="proposals-tier"] strong'
    },
    getJobId: (url) => url.match(/~([^?]+)/)?.[1] || url
  },
  'freelancer.com': {
    selectors: {
      jobTile: 'fl-project-contest-card',
      title: 'fl-heading h2[data-size="mid"]',
      description: 'fl-text[data-type="paragraph"][data-max-lines="3"] .NativeElement',
      budget: '.BudgetUpgradeWrapper-budget fl-text .NativeElement',
      posted: 'fl-relative-time fl-text span',
      skills: '.SkillsWrapper[data-show-desktop="true"] fl-tag .Content',
      bids: '.BidEntryData .NativeElement',
      averageBid: '.AverageBid-amount .NativeElement',
      rating: '.ClientRating .ValueBlock'
    },
    getJobId: (url) => {
      // Extract numeric project ID from URL
      const matches = url.match(/projects\/([^\/]+)\/([^\/\-]+)-(\d+)/);
      return matches ? matches[3] : url; // Use the numeric ID at the end
    }
  }
};

// Get current site configuration
function getCurrentSite() {
  const hostname = window.location.hostname;
  return hostname.includes('upwork.com') ? 'upwork.com' : 'freelancer.com';
}

// Scrape jobs from the current page
function scrapeJobs() {
  const site = getCurrentSite();
  const config = SITE_CONFIGS[site];
  const jobs = [];

  const jobElements = document.querySelectorAll(config.selectors.jobTile);
  
  jobElements.forEach(element => {
    try {
      const titleElement = element.querySelector(config.selectors.title);
      if (!titleElement) return;

      // For Freelancer.com, expand description first
      if (site === 'freelancer.com') {
        const moreButton = element.querySelector('.ReadMoreButton');
        if (moreButton) {
          moreButton.click();
          // Give a small delay for the description to expand
          new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // For Freelancer.com, need to get the URL from the parent <a> tag
      let jobUrl;
      if (site === 'freelancer.com') {
        const linkElement = element.closest('a');
        jobUrl = linkElement ? 'https://www.freelancer.com' + linkElement.getAttribute('href') : '';
      } else {
        jobUrl = titleElement.href;
      }

      const jobData = {
        id: config.getJobId(jobUrl),
        source: site,
        title: titleElement.textContent.trim(),
        url: jobUrl,
        description: getElementText(element, config.selectors.description),
        budget: getElementText(element, config.selectors.budget),
        posted: getElementText(element, config.selectors.posted),
        skills: Array.from(element.querySelectorAll(config.selectors.skills))
          .map(el => el.textContent.trim()),
        metadata: {
          location: site === 'upwork.com' ? 
            getElementText(element, config.selectors.location) : null,
          proposals: site === 'upwork.com' ? 
            getElementText(element, config.selectors.proposals) :
            getElementText(element, config.selectors.bids),
          experience: site === 'upwork.com' ? 
            getElementText(element, config.selectors.experience) : null,
          averageBid: site === 'freelancer.com' ?
            getElementText(element, config.selectors.averageBid) : null,
          clientRating: site === 'freelancer.com' ?
            getElementText(element, config.selectors.rating) : null
        },
        timestamp: new Date().toISOString()
      };

      jobs.push(jobData);
    } catch (error) {
      console.error('Error parsing job:', error);
    }
  });

  return jobs;
}

// Helper function to safely get text content
function getElementText(parent, selector) {
  const element = parent.querySelector(selector);
  return element ? element.textContent.trim() : '';
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJobs') {
    const jobs = scrapeJobs();
    
    // Save to storage with deduplication
    chrome.storage.local.get(['jobs'], function(result) {
      const existingJobs = result.jobs || [];
      const jobMap = new Map();
      
      // Use URL as unique identifier
      existingJobs.forEach(job => jobMap.set(job.url, job));
      jobs.forEach(job => jobMap.set(job.url, job));
      
      const updatedJobs = Array.from(jobMap.values());
      
      chrome.storage.local.set({ jobs: updatedJobs }, function() {
        sendResponse({ 
          success: true, 
          count: jobs.length,
          totalCount: updatedJobs.length,
          previousCount: existingJobs.length
        });
      });
    });
    
    return true; // Required for async response
  } else if (request.action === 'navigate') {
    const site = getCurrentSite();
    
    if (site === 'upwork.com') {
      const button = document.querySelector(request.direction === 'next' ? '[data-test="page-next"]' : '[data-test="page-previous"]');
      if (button) button.click();
    } else {
      // Freelancer.com navigation
      const button = document.querySelector(request.direction === 'next' ? 
        'button[aria-label="Next page"]' : 
        'button[aria-label="Previous page"]'
      );
      if (button) button.click();
    }
    
    sendResponse({ success: true });
    return true;
  }
});

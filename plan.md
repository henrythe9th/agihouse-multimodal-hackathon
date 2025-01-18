# Job Board Scraper Extension Plan

## Overview
Create a collection of Chrome extensions for scraping different job boards, using our Upwork implementation as the template. Each job board gets its own extension to keep things simple and avoid permission issues.

## Extension Template (Based on Upwork Implementation)

### 1. Core Files
```
extension/
├── manifest.json        # Extension configuration
├── popup.html          # Simple UI with save/navigate/download
├── popup.js           # UI logic and message handling
├── content.js         # Job scraping logic
└── background.js      # Storage initialization
```

### 2. manifest.json Template
```json
{
  "manifest_version": 3,
  "name": "[SITE] Job Saver",
  "version": "1.0",
  "description": "Save [SITE] job listings to review later",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "downloads"
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["https://www.[SITE].com/*"],
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### 3. Common UI Features
- Save jobs from current page
- Navigate between pages
- Download all saved jobs
- Clear saved jobs
- Show total jobs saved
- Status messages

### 4. Job Data Structure
```javascript
{
  id: string,           // Unique job ID from URL
  title: string,        // Job title
  url: string,          // Direct link
  description: string,  // Job description
  budget: string,       // Budget/salary info
  posted: string,       // Posted date
  skills: string[],     // Required skills
  metadata: {           // Site-specific data
    location: string,
    experience: string,
    proposals: string,  // Or similar metrics
  },
  timestamp: string     // When we scraped it
}
```

## Site-Specific Implementations

### 1. Upwork (✓ Completed)
- **URL Pattern**: `upwork.com/nx/search/jobs`
- **Selectors**:
  ```javascript
  {
    jobTile: 'article.job-tile',
    title: 'h2.job-tile-title a',
    description: 'p.mb-0.text-body-sm',
    budget: '[data-test="JobInfo"] [data-test="is-fixed-price"] strong:last-child',
    posted: '[data-test="job-pubilshed-date"] span:last-child',
    skills: '.air3-token span'
  }
  ```
- **Features**:
  - [x] Basic job scraping
  - [x] Pagination support
  - [x] Deduplication
  - [x] Job saving
  - [x] JSON export

### 2. LinkedIn Jobs (Next)
- **URL Pattern**: `linkedin.com/jobs/search`
- **Key Elements**:
  - Job cards in feed
  - Infinite scroll handling
  - Job details in sidebar
- **To Implement**:
  - [ ] Job card selectors
  - [ ] Scroll position tracking
  - [ ] Detail panel scraping
  - [ ] Authentication check

### 3. Indeed
- **URL Pattern**: `indeed.com/jobs`
- **Key Elements**:
  - Search results page
  - Job cards
  - Pagination
- **To Implement**:
  - [ ] Result page selectors
  - [ ] Pagination handling
  - [ ] Salary parsing
  - [ ] Location handling

## Implementation Steps for New Sites

1. **Research Phase**
   - Examine site structure
   - Identify key elements
   - Test URL patterns
   - Check rate limiting

2. **Basic Setup**
   - Copy Upwork extension template
   - Update manifest.json
   - Modify permissions if needed
   - Update matches patterns

3. **Content Script**
   - Map site-specific selectors
   - Implement scraping logic
   - Handle pagination/scrolling
   - Add error handling

4. **Testing**
   - Test with different searches
   - Verify data accuracy
   - Check rate limiting
   - Test error scenarios

## Best Practices (from Upwork Implementation)

1. **Scraping**
   - Use reliable CSS selectors
   - Handle missing data gracefully
   - Include error messages
   - Add delay between pages

2. **Storage**
   - Use job URL as unique ID
   - Implement deduplication
   - Regular cleanup
   - Export functionality

3. **UI/UX**
   - Simple, clean interface
   - Clear status messages
   - Show progress/counts
   - Easy navigation

4. **Performance**
   - Efficient selectors
   - Batch storage operations
   - Minimize DOM operations
   - Handle large datasets

## Development Workflow

1. **Setup**
   ```bash
   mkdir [site]-job-saver
   cp -r upwork-template/* [site]-job-saver/
   ```

2. **Customize**
   - Update manifest.json
   - Modify selectors in content.js
   - Test on target site
   - Iterate and refine

3. **Test**
   - Load unpacked extension
   - Test all features
   - Check error handling
   - Verify data format

## Notes
- Keep extensions separate for simplicity
- Respect site terms of service
- Monitor for site changes
- Regular selector maintenance
- Document site-specific quirks
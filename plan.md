Below is an example showing how to reuse your existing **Chrome** login session on **macOS** so that when you run Selenium, it will open in a regular (non‐headless) Chrome window with you already logged in.

---

## 1. Locate Your Chrome User Data Directory on macOS

On macOS, Chrome typically stores user data in:
```
~/Library/Application Support/Google/Chrome
```
Inside that folder, you’ll see subfolders for each profile. Examples:

- `Default` (the default profile, if you have only one)  
- `Profile 1`, `Profile 2`, etc.

To find the correct folder, open the folder in Finder (press **Command+Shift+G** and paste in `~/Library/Application Support/Google/Chrome`). If you only have one Chrome profile, “**Default**” is likely correct.

> **Important**: Before you run the script, **close all running Chrome windows** that use that same profile. Chrome typically doesn’t allow two processes to share the same profile folder simultaneously.

---

## 2. Make Sure ChromeDriver Matches Your Chrome Version

- On macOS, you can install/update ChromeDriver via [Homebrew](https://brew.sh/) by running:
  ```bash
  brew install chromedriver
  ```
  or
  ```bash
  brew upgrade chromedriver
  ```
- Alternatively, download the exact ChromeDriver version from  
  [https://chromedriver.chromium.org/downloads](https://chromedriver.chromium.org/downloads)  
  and place it in your PATH (e.g., `/usr/local/bin/chromedriver`) so Selenium can find it.

**Check that** the ChromeDriver version matches your installed Chrome browser version (e.g., both are version 108, 109, etc.).

---

## 3. Example Python Script (Normal Mode, Using Existing Profile)

```python
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def scrape_upwork_jobs():
    # 1) Configure Chrome to use your existing profile
    chrome_options = Options()
    # DO NOT add headless here; we want normal mode

    # This is the main Chrome user data directory on macOS:
    chrome_options.add_argument(r'--user-data-dir=/Users/YOUR_USERNAME/Library/Application Support/Google/Chrome')
    # Pick the actual profile folder name: often "Default" or "Profile 1", etc.
    chrome_options.add_argument(r'--profile-directory=Default')

    # 2) Create a Service object for the ChromeDriver
    # If you installed via Homebrew, chromedriver is probably at /usr/local/bin/chromedriver
    # or /opt/homebrew/bin/chromedriver depending on your CPU architecture (Intel vs. Apple Silicon)
    service = Service("/usr/local/bin/chromedriver")

    # 3) Initialize the WebDriver with our options
    driver = webdriver.Chrome(service=service, options=chrome_options)

    # 4) Go to the Upwork job search page. 
    #    Because you're already logged in on that profile, 
    #    you should remain logged in here.
    url = "https://www.upwork.com/nx/search/jobs?amount=100-499&duration_v3=week&sort=recency&t=1"
    driver.get(url)

    # Wait a few seconds for everything to load
    time.sleep(5)

    # 5) Find job “cards” and extract information
    # The actual selectors can change, so inspect Upwork’s HTML to confirm
    job_cards = driver.find_elements(By.CSS_SELECTOR, "section.air-card-hover")
    all_jobs = []
    for card in job_cards:
        try:
            title_el = card.find_element(By.CSS_SELECTOR, "a[data-test='job-title-link']")
            title = title_el.text.strip()

            # Example for budget (may differ if Upwork changed CSS)
            budget_el = card.find_element(By.CSS_SELECTOR, "span.up-currency")
            budget = budget_el.text.strip()

            job_info = {
                "title": title,
                "budget": budget,
            }
            all_jobs.append(job_info)
        except Exception as e:
            print(f"Error parsing job card: {e}")

    # Print results
    for job in all_jobs:
        print(job)

    # Keep browser open for a bit, or close if you prefer
    time.sleep(10)
    driver.quit()

if __name__ == "__main__":
    scrape_upwork_jobs()
```

### Key Points

1. **No `--headless` Argument**: By default, Selenium will open Chrome in visible (“normal”) mode if you don’t explicitly set headless.  
2. **`--user-data-dir`** & **`--profile-directory`**: These arguments tell Chrome to open the specified user profile directory, which should already be logged into Upwork.  
3. **Close All Other Chrome Windows**: Because you’re sharing the profile folder, you normally can’t have another instance of Chrome open in that profile. (Chrome enforces one instance per profile.)  
4. **Check Your Selectors**: Upwork’s HTML structure can change, so if “`section.air-card-hover`” or “`a[data-test='job-title-link']`” don’t match anymore, use your browser’s DevTools to identify the correct selectors.  

---

## 4. Scrolling/Load More

If you need to load additional job cards by scrolling or clicking “Load More”, you can repeat a “scroll to bottom” approach or look for a “Load more jobs” button. For example:

```python
# Example scroll approach:
last_height = driver.execute_script("return document.body.scrollHeight")
while True:
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    new_height = driver.execute_script("return document.body.scrollHeight")
    if new_height == last_height:
        # Possibly look for a "Load More" button here, or break if no more content
        break
    last_height = new_height
```

---

## 5. Done!

That’s all you need for **macOS** to reuse your existing Chrome login session in a **regular** (non-headless) Selenium browser. As always:

1. **Make Sure It’s Allowed**: Check Upwork’s Terms of Service.  
2. **Keep Your Script Maintainable**: HTML changes can break selectors.  
3. **Version Compatibility**: Keep Chrome and ChromeDriver in sync.  

You should now be able to open Upwork, already signed in, and scrape the job listings (if permitted).
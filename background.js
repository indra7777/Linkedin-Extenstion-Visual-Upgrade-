// Background script to handle extension icon clicks
console.log('Unnanu background script loaded');

// Handle extension icon click in toolbar
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    
    // Only allow sidebar toggle on LinkedIn pages
    if (tab.url && tab.url.includes('linkedin.com')) {
        // Toggle sidebar - authentication will be handled within the sidebar
        chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Content script not ready yet');
            } else {
                console.log('Toggle message sent successfully');
            }
        });
    } else {
        console.log('Extension only works on LinkedIn pages');
    }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === "getCurrentTabUrl") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            sendResponse({ currentUrl: tabs[0].url });
        });
        return true;
    }
    
    // Handle other background script functionality from uploaded extension
    if (request.action === "scrapingStarted") {
        // Handle scraping started
    }
    
    if (request.action === "scrapingStopped") {
        // Handle scraping stopped
    }
});
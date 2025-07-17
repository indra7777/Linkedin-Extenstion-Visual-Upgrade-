// Background script to handle extension icon clicks
console.log('Unnanu background script loaded');

// Handle extension icon click in toolbar
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    
    // Check if user is on LinkedIn profile page
    if (tab.url && tab.url.includes('linkedin.com/in/')) {
        // On LinkedIn profile - toggle sidebar
        chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Content script not ready yet');
            } else {
                console.log('Toggle message sent successfully');
            }
        });
    } else {
        // Not on LinkedIn profile - show popup for login/main actions
        // The popup will be shown automatically due to default_popup in manifest
        // We can't manually trigger popup, but we can send message to content script
        chrome.tabs.sendMessage(tab.id, { action: 'showLoginPrompt' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Content script not ready yet, opening popup window');
                // Fallback: create a new window with the popup
                chrome.windows.create({
                    url: chrome.runtime.getURL('index.html'),
                    type: 'popup',
                    width: 400,
                    height: 600
                });
            }
        });
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
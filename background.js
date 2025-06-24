// Background script to handle extension icon clicks
console.log('Unnanu background script loaded');

// Handle extension icon click in toolbar
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    
    // Send message to content script to toggle sidebar
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('Content script not ready yet');
        } else {
            console.log('Toggle message sent successfully');
        }
    });
});
// Copy most of the functionality from popup.js but adapted for sidebar
let profilesCollected = 0;
let stoppingInProgress = false;
var endpointType = 'prod';
var APIstring = 'https://plugin.unnanu.com';
let currentProfileData = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sidebar DOM loaded');
    initializeEventListeners();
});

function initializeEventListeners() {
    console.log('Initializing event listeners');
    
    // Close sidebar button
    const closeBtn = document.getElementById('closeSidebar');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('Close button clicked');
            window.parent.postMessage({ action: 'closeSidebar' }, '*');
        });
    }

    // Extract button
    const extractBtn = document.getElementById('extractBtn');
    if (extractBtn) {
        extractBtn.addEventListener('click', function() {
            console.log('Extract button clicked');
            window.parent.postMessage({ action: 'extractProfile' }, '*');
        });
    }
}

// Listen for messages from parent window (content script)
window.addEventListener('message', function(event) {
    console.log('Sidebar received message:', event.data);
    
    switch(event.data.action) {
        case 'updateProfile':
            displayProfileData(event.data.profileData);
            break;
        case 'extractionStarted':
            showLoadingState();
            break;
        case 'extractionSuccess':
            showSuccessState(event.data.data);
            break;
        case 'extractionError':
            showErrorState(event.data.message);
            break;
    }
});

function displayProfileData(profileData) {
    console.log('Displaying profile data:', profileData);
    currentProfileData = profileData;
    
    const profileContainer = document.getElementById('profile-container');
    const extractBtn = document.getElementById('extractBtn');
    
    if (!profileData || !profileData.firstName) {
        // Show no profile message
        profileContainer.innerHTML = `
            <div class="loading-message">
                <p>Navigate to a LinkedIn profile to view details</p>
            </div>
        `;
        extractBtn.disabled = true;
        return;
    }
    
    // Display profile data
    profileContainer.innerHTML = `
        <div class="profile-display">
            <div class="profile-image-container">
                <img src="${profileData.profileImage || '../images/icon-2.png'}" 
                     alt="Profile Picture" 
                     class="profile-image"
                     onerror="this.src='../images/icon-2.png'">
            </div>
            <div class="profile-info">
                <h3 class="profile-name">${profileData.firstName} ${profileData.lastName}</h3>
                <p class="profile-title">${profileData.headline || 'LinkedIn Profile'}</p>
                <p class="profile-location">${profileData.location || ''}</p>
            </div>
        </div>
    `;
    
    // Enable extract button
    extractBtn.disabled = false;
    hideStatusMessage();
}

function showLoadingState() {
    const extractBtn = document.getElementById('extractBtn');
    const extractText = document.getElementById('extractText');
    const extractLoader = document.getElementById('extractLoader');
    
    extractBtn.disabled = true;
    extractText.style.display = 'none';
    extractLoader.style.display = 'block';
    
    hideStatusMessage();
}

function showSuccessState(data) {
    const extractBtn = document.getElementById('extractBtn');
    const extractText = document.getElementById('extractText');
    const extractLoader = document.getElementById('extractLoader');
    
    extractBtn.disabled = false;
    extractText.style.display = 'block';
    extractLoader.style.display = 'none';
    
    showStatusMessage('Profile extracted successfully!', 'success');
}

function showErrorState(message) {
    const extractBtn = document.getElementById('extractBtn');
    const extractText = document.getElementById('extractText');
    const extractLoader = document.getElementById('extractLoader');
    
    extractBtn.disabled = false;
    extractText.style.display = 'block';
    extractLoader.style.display = 'none';
    
    showStatusMessage(message || 'Failed to extract profile', 'error');
}

function showStatusMessage(message, type) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        hideStatusMessage();
    }, 5000);
}

function hideStatusMessage() {
    const statusElement = document.getElementById('statusMessage');
    statusElement.style.display = 'none';
}

console.log('Sidebar script loaded');
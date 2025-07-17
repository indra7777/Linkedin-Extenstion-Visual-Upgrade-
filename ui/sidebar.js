// Sidebar with integrated authentication
let profilesCollected = 0;
let stoppingInProgress = false;
var endpointType = 'uat';
var APIstring = 'https://plugin.unnanu.com';
let currentProfileData = null;
let currentUserData = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sidebar DOM loaded');
    initializeEventListeners();
    checkAuthenticationStatus();
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

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }

    // Extract button
    const extractBtn = document.getElementById('extractBtn');
    if (extractBtn) {
        extractBtn.addEventListener('click', function() {
            console.log('Extract button clicked');
            if (currentUserData && currentUserData.token) {
                window.parent.postMessage({ 
                    action: 'extractProfile', 
                    userData: currentUserData 
                }, '*');
            } else {
                showErrorState('Please login to extract profiles');
            }
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
}

function checkAuthenticationStatus() {
    console.log('Checking authentication status');
    getUnnanuData(function(userData) {
        if (userData && userData.token) {
            console.log('User is authenticated');
            currentUserData = userData;
            updateUserInfo(userData);
            showMainContent(); // This will request profile data
        } else {
            console.log('User is not authenticated');
            showLoginForm();
        }
    });
}

function showLoginForm() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
}

function showMainContent() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Now that user is authenticated, request profile data from content script
    window.parent.postMessage({ action: 'requestProfileData' }, '*');
}

function updateUserInfo(userData) {
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan) {
        // Show authentication status with expiry info
        const expiryDate = new Date(userData.expiry);
        const now = new Date();
        const timeLeft = Math.round((expiryDate - now) / (1000 * 60)); // minutes
        
        if (timeLeft > 0) {
            userEmailSpan.textContent = `Logged in (${timeLeft}min left)`;
        } else {
            userEmailSpan.textContent = `Session expired`;
        }
    }
}

function handleLogin() {
    console.log('Handling login');
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginLoader = document.getElementById('loginLoader');
    const loginError = document.getElementById('loginError');
    
    // Clear previous errors
    loginError.style.display = 'none';
    
    // Show loading state
    loginBtn.disabled = true;
    loginText.style.display = 'none';
    loginLoader.style.display = 'block';
    
    const endpoint = APIstring + '/api/v1/user/hire/signin?endpointType=' + endpointType;
    
    const data = {
        Email: email,
        Password: CryptoJS.MD5(password).toString()
    };
    
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(responseData => {
        console.log('Login response:', responseData);
        
        // Reset button state
        loginBtn.disabled = false;
        loginText.style.display = 'block';
        loginLoader.style.display = 'none';
        
        if (responseData && responseData.Code === 200) {
            // Login successful
            const currentTime = new Date().getTime();
            const expiryTime = currentTime + 60 * 60 * 1000; // 60 minutes
            
            const userData = {
                token: responseData.Data.Token,
                id: responseData.Data.UserId,
                type: 'hire',
                expiry: expiryTime
            };
            
            // Store in chrome storage
            chrome.storage.local.set({
                'unnanu_token': userData.token,
                'unnanu_id': userData.id,
                'unnanu_expiry': userData.expiry,
                'unnanu_type': userData.type,
                'isLoggedOut': false 
            }, function() {
                console.log('User data stored successfully');
                currentUserData = userData;
                updateUserInfo(userData);
                showMainContent(); // This will now request profile data
                
                // Clear the form
                document.getElementById('emailInput').value = '';
                document.getElementById('passwordInput').value = '';
            });
        } else {
            // Login failed
            loginError.textContent = 'Failed to authenticate. Please check your credentials.';
            loginError.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        
        // Reset button state
        loginBtn.disabled = false;
        loginText.style.display = 'block';
        loginLoader.style.display = 'none';
        
        // Show error
        loginError.textContent = 'Login failed. Please try again.';
        loginError.style.display = 'block';
    });
}

function handleLogout() {
    console.log('Handling logout');
    
    chrome.storage.local.set({ 'isLoggedOut': true }, function() {
        chrome.storage.local.remove(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function() {
            console.log('User logged out successfully');
            currentUserData = null;
            showLoginForm();
        });
    });
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
        case 'checkAuth':
            // Send current auth status back to parent
            window.parent.postMessage({ 
                action: 'authStatus', 
                isAuthenticated: !!(currentUserData && currentUserData.token),
                userData: currentUserData 
            }, '*');
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
    
    // Enable extract button only if authenticated
    if (currentUserData && currentUserData.token) {
        extractBtn.disabled = false;
    } else {
        extractBtn.disabled = true;
    }
    
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

// Authentication functions
function getUnnanuData(callback) {
    chrome.storage.local.get(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function(result) {
        const currentTime = new Date().getTime();
        if (result.unnanu_expiry && currentTime > result.unnanu_expiry) {
            chrome.storage.local.remove(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);
            callback(null);
        } else if (result.unnanu_token && result.unnanu_id) {
            callback({
                token: result.unnanu_token,
                id: result.unnanu_id,
                type: result.unnanu_type,
                expiry: result.unnanu_expiry
            });
        } else {
            callback(null);
        }
    });
}

function addProfileToSentList(profileId) {
    chrome.storage.local.get(['sentProfileIds'], function(result) {
        const sentProfileIds = result.sentProfileIds || [];
        if (!sentProfileIds.includes(profileId)) {
            sentProfileIds.push(profileId);
            chrome.storage.local.set({ 'sentProfileIds': sentProfileIds });
        }
    });
}

console.log('Sidebar script loaded');
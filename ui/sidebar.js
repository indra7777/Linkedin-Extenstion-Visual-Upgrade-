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
    
    // Hide authentication status in header
    const authStatusHeader = document.getElementById('authStatusHeader');
    if (authStatusHeader) {
        authStatusHeader.style.display = 'none';
    }
    
    // Notify parent about authentication status
    window.parent.postMessage({ 
        action: 'authStatus', 
        isAuthenticated: false,
        userData: null 
    }, '*');
}

function showMainContent() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Show authentication status in header
    const authStatusHeader = document.getElementById('authStatusHeader');
    if (authStatusHeader) {
        authStatusHeader.style.display = 'flex';
    }
    
    // Notify parent about authentication status
    window.parent.postMessage({ 
        action: 'authStatus', 
        isAuthenticated: true,
        userData: currentUserData 
    }, '*');
    
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
                showMainContent(); // This will notify parent and request profile data
                
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
            showLoginForm(); // This will notify parent about auth status
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
            if (event.data.autoExtract) {
                // For auto-extraction, show detailed profile
                displayDetailedProfile(currentProfileData);
            } else {
                // For manual extraction, show success state
                showSuccessState(event.data.data);
            }
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
    const actionSection = document.querySelector('.action-section');
    
    if (!profileData || !profileData.firstName) {
        // Show no profile message
        profileContainer.innerHTML = `
            <div class="loading-message">
                <p>Navigate to a LinkedIn profile to view details</p>
            </div>
        `;
        if (actionSection) actionSection.style.display = 'none';
        return;
    }
    
    // For authenticated users, show detailed profile information immediately
    if (currentUserData && currentUserData.token) {
        // Hide the extract button section for authenticated users
        if (actionSection) actionSection.style.display = 'none';
        
        // Auto-extract and display detailed information
        autoExtractAndDisplay(profileData);
    } else {
        // For non-authenticated users, show basic info with extract button
        displayBasicProfile(profileData);
        if (actionSection) actionSection.style.display = 'block';
    }
    
    hideStatusMessage();
}

function displayBasicProfile(profileData) {
    const profileContainer = document.getElementById('profile-container');
    const extractBtn = document.getElementById('extractBtn');
    
    // Display basic profile data
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
    
    extractBtn.disabled = false;
}

async function autoExtractAndDisplay(profileData) {
    console.log('Auto-extracting profile for authenticated user');
    const profileContainer = document.getElementById('profile-container');
    
    // Show loading state
    profileContainer.innerHTML = `
        <div class="loading-message">
            <div class="loader"></div>
            <p>Loading detailed profile information...</p>
        </div>
    `;
    
    // First check if phone and email are already available
    const savedContactInfo = await getSavedContactInfo();
    let contactInfo = null;
    
    // If phone or email is missing, try to find contact info via API
    if (!savedContactInfo || !savedContactInfo.phone || !savedContactInfo.email) {
        console.log('Phone or email missing, attempting to find contact info via API');
        profileContainer.innerHTML = `
            <div class="loading-message">
                <div class="loader"></div>
                <p>Searching for contact information...</p>
            </div>
        `;
        
        contactInfo = await findContactInfo(profileData, currentUserData);
        
        if (contactInfo) {
            console.log('Found contact info via API:', contactInfo);
            // Merge with existing saved info
            const updatedContactInfo = {
                ...savedContactInfo,
                phone: contactInfo.phone || savedContactInfo?.phone || '',
                email: contactInfo.email || savedContactInfo?.email || '',
                firstName: contactInfo.firstName || savedContactInfo?.firstName || '',
                lastName: contactInfo.lastName || savedContactInfo?.lastName || '',
                savedAt: new Date().toISOString(),
                foundViaAPI: true
            };
            
            // Save the found contact info
            chrome.storage.local.set({ 'profileContactInfo': updatedContactInfo });
        } else {
            console.log('No contact information found via API');
        }
    }
    
    // Automatically extract profile data
    window.parent.postMessage({ 
        action: 'extractProfile', 
        userData: currentUserData,
        autoExtract: true
    }, '*');
}

function displayDetailedProfile(profileData) {
    console.log('Displaying detailed profile:', profileData);
    const profileContainer = document.getElementById('profile-container');
    
    // Build experience HTML
    let experienceHTML = '';
    if (profileData.experience && profileData.experience.length > 0) {
        experienceHTML = `
            <div class="profile-section">
                <h4 class="section-title">💼 Experience (${profileData.experience.length})</h4>
                <div class="experience-list">
                    ${profileData.experience.map(exp => `
                        <div class="experience-item">
                            <div class="exp-title">${exp.title || 'Position Title'}</div>
                            <div class="exp-company">${exp.company || 'Company Name'}</div>
                            <div class="exp-duration">${exp.duration || 'Duration'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build education HTML
    let educationHTML = '';
    if (profileData.education && profileData.education.length > 0) {
        educationHTML = `
            <div class="profile-section">
                <h4 class="section-title">🎓 Education (${profileData.education.length})</h4>
                <div class="education-list">
                    ${profileData.education.map(edu => `
                        <div class="education-item">
                            <div class="edu-school">${edu.school || 'Institution'}</div>
                            <div class="edu-degree">${edu.degree || 'Degree/Program'}</div>
                            <div class="edu-years">${edu.years || 'Years'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build certifications HTML
    let certificationsHTML = '';
    if (profileData.certifications && profileData.certifications.length > 0) {
        certificationsHTML = `
            <div class="profile-section">
                <h4 class="section-title">🏆 Certifications (${profileData.certifications.length})</h4>
                <div class="certifications-list">
                    ${profileData.certifications.map(cert => `
                        <div class="certification-item">
                            <div class="cert-name">${cert.name || 'Certification Name'}</div>
                            <div class="cert-org">${cert.organization || 'Issuing Organization'}</div>
                            <div class="cert-date">${cert.dateInfo || 'Date'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build skills HTML
    let skillsHTML = '';
    if (profileData.skills && profileData.skills.length > 0) {
        skillsHTML = `
            <div class="profile-section">
                <h4 class="section-title">🛠️ Skills (${profileData.skills.length})</h4>
                <div class="skills-container">
                    ${profileData.skills.map(skill => `
                        <span class="skill-tag">${skill}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build languages HTML
    let languagesHTML = '';
    if (profileData.languages && profileData.languages.length > 0) {
        languagesHTML = `
            <div class="profile-section">
                <h4 class="section-title">🌐 Languages (${profileData.languages.length})</h4>
                <div class="languages-list">
                    ${profileData.languages.map(lang => `
                        <div class="language-item">
                            <div class="lang-name">${lang.language}</div>
                            <div class="lang-proficiency">${lang.proficiency || 'Proficiency level'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Display comprehensive profile information with editable fields
    profileContainer.innerHTML = `
        <div class="detailed-profile">
            <div class="profile-header">
                <div class="profile-image-container">
                    <img src="${profileData.profileImage || '../images/icon-2.png'}" 
                         alt="Profile Picture" 
                         class="profile-image"
                         onerror="this.src='../images/icon-2.png'">
                </div>
                <div class="profile-info">
                    <h3 class="profile-name">${profileData.firstName} ${profileData.lastName}</h3>
                    <p class="profile-title">${profileData.headline || ''}</p>
                    <p class="profile-location">${profileData.location || ''}</p>
                    <div class="profile-stats">
                        ${profileData.connections ? `<span class="stat">${profileData.connections}</span>` : ''}
                        ${profileData.followers ? `<span class="stat">${profileData.followers}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Editable Contact Information -->
            <div class="profile-section editable-section">
                <h4 class="section-title">📞 Contact Information (Editable)</h4>
                <div class="contact-fields">
                    <div class="form-group">
                        <label for="phoneInput">Phone Number:</label>
                        <input type="tel" id="phoneInput" class="contact-input" placeholder="Enter phone number" value="">
                    </div>
                    <div class="form-group">
                        <label for="emailInput">Email Address:</label>
                        <input type="email" id="emailInputProfile" class="contact-input" placeholder="Enter email address" value="">
                    </div>
                    <div class="form-group">
                        <label for="linkedinUrlInput">LinkedIn URL:</label>
                        <input type="url" id="linkedinUrlInput" class="contact-input" placeholder="Enter LinkedIn URL" value="${profileData.url || ''}">
                    </div>
                    <div class="form-group">
                        <label for="resumeUpload">Resume Upload:</label>
                        <div class="file-upload-container">
                            <input type="file" id="resumeUpload" class="file-input" accept=".pdf,.doc,.docx" style="display: none;">
                            <button type="button" class="file-upload-btn" onclick="document.getElementById('resumeUpload').click()">
                                📄 Choose Resume File
                            </button>
                            <span id="resumeFileName" class="file-name">No file selected</span>
                        </div>
                    </div>
                    <button class="save-contact-btn" onclick="saveContactInfo()">💾 Save Contact Info</button>
                </div>
            </div>
            
            ${experienceHTML}
            ${educationHTML}
            ${certificationsHTML}
            ${skillsHTML}
            ${languagesHTML}
            
            <!-- Complete Profile Summary -->
            <div class="profile-section summary-section">
                <h4 class="section-title">📊 Profile Summary</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Experience:</span>
                        <span class="stat-value">${profileData.experience?.length || 0} positions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Education:</span>
                        <span class="stat-value">${profileData.education?.length || 0} institutions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Certifications:</span>
                        <span class="stat-value">${profileData.certifications?.length || 0} certificates</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Skills:</span>
                        <span class="stat-value">${profileData.skills?.length || 0} skills</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Languages:</span>
                        <span class="stat-value">${profileData.languages?.length || 0} languages</span>
                    </div>
                </div>
            </div>
            
            <div class="extraction-info">
                <p class="success-message">✅ Complete profile analysis finished!</p>
                <small class="timestamp">Extracted: ${new Date().toLocaleString()}</small>
            </div>
        </div>
    `;
    
    // Add event listener for resume file upload
    setTimeout(() => {
        const resumeInput = document.getElementById('resumeUpload');
        const resumeFileName = document.getElementById('resumeFileName');
        
        if (resumeInput && resumeFileName) {
            resumeInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    resumeFileName.textContent = file.name;
                    resumeFileName.style.color = '#0073b1';
                } else {
                    resumeFileName.textContent = 'No file selected';
                    resumeFileName.style.color = '#666';
                }
            });
        }
        
        // Load previously saved contact information
        loadSavedContactInfo();
    }, 100);
}

// Function to load saved contact information
function loadSavedContactInfo() {
    chrome.storage.local.get(['profileContactInfo'], function(result) {
        if (result.profileContactInfo) {
            const contactInfo = result.profileContactInfo;
            
            const phoneInput = document.getElementById('phoneInput');
            const emailInput = document.getElementById('emailInputProfile');
            const linkedinInput = document.getElementById('linkedinUrlInput');
            const resumeFileName = document.getElementById('resumeFileName');
            
            if (phoneInput && contactInfo.phone) {
                phoneInput.value = contactInfo.phone;
                // Show API found indicator if found via API
                if (contactInfo.foundViaAPI) {
                    phoneInput.style.borderColor = '#28a745';
                    phoneInput.style.backgroundColor = '#f8fff9';
                }
            }
            if (emailInput && contactInfo.email) {
                emailInput.value = contactInfo.email;
                // Show API found indicator if found via API
                if (contactInfo.foundViaAPI) {
                    emailInput.style.borderColor = '#28a745';
                    emailInput.style.backgroundColor = '#f8fff9';
                }
            }
            if (linkedinInput && contactInfo.linkedinUrl) {
                linkedinInput.value = contactInfo.linkedinUrl;
            }
            if (resumeFileName && contactInfo.resume) {
                resumeFileName.textContent = contactInfo.resume;
                resumeFileName.style.color = '#0073b1';
            }
            
            // Show API found message if contact info was found via API
            if (contactInfo.foundViaAPI) {
                const contactSection = document.querySelector('.editable-section');
                if (contactSection && !contactSection.querySelector('.api-found-indicator')) {
                    const indicator = document.createElement('div');
                    indicator.className = 'api-found-indicator';
                    indicator.innerHTML = `
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 8px; border-radius: 4px; margin-bottom: 10px; font-size: 12px;">
                            ✅ Contact information found via Unnanu API
                        </div>
                    `;
                    contactSection.insertBefore(indicator, contactSection.querySelector('.contact-fields'));
                }
            }
            
            console.log('Loaded saved contact info:', contactInfo);
        }
    });
}

// Function to find contact information via API
async function findContactInfo(profileData, userData) {
    console.log('Finding contact info for profile:', profileData);
    
    if (!userData || !userData.token) {
        console.log('No authentication token available');
        return null;
    }
    
    const apiEndpoint = 'https://uat-hire-oth-v5.unnanu.com/api/v1/account/contact/find';
    
    // Try searching by email first if available, then by LinkedIn URL
    const searchParams = [];
    
    // Add email search if available
    const savedContactInfo = await getSavedContactInfo();
    if (savedContactInfo && savedContactInfo.email) {
        searchParams.push(savedContactInfo.email);
    }
    
    // Add LinkedIn URL search
    if (profileData.url) {
        searchParams.push(profileData.url);
    }
    
    // Try each search parameter
    for (const searchParam of searchParams) {
        try {
            const response = await fetch(`${apiEndpoint}?search=${searchParam}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userData.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log(`Contact search failed for ${searchParam}: ${response.status}`);
                continue;
            }
            
            const result = await response.json();
            console.log('Contact search result:', result);
            
            if (result && (result.firstName || result.lastName || result.Phone || result.Email)) {
                return {
                    firstName: result.firstName,
                    lastName: result.lastName, 
                    phone: result.Phone,
                    email: result.Email
                };
            }
        } catch (error) {
            console.error('Contact API request failed:', error);
            continue;
        }
    }
    
    console.log('No contact information found via API');
    return null;
}

// Function to get saved contact info
function getSavedContactInfo() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['profileContactInfo'], function(result) {
            resolve(result.profileContactInfo || null);
        });
    });
}

// Function to save contact information
window.saveContactInfo = function() {
    const phone = document.getElementById('phoneInput')?.value;
    const email = document.getElementById('emailInputProfile')?.value;
    const linkedinUrl = document.getElementById('linkedinUrlInput')?.value;
    const resumeFile = document.getElementById('resumeUpload')?.files[0];
    
    const contactInfo = {
        phone: phone,
        email: email,
        linkedinUrl: linkedinUrl,
        resume: resumeFile ? resumeFile.name : null,
        savedAt: new Date().toISOString()
    };
    
    // Store in chrome storage
    chrome.storage.local.set({ 
        'profileContactInfo': contactInfo 
    }, function() {
        console.log('Contact information saved:', contactInfo);
        showStatusMessage('Contact information saved successfully!', 'success');
        
        // Here you could also send this data to your API if needed
        if (currentUserData && currentUserData.token) {
            // Optional: Send to API
            console.log('Could send contact info to API:', contactInfo);
        }
    });
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
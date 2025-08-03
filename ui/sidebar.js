// Sidebar with integrated authentication
let profilesCollected = 0;
let stoppingInProgress = false;
var endpointType = 'uat';
var APIstring = 'https://plugin.unnanu.com';
var crmAPI = 'https://uat-hire-oth-v5.unnanu.com';
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
    
    // Show usage disclaimer when not authenticated
    const usageDisclaimer = document.getElementById('usage-disclaimer');
    if (usageDisclaimer) {
        usageDisclaimer.style.display = 'block';
    }
    
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
    
    // Hide usage disclaimer when authenticated
    const usageDisclaimer = document.getElementById('usage-disclaimer');
    if (usageDisclaimer) {
        usageDisclaimer.style.display = 'none';
    }
    
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
                // Trigger contact finding API for manual extractions too
                if (currentUserData && currentUserData.token && currentProfileData) {
                    triggerContactFinding(currentProfileData, currentUserData);
                }
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
        case 'overlayContactInfo':
            handleOverlayContactInfo(event.data.contactInfo);
            break;
    }
});

function displayProfileData(profileData) {
    console.log('Displaying profile data:', profileData);
    
    // Extract profile IDs for comparison instead of full URLs
    const currentProfileId = currentProfileData ? extractLinkedInProfileId(currentProfileData.url) : '';
    const newProfileId = extractLinkedInProfileId(profileData.url);
    
    // Check if this is a new profile based on profile ID rather than full URL
    const isNewProfile = !currentProfileData || 
                        currentProfileId !== newProfileId ||
                        (currentProfileData.firstName + ' ' + currentProfileData.lastName) !== (profileData.firstName + ' ' + profileData.lastName);
    
    console.log('Profile ID comparison - Current:', currentProfileId, 'New:', newProfileId, 'Is new profile:', isNewProfile);
    
    if (isNewProfile) {
        console.log('New profile detected, checking existing contact info');
        
        // Check if we have overlay-extracted contact info for a different profile
        chrome.storage.local.get(['profileContactInfo'], function(result) {
            const storedProfileId = result.profileContactInfo ? extractLinkedInProfileId(result.profileContactInfo.linkedinUrl) : '';
            
            const shouldClearContactInfo = !result.profileContactInfo || 
                                         !result.profileContactInfo.extractedFromOverlay ||
                                         storedProfileId !== newProfileId;
            
            console.log('Contact info check - Stored profile ID:', storedProfileId, 'Should clear:', shouldClearContactInfo);
            
            if (shouldClearContactInfo) {
                console.log('Clearing contact info for new profile or different profile overlay data');
                chrome.storage.local.remove(['profileContactInfo'], function() {
                    console.log('Cleared contact info for new profile');
                });
                
                // Clear form fields immediately when profile changes
                setTimeout(() => {
                    clearContactFieldsForNewProfile();
                }, 100);
            } else {
                console.log('Preserving overlay-extracted contact info for same profile ID');
                // Don't clear form fields if we're preserving overlay data for the same profile
            }
        });
    }
    
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
    const profileImageHtml = profileData.profileImage ? 
        `<img src="${profileData.profileImage}" 
             alt="Profile Picture" 
             class="profile-image"
             onerror="this.src='../images/icon-2.png'">` :
        `<div class="profile-image-placeholder">
             <span class="profile-initials">${(profileData.firstName || '').charAt(0)}${(profileData.lastName || '').charAt(0)}</span>
         </div>`;
    
    profileContainer.innerHTML = `
        <div class="profile-display">
            <div class="profile-image-container">
                ${profileImageHtml}
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
    
    if (!profileData) {
        console.error('autoExtractAndDisplay called with null profileData');
        return;
    }

    try {
        const profileContainer = document.getElementById('profile-container');
        
        // Show loading state
        profileContainer.innerHTML = `
            <div class="loading-message">
                <div class="loader"></div>
                <p>Loading detailed profile information...</p>
            </div>
        `;
        
        // Always try to find fresh contact info via API for each profile
        console.log('Attempting to find contact info via API for new profile');
        profileContainer.innerHTML = `
            <div class="loading-message">
                <div class="loader"></div>
                <p>Searching for contact information...</p>
            </div>
        `;
        
        const contactInfo = await findContactInfo(profileData, currentUserData);
        
        if (contactInfo) {
            console.log('Found contact info via API:', contactInfo);
            // Save the found contact info with all data
            const updatedContactInfo = {
                phone: contactInfo.phone || '',
                email: contactInfo.email || '',
                firstName: contactInfo.firstName || '',
                lastName: contactInfo.lastName || '',
                allFirstNames: contactInfo.allFirstNames || [],
                allLastNames: contactInfo.allLastNames || [],
                allPhones: contactInfo.allPhones || [],
                allEmails: contactInfo.allEmails || [],
                linkedinUrl: profileData.url || '',
                savedAt: new Date().toISOString(),
                foundViaAPI: true,
                searchMethod: contactInfo.searchMethod
            };
            
            // Save the found contact info
            chrome.storage.local.set({ 'profileContactInfo': updatedContactInfo });
        } else {
            console.log('No contact information found via API');
        }
        
        // Automatically extract profile data
        window.parent.postMessage({ 
            action: 'extractProfile', 
            userData: currentUserData,
            autoExtract: true
        }, '*');
    } catch (error) {
        console.error('Error in autoExtractAndDisplay:', error);
        // Optionally, display an error message to the user
        const profileContainer = document.getElementById('profile-container');
        if (profileContainer) {
            profileContainer.innerHTML = `<div class="error-message">Failed to load profile details.</div>`;
        }
    }
}

// Helper function to trigger contact finding API
async function triggerContactFinding(profileData, userData) {
    console.log('Triggering contact finding API for extracted profile');
    
    if (!profileData || !userData || !userData.token) {
        console.log('Cannot trigger contact finding - missing data or authentication');
        return;
    }
    
    try {
        const contactInfo = await findContactInfo(profileData, userData);
        
        if (contactInfo) {
            console.log('Contact information found and will be auto-populated:', contactInfo);
            
            // Auto-save the found contact information first
            const mergedContactInfo = {
                phone: contactInfo.phone || '',
                email: contactInfo.email || '',
                linkedinUrl: profileData.url || '',
                firstName: contactInfo.firstName || profileData.firstName || '',
                lastName: contactInfo.lastName || profileData.lastName || '',
                allFirstNames: contactInfo.allFirstNames || [],
                allLastNames: contactInfo.allLastNames || [],
                allPhones: contactInfo.allPhones || [],
                allEmails: contactInfo.allEmails || [],
                savedAt: new Date().toISOString(),
                foundViaAPI: true,
                searchMethod: contactInfo.searchMethod
            };
            
            chrome.storage.local.set({ 'profileContactInfo': mergedContactInfo }, () => {
                console.log('Contact info saved to storage:', mergedContactInfo);
            });
            
            // Show contact found buttons with retry mechanism
            const showContactButtons = (attempts = 0) => {
                console.log(`Attempting to show contact buttons (attempt ${attempts + 1})`);
                
                const contactFoundSection = document.getElementById('contactFoundSection');
                const firstNameOptions = document.getElementById('firstNameOptions');
                const lastNameOptions = document.getElementById('lastNameOptions');
                const phoneOptions = document.getElementById('phoneOptions');
                const emailOptions = document.getElementById('emailOptions');
                
                console.log('Contact elements found:', {
                    contactFoundSection: !!contactFoundSection,
                    firstNameOptions: !!firstNameOptions,
                    lastNameOptions: !!lastNameOptions,
                    phoneOptions: !!phoneOptions,
                    emailOptions: !!emailOptions
                });
                
                if (contactFoundSection && firstNameOptions && lastNameOptions && phoneOptions && emailOptions) {
                    let hasData = false;
                    
                    // Create first name buttons for all available first names
                    if (contactInfo.allFirstNames && contactInfo.allFirstNames.length > 0) {
                        firstNameOptions.innerHTML = ''; // Clear existing content
                        contactInfo.allFirstNames.forEach((firstName) => {
                            if (firstName.trim()) {
                                const firstNameButton = document.createElement('button');
                                firstNameButton.className = 'contact-option-btn name-option-btn';
                                firstNameButton.innerHTML = `👤 ${firstName.trim()}`;
                                firstNameButton.addEventListener('click', function() {
                                    useContactValue('firstName', firstName.trim());
                                });
                                firstNameOptions.appendChild(firstNameButton);
                                hasData = true;
                            }
                        });
                    }
                    
                    // Create last name buttons for all available last names
                    if (contactInfo.allLastNames && contactInfo.allLastNames.length > 0) {
                        lastNameOptions.innerHTML = ''; // Clear existing content
                        contactInfo.allLastNames.forEach((lastName) => {
                            if (lastName.trim()) {
                                const lastNameButton = document.createElement('button');
                                lastNameButton.className = 'contact-option-btn name-option-btn';
                                lastNameButton.innerHTML = `👤 ${lastName.trim()}`;
                                lastNameButton.addEventListener('click', function() {
                                    useContactValue('lastName', lastName.trim());
                                });
                                lastNameOptions.appendChild(lastNameButton);
                                hasData = true;
                            }
                        });
                    }
                    
                    // Create phone buttons for all available phones
                    if (contactInfo.allPhones && contactInfo.allPhones.length > 0) {
                        phoneOptions.innerHTML = ''; // Clear existing content
                        contactInfo.allPhones.forEach((phone) => {
                            if (phone.trim()) {
                                const phoneButton = document.createElement('button');
                                phoneButton.className = 'contact-option-btn phone-option-btn';
                                phoneButton.innerHTML = `📞 ${phone.trim()}`;
                                phoneButton.addEventListener('click', function() {
                                    useContactValue('phone', phone.trim());
                                });
                                phoneOptions.appendChild(phoneButton);
                                hasData = true;
                            }
                        });
                    }
                    
                    // Create email buttons for all available emails
                    if (contactInfo.allEmails && contactInfo.allEmails.length > 0) {
                        emailOptions.innerHTML = ''; // Clear existing content
                        contactInfo.allEmails.forEach((email) => {
                            if (email.trim()) {
                                const emailButton = document.createElement('button');
                                emailButton.className = 'contact-option-btn email-option-btn';
                                emailButton.innerHTML = `📧 ${email.trim()}`;
                                emailButton.addEventListener('click', function() {
                                    useContactValue('email', email.trim());
                                });
                                emailOptions.appendChild(emailButton);
                                hasData = true;
                            }
                        });
                    }
                    
                    // Show the contact found data if we have any data
                    if (hasData) {
                        // Update header status - this is the only message we need
                        updateHeaderStatus('✅ Profile Found Successfully');
                    }
                }
                
                // If elements weren't found and we have more attempts, retry
                if ((!contactFoundSection || !phoneOptions || !emailOptions) && attempts < 5) {
                    setTimeout(() => showContactButtons(attempts + 1), 1000);
                }
            };
            
            // Start showing contact buttons with initial delay
            setTimeout(() => showContactButtons(), 1000);
        } else {
            console.log('No contact information found via API');
        }
    } catch (error) {
        console.error('Error in triggerContactFinding:', error);
    }
}

function displayDetailedProfile(profileData) {
    console.log('Displaying detailed profile:', profileData);

    if (!profileData) {
        console.error('displayDetailedProfile called with null profileData');
        const profileContainer = document.getElementById('profile-container');
        if (profileContainer) {
            profileContainer.innerHTML = `<div class="error-message">Failed to display profile details.</div>`;
        }
        return;
    }

    try {
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
        const detailedProfileImageHtml = profileData.profileImage ? 
            `<img src="${profileData.profileImage}" 
                 alt="Profile Picture" 
                 class="profile-image"
                 onerror="this.src='../images/icon-2.png'">` :
            `<div class="profile-image-placeholder">
                 <span class="profile-initials">${(profileData.firstName || '').charAt(0)}${(profileData.lastName || '').charAt(0)}</span>
             </div>`;
        
        profileContainer.innerHTML = `
            <div class="detailed-profile">
                <div class="profile-header">
                    <div class="profile-image-container">
                        ${detailedProfileImageHtml}
                    </div>
                    <div class="profile-info">
                        <h3 class="profile-name">${profileData.firstName} ${profileData.lastName}</h3>
                        <p class="profile-title">${profileData.headline || ''}</p>
                        <p class="profile-location">${profileData.location || ''}</p>
                        <!-- Profile stats removed as requested -->
                    </div>
                </div>
                
                <!-- Editable Contact Information -->
                <div class="profile-section editable-section">
                    <h4 class="section-title">📞 Contact Information (Editable)</h4>
                    <div id="contactFoundSection" class="contact-found-section" style="display: none;">
                        <!-- Contact found section - no duplicate message needed -->
                    </div>
                    <div class="contact-fields">
                        <div class="name-row">
                            <div class="form-group half-width">
                                <label for="firstNameInput">First Name:</label>
                                <input type="text" id="firstNameInput" name="firstName" class="contact-input" placeholder="Select from options below or enter manually" value="${profileData.firstName || ''}">
                                <div id="firstNameOptions" class="contact-options">
                                    <!-- First name buttons will be inserted here -->
                                </div>
                            </div>
                            <div class="form-group half-width">
                                <label for="lastNameInput">Last Name:</label>
                                <input type="text" id="lastNameInput" name="lastName" class="contact-input" placeholder="Select from options below or enter manually" value="${profileData.lastName || ''}">
                                <div id="lastNameOptions" class="contact-options">
                                    <!-- Last name buttons will be inserted here -->
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="phoneInput">Phone:</label>
                            <input type="tel" id="phoneInput" name="phone" class="contact-input" placeholder="Select a phone number from options below" value="">
                            <div id="phoneOptions" class="contact-options">
                                <!-- Phone buttons will be inserted here -->
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="emailInput">Email:</label>
                            <input type="email" id="emailInputProfile" name="email" class="contact-input" placeholder="Select an email address from options below" value="">
                            <div id="emailOptions" class="contact-options">
                                <!-- Email buttons will be inserted here -->
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="linkedinUrlInput">LinkedIn URL:</label>
                            <input type="url" id="linkedinUrlInput" name="linkedinUrl" class="contact-input" placeholder="LinkedIn URL (auto-filled)" value="${profileData.url || ''}" readonly>
                        </div>
                        <div class="form-group">
                            <label for="resumeUpload">Resume Upload:</label>
                            <div class="resume-upload-container">
                                <input type="file" id="resumeUpload" name="resume" accept=".pdf,.doc,.docx" style="display: none;">
                                <div class="file-controls">
                                    <button type="button" class="file-upload-btn" id="resumeUploadBtn">
                                        📄 Choose Resume File
                                    </button>
                                    <button type="button" class="remove-file-btn" id="removeResumeBtn" style="display: none;">
                                        🗑️ Remove File
                                    </button>
                                    <button type="button" class="upload-to-server-btn" id="uploadToServerBtn" style="display: none;">
                                        ☁️ Upload to Server
                                    </button>
                                </div>
                                <div id="resumeFileName" class="file-name" style="display: none;"></div>
                                <div id="resumeUploadStatus" class="upload-status" style="display: none;"></div>
                                <div id="resumePreview" class="resume-preview" style="display: none;">
                                    <p><strong>Selected File:</strong> <span id="selectedFileName"></span></p>
                                    <p><strong>File Size:</strong> <span id="selectedFileSize"></span></p>
                                    <p><strong>Status:</strong> <span id="uploadStatusText">Ready to upload</span></p>
                                </div>
                            </div>
                        </div>
                        <button class="save-contact-btn" id="saveContactBtn" style="margin-top: 20px;">💾 Save Contact Info</button>
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
        
        // Add event listeners for contact form
        setTimeout(() => {
            const saveContactBtn = document.getElementById('saveContactBtn');
            const resumeUploadBtn = document.getElementById('resumeUploadBtn');
            const resumeUpload = document.getElementById('resumeUpload');
            const removeResumeBtn = document.getElementById('removeResumeBtn');
            const uploadToServerBtn = document.getElementById('uploadToServerBtn');
            
            // Save contact button event listener
            if (saveContactBtn) {
                saveContactBtn.addEventListener('click', function() {
                    saveContactInfo();
                });
            }
            
            // Resume file selection event listener
            if (resumeUploadBtn && resumeUpload) {
                resumeUploadBtn.addEventListener('click', function() {
                    resumeUpload.click();
                });
                
                resumeUpload.addEventListener('change', function(e) {
                    handleFileSelection(e.target.files[0]);
                });
            }
            
            // Remove resume file event listener
            if (removeResumeBtn) {
                removeResumeBtn.addEventListener('click', function() {
                    removeSelectedFile();
                });
            }
            
            // Upload to server event listener
            if (uploadToServerBtn) {
                uploadToServerBtn.addEventListener('click', function() {
                    uploadResumeToServer();
                });
            }
            
            // Clear contact form fields for new profiles
            clearContactFields();
            
            // Initialize form fields with profile data (with slight delay to ensure DOM is ready)
            setTimeout(() => {
                initializeFormFields(profileData);
            }, 50);
            
            // Load previously saved contact information
            loadSavedContactInfo();
            
            // Show contact buttons if we have saved contact info with API data
            setTimeout(() => {
                loadAndShowContactButtons();
            }, 200);
        }, 100);
    } catch (error) {
        console.error('Error in displayDetailedProfile:', error);
        const profileContainer = document.getElementById('profile-container');
        if (profileContainer) {
            profileContainer.innerHTML = `<div class="error-message">Failed to display profile details.</div>`;
        }
    }
}

// Function to initialize form fields with profile data
function initializeFormFields(profileData, attempts = 0) {
    console.log('Initializing form fields with profile data (attempt ' + (attempts + 1) + '):', profileData);
    
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const linkedinUrlInput = document.getElementById('linkedinUrlInput');
    
    console.log('Elements found:', {
        firstNameInput: !!firstNameInput,
        lastNameInput: !!lastNameInput,
        linkedinUrlInput: !!linkedinUrlInput
    });
    
    if (firstNameInput && profileData.firstName) {
        firstNameInput.value = profileData.firstName;
        console.log('Set first name to:', profileData.firstName);
    }
    
    if (lastNameInput && profileData.lastName) {
        lastNameInput.value = profileData.lastName;
        console.log('Set last name to:', profileData.lastName);
    }
    
    if (linkedinUrlInput && profileData.url) {
        linkedinUrlInput.value = profileData.url;
        console.log('Set LinkedIn URL to:', profileData.url);
    }
    
    // If elements weren't found and we have more attempts, retry
    if ((!firstNameInput || !lastNameInput || !linkedinUrlInput) && attempts < 3) {
        setTimeout(() => initializeFormFields(profileData, attempts + 1), 200);
    }
}

// Function to clear contact form fields
function clearContactFields() {
    console.log('Clearing contact form fields for new profile');
    
    // First check if there's overlay-extracted data that should be preserved for the current profile
    chrome.storage.local.get(['profileContactInfo'], function(result) {
        const currentProfileId = currentProfileData ? extractLinkedInProfileId(currentProfileData.url) : '';
        const storedProfileId = result.profileContactInfo ? extractLinkedInProfileId(result.profileContactInfo.linkedinUrl) : '';
        
        const hasOverlayDataForCurrentProfile = result.profileContactInfo && 
                                              result.profileContactInfo.extractedFromOverlay &&
                                              storedProfileId === currentProfileId;
        console.log('Has overlay data to preserve for current profile:', hasOverlayDataForCurrentProfile);
        
        const firstNameInput = document.getElementById('firstNameInput');
        const lastNameInput = document.getElementById('lastNameInput');
        const phoneInput = document.getElementById('phoneInput');
        const emailInput = document.getElementById('emailInputProfile');
        const firstNameOptions = document.getElementById('firstNameOptions');
        const lastNameOptions = document.getElementById('lastNameOptions');
        const phoneOptions = document.getElementById('phoneOptions');
        const emailOptions = document.getElementById('emailOptions');
        
        if (firstNameInput) {
            firstNameInput.value = '';
            firstNameInput.style.borderColor = '';
            firstNameInput.style.backgroundColor = '';
        }
        
        if (lastNameInput) {
            lastNameInput.value = '';
            lastNameInput.style.borderColor = '';
            lastNameInput.style.backgroundColor = '';
        }
        
        // Only clear phone and email if they weren't extracted from overlay for current profile
        if (!hasOverlayDataForCurrentProfile) {
            if (phoneInput) {
                phoneInput.value = '';
                phoneInput.style.borderColor = '';
                phoneInput.style.backgroundColor = '';
            }
            
            if (emailInput) {
                emailInput.value = '';
                emailInput.style.borderColor = '';
                emailInput.style.backgroundColor = '';
            }
        } else {
            console.log('Preserving overlay-extracted phone and email data for current profile');
        }
        
        // Clear contact option buttons
        if (firstNameOptions) {
            firstNameOptions.innerHTML = '';
        }
        
        if (lastNameOptions) {
            lastNameOptions.innerHTML = '';
        }
        
        if (phoneOptions) {
            phoneOptions.innerHTML = '';
        }
        
        if (emailOptions) {
            emailOptions.innerHTML = '';
        }
        
        // Reset header status only if no overlay data for current profile
        if (!hasOverlayDataForCurrentProfile) {
            const authStatusHeader = document.getElementById('authStatusHeader');
            if (authStatusHeader) {
                const statusIndicator = authStatusHeader.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.textContent = 'Logged in';
                    statusIndicator.style.background = '';
                    statusIndicator.style.color = '';
                    statusIndicator.style.border = '';
                }
            }
        }
    });
}

// Function to clear contact form fields specifically for new profiles (clears everything)
function clearContactFieldsForNewProfile() {
    console.log('Clearing ALL contact form fields for new profile');
    
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const phoneInput = document.getElementById('phoneInput');
    const emailInput = document.getElementById('emailInputProfile');
    const firstNameOptions = document.getElementById('firstNameOptions');
    const lastNameOptions = document.getElementById('lastNameOptions');
    const phoneOptions = document.getElementById('phoneOptions');
    const emailOptions = document.getElementById('emailOptions');
    
    // Clear all input fields regardless of source
    if (firstNameInput) {
        firstNameInput.value = '';
        firstNameInput.style.borderColor = '';
        firstNameInput.style.backgroundColor = '';
    }
    
    if (lastNameInput) {
        lastNameInput.value = '';
        lastNameInput.style.borderColor = '';
        lastNameInput.style.backgroundColor = '';
    }
    
    if (phoneInput) {
        phoneInput.value = '';
        phoneInput.style.borderColor = '';
        phoneInput.style.backgroundColor = '';
    }
    
    if (emailInput) {
        emailInput.value = '';
        emailInput.style.borderColor = '';
        emailInput.style.backgroundColor = '';
    }
    
    // Clear all contact option buttons
    if (firstNameOptions) {
        firstNameOptions.innerHTML = '';
    }
    
    if (lastNameOptions) {
        lastNameOptions.innerHTML = '';
    }
    
    if (phoneOptions) {
        phoneOptions.innerHTML = '';
    }
    
    if (emailOptions) {
        emailOptions.innerHTML = '';
    }
    
    // Reset header status
    const authStatusHeader = document.getElementById('authStatusHeader');
    if (authStatusHeader) {
        const statusIndicator = authStatusHeader.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.textContent = 'Logged in';
            statusIndicator.style.background = '';
            statusIndicator.style.color = '';
            statusIndicator.style.border = '';
        }
    }
}

// Function to use contact value from buttons
window.useContactValue = function(type, value) {
    if (type === 'firstName') {
        const firstNameInput = document.getElementById('firstNameInput');
        if (firstNameInput) {
            firstNameInput.value = value;
            firstNameInput.style.borderColor = '#28a745';
            firstNameInput.style.backgroundColor = '#f8fff9';
            showStatusMessage('First name added to contact field!', 'success');
        }
    } else if (type === 'lastName') {
        const lastNameInput = document.getElementById('lastNameInput');
        if (lastNameInput) {
            lastNameInput.value = value;
            lastNameInput.style.borderColor = '#28a745';
            lastNameInput.style.backgroundColor = '#f8fff9';
            showStatusMessage('Last name added to contact field!', 'success');
        }
    } else if (type === 'phone') {
        const phoneInput = document.getElementById('phoneInput');
        if (phoneInput) {
            phoneInput.value = value;
            phoneInput.style.borderColor = '#28a745';
            phoneInput.style.backgroundColor = '#f8fff9';
            showStatusMessage('Phone number added to contact field!', 'success');
        }
    } else if (type === 'email') {
        const emailInput = document.getElementById('emailInputProfile');
        if (emailInput) {
            emailInput.value = value;
            emailInput.style.borderColor = '#28a745';
            emailInput.style.backgroundColor = '#f8fff9';
            showStatusMessage('Email address added to contact field!', 'success');
        }
    }
}

// Function to update header status
function updateHeaderStatus(message) {
    const authStatusHeader = document.getElementById('authStatusHeader');
    if (authStatusHeader) {
        const statusIndicator = authStatusHeader.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.textContent = message;
            statusIndicator.style.background = '#d4edda';
            statusIndicator.style.color = '#155724';
            statusIndicator.style.border = '1px solid #c3e6cb';
        }
    }
}

// Global variable to store selected file
let selectedResumeFile = null;
let uploadedResumeUrl = null;

// Function to handle file selection (Step 1: User selects file)
function handleFileSelection(file) {
    console.log('Handling file selection:', file);
    
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
        showResumeUploadStatus('Please select a PDF, DOC, or DOCX file.', 'error');
        clearFileSelection();
        return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showResumeUploadStatus('File size must be less than 5MB.', 'error');
        clearFileSelection();
        return;
    }
    
    // Store the selected file
    selectedResumeFile = file;
    console.log('Selected file:', selectedResumeFile);
    //print binary data of file
    console.log('Selected file binary data:', selectedResumeFile.arrayBuffer ? selectedResumeFile.arrayBuffer() : 'No binary data available');

    
    // Show file preview and controls
    // showFilePreview(file);
   
    showFileControls();
    
    showResumeUploadStatus('File selected successfully. Click "Upload to Server" to upload.', 'info');
}

// Function to show file preview
function showFilePreview(file) {
    const resumePreview = document.getElementById('resumePreview');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    const uploadStatusText = document.getElementById('uploadStatusText');
    
    if (resumePreview && selectedFileName && selectedFileSize && uploadStatusText) {
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatFileSize(file.size);
        uploadStatusText.textContent = 'Ready to upload';
        uploadStatusText.style.color = '#007bff';
        resumePreview.style.display = 'block';
    }
   
}

// Function to show file control buttons
function showFileControls() {
    const removeResumeBtn = document.getElementById('removeResumeBtn');
    const uploadToServerBtn = document.getElementById('uploadToServerBtn');
    
    if (removeResumeBtn) {
        removeResumeBtn.style.display = 'inline-block';
    }
    
    if (uploadToServerBtn) {
        uploadToServerBtn.style.display = 'inline-block';
        uploadToServerBtn.disabled = false;
        uploadToServerBtn.textContent = '☁️ Upload to Server';
    }
}

// Function to remove selected file (Step 3: User can remove file before upload)
function removeSelectedFile() {
    console.log('Removing selected file');
    
    // Clear the file input
    const resumeUpload = document.getElementById('resumeUpload');
    if (resumeUpload) {
        resumeUpload.value = '';
    }
    
    // Clear file selection
    clearFileSelection();
    
    showResumeUploadStatus('File removed successfully.', 'info');
}

// Function to clear file selection and UI
function clearFileSelection() {
    selectedResumeFile = null;
    
    const resumePreview = document.getElementById('resumePreview');
    const removeResumeBtn = document.getElementById('removeResumeBtn');
    const uploadToServerBtn = document.getElementById('uploadToServerBtn');
    
    if (resumePreview) {
        resumePreview.style.display = 'none';
    }
    
    if (removeResumeBtn) {
        removeResumeBtn.style.display = 'none';
    }
    
    if (uploadToServerBtn) {
        uploadToServerBtn.style.display = 'none';
    }
}

// Function to upload resume to server (Step 2: Upload to API)
async function uploadResumeToServer() {
    console.log('Uploading resume to server');
    
    if (!selectedResumeFile) {
        showResumeUploadStatus('No file selected to upload.', 'error');
        return;
    }
    
    if (!currentUserData || !currentUserData.token) {
        showResumeUploadStatus('Please login to upload files.', 'error');
        return;
    }
    
    const uploadToServerBtn = document.getElementById('uploadToServerBtn');
    const uploadStatusText = document.getElementById('uploadStatusText');
    
    try {
        // Show uploading status
        if (uploadToServerBtn) {
            uploadToServerBtn.disabled = true;
            uploadToServerBtn.textContent = '⏳ Uploading...';
        }
        
        if (uploadStatusText) {
            uploadStatusText.textContent = 'Uploading to server...';
            uploadStatusText.style.color = '#ffc107';
        }
        
        showResumeUploadStatus('Uploading resume to server...', 'info');
        
        // Convert File to actual binary data
        console.log('Converting file to binary data...');
        
        try {
            const formData = new FormData();

            // Append the file directly. The browser will handle the rest.
            formData.append('uploaded_file', selectedResumeFile);

            // Determine file type based on MIME type
            let fileType = '2'; // Default to '2' for other document types

            formData.append('file_type', fileType);
            formData.append('co_guid', ''); // Empty string instead of space

            console.log('Final upload payload:', {
                fileName: selectedResumeFile.name,
                mimeType: selectedResumeFile.type,
                fileType: fileType,
                originalFileSize: selectedResumeFile.size,
            });

            // Debug: Log FormData contents
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`${key}:`, {
                        type: 'File',
                        size: value.size,
                        mimeType: value.type,
                        name: value.name
                    });
                } else {
                    console.log(`${key}:`, value);
                }
            }

            // Upload to API with actual binary data
            const result = await uploadResumeToAPI(formData);

        } catch (fileConversionError) {
            console.error('Error preparing file for upload:', fileConversionError);
            throw new Error('Failed to process file for upload: ' + fileConversionError.message);
        }
        
        // Store the uploaded file URL
        if (result && result.url) {
            uploadedResumeUrl = result.url;
        }
        
        // Update UI for successful upload
        if (uploadToServerBtn) {
            uploadToServerBtn.textContent = '✅ Uploaded';
            uploadToServerBtn.style.backgroundColor = '#28a745';
            uploadToServerBtn.style.color = 'white';
        }
        
        if (uploadStatusText) {
            uploadStatusText.textContent = 'Successfully uploaded to server';
            uploadStatusText.style.color = '#28a745';
        }
        
        showResumeUploadStatus('Resume uploaded successfully!', 'success');
        
    } catch (error) {
        console.error('Resume upload failed:', error);
        
        // Reset UI on error
        if (uploadToServerBtn) {
            uploadToServerBtn.disabled = false;
            uploadToServerBtn.textContent = '☁️ Upload to Server';
            uploadToServerBtn.style.backgroundColor = '';
            uploadToServerBtn.style.color = '';
        }
        
        if (uploadStatusText) {
            uploadStatusText.textContent = 'Upload failed';
            uploadStatusText.style.color = '#dc3545';
        }
        
        showResumeUploadStatus('Failed to upload resume. Please try again.', 'error');
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the data:mime/type;base64, prefix
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

// Function to generate GUID
function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Function to upload resume data to API
async function uploadResumeToAPI(formData) {
    console.log('Uploading resume to API with FormData');
    
    if (!currentUserData || !currentUserData.token) {
        throw new Error('User not authenticated');
    }
    
    const apiEndpoint = 'https://uat-hire-oth-v5.unnanu.com/api/v1/account/contact/upload';
    
    console.log('API Request Details:', {
        endpoint: apiEndpoint,
        method: 'POST',
        hasAuthToken: !!currentUserData.token,
        tokenPrefix: currentUserData.token ? currentUserData.token.substring(0, 10) + '...' : 'none'
    });
    
    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUserData.token}`
                // Note: Don't set Content-Type header when using FormData - browser sets it automatically
            },
            body: formData
        });
        
        console.log('API Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = await response.text();
                console.error('API Error Response:', errorDetails);
            } catch (parseError) {
                errorDetails = 'Unable to parse error response';
                console.error('Error parsing API error response:', parseError);
            }
            
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorDetails}`);
        }
        
        const result = await response.json();
        console.log('Resume upload API response:', result);
        
        return result;
        
    } catch (networkError) {
        console.error('Network error during upload:', networkError);
        throw networkError;
    }
}

// Function to show resume upload status
function showResumeUploadStatus(message, type) {
    const statusElement = document.getElementById('resumeUploadStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `upload-status ${type}`;
        statusElement.style.display = 'block';
        
        // Hide status after 5 seconds for success/error messages
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Function to load and show contact buttons from saved contact info
function loadAndShowContactButtons() {
    console.log('Loading and showing contact buttons...');
    
    chrome.storage.local.get(['profileContactInfo'], function(result) {
        if (result.profileContactInfo && result.profileContactInfo.foundViaAPI) {
            const contactInfo = result.profileContactInfo;
            console.log('Found saved contact info with API data:', contactInfo);
            
            // Check if the saved contact info is for the current profile URL
            if (currentProfileData && contactInfo.linkedinUrl !== currentProfileData.url) {
                console.log('Saved contact info is for a different profile, clearing it');
                chrome.storage.local.remove(['profileContactInfo']);
                return;
            }
            
            const contactFoundSection = document.getElementById('contactFoundSection');
            const firstNameOptions = document.getElementById('firstNameOptions');
            const lastNameOptions = document.getElementById('lastNameOptions');
            const phoneOptions = document.getElementById('phoneOptions');
            const emailOptions = document.getElementById('emailOptions');
            
            if (contactFoundSection && firstNameOptions && lastNameOptions && phoneOptions && emailOptions) {
                let hasData = false;
                
                // Create first name buttons for all available first names
                if (contactInfo.allFirstNames && contactInfo.allFirstNames.length > 0) {
                    firstNameOptions.innerHTML = ''; // Clear existing content
                    contactInfo.allFirstNames.forEach((firstName) => {
                        if (firstName.trim()) {
                            const firstNameButton = document.createElement('button');
                            firstNameButton.className = 'contact-option-btn name-option-btn';
                            firstNameButton.innerHTML = `👤 ${firstName.trim()}`;
                            firstNameButton.addEventListener('click', function() {
                                useContactValue('firstName', firstName.trim());
                            });
                            firstNameOptions.appendChild(firstNameButton);
                            hasData = true;
                        }
                    });
                }
                
                // Create last name buttons for all available last names
                if (contactInfo.allLastNames && contactInfo.allLastNames.length > 0) {
                    lastNameOptions.innerHTML = ''; // Clear existing content
                    contactInfo.allLastNames.forEach((lastName) => {
                        if (lastName.trim()) {
                            const lastNameButton = document.createElement('button');
                            lastNameButton.className = 'contact-option-btn name-option-btn';
                            lastNameButton.innerHTML = `👤 ${lastName.trim()}`;
                            lastNameButton.addEventListener('click', function() {
                                useContactValue('lastName', lastName.trim());
                            });
                            lastNameOptions.appendChild(lastNameButton);
                            hasData = true;
                        }
                    });
                }
                
                // Create phone buttons for all available phones
                if (contactInfo.allPhones && contactInfo.allPhones.length > 0) {
                    phoneOptions.innerHTML = ''; // Clear existing content
                    contactInfo.allPhones.forEach((phone) => {
                        if (phone.trim()) {
                            const phoneButton = document.createElement('button');
                            phoneButton.className = 'contact-option-btn phone-option-btn';
                            phoneButton.innerHTML = `📞 ${phone.trim()}`;
                            phoneButton.addEventListener('click', function() {
                                useContactValue('phone', phone.trim());
                            });
                            phoneOptions.appendChild(phoneButton);
                            hasData = true;
                        }
                    });
                }
                
                // Create email buttons for all available emails
                if (contactInfo.allEmails && contactInfo.allEmails.length > 0) {
                    emailOptions.innerHTML = ''; // Clear existing content
                    contactInfo.allEmails.forEach((email) => {
                        if (email.trim()) {
                            const emailButton = document.createElement('button');
                            emailButton.className = 'contact-option-btn email-option-btn';
                            emailButton.innerHTML = `📧 ${email.trim()}`;
                            emailButton.addEventListener('click', function() {
                                useContactValue('email', email.trim());
                            });
                            emailOptions.appendChild(emailButton);
                            hasData = true;
                        }
                    });
                }
                
                // Show the contact found section if we have any data
                if (hasData) {
                    // Update header status - this is the only message we need
                    updateHeaderStatus('✅ Profile Found Successfully');
                    
                    // No need to show the contact found section or duplicate messages
                    // Just let the buttons be visible under their respective fields
                }
            }
        } else {
            console.log('No saved contact info with API data found');
        }
    });
}

// Function to load saved contact information
function loadSavedContactInfo() {
    console.log('Loading saved contact information...');
    
    chrome.storage.local.get(['profileContactInfo'], function(result) {
        console.log('Storage result:', result);
        
        if (result.profileContactInfo) {
            const contactInfo = result.profileContactInfo;
            console.log('Found saved contact info:', contactInfo);
            
            // Use a retry mechanism to ensure DOM elements are available
            const loadWithRetry = (attempts = 0) => {
                console.log(`Attempting to load contact info (attempt ${attempts + 1})`);
                
                const phoneInput = document.getElementById('phoneInput');
                const emailInput = document.getElementById('emailInputProfile');
                const linkedinInput = document.getElementById('linkedinUrlInput');
                
                console.log('Elements found - Phone:', !!phoneInput, 'Email:', !!emailInput, 'LinkedIn:', !!linkedinInput);
                
                // Load LinkedIn URL
                if (linkedinInput && contactInfo.linkedinUrl) {
                    console.log('Loading LinkedIn URL:', contactInfo.linkedinUrl);
                    linkedinInput.value = contactInfo.linkedinUrl;
                }
                
                // Load phone and email if they were extracted from overlay
                if (contactInfo.extractedFromOverlay) {
                    if (phoneInput && contactInfo.phone) {
                        console.log('Loading saved phone from overlay:', contactInfo.phone);
                        phoneInput.value = contactInfo.phone;
                        phoneInput.style.borderColor = '#0073b1';
                        phoneInput.style.backgroundColor = '#f0f8ff';
                    }
                    
                    if (emailInput && contactInfo.email) {
                        console.log('Loading saved email from overlay:', contactInfo.email);
                        emailInput.value = contactInfo.email;
                        emailInput.style.borderColor = '#0073b1';
                        emailInput.style.backgroundColor = '#f0f8ff';
                    }
                }
                
                // If elements weren't found and we have more attempts, retry
                if ((!phoneInput || !emailInput || !linkedinInput) && attempts < 3) {
                    setTimeout(() => loadWithRetry(attempts + 1), 500);
                }
            };
            
            // Start loading with initial delay
            setTimeout(() => loadWithRetry(), 100);
        } else {
            console.log('No saved contact info found');
        }
    });
}

// Function to find contact information via API
async function findContactInfo(profileData, userData) {
    console.log('Finding contact info for profile:', profileData);
    
    if (!profileData || !userData || !userData.token) {
        console.log('Missing profile data or authentication token');
        return null;
    }
    
    try {
        const apiEndpoint = 'https://uat-hire-oth-v5.unnanu.com/api/v1/account/contact/find';
        
        // Use only LinkedIn URL for search
        const searchParams = [];
        
        // Add LinkedIn URL search with normalized format only
        if (profileData.url) {
            // Clean and normalize LinkedIn URL
            const linkedinUrl = profileData.url;
            searchParams.push({
                type: 'linkedin_url',
                value: linkedinUrl
            });
        }
        
        // Try each search parameter
        for (const searchParam of searchParams) {
            try {
                console.log(`Searching contacts by ${searchParam.type}:`, searchParam.value);
                
                const encodedSearchValue = encodeURIComponent(searchParam.value);
                const response = await fetch(`${apiEndpoint}?search=${encodedSearchValue}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${userData.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log(`Contact search failed for ${searchParam.type} (${searchParam.value}): ${response.status}`);
                    
                    // Log response details for debugging
                    if (response.status === 401) {
                        console.error('Authentication failed - token may be expired');
                    } else if (response.status === 404) {
                        console.log('No contact found for this search parameter');
                    }
                    continue;
                }
                
                const result = await response.json();
                console.log(`Contact search result for ${searchParam.type}:`, result);
                
                // Check if we got valid contact information
                if (result && result.Code === 200 && result.Data) {
                    const contactData = result.Data;
                    if (contactData.firstNames || contactData.lastNames || contactData.phones || contactData.emails) {
                        console.log('Found contact via API:', contactData);
                        
                        // Parse comma-separated values and take the first one
                        const phones = contactData.phones ? contactData.phones.split(', ')[0].trim() : '';
                        const emails = contactData.emails ? contactData.emails.split(', ')[0].trim() : '';
                        
                        return {
                            firstName: contactData.firstNames ? contactData.firstNames.split(', ')[0].trim() : '',
                            lastName: contactData.lastNames ? contactData.lastNames.split(', ')[0].trim() : '',
                            phone: phones,
                            email: emails,
                            allFirstNames: contactData.firstNames ? contactData.firstNames.split(', ') : [],
                            allLastNames: contactData.lastNames ? contactData.lastNames.split(', ') : [],
                            allPhones: contactData.phones ? contactData.phones.split(', ') : [],
                            allEmails: contactData.emails ? contactData.emails.split(', ') : [],
                            searchMethod: searchParam.type
                        };
                    }
                } else if (result && (result.firstName || result.lastName || result.Phone || result.Email)) {
                    // Handle direct result format (legacy support)
                    console.log('Found contact via API (legacy format):', result);
                    return {
                        firstName: result.firstName,
                        lastName: result.lastName,
                        phone: result.Phone || result.phone,
                        email: result.Email || result.email,
                        searchMethod: searchParam.type
                    };
                }
            } catch (error) {
                console.error(`Contact API request failed for ${searchParam.type} (${searchParam.value}):`, error);
                continue; // Try the next search parameter
            }
        }
        
        console.log('No contact information found via API after trying all search methods');
        return null;
    } catch (error) {
        console.error('An unexpected error occurred in findContactInfo:', error);
        return null;
    }
}

// Helper function to extract LinkedIn profile ID from URL
function extractLinkedInProfileId(url) {
    if (!url) return '';
    
    try {
        // Handle different LinkedIn URL formats
        // Standard: https://www.linkedin.com/in/profile-id/
        // Overlay: https://www.linkedin.com/in/profile-id/overlay/contact-info/
        // Detail: https://www.linkedin.com/in/profile-id/detail/contact-info/
        
        const match = url.match(/\/in\/([^\/\?]+)/);
        if (match && match[1]) {
            return match[1].toLowerCase(); // Return profile ID in lowercase for consistency
        }
        
        return '';
    } catch (error) {
        console.error('Error extracting LinkedIn profile ID:', error);
        return '';
    }
}

// Helper function to normalize LinkedIn URLs
function normalizeLinkedInUrl(url) {
    if (!url) return '';
    
    // Remove trailing slashes and query parameters
    let cleanUrl = url.trim().replace(/\/$/, '').split('?')[0];
    
    // Ensure it starts with https://
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    
    // Convert to standard LinkedIn format
    if (cleanUrl.includes('linkedin.com/in/')) {
        return cleanUrl;
    } else if (cleanUrl.includes('linkedin.com/pub/')) {
        // Convert old pub format to new in format if needed
        return cleanUrl.replace('/pub/', '/in/');
    }
    
    return cleanUrl;
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
    const firstName = document.getElementById('firstNameInput')?.value;
    const lastName = document.getElementById('lastNameInput')?.value;
    const phone = document.getElementById('phoneInput')?.value;
    const email = document.getElementById('emailInputProfile')?.value;
    const linkedinUrl = document.getElementById('linkedinUrlInput')?.value;

    const contactInfo = {
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        email: email,
        linkedinUrl: linkedinUrl,
        savedAt: new Date().toISOString()
    };

    // Store in chrome storage
    chrome.storage.local.set({
        'profileContactInfo': contactInfo
    }, function() {
        console.log('Contact information saved:', contactInfo);
        showStatusMessage('Contact information saved successfully!', 'success');

        // Send this data to the API
        if (currentUserData && currentUserData.token) {
            sendContactInfoToAPI(contactInfo);
        }
    });
}

async function sendContactInfoToAPI(contactInfo) {
    console.log('Sending contact info to API:', contactInfo);

    // Create JSON payload with all required fields
    const payload = {
        contactId: 0, // 0 for new contact
        firstName: contactInfo.firstName || currentProfileData.firstName || '',
        lastName: contactInfo.lastName || currentProfileData.lastName || '',
        title: currentProfileData.headline || '',
        skills: currentProfileData.skills ? currentProfileData.skills.join(', ') : '',
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        available: true, // Default to available
        location: currentProfileData.location || '',
        relocation: false, // Default to false
        unnanuId: currentUserData.id || 0,
        imageUrl: currentProfileData.profileImage || '',
        resumeUrl: uploadedResumeUrl || '', // Include uploaded resume URL
        salary: '', // Default empty
        source: 'linkedin-plugin', // Set source as linkedin-plugin
        jobtype: '', // Default empty
        notes: '', // Default empty
        canDetails: '' // Default empty - could include profile JSON if needed
    };

    const apiEndpoint = crmAPI + '/api/v1/account/contact/add';

    try {
        console.log('Sending request to API:', apiEndpoint, payload);
        // Show loading state
        showLoadingState();
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserData.token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API response:', result);
        showStatusMessage('Contact information sent to API successfully!', 'success');
    } catch (error) {
        console.error('API request failed:', error);
        showStatusMessage('Failed to send contact information to API.', 'error');
    }
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

// Handle contact info extracted from LinkedIn overlay
function handleOverlayContactInfo(contactInfo) {
    console.log('Handling overlay contact info:', contactInfo);
    
    const phoneInput = document.getElementById('phoneInput');
    const emailInput = document.getElementById('emailInputProfile');
    
    let fieldsUpdated = false;
    
    // Auto-fill phone number directly (take the first one if multiple)
    if (contactInfo.phones && contactInfo.phones.length > 0 && phoneInput) {
        phoneInput.value = contactInfo.phones[0];
        phoneInput.style.borderColor = '#0073b1';
        phoneInput.style.backgroundColor = '#f0f8ff';
        console.log('Auto-filled phone:', contactInfo.phones[0]);
        fieldsUpdated = true;
    }
    
    // Auto-fill email directly (take the first one if multiple)
    if (contactInfo.emails && contactInfo.emails.length > 0 && emailInput) {
        emailInput.value = contactInfo.emails[0];
        emailInput.style.borderColor = '#0073b1';
        emailInput.style.backgroundColor = '#f0f8ff';
        console.log('Auto-filled email:', contactInfo.emails[0]);
        fieldsUpdated = true;
    }
    
    // Show success message if any fields were updated
    if (fieldsUpdated) {
        updateHeaderStatus('✅ LinkedIn Contact Info Filled!');
        showStatusMessage('Contact information filled from LinkedIn overlay!', 'success');
        
        // Save the extracted contact info to storage for persistence
        const contactInfoToSave = {
            phone: contactInfo.phones[0] || '',
            email: contactInfo.emails[0] || '',
            firstName: currentProfileData?.firstName || '',
            lastName: currentProfileData?.lastName || '',
            linkedinUrl: currentProfileData?.url || '',
            savedAt: new Date().toISOString(),
            extractedFromOverlay: true
        };
        
        chrome.storage.local.set({ 'profileContactInfo': contactInfoToSave }, () => {
            console.log('LinkedIn overlay contact info saved to storage');
        });
    }
}

console.log('Sidebar script loaded');
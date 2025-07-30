console.log("Unnanu LinkedIn Extension loaded!");

// Block extension detection attempts from websites
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.startsWith('chrome-extension://')) {
            // Block fetch requests to chrome-extension:// URLs from page scripts
            return Promise.reject(new Error('Extension access blocked'));
        }
        return originalFetch.apply(this, args);
    };
})();

// Check if we're on a LinkedIn page
function isLinkedInPage() {
    return window.location.href.includes('linkedin.com');
}

// Create floating Unnanu icon only on LinkedIn pages
let icon = null;
if (isLinkedInPage()) {
    icon = document.createElement('div');
    icon.id = 'unnanu-icon';
    icon.innerHTML = `<img src="${chrome.runtime.getURL('images/unnanu-white-logo.avif')}" alt="Unnanu" style="width: 40px; height: 40px; object-fit: contain;">`;
    icon.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        width: 60px;
        height: 60px;
        background: white;
        color: white;
        border-radius: 50%;
        cursor: pointer;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 20px;
        transform: translateY(-50%);
        box-shadow: 0 4px 12px rgba(0, 115, 177, 0.3);
        border: 3px solid #0073b1;
        transition: all 0.3s ease;
    `;

    // Add hover effect
    icon.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-50%) scale(1.1)';
        this.style.boxShadow = '0 6px 20px rgba(0, 115, 177, 0.4)';
        this.style.borderColor = '#005885';
    });

    icon.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(-50%) scale(1)';
        this.style.boxShadow = '0 4px 12px rgba(0, 115, 177, 0.3)';
        this.style.borderColor = '#0073b1';
    });
}

// Track sidebar state
let sidebarOpen = false;
let isAuthenticated = false;
let currentUrl = window.location.href;
let lastProfileData = null;

// Add click functionality to toggle sidebar (only if icon exists)
if (icon) {
    icon.addEventListener('click', function() {
        console.log("Unnanu icon clicked!");
        toggleSidebar();
    });
}

function toggleSidebar() {
    if (sidebarOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function extractLinkedInProfile() {
    console.log("Extracting LinkedIn profile data...");
    
    // Check if we're on a LinkedIn profile page
    if (!window.location.href.includes('linkedin.com/in/')) {
        return {
            isLinkedInProfile: false,
            message: "Not on a LinkedIn profile page"
        };
    }
    
    try {
        // Extract profile image with more specific and validated selectors
        let profileImage = '';
        
        // First, try to get the main profile image from the profile header
        const profileImageSelectors = [
            // Most specific selectors for the main profile image
            '.pv-top-card-profile-picture__image--show img',
            'img.pv-top-card-profile-picture__image',
            '.pv-top-card__photo img',
            '.pv-top-card-profile-picture img',
            'button.pv-top-card-profile-picture img'
        ];
        
        for (const selector of profileImageSelectors) {
            const imgElement = document.querySelector(selector);
            if (imgElement && imgElement.src && isValidProfileImage(imgElement.src)) {
                profileImage = imgElement.src;
                console.log('Found valid profile image:', profileImage);
                break;
            }
        }
        
        // If no image found with specific selectors, look for images with profile-related alt text
        if (!profileImage) {
            const altTextImages = document.querySelectorAll('img[alt*="profile photo"], img[alt*="profile picture"]');
            for (const imgElement of altTextImages) {
                if (imgElement.src && isValidProfileImage(imgElement.src) && isInProfileSection(imgElement)) {
                    profileImage = imgElement.src;
                    console.log('Found profile image via alt text:', profileImage);
                    break;
                }
            }
        }
        
        console.log('Final profile image result:', profileImage || 'No valid profile image found');

        // Extract name with more selectors
        const nameSelectors = [
            'h1.text-heading-xlarge',
            '.pv-text-details__left-panel h1',
            '.ph5 h1',
            'h1.top-card-layout__title',
            'h1[data-anonymize="person-name"]',
            '.text-heading-xlarge',
            '.pv-top-card h1',
            'h1.break-words'
        ];
        
        let fullName = '';
        for (const selector of nameSelectors) {
            const nameElement = document.querySelector(selector);
            if (nameElement && nameElement.textContent.trim()) {
                fullName = nameElement.textContent.trim();
                console.log('Found name:', fullName);
                break;
            }
        }

        // Extract headline/title with more selectors
        const headlineSelectors = [
            '.text-body-medium.break-words',
            '.pv-text-details__left-panel .text-body-medium',
            '.top-card-layout__headline',
            'div[data-anonymize="headline"]',
            '.pv-text-details__left-panel div.text-body-medium',
            '.pv-top-card .text-body-medium',
            '.pv-top-card--list + div .text-body-medium'
        ];
        
        let headline = '';
        for (const selector of headlineSelectors) {
            const headlineElement = document.querySelector(selector);
            if (headlineElement && headlineElement.textContent.trim()) {
                headline = headlineElement.textContent.trim();
                console.log('Found headline:', headline);
                break;
            }
        }

        // Extract location with more selectors
        const locationSelectors = [
            '.text-body-small.inline.t-black--light.break-words',
            '.pv-text-details__left-panel .text-body-small',
            '.top-card-layout__first-subline',
            'span[data-anonymize="location"]',
            '.pv-text-details__left-panel .text-body-small',
            '.pv-top-card .text-body-small'
        ];
        
        let location = '';
        for (const selector of locationSelectors) {
            const locationElement = document.querySelector(selector);
            if (locationElement && locationElement.textContent.trim() && !locationElement.textContent.includes('connection') && !locationElement.textContent.includes('follower')) {
                location = locationElement.textContent.trim();
                console.log('Found location:', location);
                break;
            }
        }

        // Enhanced followers and connections extraction
        let connections = '';
        let followers = '';
        
        // Look for the "About" or profile section links/stats
        const statsElements = document.querySelectorAll('a[href*="/in/"], span, .pv-top-card--list span, .pv-top-card--list-bullet span');
        console.log('Checking', statsElements.length, 'elements for connections/followers');
        
        for (const element of statsElements) {
            const text = element.textContent.trim().toLowerCase();
            console.log('Checking element text:', text);
            
            if (text.includes('connection') && !connections) {
                connections = element.textContent.trim();
                console.log('Found connections:', connections);
            }
            
            if (text.includes('follower') && !followers) {
                followers = element.textContent.trim();
                console.log('Found followers:', followers);
            }
        }

        // Alternative approach: look for network info in different sections
        if (!followers || !connections) {
            const networkElements = document.querySelectorAll('[data-field="network_info"] span, .pv-top-card--list span, .pv-top-card__connections span');
            for (const element of networkElements) {
                const text = element.textContent.trim();
                console.log('Network element text:', text);
                
                if (text.toLowerCase().includes('connection') && !connections) {
                    connections = text;
                }
                if (text.toLowerCase().includes('follower') && !followers) {
                    followers = text;
                }
            }
        }

        // Extract Experience with LinkedIn's new structure
        let experience = [];
        
        // Find the experience section using the structure you provided
        const experienceSection = document.querySelector('#experience')?.parentElement;
        
        if (experienceSection) {
            console.log('Found experience section');
            
            // Look for experience items using the new LinkedIn structure
            const experienceItems = experienceSection.querySelectorAll('li.artdeco-list__item');
            console.log('Found', experienceItems.length, 'experience items');
            
            for (let i = 0; i < Math.min(experienceItems.length, 5); i++) {
                const item = experienceItems[i];
                
                // Extract job title - look for the bold text with job title
                const titleElement = item.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
                const title = titleElement ? titleElement.textContent.trim() : '';
                
                // Extract company name - look for the company info
                const companyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                let company = '';
                if (companyElement) {
                    const companyText = companyElement.textContent.trim();
                    // Remove job type info (like "· Full-time", "· Contract")
                    company = companyText.split('·')[0].trim();
                }
                
                // Extract duration - look for the time period
                const durationElement = item.querySelector('.t-14.t-normal.t-black--light .pvs-entity__caption-wrapper span[aria-hidden="true"]');
                const duration = durationElement ? durationElement.textContent.trim() : '';
                
                if (title && company) {
                    experience.push({ title, company, duration });
                    console.log('Added experience:', { title, company, duration });
                }
            }
        } else {
            console.log('Experience section not found');
        }

        // Extract Education with LinkedIn's new structure
        let education = [];
        
        // Find the education section
        const educationSection = document.querySelector('#education')?.parentElement;
        
        if (educationSection) {
            console.log('Found education section');
            
            // Look for education items
            const educationItems = educationSection.querySelectorAll('li.artdeco-list__item');
            console.log('Found', educationItems.length, 'education items');
            
            for (let i = 0; i < Math.min(educationItems.length, 5); i++) {
                const item = educationItems[i];
                
                // Extract school name
                const schoolElement = item.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
                const school = schoolElement ? schoolElement.textContent.trim() : '';
                
                // Extract degree
                const degreeElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                const degree = degreeElement ? degreeElement.textContent.trim() : '';
                
                // Extract years
                const yearElement = item.querySelector('.t-14.t-normal.t-black--light .pvs-entity__caption-wrapper span[aria-hidden="true"]');
                const years = yearElement ? yearElement.textContent.trim() : '';
                
                if (school || degree) {
                    education.push({ school, degree, years });
                    console.log('Added education:', { school, degree, years });
                }
            }
        } else {
            console.log('Education section not found');
        }

        // Extract Certificates/Certifications with LinkedIn's new structure
        let certifications = [];
        
        // Find the certifications section
        const certificationsSection = document.querySelector('#licenses_and_certifications')?.parentElement ||
                                     document.querySelector('#certifications')?.parentElement ||
                                     document.querySelector('[data-section="certifications"]');
        
        if (certificationsSection) {
            console.log('Found certifications section');
            
            // Look for certification items
            const certificationItems = certificationsSection.querySelectorAll('li.artdeco-list__item');
            console.log('Found', certificationItems.length, 'certification items');
            
            for (let i = 0; i < Math.min(certificationItems.length, 10); i++) {
                const item = certificationItems[i];
                
                // Extract certification name
                const nameElement = item.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]') ||
                                  item.querySelector('.t-16.t-bold span[aria-hidden="true"]');
                const name = nameElement ? nameElement.textContent.trim() : '';
                
                // Extract issuing organization
                const orgElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                const organization = orgElement ? orgElement.textContent.trim().split('·')[0].trim() : '';
                
                // Extract issue date and expiry
                const dateElement = item.querySelector('.t-14.t-normal.t-black--light .pvs-entity__caption-wrapper span[aria-hidden="true"]');
                const dateInfo = dateElement ? dateElement.textContent.trim() : '';
                
                if (name || organization) {
                    certifications.push({ name, organization, dateInfo });
                    console.log('Added certification:', { name, organization, dateInfo });
                }
            }
        } else {
            console.log('Certifications section not found');
        }

        // Extract Skills
        let skills = [];
        const skillsSection = document.querySelector('#skills')?.parentElement;
        
        if (skillsSection) {
            console.log('Found skills section');
            const skillItems = skillsSection.querySelectorAll('span[aria-hidden="true"]');
            
            for (const skillItem of skillItems) {
                const skillText = skillItem.textContent.trim();
                if (skillText && skillText.length > 2 && skillText.length < 50 && 
                    !skillText.includes('Show') && !skillText.includes('endorsement') && 
                    !skillText.includes('Add skill')) {
                    skills.push(skillText);
                    if (skills.length >= 20) break; // Limit to top 20 skills
                }
            }
            console.log('Found skills:', skills);
        }

        // Extract Languages
        let languages = [];
        const languagesSection = document.querySelector('#languages')?.parentElement;
        
        if (languagesSection) {
            console.log('Found languages section');
            const languageItems = languagesSection.querySelectorAll('li.artdeco-list__item');
            
            for (let i = 0; i < Math.min(languageItems.length, 10); i++) {
                const item = languageItems[i];
                const langElement = item.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
                const proficiencyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                
                const language = langElement ? langElement.textContent.trim() : '';
                const proficiency = proficiencyElement ? proficiencyElement.textContent.trim() : '';
                
                if (language) {
                    languages.push({ language, proficiency });
                    console.log('Added language:', { language, proficiency });
                }
            }
        }

        const result = {
            isLinkedInProfile: true,
            fullName: fullName,
            headline: headline,
            location: location,
            profileImage: profileImage,
            connections: connections,
            followers: followers,
            experience: experience,
            education: education,
            certifications: certifications,
            skills: skills,
            languages: languages,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        console.log('=== FINAL EXTRACTED PROFILE DATA ===');
        console.log('Name:', fullName);
        console.log('Headline:', headline);
        console.log('Location:', location);
        console.log('Connections:', connections);
        console.log('Followers:', followers);
        console.log('Experience count:', experience.length);
        console.log('Education count:', education.length);
        console.log('===================================');
        
        return result;
        
    } catch (error) {
        console.error('Error extracting profile data:', error);
        return {
            isLinkedInProfile: false,
            error: error.message
        };
    }
}

// Helper function to validate if an image URL is a real profile image
function isValidProfileImage(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return false;
    }
    
    // Check if it's a data URL (inline image) - these are usually not profile images
    if (imageUrl.startsWith('data:')) {
        return false;
    }
    
    // Check for common LinkedIn default/placeholder image patterns
    const invalidPatterns = [
        '/static/images/',
        '/common/images/',
        'default-profile',
        'ghost-person',
        'linkedin-icon',
        'company-logo',
        'generic-profile',
        'blank-profile',
        'anonymous',
        'default_',
        '_default',
        'placeholder'
    ];
    
    const lowerUrl = imageUrl.toLowerCase();
    for (const pattern of invalidPatterns) {
        if (lowerUrl.includes(pattern)) {
            console.log('Rejected image (invalid pattern):', imageUrl);
            return false;
        }
    }
    
    // Must contain LinkedIn media patterns for actual profile photos
    const validPatterns = [
        'media.licdn.com',
        'media-exp',
        '/profile-displayphoto-shrink',
        '/profile-displayphoto',
        'linkedin.com/dms/image'
    ];
    
    for (const pattern of validPatterns) {
        if (lowerUrl.includes(pattern)) {
            console.log('Accepted image (valid pattern):', imageUrl);
            return true;
        }
    }
    
    // If no valid patterns found, it's likely not a real profile image
    console.log('Rejected image (no valid patterns):', imageUrl);
    return false;
}

// Helper function to check if an image element is in the profile section
function isInProfileSection(imgElement) {
    if (!imgElement) return false;
    
    // Check if the image is within the main profile section
    const profileSections = [
        '.pv-top-card',
        '.profile-photo-edit',
        '.pv-profile-sticky-header',
        '.ph5.pb5',
        '.artdeco-card.pv-profile-sticky-header'
    ];
    
    for (const sectionSelector of profileSections) {
        const section = document.querySelector(sectionSelector);
        if (section && section.contains(imgElement)) {
            console.log('Image found in profile section:', sectionSelector);
            return true;
        }
    }
    
    // Check if it's close to the profile name
    const nameElements = document.querySelectorAll('h1.text-heading-xlarge, .pv-text-details__left-panel h1');
    for (const nameElement of nameElements) {
        const rect1 = imgElement.getBoundingClientRect();
        const rect2 = nameElement.getBoundingClientRect();
        
        // If image is within reasonable distance from name (same general area)
        const distance = Math.sqrt(
            Math.pow(rect1.x - rect2.x, 2) + Math.pow(rect1.y - rect2.y, 2)
        );
        
        if (distance < 300) { // Within 300px
            console.log('Image found near profile name');
            return true;
        }
    }
    
    console.log('Image not found in profile section');
    return false;
}

// Helper function to extract email from profile if visible
function extractEmailFromProfile() {
    try {
        // Some LinkedIn profiles may show email in contact info section
        const emailSelectors = [
            'a[href^="mailto:"]',
            '.pv-contact-info-section a[href^="mailto:"]',
            '.ci-email a[href^="mailto:"]'
        ];
        
        for (const selector of emailSelectors) {
            const emailElement = document.querySelector(selector);
            if (emailElement) {
                const email = emailElement.href.replace('mailto:', '');
                console.log('Found email in profile:', email);
                return email;
            }
        }
        
        return '';
    } catch (error) {
        console.error('Error extracting email from profile:', error);
        return '';
    }
}

function openSidebar() {
    console.log("Opening sidebar...");
    
    // Remove existing sidebar if any
    const existing = document.getElementById('unnanu-sidebar');
    if (existing) existing.remove();
    
    // Hide the floating icon when sidebar opens
    if (icon) {
        icon.style.display = 'none';
    }
    
    // Extract profile data
    const profileData = extractLinkedInProfile();
    
    // Create iframe for sidebar
    const iframe = document.createElement('iframe');
    iframe.id = 'unnanu-sidebar-iframe';
    iframe.src = chrome.runtime.getURL('ui/sidebar.html');
    iframe.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        border: none;
        border-left: 2px solid #0073b1;
        box-shadow: -5px 0 15px rgba(0,0,0,0.2);
        z-index: 99998;
        background: white;
    `;
    
    // Wait for iframe to load, then check authentication status
    iframe.onload = function() {
        console.log('Sidebar iframe loaded');
        
        // Don't send profile data immediately - let sidebar handle authentication first
        // The sidebar will request profile data after authentication is confirmed
    };
    
    document.body.appendChild(iframe);
    sidebarOpen = true;
    console.log("Sidebar opened!");
}

function closeSidebar() {
    console.log("Closing sidebar...");
    const iframe = document.getElementById('unnanu-sidebar-iframe');
    if (iframe) {
        iframe.remove();
        sidebarOpen = false;
        
        // Always show the floating icon again when sidebar closes
        if (icon) {
            icon.style.display = 'flex';
        }
        
        console.log("Sidebar closed!");
    }
}

// Listen for messages from sidebar iframe
window.addEventListener('message', function(event) {
    if (event.source === document.getElementById('unnanu-sidebar-iframe')?.contentWindow) {
        console.log('Content script received message from sidebar:', event.data);
        
        switch(event.data.action) {
            case 'closeSidebar':
                closeSidebar();
                break;
            case 'extractProfile':
                handleProfileExtraction(event.data.userData, event.data.autoExtract || false);
                break;
            case 'requestProfileData':
                // Only send profile data when requested by authenticated sidebar
                sendProfileDataToSidebar();
                break;
            case 'authStatus':
                // Handle authentication status updates from sidebar
                handleAuthStatusUpdate(event.data);
                break;
        }
    }
});

// Handle authentication status updates
function handleAuthStatusUpdate(data) {
    console.log('Authentication status updated:', data);
    isAuthenticated = data.isAuthenticated;
    
    // Icon visibility is controlled by sidebar state, not auth status
    // Icon is always shown when sidebar is closed, regardless of auth status
    if (icon && !sidebarOpen) {
        icon.style.display = 'flex';
    }
}

function sendProfileDataToSidebar() {
    console.log('Sending profile data to sidebar');
    const iframe = document.getElementById('unnanu-sidebar-iframe');
    if (!iframe) return;
    
    const profileData = extractLinkedInProfile();
    
    // Check if this is a different profile than the last one extracted
    const profileHash = profileData.url + (profileData.fullName || '');
    const lastProfileHash = lastProfileData ? (lastProfileData.url + (lastProfileData.fullName || '')) : '';
    
    if (profileHash !== lastProfileHash) {
        console.log('New profile detected, checking cached contact info');
        // Only clear cached contact info if it wasn't extracted from overlay
        chrome.storage.local.get(['profileContactInfo'], function(result) {
            if (result.profileContactInfo && !result.profileContactInfo.extractedFromOverlay) {
                console.log('Clearing non-overlay contact info for new profile');
                chrome.storage.local.remove(['profileContactInfo']);
            } else if (result.profileContactInfo && result.profileContactInfo.extractedFromOverlay) {
                console.log('Preserving overlay-extracted contact info for profile change');
            }
        });
        lastProfileData = profileData;
    }
    
    iframe.contentWindow.postMessage({
        action: 'updateProfile',
        profileData: {
            firstName: profileData.fullName ? profileData.fullName.split(' ')[0] : '',
            lastName: profileData.fullName ? profileData.fullName.split(' ').slice(1).join(' ') : '',
            headline: profileData.headline || '',
            location: profileData.location || '',
            profileImage: profileData.profileImage || '',
            connections: profileData.connections || '',
            followers: profileData.followers || '',
            experience: profileData.experience || [],
            education: profileData.education || [],
            certifications: profileData.certifications || [],
            skills: profileData.skills || [],
            languages: profileData.languages || [],
            url: profileData.url,
            timestamp: profileData.timestamp,
            // Add extracted email from profile if available (some profiles show this)
            profileEmail: extractEmailFromProfile() || ''
        }
    }, '*');
}

function handleProfileExtraction(userData, isAutoExtract = false) {
    console.log('Handling profile extraction with user data:', userData, 'Auto:', isAutoExtract);
    
    const profileData = extractLinkedInProfile();
    const iframe = document.getElementById('unnanu-sidebar-iframe');
    
    if (!iframe) return;
    
    // For auto-extraction by authenticated users, skip API call and just show data
    if (isAutoExtract) {
        console.log('Auto-extracting for authenticated user - showing data directly');
        
        // Send success message immediately with the profile data
        iframe.contentWindow.postMessage({
            action: 'extractionSuccess',
            data: profileData,
            autoExtract: true
        }, '*');
        
        return;
    }
    
    // For manual extraction, proceed with API call
    // Send extraction started message
    iframe.contentWindow.postMessage({
        action: 'extractionStarted'
    }, '*');
    
    // Send data to Unnanu API
    sendProfileDataToAPI(profileData, userData)
        .then(response => {
            console.log('Profile sent successfully:', response);
            
            // Send success message
            iframe.contentWindow.postMessage({
                action: 'extractionSuccess',
                data: response,
                autoExtract: false
            }, '*');
            
            // Add profile to sent list
            addProfileToSentList(profileData.url);
        })
        .catch(error => {
            console.error('Failed to send profile:', error);
            
            // Send error message
            iframe.contentWindow.postMessage({
                action: 'extractionError',
                message: 'Failed to extract profile. Please try again.'
            }, '*');
        });
}

// Add the icon to the page (only if on LinkedIn and icon was created)
if (icon) {
    document.body.appendChild(icon);
    console.log("Unnanu floating icon added!");
    
    // Check authentication status on page load to determine icon visibility
    checkInitialAuthStatus();
    
    // Set up URL change detection for dynamic profile updates
    setupUrlChangeDetection();
    
    // Set up contact info overlay detection
    setupContactInfoOverlayDetection();
} else {
    console.log("Not on LinkedIn page, icon not created");
}

// Set up URL change detection for LinkedIn SPA navigation
function setupUrlChangeDetection() {
    console.log('Setting up URL change detection');
    
    // Override pushState and replaceState to detect navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        handleUrlChange();
    };
    
    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        handleUrlChange();
    };
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    // Also check periodically in case LinkedIn uses other navigation methods
    setInterval(checkForUrlChange, 1000);
}

// Handle URL changes
function handleUrlChange() {
    const newUrl = window.location.href;
    
    if (newUrl !== currentUrl) {
        console.log('URL changed from', currentUrl, 'to', newUrl);
        currentUrl = newUrl;
        
        // If sidebar is open and user is authenticated, update profile data
        if (sidebarOpen && isAuthenticated && newUrl.includes('linkedin.com/in/')) {
            console.log('Profile URL changed, updating sidebar with new profile data');
            
            // Small delay to allow LinkedIn to load the new profile content
            setTimeout(() => {
                sendProfileDataToSidebar();
            }, 1500);
        }
    }
}

// Periodic check for URL changes (fallback method)
function checkForUrlChange() {
    const newUrl = window.location.href;
    
    if (newUrl !== currentUrl) {
        handleUrlChange();
    }
}

// Check initial authentication status to determine icon visibility
function checkInitialAuthStatus() {
    getUnnanuData(function(userData) {
        isAuthenticated = !!(userData && userData.token);
        console.log('Initial auth status:', isAuthenticated);
        
        // Always show icon by default - it will be hidden only when sidebar is open
        if (icon) {
            icon.style.display = 'flex';
            console.log('Icon should be visible');
        }
    });
}

// Authentication and API functions
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
                type: result.unnanu_type
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

async function sendProfileDataToAPI(profileData, userData) {
    const apiEndpoint = 'https://plugin.unnanu.com/api/v1/profiles/extract';
    
    // Prepare data in the format expected by Unnanu API
    const dataToSend = {
        firstName: profileData.fullName ? profileData.fullName.split(' ')[0] : '',
        lastName: profileData.fullName ? profileData.fullName.split(' ').slice(1).join(' ') : '',
        headline: profileData.headline || '',
        location: profileData.location || '',
        profileImage: profileData.profileImage || '',
        connections: profileData.connections || '',
        followers: profileData.followers || '',
        experience: profileData.experience || [],
        education: profileData.education || [],
        url: profileData.url,
        extractedAt: profileData.timestamp,
        userId: userData.id
    };
    
    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            },
            body: JSON.stringify(dataToSend)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Listen for messages from background script (extension icon clicks)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received from extension icon:', request);
    
    if (request.action === 'toggleSidebar') {
        toggleSidebar();
        sendResponse({ success: true });
    }
    
    return true;
});

// Set up contact info overlay detection
function setupContactInfoOverlayDetection() {
    console.log('Setting up contact info overlay detection');
    
    // Use MutationObserver to detect when contact info overlay appears
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the added node contains the contact info modal
                    const contactModal = node.querySelector?.('.artdeco-modal__content') || 
                                       (node.classList?.contains('artdeco-modal__content') ? node : null);
                    
                    if (contactModal && contactModal.textContent.includes('Contact Info')) {
                        console.log('Contact info overlay detected');
                        setTimeout(() => extractContactInfoFromOverlay(contactModal), 500);
                    }
                }
            });
        });
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Extract contact information from LinkedIn contact info overlay
function extractContactInfoFromOverlay(modalElement) {
    console.log('Extracting contact info from overlay');
    
    const contactInfo = {
        phones: [],
        emails: []
    };
    
    try {
        // Extract phone numbers - using more robust selectors
        const phoneSections = modalElement.querySelectorAll('section');
        for (const section of phoneSections) {
            if (section.innerHTML.includes('phone-handset-medium') || 
                section.innerHTML.includes('Phone')) {
                const phoneElements = section.querySelectorAll('span.t-14.t-black.t-normal');
                phoneElements.forEach(phoneEl => {
                    const phone = phoneEl.textContent.trim();
                    // Check if it looks like a phone number (contains digits and is reasonable length)
                    if (phone && /\d{3,}/.test(phone) && phone.length > 5 && phone.length < 20) {
                        contactInfo.phones.push(phone);
                        console.log('Found phone:', phone);
                    }
                });
            }
        }
        
        // Extract email addresses - using more robust selectors
        const emailSections = modalElement.querySelectorAll('section');
        for (const section of emailSections) {
            if (section.innerHTML.includes('envelope-medium') || 
                section.innerHTML.includes('Email')) {
                const emailLinks = section.querySelectorAll('a[href^="mailto:"]');
                emailLinks.forEach(emailLink => {
                    const email = emailLink.textContent.trim();
                    if (email && email.includes('@') && email.includes('.')) {
                        contactInfo.emails.push(email);
                        console.log('Found email:', email);
                    }
                });
                
                // Also look for email text that might not be in mailto links
                const emailTexts = section.querySelectorAll('a, span, div');
                emailTexts.forEach(emailEl => {
                    const emailText = emailEl.textContent.trim();
                    if (emailText && emailText.includes('@') && emailText.includes('.') && 
                        emailText.length < 50 && !contactInfo.emails.includes(emailText)) {
                        contactInfo.emails.push(emailText);
                        console.log('Found email text:', emailText);
                    }
                });
            }
        }
        
        // Send extracted contact info to sidebar if it's open
        if (sidebarOpen) {
            sendContactInfoToSidebar(contactInfo);
        }
        
        console.log('Extracted contact info:', contactInfo);
        return contactInfo;
        
    } catch (error) {
        console.error('Error extracting contact info from overlay:', error);
        return contactInfo;
    }
}

// Send extracted contact info to sidebar
function sendContactInfoToSidebar(contactInfo) {
    console.log('Sending contact info from overlay to sidebar');
    const iframe = document.getElementById('unnanu-sidebar-iframe');
    if (!iframe) return;
    
    iframe.contentWindow.postMessage({
        action: 'overlayContactInfo',
        contactInfo: contactInfo
    }, '*');
}
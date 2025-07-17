console.log("Unnanu LinkedIn Extension loaded!");

// Create floating Unnanu icon
const icon = document.createElement('div');
icon.id = 'unnanu-icon';
icon.innerHTML = 'U';
icon.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #0073b1;
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
    transition: all 0.3s ease;
`;

// Add hover effect
icon.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-50%) scale(1.1)';
    this.style.boxShadow = '0 6px 20px rgba(0, 115, 177, 0.4)';
});

icon.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(-50%) scale(1)';
    this.style.boxShadow = '0 4px 12px rgba(0, 115, 177, 0.3)';
});

// Track sidebar state
let sidebarOpen = false;

// Add click functionality to toggle sidebar
icon.addEventListener('click', function() {
    console.log("Unnanu icon clicked!");
    toggleSidebar();
});

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
        // Extract profile image with more selectors
        const profileImageSelectors = [
            'img.pv-top-card-profile-picture__image',
            'img.profile-photo-edit__preview',
            '.pv-top-card__photo img',
            '.profile-photo img',
            'img[data-ghost-classes="pv-top-card-profile-picture__image"]',
            '.pv-top-card-profile-picture__image',
            '.pv-top-card-profile-picture img',
            'button img[alt*="profile photo"]',
            'img[alt*="profile picture"]'
        ];
        
        let profileImage = '';
        for (const selector of profileImageSelectors) {
            const imgElement = document.querySelector(selector);
            if (imgElement && imgElement.src) {
                profileImage = imgElement.src;
                console.log('Found profile image:', profileImage);
                break;
            }
        }

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

function openSidebar() {
    console.log("Opening sidebar...");
    
    // Remove existing sidebar if any
    const existing = document.getElementById('unnanu-sidebar');
    if (existing) existing.remove();
    
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
                handleProfileExtraction(event.data.userData);
                break;
            case 'requestProfileData':
                // Only send profile data when requested by authenticated sidebar
                sendProfileDataToSidebar();
                break;
        }
    }
});

function sendProfileDataToSidebar() {
    console.log('Sending profile data to sidebar');
    const iframe = document.getElementById('unnanu-sidebar-iframe');
    if (!iframe) return;
    
    const profileData = extractLinkedInProfile();
    
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
            url: profileData.url,
            timestamp: profileData.timestamp
        }
    }, '*');
}

function handleProfileExtraction(userData) {
    console.log('Handling profile extraction with user data:', userData);
    
    const profileData = extractLinkedInProfile();
    const iframe = document.getElementById('unnanu-sidebar-iframe');
    
    if (!iframe) return;
    
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
                data: response
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

// Add the icon to the page
document.body.appendChild(icon);
console.log("Unnanu floating icon added!");

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
alert("Extension loaded!");

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
    
    // Create sidebar
    const sidebar = document.createElement('div');
    sidebar.id = 'unnanu-sidebar';
    sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: white;
        border-left: 2px solid #0073b1;
        box-shadow: -5px 0 15px rgba(0,0,0,0.2);
        z-index: 99998;
        padding: 20px;
        font-family: Arial, sans-serif;
        overflow-y: auto;
    `;
    
    // Generate sidebar content based on whether we're on LinkedIn
    let sidebarContent;
    
    if (profileData.isLinkedInProfile && profileData.fullName) {
        sidebarContent = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <h2 style="color: #0073b1; margin: 0; font-size: 20px;">LinkedIn Profile</h2>
                <button id="close-sidebar" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${profileData.profileImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzciIHI9IjE1IiBmaWxsPSIjOUM5Q0EyIi8+CjxwYXRoIGQ9Ik0yMCA3MEM0MCA2MCA2MCA2MCA4MCA3MEw4MCA5MEwyMCA5MEwyMCA3MFoiIGZpbGw9IiM5QzlDQTIiLz4KPC9zdmc+'}" 
                 alt="Profile Picture" 
                 style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #0073b1; object-fit: cover;"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzciIHI9IjE1IiBmaWxsPSIjOUM5Q0EyIi8+CjxwYXRoIGQ9Ik0yMCA3MEM0MCA2MCA2MCA2MCA4MCA3MEw4MCA5MEwyMCA5MEwyMCA3MFoiIGZpbGw9IiM5QzlDQTIiLz4KPC9zdmc+'">
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #0073b1; margin: 0 0 15px 0; font-size: 18px; text-align: center;">${profileData.fullName}</h3>
                
                ${profileData.headline ? `
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #666; font-size: 12px;">TITLE:</strong>
                        <p style="margin: 5px 0; color: #333; font-size: 14px; line-height: 1.4;">${profileData.headline}</p>
                    </div>
                ` : ''}
                
                ${profileData.location ? `
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #666; font-size: 12px;">LOCATION:</strong>
                        <p style="margin: 5px 0; color: #333; font-size: 14px;">📍 ${profileData.location}</p>
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                    ${profileData.connections ? `
                        <div style="text-align: center; flex: 1;">
                            <strong style="color: #666; font-size: 11px;">CONNECTIONS</strong>
                            <p style="margin: 5px 0; color: #0073b1; font-size: 13px; font-weight: bold;">🔗 ${profileData.connections}</p>
                        </div>
                    ` : ''}
                    
                    ${profileData.followers ? `
                        <div style="text-align: center; flex: 1;">
                            <strong style="color: #666; font-size: 11px;">FOLLOWERS</strong>
                            <p style="margin: 5px 0; color: #0073b1; font-size: 13px; font-weight: bold;">👥 ${profileData.followers}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- WORK EXPERIENCE SECTION -->
            ${profileData.experience && profileData.experience.length > 0 ? `
                <div style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #0073b1; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">
                        💼 WORK EXPERIENCE (${profileData.experience.length})
                    </h4>
                    ${profileData.experience.slice(0, 3).map((exp, index) => `
                        <div style="margin-bottom: 15px; padding-bottom: 15px; ${index < 2 ? 'border-bottom: 1px solid #f0f0f0;' : ''}">
                            ${exp.title ? `<p style="margin: 0 0 5px 0; color: #333; font-size: 14px; font-weight: bold;">${exp.title}</p>` : ''}
                            ${exp.company ? `<p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">${exp.company}</p>` : ''}
                            ${exp.duration ? `<p style="margin: 0; color: #999; font-size: 12px;">${exp.duration}</p>` : ''}
                        </div>
                    `).join('')}
                    ${profileData.experience.length > 3 ? `
                        <p style="color: #0073b1; font-size: 12px; font-style: italic; text-align: center; margin: 10px 0 0 0;">
                            +${profileData.experience.length - 3} more position${profileData.experience.length - 3 > 1 ? 's' : ''}
                        </p>
                    ` : ''}
                </div>
            ` : `
                <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #666; margin: 0 0 10px 0; font-size: 14px;">💼 WORK EXPERIENCE</h4>
                    <p style="color: #999; font-size: 12px; margin: 0; font-style: italic;">No work experience found on this profile</p>
                </div>
            `}
            
            <!-- EDUCATION SECTION -->
            ${profileData.education && profileData.education.length > 0 ? `
                <div style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #0073b1; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">
                        🎓 EDUCATION (${profileData.education.length})
                    </h4>
                    ${profileData.education.slice(0, 3).map((edu, index) => `
                        <div style="margin-bottom: 15px; padding-bottom: 15px; ${index < 2 ? 'border-bottom: 1px solid #f0f0f0;' : ''}">
                            ${edu.school ? `<p style="margin: 0 0 5px 0; color: #333; font-size: 14px; font-weight: bold;">${edu.school}</p>` : ''}
                            ${edu.degree ? `<p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">${edu.degree}</p>` : ''}
                            ${edu.years ? `<p style="margin: 0; color: #999; font-size: 12px;">${edu.years}</p>` : ''}
                        </div>
                    `).join('')}
                    ${profileData.education.length > 3 ? `
                        <p style="color: #0073b1; font-size: 12px; font-style: italic; text-align: center; margin: 10px 0 0 0;">
                            +${profileData.education.length - 3} more school${profileData.education.length - 3 > 1 ? 's' : ''}
                        </p>
                    ` : ''}
                </div>
            ` : `
                <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #666; margin: 0 0 10px 0; font-size: 14px;">🎓 EDUCATION</h4>
                    <p style="color: #999; font-size: 12px; margin: 0; font-style: italic;">No education information found on this profile</p>
                </div>
            `}
            
            <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #0073b1; margin: 0 0 10px 0; font-size: 14px;">✅ EXTRACTION SUMMARY</h4>
                <p style="margin: 0; color: #666; font-size: 12px;">
                    Found: ${profileData.fullName ? '✓ Name' : '✗ Name'} 
                    ${profileData.headline ? ', ✓ Title' : ', ✗ Title'}
                    ${profileData.location ? ', ✓ Location' : ', ✗ Location'}
                    ${profileData.connections ? ', ✓ Connections' : ', ✗ Connections'}
                    ${profileData.followers ? ', ✓ Followers' : ', ✗ Followers'}
                    ${profileData.experience?.length > 0 ? `, ✓ Experience (${profileData.experience.length})` : ', ✗ Experience'}
                    ${profileData.education?.length > 0 ? `, ✓ Education (${profileData.education.length})` : ', ✗ Education'}
                </p>
            </div>
            
            <button id="extract-btn" style="
                background: #0073b1; 
                color: white; 
                border: none; 
                padding: 12px 20px; 
                border-radius: 5px; 
                cursor: pointer; 
                font-size: 14px;
                width: 100%;
                margin-bottom: 10px;
                font-weight: bold;
            ">
                📋 Extract Complete Profile Data
            </button>
            
            <button id="close-btn" style="
                background: #666; 
                color: white; 
                border: none; 
                padding: 12px 20px; 
                border-radius: 5px; 
                cursor: pointer; 
                font-size: 14px;
                width: 100%;
            ">
                Close Sidebar
            </button>
        `;
    } else {
        sidebarContent = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <h2 style="color: #0073b1; margin: 0; font-size: 20px;">Unnanu Extension</h2>
                <button id="close-sidebar" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 80px; height: 80px; background: #0073b1; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
                    U
                </div>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 14px;">ℹ️ NOT A LINKEDIN PROFILE</h4>
                <p style="margin: 0; color: #856404; font-size: 12px;">Navigate to a LinkedIn profile page (linkedin.com/in/username) to extract profile data.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #0073b1; margin: 0 0 10px 0; font-size: 14px;">Current Page:</h4>
                <p style="margin: 0; color: #666; font-size: 12px; word-break: break-all;">${window.location.href}</p>
            </div>
            
            <button id="close-btn" style="
                background: #666; 
                color: white; 
                border: none; 
                padding: 12px 20px; 
                border-radius: 5px; 
                cursor: pointer; 
                font-size: 14px;
                width: 100%;
            ">
                Close Sidebar
            </button>
        `;
    }
    
    sidebar.innerHTML = sidebarContent;
    
    // Add event listeners for buttons
    sidebar.querySelector('#close-sidebar')?.addEventListener('click', closeSidebar);
    sidebar.querySelector('#close-btn').addEventListener('click', closeSidebar);
    
    // Enhanced extract button functionality
    const extractBtn = sidebar.querySelector('#extract-btn');
    if (extractBtn) {
        extractBtn.addEventListener('click', function() {
            console.log('Extracting complete profile data:', profileData);
            
            let experienceText = profileData.experience && profileData.experience.length > 0 
                ? profileData.experience.map((exp, index) => `${index + 1}. ${exp.title} at ${exp.company} (${exp.duration})`).join('\n') 
                : 'No work experience found';
                
            let educationText = profileData.education && profileData.education.length > 0 
                ? profileData.education.map((edu, index) => `${index + 1}. ${edu.degree} at ${edu.school} (${edu.years})`).join('\n') 
                : 'No education data found';
            
            alert(`COMPLETE PROFILE EXTRACTED!\n\n` +
                  `👤 Name: ${profileData.fullName || 'Not found'}\n` +
                  `💼 Title: ${profileData.headline || 'Not found'}\n` +
                  `📍 Location: ${profileData.location || 'Not found'}\n` +
                  `🔗 Connections: ${profileData.connections || 'Not found'}\n` +
                  `👥 Followers: ${profileData.followers || 'Not found'}\n\n` +
                  `WORK EXPERIENCE:\n${experienceText}\n\n` +
                  `EDUCATION:\n${educationText}\n\n` +
                  `🔗 Profile URL: ${profileData.url}`);
        });
    }
    
    document.body.appendChild(sidebar);
    sidebarOpen = true;
    console.log("Sidebar opened with profile data!");
}

function closeSidebar() {
    console.log("Closing sidebar...");
    const sidebar = document.getElementById('unnanu-sidebar');
    if (sidebar) {
        sidebar.remove();
        sidebarOpen = false;
        console.log("Sidebar closed!");
    }
}

// Add the icon to the page
document.body.appendChild(icon);
console.log("Unnanu floating icon added!");

// Listen for messages from background script (extension icon clicks)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received from extension icon:', request);
    
    if (request.action === 'toggleSidebar') {
        toggleSidebar();
        sendResponse({ success: true });
    }
    
    return true;
});
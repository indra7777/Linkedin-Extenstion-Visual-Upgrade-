let profilesCollected = 0;
let stoppingInProgress = false;
var endpointType = 'uat'   //uat or prod
var APIstring = 'https://plugin.unnanu.com';

//Single profile button
document.addEventListener('DOMContentLoaded', function() {
    var singleProfile_BTN = document.getElementById('scrapeProfile');
    if (singleProfile_BTN) {
        singleProfile_BTN.addEventListener('click', ScanCurrentProfile);
    }

    var scrapeButton = document.getElementById('scrapeApplicants');
    if (scrapeButton) {
        scrapeButton.addEventListener('click', ScrapeApplicants);
    }

    var scrapePButton = document.getElementById('scrapeProjects');
    if (scrapePButton) {
        scrapePButton.addEventListener('click', ScrapeProjects);
    }

    var scrapeSales = document.getElementById('scrapeSales');
    if (scrapeSales) {
        scrapeSales.addEventListener('click', ScrapeSales);
    }

    var refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', RefreshAll);
    }

    var logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            logoutUser();
        });
    }

    chrome.storage.local.get('isRunning', function(data) {
        let isScraping = data.isRunning || false;
        updateButtonState(isScraping);
    });

    chrome.storage.local.get('isRunningP', function(data) {
        let isScraping = data.isRunningP || false;
        updateButtonStateP(isScraping);
    });

    chrome.storage.local.get('isRunningS', function(data) {
        let isScraping = data.isRunningS || false;
        updateButtonStateS(isScraping);
    });

    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        if (tabs[0] && tabs[0].url) {
            setButtonStateForUrl(tabs[0].url);
        }
    });

    getUnnanuData(function(userData) {
        console.log(userData)
        console.log(userData.type)

        if (userData && userData.type === "hire") {
            checkIfProfileScrapedBefore(userData.id);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {message: "checkForElement"}, function(response) {
                    if (response && response.elementFound) {
                        enableProfileScrapeButton();
                    } else {
                        disableProfileScrapeButton();
                    }
                });
            });
        }
    });

    checkCurrentUrlAndDisableButton();

    chrome.storage.local.get('profilesCollected', function(data) {
        if (data.profilesCollected !== undefined) {
            profilesCollected = data.profilesCollected;
            let countSpan = document.getElementById('collected-profiles-count');
            if (countSpan) {
                countSpan.textContent = `Profiles collected: ${profilesCollected}`;
            }
        }
    });

    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        let currentUrl = tabs[0].url;
        adjustScrapeProfileButtonForUrl(currentUrl);
    });

    // Check for auto-login
    getUnnanuData(function(data) {
        if (data) {
            document.querySelector('.login-container').style.display = 'none';
            document.querySelector('.main-container').style.display = 'block';
        } else {
            document.querySelector('.main-container').style.display = 'none';
            document.querySelector('.login-container').style.display = 'block';
        }
    });

    // Setup login button
    var loginButton = document.querySelector('.login-button');
    if (loginButton) {
        loginButton.addEventListener('click', function() {
            handleLogin();
        });
    }
});

function checkIfProfileScrapedBefore(currentProfileId, callback) {
    chrome.storage.local.get('sentProfileIds', function(data) {
        const profileIds = data.sentProfileIds || [];
        let isScraped = profileIds.includes(currentProfileId);
        if (isScraped) {
            disableProfileScrapeButton();
        }
        if (callback) {
            callback(isScraped);
        }
    });
}

function RefreshAll(){
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "refreshAll" });
        }
    });    
}

function logoutUser() {
    chrome.storage.local.set({ 'isLoggedOut': true }, function() {
        chrome.storage.local.remove(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function() {
            document.querySelector('.main-container').style.display = 'none';
            document.querySelector('.login-container').style.display = 'block';

            let errorMessage = document.getElementById('error-message');
            errorMessage.textContent = "You have logged out.";
            errorMessage.classList.add('error-visible');
        });
    });
}

function enableProfileScrapeButton() {
    getUnnanuData(function(userData) {
        if (userData && userData.id) {
            checkIfProfileScrapedBefore(userData.id, function(isScraped) {
                if (!isScraped) {
                    let scrapeProfileBtn = document.getElementById('scrapeProfile');
                    if (scrapeProfileBtn) {
                        scrapeProfileBtn.disabled = false;
                        scrapeProfileBtn.style.backgroundColor = "#266adc";
                    }
                }
            });
        }
    });
}

function checkCurrentUrlAndDisableButton() {
    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        let currentUrl = tabs[0].url;
        
        chrome.storage.local.get('sentProfileIds', function(data) {
            const profileIds = data.sentProfileIds || [];
            console.log("DOES ")
            console.log(profileIds)
            console.log("INCLUDE " + currentUrl)
            let isScraped = profileIds.includes(currentUrl);
            if (isScraped) {
                disableProfileScrapeButton();
            }
        });
    });
}

function disableProfileScrapeButton() {
    let scrapeProfileBtn = document.getElementById('scrapeProfile');
    if (scrapeProfileBtn) {
        scrapeProfileBtn.disabled = true;
        scrapeProfileBtn.style.backgroundColor = "#d3d3d3";
    }
}

function ScanCurrentProfile() {
    document.getElementById('scrapeProfileLoader').style.display = 'inline-block';
    document.getElementById('scrapeProfileText').style.display = 'none';

    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        var activeTab = tabs[0];

        chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeCurrent" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            } else if (!response.success) {
                console.error(response.message);
            }
        });
    });
}

function ScrapeApplicants() {
    var textHolder = document.querySelector('.textHolder');

    chrome.storage.local.get('isRunning', function(data) {
        const isScraping = data.isRunning || false;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            var activeTab = tabs[0];
            
            if (isScraping) {
                StopScrapingAll();
                chrome.tabs.sendMessage(activeTab.id, { message: "stopScraping" });
                if (textHolder) textHolder.style.display = 'none';
            } else {
                if (textHolder) textHolder.style.display = 'block'; 
                profilesCollected = 0;
                chrome.storage.local.set({'profilesCollected': profilesCollected});

                chrome.storage.local.set({ 'stopInitiated': false }, function() {
                    chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeApps" });
                    chrome.storage.local.set({ 'scrapingTabId': activeTab.id });
                });
            }
        });
    });
}

function ScrapeProjects() {
    var textHolder = document.querySelector('.textHolder');

    chrome.storage.local.get('isRunningP', function(data) {
        const isScraping = data.isRunningP || false;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            var activeTab = tabs[0];
            
            if (isScraping) {
                StopScrapingAllP();
                chrome.tabs.sendMessage(activeTab.id, { message: "stopScrapingP" });
                if (textHolder) textHolder.style.display = 'none';
            } else {
                if (textHolder) textHolder.style.display = 'block'; 
                profilesCollected = 0;
                chrome.storage.local.set({'profilesCollectedP': profilesCollected});

                chrome.storage.local.set({ 'stopInitiatedP': false }, function() {
                    console.log("Send start message")
                    chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeProjects" });
                    chrome.storage.local.set({ 'scrapingTabIdP': activeTab.id });
                });
            }
        });
    });
}

function ScrapeSales() {
    var textHolder = document.querySelector('.textHolder');

    chrome.storage.local.get('isRunningS', function(data) {
        const isScraping = data.isRunningS || false;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            var activeTab = tabs[0];
            
            if (isScraping) {
                StopScrapingAllS();
                chrome.tabs.sendMessage(activeTab.id, { message: "stopScrapingS" });
                if (textHolder) textHolder.style.display = 'none';
            } else {
                if (textHolder) textHolder.style.display = 'block'; 
                profilesCollected = 0;
                chrome.storage.local.set({'profilesCollectedS': profilesCollected});

                chrome.storage.local.set({ 'stopInitiatedS': false }, function() {
                    console.log("Send start message SALES")
                    chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeSales" });
                    chrome.storage.local.set({ 'scrapingTabIdS': activeTab.id });
                });
            }
        });
    });
}

function StopScrapingAll(){
    stoppingInProgress = true;
    updateStoppingState();

    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScraping" });
        }
    });    
}

function StopScrapingAllP(){
    stoppingInProgress = true;
    updateStoppingStateP();

    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScrapingP" });
        }
    });    
}

function StopScrapingAllS(){
    stoppingInProgress = true;
    updateStoppingStateS();

    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScrapingS" });
        }
    });    
}

// Authentication Logic
function handleLogin() {
    let email = document.getElementById('emailInput').value;
    let password = document.getElementById('passwordInput').value;
    
    let endpoint = APIstring + '/api/v1/user/hire/signin?endpointType=' + endpointType;

    let data = {
        Email: email,
        Password: CryptoJS.MD5(password).toString()
    };
    
    // Disable the button and show the loader
    document.querySelector('.login-button').disabled = true;
    document.querySelector('.loader').style.display = 'inline-block';
    document.getElementById('login-text').style.display = 'none';
    
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(responseData => {
        console.log('responseData IS ', responseData);
        
        // Enable the button and hide the loader
        document.querySelector('.login-button').disabled = false;
        document.querySelector('.loader').style.display = 'none';
        document.getElementById('login-text').style.display = 'block';

        if (responseData && responseData.Code === 200) {
            const currentTime = new Date().getTime();
            const expiryTime = currentTime + 60 * 60 * 1000; // 60 minutes

            chrome.storage.local.set({
                'unnanu_token': responseData.Data.Token,
                'unnanu_id': responseData.Data.UserId,
                'unnanu_expiry': expiryTime,
                'unnanu_type': 'hire',
                'isLoggedOut': false 
            }, function() {
                document.querySelector('.login-container').style.display = 'none';
                document.querySelector('.main-container').style.display = 'block';
                document.getElementById('error-message').classList.remove('error-visible');

                getUnnanuData(function(userData) {
                    if (userData && userData.type === "hire") {
                        checkIfProfileScrapedBefore(userData.id);
                        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                            chrome.tabs.sendMessage(tabs[0].id, {message: "checkForElement"}, function(response) {
                                if (response && response.elementFound) {
                                    enableProfileScrapeButton();
                                } else {
                                    disableProfileScrapeButton();
                                }
                            });
                        });
                    }
                });
            });
        } else {
            document.getElementById('error-message').textContent = "Failed to authenticate user, user is incorrect.";
            document.getElementById('error-message').classList.add('error-visible');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        document.querySelector('.login-button').disabled = false;
        document.querySelector('.loader').style.display = 'none';
        document.getElementById('login-text').style.display = 'block';
        document.getElementById('error-message').textContent = "Failed to authenticate user, user is incorrect.";
        document.getElementById('error-message').classList.add('error-visible');
    });
}

function getUnnanuData(callback) {
    chrome.storage.local.get(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function(result) {
        const currentTime = new Date().getTime();
        if (result.unnanu_expiry && currentTime > result.unnanu_expiry) {
            chrome.storage.local.remove(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);
            expireUser();
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

function isLinkedInProfile(url) {
    return url && url.startsWith('https://www.linkedin.com/in/');
}

function isLinkedOnProjects(url) {
    return url && url.startsWith('https://www.linkedin.com/talent/hire/');
}

function isLinkedOnSales(url) {
    if(url.startsWith('https://www.linkedin.com/sales/search/people?query='))
    return false;

    if(url.startsWith('https://www.linkedin.com/sales/search/people?viewAllFilters=true'))
    return false;

    if(url == 'https://www.linkedin.com/sales/search/people')
    return false;

    return url && (url.startsWith('https://www.linkedin.com/sales/search/people') || url.startsWith('https://www.linkedin.com/sales/lists/people/'));
}

var shouldBeGrey;
var shouldBeGreyP;
var shouldBeGreyS;
function setButtonStateForUrl(url) {
    let scrapeApplicantsBtn = document.getElementById('scrapeApplicants');
    let scrapeProjectsBtn = document.getElementById('scrapeProjects');
    let scrapeSalesBtn = document.getElementById('scrapeSales');
    
    const hiringUrlPattern = /^https:\/\/www\.linkedin\.com\/hiring\/jobs\/\d+\/applicants\/\d+\/detail\//;
    if (scrapeApplicantsBtn) {
        if (isLinkedInProfile(url) || hiringUrlPattern.test(url) == false) {
            shouldBeGrey = true;
            scrapeApplicantsBtn.disabled = true;
            scrapeApplicantsBtn.style.backgroundColor = "#d3d3d3";
            scrapeApplicantsBtn.innerText = "Extract Job Applicants";
        } else if (hiringUrlPattern.test(url)) {
            shouldBeGrey = false;
            scrapeApplicantsBtn.disabled = false;
            scrapeApplicantsBtn.style.backgroundColor = "#266adc";
            scrapeApplicantsBtn.innerText = "Extract Job Applicants";
        }
    }

    if (scrapeProjectsBtn) {
        if(isLinkedOnProjects(url) == false){
            shouldBeGreyP = true;
            scrapeProjectsBtn.disabled = true;
            scrapeProjectsBtn.style.backgroundColor = "#d3d3d3";
            scrapeProjectsBtn.innerText = "Extract Recruiter Applicants";
        }else{
            shouldBeGreyP = false;
            scrapeProjectsBtn.disabled = false;
            scrapeProjectsBtn.style.backgroundColor = "#266adc";
            scrapeProjectsBtn.innerText = "Extract Recruiter Applicants";
        }
    }

    if (scrapeSalesBtn) {
        if(isLinkedOnSales(url) == false){
            shouldBeGreyS = true;
            scrapeSalesBtn.disabled = true;
            scrapeSalesBtn.style.backgroundColor = "#d3d3d3";
            scrapeSalesBtn.innerText = "Extract SN List Profiles";
        }else{
            shouldBeGreyS = false;
            scrapeSalesBtn.disabled = false;
            scrapeSalesBtn.style.backgroundColor = "#266adc";
            scrapeSalesBtn.innerText = "Extract SN List Profiles";
        }
    }
}

function expireUser() {
    document.querySelector('.main-container').style.display = 'none';
    document.querySelector('.login-container').style.display = 'block';
    document.getElementById('error-message').textContent = "Session expired. Please log in again.";
    document.getElementById('error-message').classList.add('error-visible');
}

function updateButtonState(isScraping) {
    var textHolder = document.querySelector('.textHolder');
    if(stoppingInProgress) return;

    console.log("UPDATE TO " + isScraping)
    
    let scrapeApplicants = document.getElementById('scrapeApplicants');
    if (scrapeApplicants) {
        if (isScraping) {
            scrapeApplicants.innerText = "STOP Extracting In Progress......";
            scrapeApplicants.disabled = false;
            scrapeApplicants.style.backgroundColor = "#d15050";
            if (textHolder) textHolder.style.display = "block";
        } else {
            if(shouldBeGrey == false){
                scrapeApplicants.innerText = "Extract Job Applicants";
                scrapeApplicants.style.backgroundColor = "#266adc";
            }
            if (textHolder) textHolder.style.display = "none";
        }
    }
}

function updateButtonStateP(isScraping) {
    var textHolder = document.querySelector('.textHolder');
    if(stoppingInProgress) return;
    
    let scrapeApplicants = document.getElementById('scrapeProjects');
    if (scrapeApplicants) {
        if (isScraping) {
            scrapeApplicants.innerText = "STOP Extracting In Progress......";
            scrapeApplicants.disabled = false;
            scrapeApplicants.style.backgroundColor = "#d15050";
            if (textHolder) textHolder.style.display = "block";
        } else {
            if(shouldBeGreyP == false){
                scrapeApplicants.innerText = "Extract Recruiter Applicants";
                scrapeApplicants.style.backgroundColor = "#266adc";
            }
            if (textHolder) textHolder.style.display = "none";
        }
    }
}

function updateButtonStateS(isScraping) {
    var textHolder = document.querySelector('.textHolder');
    if(stoppingInProgress) return;
    
    let scrapeApplicants = document.getElementById('scrapeSales');
    if (scrapeApplicants) {
        if (isScraping) {
            scrapeApplicants.innerText = "STOP Extracting In Progress......";
            scrapeApplicants.disabled = false;
            scrapeApplicants.style.backgroundColor = "#d15050";
            if (textHolder) textHolder.style.display = "block";
        } else {
            if(shouldBeGreyS == false){
                scrapeApplicants.innerText = "Extract SN List Profiles";
                scrapeApplicants.style.backgroundColor = "#266adc";
            }
            if (textHolder) textHolder.style.display = "none";
        }
    }
}

function updateStoppingState() {
    let scrapeApplicants = document.getElementById('scrapeApplicants');
    if (scrapeApplicants) {
        scrapeApplicants.innerText = "Stopping...";
        scrapeApplicants.style.backgroundColor = "#e8c525";
    }
}

function updateStoppingStateP() {
    let scrapeApplicants = document.getElementById('scrapeProjects');
    if (scrapeApplicants) {
        scrapeApplicants.innerText = "Stopping...";
        scrapeApplicants.style.backgroundColor = "#e8c525";
    }
}

function updateStoppingStateS() {
    let scrapeApplicants = document.getElementById('scrapeSales');
    if (scrapeApplicants) {
        scrapeApplicants.innerText = "Stopping...";
        scrapeApplicants.style.backgroundColor = "#e8c525";
    }
}

function adjustScrapeProfileButtonForUrl(url) {
    let scrapeProfileBtn = document.getElementById('scrapeProfile');
    if (scrapeProfileBtn) {
        if (isLinkedInProfile(url)) {
            scrapeProfileBtn.disabled = false;
            scrapeProfileBtn.style.backgroundColor = "#266adc";
        } else {
            scrapeProfileBtn.disabled = true;
            scrapeProfileBtn.style.backgroundColor = "#d3d3d3";
            console.log("DISABLE CURRENT")
        }
    }
}

// Message listeners for runtime messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "scrapingStarted") {
        updateButtonState(true);
    }

    if (request.action === "scrapingStartedP") {
        updateButtonStateP(true);
    }

    if (request.action === "scrapingStartedS") {
        updateButtonStateS(true);
    }
    
    if (request.action === "tabClosingOrRefreshing") {
        updateButtonState(false);
    }

    if(request.action === "scrapingStopped"){
        updateButtonState(false);
    }

    if(request.action === "scrapingStoppedP"){
        updateButtonStateP(false);
    }

    if(request.action === "scrapingStoppedS"){
        updateButtonStateS(false);
    }

    if(request.action === "scrapingFullyStopped") {
        stoppingInProgress = false;
        updateButtonState(false);
    }

    if(request.action === "scrapingFullyStoppedP") {
        stoppingInProgress = false;
        updateButtonStateP(false);
    }

    if(request.action === "scrapingFullyStoppedS") {
        stoppingInProgress = false;
        updateButtonStateS(false);
    }

    if (request.action === "restoreScrapeProfileButtonState") {
        document.getElementById('scrapeProfileLoader').style.display = 'none';
        document.getElementById('scrapeProfileText').style.display = 'inline';
    }

    if(request.action === "updateTheCount"){
        chrome.storage.local.get('profilesCollected', function(data) {
            if (data.profilesCollected !== undefined) {
                profilesCollected = data.profilesCollected;
                let countSpan = document.getElementById('collected-profiles-count');
                if (countSpan) {
                    countSpan.textContent = `Profiles collected: ${profilesCollected}`;
                }
            }
        });
    }

    if(request.action === "updateTheCountP"){
        chrome.storage.local.get('profilesCollectedP', function(data) {
            if (data.profilesCollectedP !== undefined) {
                profilesCollectedP = data.profilesCollectedP;
                let countSpan = document.getElementById('collected-profiles-count');
                if (countSpan) {
                    countSpan.textContent = `Profiles collected: ${profilesCollectedP}`;
                }
            }
        });
    }
});
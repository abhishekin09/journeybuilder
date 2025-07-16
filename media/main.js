// Get VS Code API
const vscode = acquireVsCodeApi();

// DOM elements
let functionInput, analyzeBtn, clearBtn, retryBtn;
let loadingSection, errorSection, resultsSection;
let diagramContainer, writeupContainer;
let resultTitle, errorMessage, loadingFunction;
let tabButtons, tabPanes;

// State
let recentSearches = [];
let currentFunction = '';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    initializeMermaid();
    loadRecentSearches();
});

function initializeElements() {
    // Input elements
    functionInput = document.getElementById('functionInput');
    analyzeBtn = document.getElementById('analyzeBtn');
    clearBtn = document.getElementById('clearBtn');
    retryBtn = document.getElementById('retryBtn');
    
    // Section elements
    loadingSection = document.getElementById('loadingSection');
    errorSection = document.getElementById('errorSection');
    resultsSection = document.getElementById('resultsSection');
    
    // Content elements
    diagramContainer = document.getElementById('diagramContainer');
    writeupContainer = document.getElementById('writeupContainer');
    resultTitle = document.getElementById('resultTitle');
    errorMessage = document.getElementById('errorMessage');
    loadingFunction = document.getElementById('loadingFunction');
    
    // Tab elements
    tabButtons = document.querySelectorAll('.tab-button');
    tabPanes = document.querySelectorAll('.tab-pane');
}

function initializeEventListeners() {
    // Analyze button
    analyzeBtn.addEventListener('click', handleAnalyze);
    
    // Enter key in input
    functionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAnalyze();
        }
    });
    
    // Clear button
    clearBtn.addEventListener('click', function() {
        vscode.postMessage({
            command: 'clear'
        });
        showSection('search');
    });
    
    // Retry button
    retryBtn.addEventListener('click', function() {
        if (currentFunction) {
            analyzeFunction(currentFunction);
        }
    });
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Recent searches
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('recent-search-item')) {
            const functionName = e.target.textContent;
            functionInput.value = functionName;
            handleAnalyze();
        }
    });
}

function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                darkMode: true,
                primaryColor: '#0078d4',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#0078d4',
                lineColor: '#ffffff',
                secondaryColor: '#1e1e1e',
                tertiaryColor: '#2d2d30'
            }
        });
    }
}

function handleAnalyze() {
    const functionName = functionInput.value.trim();
    if (!functionName) {
        showError('Please enter a function name');
        return;
    }
    
    analyzeFunction(functionName);
}

function analyzeFunction(functionName) {
    currentFunction = functionName;
    addToRecentSearches(functionName);
    
    // Send message to extension
    vscode.postMessage({
        command: 'analyze',
        functionName: functionName
    });
}

function addToRecentSearches(functionName) {
    // Remove if already exists
    recentSearches = recentSearches.filter(item => item !== functionName);
    
    // Add to beginning
    recentSearches.unshift(functionName);
    
    // Keep only last 5
    recentSearches = recentSearches.slice(0, 5);
    
    // Save to localStorage
    try {
        localStorage.setItem('apiJourneyRecentSearches', JSON.stringify(recentSearches));
    } catch (e) {
        console.warn('Could not save recent searches:', e);
    }
    
    updateRecentSearchesList();
}

function loadRecentSearches() {
    try {
        const saved = localStorage.getItem('apiJourneyRecentSearches');
        if (saved) {
            recentSearches = JSON.parse(saved);
            updateRecentSearchesList();
        }
    } catch (e) {
        console.warn('Could not load recent searches:', e);
    }
}

function updateRecentSearchesList() {
    const recentList = document.getElementById('recentList');
    recentList.innerHTML = '';
    
    if (recentSearches.length === 0) {
        recentList.innerHTML = '<li class="no-recent">No recent searches</li>';
        return;
    }
    
    recentSearches.forEach(functionName => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="recent-search-item">${functionName}</span>`;
        recentList.appendChild(li);
    });
}

function showSection(sectionName) {
    // Hide all sections
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';
    
    // Show requested section
    switch (sectionName) {
        case 'loading':
            loadingSection.style.display = 'block';
            break;
        case 'error':
            errorSection.style.display = 'block';
            break;
        case 'results':
            resultsSection.style.display = 'block';
            break;
        // 'search' or default shows nothing (search is always visible)
    }
}

function showError(message) {
    errorMessage.textContent = message;
    showSection('error');
}

function switchTab(tabName) {
    // Update button states
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        }
    });
    
    // Update pane visibility
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === tabName + 'Tab') {
            pane.classList.add('active');
        }
    });
}

function renderMermaidDiagram(diagramText) {
    if (typeof mermaid === 'undefined') {
        diagramContainer.innerHTML = '<div class="error">Mermaid library not loaded</div>';
        return;
    }
    
    // Clear previous diagram
    diagramContainer.innerHTML = '';
    
    // Create a unique ID for this diagram
    const diagramId = 'diagram-' + Date.now();
    
    try {
        // Render the diagram
        mermaid.render(diagramId, diagramText, function(svgCode) {
            diagramContainer.innerHTML = svgCode;
        });
    } catch (error) {
        console.error('Mermaid rendering error:', error);
        diagramContainer.innerHTML = `
            <div class="error">
                <h3>Diagram Rendering Error</h3>
                <p>Could not render the diagram. Raw content:</p>
                <pre>${diagramText}</pre>
            </div>
        `;
    }
}

function renderWriteup(writeupText) {
    // Convert markdown to HTML (basic implementation)
    let html = writeupText
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^\*\*(.*)\*\*/gm, '<strong>$1</strong>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.*)$/gm, '<p>$1</p>')
        .replace(/<p><h/g, '<h')
        .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
        .replace(/<p><ul>/g, '<ul>')
        .replace(/<\/ul><\/p>/g, '</ul>')
        .replace(/<p><\/p>/g, '');
    
    writeupContainer.innerHTML = html;
}

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
        case 'showLoading':
            loadingFunction.textContent = message.functionName;
            showSection('loading');
            break;
            
        case 'showError':
            showError(message.error);
            break;
            
        case 'showResult':
            const result = message.result;
            
            // Update title
            resultTitle.textContent = `API Journey: ${result.functionName}`;
            
            // Render diagram
            if (result.diagram) {
                renderMermaidDiagram(result.diagram);
            } else {
                diagramContainer.innerHTML = '<div class="no-content">No diagram available</div>';
            }
            
            // Render writeup
            if (result.writeup) {
                renderWriteup(result.writeup);
            } else {
                writeupContainer.innerHTML = '<div class="no-content">No details available</div>';
            }
            
            // Show results
            showSection('results');
            
            // Default to diagram tab
            switchTab('diagram');
            break;
    }
});

// Handle theme changes
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-vscode-theme-kind') {
            // Re-initialize mermaid with new theme
            initializeMermaid();
        }
    });
});

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-vscode-theme-kind']
}); 
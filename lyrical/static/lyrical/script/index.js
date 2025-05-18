document.addEventListener('DOMContentLoaded', function () {
    initStreamHandler();
});

// Store original button HTML to restore it later
const originalButtonHTML = new Map();
let streamHelper; // Declare globally for this script if needed, or manage scope appropriately

// --- UI Update Functions ---

function uiShowLoading(isLoading) {
    const heroButton = document.querySelector('.hero-btn');
    const jsonDataContainer = document.querySelector('.json-data');

    if (isLoading) {
        if (heroButton && !originalButtonHTML.has(heroButton)) {
            originalButtonHTML.set(heroButton, heroButton.innerHTML);
        }
        if (heroButton) {
            heroButton.disabled = true;
            heroButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        }
        if (jsonDataContainer) {
            jsonDataContainer.innerHTML = ''; // Clear previous results at the start of a new request
        }
    } else {
        if (heroButton && originalButtonHTML.has(heroButton)) {
            heroButton.innerHTML = originalButtonHTML.get(heroButton);
            originalButtonHTML.delete(heroButton); // Clean up map entry
        }
        if (heroButton) {
            heroButton.disabled = false;
        }
    }
}

function uiDisplayStreamData(data) {
    const container = document.querySelector('.json-data');
    if (!container) return;

    // This function now only handles appending a single piece of incoming data.
    // Error display and "no results" are handled by uiDisplayError and potentially onComplete.

    if (Array.isArray(data)) {
        // If the stream sends an array as a single item (less common for NDJSON line-by-line)
        data.forEach(element => appendElementToContainer(container, element));
    } else if (typeof data === 'object' && data !== null) {
        appendElementToContainer(container, data);
    } else if (data) { // Handle primitive types (e.g., a string directly from a simpler stream)
        appendElementToContainer(container, data);
    }
    // If data is null or undefined, we simply do nothing for this chunk.
}

function appendElementToContainer(container, element) {
    const p = document.createElement('p');
    p.className = "hero-subheading"; // Assuming this class is appropriate for all data

    if (typeof element === 'string') {
        p.innerHTML = element.replace(/\n/g, '<br>');
    } else if (element && element.name) { // Example: prioritize 'title'
        p.innerHTML = String(element.name).replace(/\n/g, '<br>');
    } else if (typeof element === 'object' && element !== null) {
        // Fallback for other object structures: display as preformatted JSON
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-all';
        pre.textContent = JSON.stringify(element, null, 2);
        p.appendChild(pre);
    } else {
        // For other unexpected data types, or if element is null/undefined after checks
        p.textContent = "Received non-displayable data chunk.";
    }
    container.appendChild(p);
}


function uiDisplayError(error) {
    const container = document.querySelector('.json-data');
    if (!container) return;
    // Clear previous results before showing a new error message for a request
    // container.innerHTML = ''; // This might be too aggressive if errors are per-chunk

    const p = document.createElement('p');
    p.className = "hero-subheading text-danger"; // Use Bootstrap's text-danger for errors

    let errorMessage = `Error: ${error.message || 'Unknown error'}`;
    if (error.type) errorMessage = `[${error.type}] ${errorMessage}`;
    if (error.status) errorMessage += ` (Status: ${error.status})`;
    p.innerHTML = errorMessage;

    if (error.raw_content) {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-all';
        pre.textContent = `Raw content: ${error.raw_content}`;
        p.appendChild(document.createElement('br'));
        p.appendChild(pre);
    }
    if (error.details) { // For parsing errors or other details
        const detailsPre = document.createElement('pre');
        detailsPre.style.whiteSpace = 'pre-wrap';
        detailsPre.style.wordBreak = 'break-all';
        detailsPre.textContent = `Details: ${error.details}`;
        p.appendChild(document.createElement('br'));
        p.appendChild(detailsPre);
    }
    // Displaying full traceback from server might be too verbose for users,
    // but if needed, it would be in error.data or error.originalError.data
    container.appendChild(p);
}

function uiHandleStreamEnd() {
    // This callback is useful if you need to do something specific when the stream has finished sending data,
    // but before the final onComplete (which might include other cleanup).
    // For example, if there were no items, you might want to display "No results found."
    const container = document.querySelector('.json-data');
    if (container && container.children.length === 0) {
        const p = document.createElement('p');
        p.className = "hero-subheading";
        p.innerHTML = "No results found.";
        container.appendChild(p);
    }
    console.log("Stream finished.");
}


// --- Stream Initialization and Event Binding ---

function initStreamHandler() {
    const heroButton = document.querySelector('.hero-btn');
    if (!heroButton) return;

    streamHelper = new StreamHelper('/call_llm', {
        callbacks: {
            onPreRequest: () => {
                console.log("Stream PreRequest");
                uiShowLoading(true);
            },
            onIncomingData: (data) => {
                // console.log("Stream IncomingData:", data);
                uiDisplayStreamData(data);
            },
            onStreamEnd: () => {
                console.log("Stream End");
                uiHandleStreamEnd();
            },
            onComplete: () => {
                console.log("Stream Complete");
                uiShowLoading(false);
            },
            onError: (error) => {
                console.error("Stream Error:", error);
                uiDisplayError(error);
                // uiShowLoading(false) is called by onComplete, which should also be called on error.
            }
        }
    });

    // Example: Set a default parameter if needed, though prompt is request-specific here
    // streamHelper.setParameter('some_default_param', 'defaultValue');

    heroButton.addEventListener('click', () => {
        // Parameters for this specific request
        const requestParams = {
            prompt: 'song_names',
            count: 5,
            include_themes: "inspirational, uplifting, motivational, positive",
            exclude_themes: "neon, cyber, digital, futuristic",
            exclude_words: "neon, cyber, endless"            
        };
        streamHelper.initiateRequest(requestParams);
    });
}

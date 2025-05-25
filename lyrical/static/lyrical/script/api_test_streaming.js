import { StreamHelper } from "./util_stream_helper.js";

/**
 * initializes the streaming test page when dom is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    initStreamHandler();
});

// store original button html to restore it later
const originalButtonHTML = new Map();
let streamHelper;

/**
 * shows or hides loading state in the ui
 * @param {boolean} isLoading - whether to show loading state
 */
function uiShowLoading(isLoading) {
    const generateButton = document.querySelector('.generate-btn');
    const jsonDataContainer = document.querySelector('.json-data');

    if (isLoading) {
        handleLoadingStart(generateButton, jsonDataContainer);
    } else {
        handleLoadingEnd(generateButton);
    }
}

/**
 * handles ui changes when loading starts
 * @param {HTMLElement} generateButton - the generate button element
 * @param {HTMLElement} jsonDataContainer - the data container element
 */
function handleLoadingStart(generateButton, jsonDataContainer) {
    if (generateButton && !originalButtonHTML.has(generateButton)) {
        originalButtonHTML.set(generateButton, generateButton.innerHTML);
    }
    if (generateButton) {
        generateButton.disabled = true;
        generateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    }
    if (jsonDataContainer) {
        jsonDataContainer.innerHTML = '';
    }
}

/**
 * handles ui changes when loading ends
 * @param {HTMLElement} generateButton - the generate button element
 */
function handleLoadingEnd(generateButton) {
    if (generateButton && originalButtonHTML.has(generateButton)) {
        generateButton.innerHTML = originalButtonHTML.get(generateButton);
        originalButtonHTML.delete(generateButton);
    }
    if (generateButton) {
        generateButton.disabled = false;
    }
}

/**
 * displays incoming stream data in the ui
 * @param {any} data - the data received from the stream
 */
function uiDisplayStreamData(data) {
    const container = document.querySelector('.json-data');
    if (!container) return;

    if (Array.isArray(data)) {
        data.forEach(element => appendElementToContainer(container, element));
    } else if (typeof data === 'object' && data !== null) {
        appendElementToContainer(container, data);
    } else if (data) {
        appendElementToContainer(container, data);
    }
}

/**
 * appends a data element to the container
 * @param {HTMLElement} container - the container element
 * @param {any} element - the element to append
 */
function appendElementToContainer(container, element) {
    const p = document.createElement('p');
    p.className = "generate-subheading";

    if (typeof element === 'string') {
        p.innerHTML = element.replace(/\n/g, '<br>');
    } else if (element && element.name) {
        p.innerHTML = String(element.name).replace(/\n/g, '<br>');
    } else {
        handleSpecificElementTypes(p, element);
    }
    
    container.appendChild(p);
}

/**
 * handles specific element types for display
 * @param {HTMLElement} p - the paragraph element to populate
 * @param {any} element - the element to process
 */
function handleSpecificElementTypes(p, element) {
    if (element && element.verse1) {
        p.innerHTML = 'verse1: ' + String(element.verse1).replace(/\n/g, '<br>');
    } else if (element && element.verse2) {
        p.innerHTML = 'verse2: ' + String(element.verse2).replace(/\n/g, '<br>');
    } else if (element && element.pre_chorus) {
        p.innerHTML = 'pre-chorus: ' + String(element.pre_chorus).replace(/\n/g, '<br>');
    } else if (element && element.chorus) {
        p.innerHTML = 'chorus: ' + String(element.chorus).replace(/\n/g, '<br>');
    } else if (element && element.bridge) {
        p.innerHTML = 'bridge: ' + String(element.bridge).replace(/\n/g, '<br>');
    } else if (element && element.outro) {
        p.innerHTML = 'outro: ' + String(element.outro).replace(/\n/g, '<br>');
    } else if (element && element.vocalisation) {
        p.innerHTML = 'vocalisation: ' + String(element.vocalisation).replace(/\n/g, '<br>');
    } else if (typeof element === 'object' && element !== null) {
        createJsonDisplay(p, element);
    } else {
        p.textContent = "received non-displayable data chunk.";
    }
}

/**
 * creates a json display for complex objects
 * @param {HTMLElement} p - the paragraph element
 * @param {object} element - the object to display
 */
function createJsonDisplay(p, element) {
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-all';
    pre.textContent = JSON.stringify(element, null, 2);
    p.appendChild(pre);
}


/**
 * displays error messages in the ui
 * @param {object} error - the error object to display
 */
function uiDisplayError(error) {
    const container = document.querySelector('.json-data');
    if (!container) return;

    const p = document.createElement('p');
    p.className = "generate-subheading text-danger";

    let errorMessage = `error: ${error.message || 'unknown error'}`;
    if (error.type) errorMessage = `[${error.type}] ${errorMessage}`;
    if (error.status) errorMessage += ` (status: ${error.status})`;
    p.innerHTML = errorMessage;

    appendErrorDetails(p, error);
    container.appendChild(p);
}

/**
 * appends error details to the error display
 * @param {HTMLElement} p - the paragraph element
 * @param {object} error - the error object
 */
function appendErrorDetails(p, error) {
    if (error.raw_content) {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-all';
        pre.textContent = `raw content: ${error.raw_content}`;
        p.appendChild(document.createElement('br'));
        p.appendChild(pre);
    }
    if (error.details) {
        const detailsPre = document.createElement('pre');
        detailsPre.style.whiteSpace = 'pre-wrap';
        detailsPre.style.wordBreak = 'break-all';
        detailsPre.textContent = `details: ${error.details}`;
        p.appendChild(document.createElement('br'));
        p.appendChild(detailsPre);
    }
}

/**
 * handles when the stream has ended
 */
function uiHandleStreamEnd() {
    const container = document.querySelector('.json-data');
    if (container && container.children.length === 0) {
        const p = document.createElement('p');
        p.className = "generate-subheading";
        p.innerHTML = "no results found.";
        container.appendChild(p);
    }
    console.log("stream finished.");
}


/**
 * initializes the stream handler and sets up event listeners
 */
function initStreamHandler() {
    const generateButton = document.querySelector('.generate-btn');
    if (!generateButton) return;

    streamHelper = createStreamHelper();
    generateButton.addEventListener('click', handleGenerateClick);
}

/**
 * creates and configures the stream helper
 * @returns {StreamHelper} configured stream helper instance
 */
function createStreamHelper() {
    return new StreamHelper('/api_gen_song', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                uiShowLoading(true);
            },
            onIncomingData: (data) => {
                uiDisplayStreamData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
                uiHandleStreamEnd();
            },
            onComplete: () => {
                console.log("stream complete");
                uiShowLoading(false);
            },
            onError: (error) => {
                console.error("stream error:", error);
                uiDisplayError(error);
            }
        }
    });
}

/**
 * handles the generate button click event
 */
function handleGenerateClick() {
    const requestParams = buildRequestParams();
    streamHelper.initiateRequest(requestParams);
}

/**
 * builds the request parameters for the stream
 * @returns {object} request parameters
 */
function buildRequestParams() {
    return {
        prompt: 'song',
        song_name: 'In The Sunshine',
        song_theme: 'A song about having fun by myself in the sunshine',
        verse_count: 1,
        verse_lines: 4,
        pre_chorus_lines: 0,
        chorus_lines: 6,
        bridge_lines: 4,
        outro_lines: 2,
        vocalisation_lines: 2,
        vocalisation_terms: "oh, ooh, ah, ahh, whoa",
        song_vocalisation_level: 3,
        syllables: 9
    };
}

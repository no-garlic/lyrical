document.addEventListener('DOMContentLoaded', function () {
    initHeroButton();
});

function initHeroButton() {
    const heroButton = document.querySelector('.hero-btn');
    if (heroButton) {
        heroButton.addEventListener('click', () => handleHeroButtonClick('book_names'));
    }
}

// Store original button HTML to restore it later
const originalButtonHTML = new Map();

function showLoadingIndicator(show) {
    const heroButton = document.querySelector('.hero-btn');
    const jsonDataContainer = document.querySelector('.json-data');

    if (show) {
        if (!originalButtonHTML.has(heroButton)) {
            originalButtonHTML.set(heroButton, heroButton.innerHTML);
        }
        heroButton.disabled = true;
        heroButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        jsonDataContainer.innerHTML = ''; // Clear previous results
    } else {
        if (originalButtonHTML.has(heroButton)) {
            heroButton.innerHTML = originalButtonHTML.get(heroButton);
            originalButtonHTML.delete(heroButton); // Clean up map entry
        }
        heroButton.disabled = false;
    }
}

function displayResults(data, append = false) {
    const container = document.querySelector('.json-data');
    if (!append) {
        container.innerHTML = ''; // Clear previous results only if not appending
    }

    if (data && data.error) {
        const p = document.createElement('p');
        p.className = "hero-subheading text-danger";
        p.innerHTML = `Error: ${data.error}`;
        if (data.raw_content) {
            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordBreak = 'break-all';
            pre.textContent = `Raw content: ${data.raw_content}`;
            p.appendChild(document.createElement('br'));
            p.appendChild(pre);
        }
        if (data.traceback) {
            const pre_tb = document.createElement('pre');
            pre_tb.style.whiteSpace = 'pre-wrap';
            pre_tb.style.wordBreak = 'break-all';
            pre_tb.textContent = `Traceback: ${data.traceback}`;
            p.appendChild(document.createElement('br'));
            p.appendChild(pre_tb);
        }
        container.appendChild(p); // Append the error message
        return;
    }

    if (Array.isArray(data)) {
        if (data.length === 0 && !append) { // Only show "No results" if not appending and data is empty
            const p = document.createElement('p');
            p.className = "hero-subheading";
            p.innerHTML = "No results found.";
            container.appendChild(p);
            return;
        }
        data.forEach(element => {
            const p = document.createElement('p');
            p.className = "hero-subheading";
            // If the element is a simple string, display it directly.
            // Otherwise, stringify it. This is a common pattern for LLM text streaming.
            if (typeof element === 'string') {
                p.innerHTML = element;
            } else if (element.title) {
                p.innerHTML = element.title;
            } else {
                // Fallback for other object structures
                const pre = document.createElement('pre');
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.wordBreak = 'break-all';
                pre.textContent = JSON.stringify(element, null, 2);
                p.appendChild(pre);
            }
            container.appendChild(p);
        });
    } else if (typeof data === 'object' && data !== null) {
        // This case handles single JSON objects streamed one by one.
        let contentToDisplay = '';
        if (data.title) { // Check for title first
            contentToDisplay = data.title;
        } else if (data.text) {
            contentToDisplay = data.text;
        } else if (data.content) {
            contentToDisplay = data.content;
        } else {
            // Fallback to stringifying the whole object if no specific text field is found.
            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordBreak = 'break-all';
            pre.textContent = JSON.stringify(data, null, 2);
            
            const p = document.createElement('p');
            p.className = "hero-subheading";
            p.appendChild(pre);
            container.appendChild(p);
            return; // Return after appending the preformatted object
        }

        // If we have simple text content (like a title), append it.
        // Create a new paragraph for each title.
        const p = document.createElement('p');
        p.className = "hero-subheading";
        p.innerHTML = contentToDisplay.replace(/\n/g, '<br>'); // Replace newlines just in case title has them
        container.appendChild(p);

    } else if (data) { // Handle other primitive types (e.g., a string directly)
        // This is useful if the LLM streams plain text chunks.
        let lastP = container.lastElementChild;
        if (append && lastP && lastP.tagName === 'P' && lastP.className === "hero-subheading") {
            lastP.innerHTML += String(data).replace(/\n/g, '<br>');
        } else {
            const p = document.createElement('p');
            p.className = "hero-subheading";
            p.innerHTML = String(data).replace(/\n/g, '<br>');
            container.appendChild(p);
        }
    } else if (!append) { // Only show "Unexpected data" if not appending and no data
        const p = document.createElement('p');
        p.className = "hero-subheading";
        p.innerHTML = "Unexpected data format or empty response received.";
        container.appendChild(p);
    }
}

function handleHeroButtonClick(promptName) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    showLoadingIndicator(true);
    const jsonDataContainer = document.querySelector('.json-data'); // Get container once
    jsonDataContainer.innerHTML = ''; // Clear previous results at the start

    fetch(`/call_llm?prompt=${encodeURIComponent(promptName)}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrfToken,
        }
    })
    .then(response => {
        if (!response.ok) {
            // Attempt to parse error from server as JSON, otherwise use statusText
            return response.json()
                .then(errData => {
                    throw new Error(`Server error: ${response.status} - ${errData.error || errData.detail || 'Unknown server error'}`);
                })
                .catch(() => {
                    // If parsing JSON fails, use the status text
                    throw new Error(`Server error: ${response.status} - ${response.statusText}`);
                });
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';

        function readStream() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('Stream complete.');
                    // Since we are now using ndjson, we process the last chunk if any.
                    // The main processing happens as chunks arrive.
                    // If accumulatedData is not empty, it might be an incomplete JSON fragment.
                    // Depending on the streaming protocol, you might need to handle this.
                    // For ndjson, each line is a complete JSON, so this might not be strictly necessary
                    // unless a chunk ended mid-JSON object.
                    if (accumulatedData.trim() !== '') {
                        console.warn('Stream ended with unprocessed data:', accumulatedData);
                        // Optionally, try to parse it if it's expected to be a valid JSON object
                        // or handle as an error/incomplete data.
                        // For robust ndjson, each complete line should have been processed.
                    }
                    showLoadingIndicator(false);
                    return;
                }
                const chunk = decoder.decode(value, { stream: true });
                accumulatedData += chunk;

                // Process ndjson: split by newline and parse each JSON object
                let newlineIndex;
                while ((newlineIndex = accumulatedData.indexOf('\n')) >= 0) {
                    const line = accumulatedData.substring(0, newlineIndex);
                    accumulatedData = accumulatedData.substring(newlineIndex + 1);

                    if (line.trim() !== '') {
                        try {
                            const jsonData = JSON.parse(line);
                            // Log the parsed JSON object to the browser console
                            console.log('Parsed jsonData from stream:', JSON.stringify(jsonData, null, 2)); 
                            displayResults(jsonData, true); // Pass a flag to indicate progressive update
                        } catch (e) {
                            console.error('Error parsing JSON object from stream:', e, 'Line:', line);
                            // Display an error for the specific malformed JSON object
                            displayResults({ error: 'Failed to parse a JSON object from stream.', raw_content: line }, true);
                        }
                    }
                }
                return readStream();
            });
        }
        return readStream();
    })
    .catch(error => {
        console.error('Error calling the LLM or processing stream:', error);
        showLoadingIndicator(false);
        displayResults({ error: error.message });
    });
}

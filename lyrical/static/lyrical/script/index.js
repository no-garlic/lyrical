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

function displayResults(data) {
    const container = document.querySelector('.json-data');
    container.innerHTML = ''; // Clear previous results or loading messages

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
        container.appendChild(p);
        return;
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            const p = document.createElement('p');
            p.className = "hero-subheading";
            p.innerHTML = "No results found.";
            container.appendChild(p);
            return;
        }
        data.forEach(element => {
            const p = document.createElement('p');
            p.className = "hero-subheading";
            p.innerHTML = element.title ? element.title : JSON.stringify(element);
            container.appendChild(p);
        });
    } else if (typeof data === 'object' && data !== null) {
        const p = document.createElement('p');
        p.className = "hero-subheading";
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-all';
        pre.textContent = JSON.stringify(data, null, 2);
        p.appendChild(pre);
        container.appendChild(p);
    } else if (data) { // Handle other primitive types
        const p = document.createElement('p');
        p.className = "hero-subheading";
        p.textContent = String(data);
        container.appendChild(p);
    } else {
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
                    try {
                        const jsonData = JSON.parse(accumulatedData);
                        displayResults(jsonData);
                    } catch (e) {
                        console.error('Error parsing final JSON from stream:', e, 'Accumulated data:', accumulatedData);
                        displayResults({ error: 'Failed to parse JSON from stream.', raw_content: accumulatedData });
                    }
                    showLoadingIndicator(false);
                    return;
                }
                const chunk = decoder.decode(value, { stream: true });
                accumulatedData += chunk;
                // Optional: Update UI progressively if chunks are meaningful on their own
                // For now, we accumulate and parse at the end.
                // Example for progressive update (if each chunk is a valid JSON object or part of a list):
                // try {
                //     // This assumes the stream sends newline-delimited JSON (ndjson)
                //     // or that you have a way to identify complete JSON objects in the stream.
                //     const potentialJsonObjects = accumulatedData.split('\n');
                //     potentialJsonObjects.forEach(objStr => {
                //         if (objStr.trim() !== '') {
                //             const jsonObj = JSON.parse(objStr);
                //             // Update display with jsonObj - this needs careful implementation
                //             // For example, appending to a list or updating a specific element.
                //         }
                //     });
                //     accumulatedData = ''; // Reset if objects are processed
                // } catch (e) {
                //     // Not a complete JSON object yet, or not ndjson, continue accumulating
                // }
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

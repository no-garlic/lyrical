document.addEventListener('DOMContentLoaded', function () {
    initHeroButton();
});

function initHeroButton() {
    // Set up the hero button click handler
    const heroButton = document.querySelector('.hero-btn');
    if (heroButton) {
        // Pass the desired prompt name to the handler
        // This could be made more dynamic if you have multiple buttons
        // or a way for the user to select a prompt.
        heroButton.addEventListener('click', () => handleHeroButtonClick('book_names'));
    }
}

function showLoadingIndicator(show) {
    const heroButton = document.querySelector('.hero-btn');
    const jsonDataContainer = document.querySelector('.json-data');

    if (show) {
        // Disable button and show spinner (or text)
        heroButton.disabled = true;
        heroButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Clear previous results
        jsonDataContainer.innerHTML = ''; 
    } else {
        // Enable button and restore original text
        heroButton.disabled = false;
        heroButton.innerHTML = '<i class="bi bi-play-fill"></i>Call LLM';
    }
}

function displayResults(data) {
    const container = document.querySelector('.json-data');
    container.innerHTML = ''; // Clear previous results or loading messages

    if (data && data.error) {
        const p = document.createElement('p');
        p.className = "hero-subheading text-danger"; // Added text-danger for errors
        p.innerHTML = `Error: ${data.error}`;
        if(data.raw_content) {
            const pre = document.createElement('pre');
            pre.textContent = `Raw content: ${data.raw_content}`;
            container.appendChild(pre);
        }
        if(data.traceback) {
            const pre_tb = document.createElement('pre');
            pre_tb.textContent = `Traceback: ${data.traceback}`;
            container.appendChild(pre_tb);
        }
        container.appendChild(p);
        return;
    }

    if (Array.isArray(data)) {
        data.forEach(element => {
            const p = document.createElement('p');
            p.className = "hero-subheading";
            p.innerHTML = element.title ? element.title : JSON.stringify(element);
            container.appendChild(p);
        });
    } else if (typeof data === 'object' && data !== null) {
        const p = document.createElement('p');
        p.className = "hero-subheading";
        p.innerHTML = JSON.stringify(data, null, 2);
        container.appendChild(p);
    } else {
        const p = document.createElement('p');
        p.className = "hero-subheading";
        p.innerHTML = "Unexpected data format received.";
        container.appendChild(p);
    }
}

function pollForResult(taskId, csrfToken) {
    const pollInterval = 2000; // Poll every 2 seconds

    const poller = setInterval(() => {
        fetch(`/llm_result/${taskId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Polling failed with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Poll status:', data.status);
            if (data.status === 'complete') {
                clearInterval(poller);
                showLoadingIndicator(false);
                displayResults(data.data);
            } else if (data.status === 'error') {
                clearInterval(poller);
                showLoadingIndicator(false);
                displayResults(data.data);
            } else if (data.status === 'not_found') {
                clearInterval(poller);
                showLoadingIndicator(false);
                displayResults({ error: 'Task ID not found. The task may have expired or never existed.' });
            }
        })
        .catch(error => {
            console.error('Error polling for result:', error);
            clearInterval(poller);
            showLoadingIndicator(false);
            displayResults({ error: `Error polling for results: ${error.message}` });
        });
    }, pollInterval);
}

function handleHeroButtonClick(promptName) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    showLoadingIndicator(true);

    // Add the prompt name as a query parameter
    fetch(`/call_llm?prompt=${encodeURIComponent(promptName)}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrfToken,
        }
    })
    .then(response => {
        if (!response.ok) {
            // Try to parse error from JSON response, otherwise use statusText
            return response.json().then(errData => {
                throw new Error(`Failed to initiate LLM call: ${response.status} - ${errData.error || response.statusText}`);
            }).catch(() => { // Catch if response.json() itself fails (e.g. not valid JSON)
                 throw new Error(`Failed to initiate LLM call: ${response.status} - ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('LLM call initiated:', data);
        if (data.task_id && data.status === 'processing') {
            pollForResult(data.task_id, csrfToken);
        } else if (data.error) {
            // If the server returns an error directly (e.g., prompt not found before task creation)
            throw new Error(data.error);
        } else {
            throw new Error('Failed to get a valid task ID from the server.');
        }
    })
    .catch(error => {
        console.error('Error calling the llm:', error);
        showLoadingIndicator(false);
        displayResults({ error: error.message }); // Display the error message caught
    });
}

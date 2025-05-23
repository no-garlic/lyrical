export function apiRenderComponent(componentName, targetElement, props) {
    // Get the CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Get the component HTML from the server
    return fetch(`/api_render_component/${componentName}`, { // Add return here
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(props)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.html !== undefined) { // Check if data and data.html exist
            document.getElementById(targetElement).insertAdjacentHTML('beforeend', data.html);
            return data.html; // Resolve with the HTML content or a success indicator
        } else {
            console.error('Error rendering component: Invalid data received', data);
            throw new Error('Failed to render component: Invalid data received');
        }
    })
    .catch(error => {
        console.error('Error rendering component:', error);
        throw error; // Re-throw the error to be caught by the caller
    });
}

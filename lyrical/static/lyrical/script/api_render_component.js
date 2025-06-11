/**
 * Render a component via API call and insert it into a target element.
 * @param {string} componentName - The name of the component to render.
 * @param {string} targetElement - The ID of the target element to insert the component into.
 * @param {Object} props - Properties to pass to the component.
 * @param {string} position - Either 'beforeend' or 'afterbegin'
 * @returns {Promise<string>} Promise that resolves to the rendered HTML.
 */
export function apiRenderComponent(componentName, targetElement, props, position='afterbegin') {
    // get the CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // get the component HTML from the server
    return fetch(`/api_render_component/${componentName}`, {
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
        if (data && data.html !== undefined) {
            document.getElementById(targetElement).insertAdjacentHTML(position, data.html);
            return data.html;
        } else {
            console.error('Error rendering component: Invalid data received', data);
            throw new Error('Failed to render component: Invalid data received');
        }
    })
    .catch(error => {
        console.error('Error rendering component:', error);
        throw error;
    });
}

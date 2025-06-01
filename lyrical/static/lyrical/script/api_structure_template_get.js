

export function apiStructureTemplateGet(templateId) {

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { template_id: templateId };

    // Log the request body for debugging
    console.log('Request body for template get:', JSON.stringify(requestBody, null, 2));

    // send the request to the server
    return fetch('/api_structure_template_get', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('get template operation returned success');
            return data.data;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to get the template');
        }
    })
    .catch(error => {
        console.error('Error getting template:', error);
        throw error;
    });
}
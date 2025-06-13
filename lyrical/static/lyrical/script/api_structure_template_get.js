/**
 * API function for retrieving song structure templates.
 * Handles fetching template data from the server.
 */

/**
 * Get a structure template via API call
 * @param {string} templateId - The ID of the template to retrieve
 * @returns {Promise<Object>} Promise that resolves to the template data
 */
export function apiStructureTemplateGet(templateId) {
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = { template_id: templateId };

    // Log the request body for debugging
    console.log('Request body for template get:', JSON.stringify(requestBody, null, 2));

    // Send the request to the server
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
            console.log('Get template operation returned success');
            return data.data;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to get the template');
        }
    })
    .catch(error => {
        console.error('Error getting template:', error);
        throw error;
    });
}
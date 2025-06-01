

export function apiStructureTemplateEdit(templateId, updates = {}) {
    // accept updates object with specific parameters only
    const {
        template_name: templateName,
    } = updates;

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { template_id: templateId };

    // base fields
    if (templateName) requestBody.template_name = templateName;

    // send the request to the server
    return fetch('/api_structure_template_edit', {
        method: 'PUT',
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
            console.log('edit operation returned success');
            return data.song_id;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit template');
        }
    })
    .catch(error => {
        console.error('Error editing template:', error);
        throw error;
    });
}
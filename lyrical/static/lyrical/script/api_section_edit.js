
/**
 * Edit a section via API call.
 * @param {string} sectionId - The ID of the section to edit.
 * @param {Boolean} hidden - The hidden field to update.
 * @returns {Promise<string>} Promise that resolves to the section ID.
 */
export function apiSectionEdit(sectionId, isHidden) {

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { section_id: sectionId, hidden: isHidden };

    // send the request to the server
    return fetch('/api_section_edit', {
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
            throw new Error('Failed to edit section');
        }
    })
    .catch(error => {
        console.error('Error editing section:', error);
        throw error;
    });
}
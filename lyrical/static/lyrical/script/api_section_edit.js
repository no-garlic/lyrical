/**
 * API function for editing section properties.
 * Handles updating section visibility and other properties.
 */

/**
 * Edit a section via API call
 * @param {string} sectionId - The ID of the section to edit
 * @param {boolean} isHidden - The hidden field to update
 * @returns {Promise<string>} Promise that resolves to the section ID
 */
export function apiSectionEdit(sectionId, isHidden) {
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = { section_id: sectionId, hidden: isHidden };

    // Send the request to the server
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
            console.log('Edit operation returned success');
            return data.section_id;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to edit section');
        }
    })
    .catch(error => {
        console.error('Error editing section:', error);
        throw error;
    });
}
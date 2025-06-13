/**
 * API function for bulk editing sections.
 * Handles updating multiple sections of a song at once.
 */

/**
 * Edit all sections of a song via API call
 * @param {string} songId - The ID of the song to edit
 * @param {boolean} isHidden - The hidden field to update
 * @param {Array} [styleIds=null] - Optional array of specific style IDs to update
 * @returns {Promise<string>} Promise that resolves to the song ID
 */
export function apiSectionEditBulk(songId, isHidden, styleIds = null) {
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = { song_id: songId, hidden: isHidden, style_ids: styleIds };

    // Send the request to the server
    return fetch('/api_section_edit_bulk', {
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
            return data.song_id;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to edit sections');
        }
    })
    .catch(error => {
        console.error('Error editing sections:', error);
        throw error;
    });
}
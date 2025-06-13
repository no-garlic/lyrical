/**
 * API function for bulk editing songs.
 * Handles updating the stage of multiple songs at once.
 */

/**
 * Update the stage of all songs of the specified stage via API call
 * @param {Object} [updates={}] - Object containing fields to update (song_stage_from and song_stage_to)
 * @param {string} updates.song_stage_from - The current stage to filter songs by
 * @param {string} updates.song_stage_to - The new stage to update songs to
 * @returns {Promise<Array>} Promise that resolves to the list of song IDs updated
 */
export function apiSongEditBulk(updates = {}) {
    // Accept updates object with optional song_name and/or song_stage
    const { song_stage_from: songStageFrom, song_stage_to: songStageTo } = updates;
    
    // Log the operation
    if (songStageFrom && songStageTo) {
        console.log(`Updating all songs from stage '${songStageFrom}' to stage '${songStageTo}'`);
    }

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with the data
    const requestBody = { song_stage_from: songStageFrom, song_stage_to: songStageTo };

    // Send the request to the server
    return fetch('/api_song_edit_bulk', {
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
            console.log('Bulk edit operation returned success');
            return data.updated_song_ids;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to edit songs');
        }
    })
    .catch(error => {
        console.error('Error editing songs:', error);
        throw error;
    });
}

/**
 * Update the stage of all songs of the specified stage via API call.
 * @param {Object} updates - Object containing fields to update (song_stage_from and song_stage_to).
 * @returns {Promise<string>} Promise that resolves to the list of song ID's updated.
 */
export function apiSongEditBulk(updates = {}) {
    // accept updates object with optional song_name and/or song_stage
    const { song_stage_from: songStageFrom, song_stage_to: songStageTo } = updates;
    
    // log the operation
    if (songStageFrom && songStageTo) {
        console.log(`updating all songs from stage '${songStageFrom}' to stage '${songStageTo}'`);
    }

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with the data
    const requestBody = { song_stage_from: songStageFrom, song_stage_to: songStageTo };

    // send the request to the server
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
            console.log('bulk edit operation returned success');
            return data.updated_song_ids;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit songs');
        }
    })
    .catch(error => {
        console.error('Error editing songs:', error);
        throw error;
    });
}
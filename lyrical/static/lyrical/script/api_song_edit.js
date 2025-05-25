
/**
 * Edit a song via API call.
 * @param {string} songId - The ID of the song to edit.
 * @param {Object} updates - Object containing fields to update (song_name and/or song_stage).
 * @returns {Promise<string>} Promise that resolves to the song ID.
 */
export function apiSongEdit(songId, updates = {}) {
    // accept updates object with optional song_name and/or song_stage
    const { song_name: songName, song_stage: songStage } = updates;
    
    // for backward compatibility, if updates is a string, treat it as songName
    if (typeof updates === 'string') {
        const songName = updates;
        return apiSongEdit(songId, { song_name: songName });
    }

    // log the operation
    if (songName && songStage) {
        console.log(`editing song_id: ${songId} - name to '${songName}' and stage to '${songStage}'`);
    } else if (songName) {
        console.log(`editing song_id: ${songId} to new name: ${songName}`);
    } else if (songStage) {
        console.log(`moving song_id: ${songId} to new stage: ${songStage}`);
    }

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { song_id: songId };
    if (songName) requestBody.song_name = songName;
    if (songStage) requestBody.song_stage = songStage;

    // send the request to the server
    return fetch('/api_song_edit', {
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
            throw new Error('Failed to edit song');
        }
    })
    .catch(error => {
        console.error('Error editing song:', error);
        throw error;
    });
}
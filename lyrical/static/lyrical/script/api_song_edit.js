
export function apiSongEdit(songId, updates = {}) {
    // Accept updates object with optional song_name and/or song_stage
    const { song_name: songName, song_stage: songStage } = updates;
    
    // For backward compatibility, if updates is a string, treat it as songName
    if (typeof updates === 'string') {
        const songName = updates;
        return apiSongEdit(songId, { song_name: songName });
    }

    // Log the operation
    if (songName && songStage) {
        console.log(`editing song_id: ${songId} - name to '${songName}' and stage to '${songStage}'`);
    } else if (songName) {
        console.log(`editing song_id: ${songId} to new name: ${songName}`);
    } else if (songStage) {
        console.log(`moving song_id: ${songId} to new stage: ${songStage}`);
    }

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = { song_id: songId };
    if (songName) requestBody.song_name = songName;
    if (songStage) requestBody.song_stage = songStage;

    // Send the request to the server
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
            return data.song_id; // Resolve with song_id
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit song');
        }
    })
    .catch(error => {
        console.error('Error editing song:', error);
        // Error will be caught and displayed by caller using toast
        throw error; // Re-throw the error to be caught by the caller
    });
}
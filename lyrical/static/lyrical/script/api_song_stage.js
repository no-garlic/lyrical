
export function apiSongStage(songId, songStage) {
    // Log the operation
    console.log(`moving song_id: ${songId} to new stage: ${songStage}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the request to the server
    return fetch('/api_song_stage', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            song_id: songId,
            song_stage: songStage
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('update song stage operation returned success');
            return data.song_id; // Resolve with song_id
        } else {
            console.log('no data.status received');
            throw new Error('Failed to update song stage');
        }
    })
    .catch(error => {
        console.error('Error updating song stage:', error);
        // Error will be caught and displayed by caller using toast
        throw error; // Re-throw the error to be caught by the caller
    });
}
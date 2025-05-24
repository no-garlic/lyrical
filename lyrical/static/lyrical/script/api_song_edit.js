
export function apiSongEdit(songId, songName) {
    // Log the operation
    console.log(`editing song_id: ${songId} to new name: ${songName}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the request to the server
    return fetch('/api_song_edit', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            song_id: songId,
            song_name: songName
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
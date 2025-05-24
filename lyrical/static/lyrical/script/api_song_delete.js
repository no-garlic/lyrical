
export function apiSongDelete(songId) {
    // Log the operation
    console.log(`deleting song_id: ${songId}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the request to the server
    return fetch('/api_song_delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            song_id: songId
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
            console.log('delete operation returned success');
            return true; // Resolve with success
        } else {
            console.log('no data.status received');
            throw new Error('Failed to delete song');
        }
    })
    .catch(error => {
        console.error('Error deleting song:', error);
        // TODO: Add visual error display to user
        throw error; // Re-throw the error to be caught by the caller
    });
}
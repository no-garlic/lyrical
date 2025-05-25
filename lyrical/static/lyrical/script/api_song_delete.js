
/**
 * Delete a song via API call.
 * @param {string} songId - The ID of the song to delete.
 * @returns {Promise<string>} Promise that resolves to the song ID.
 */
export function apiSongDelete(songId) {
    // log the operation
    console.log(`deleting song_id: ${songId}`);

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // send the request to the server
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
            return data.song_id;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to delete song');
        }
    })
    .catch(error => {
        console.error('Error deleting song:', error);
        throw error;
    });
}
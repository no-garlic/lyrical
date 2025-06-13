/**
 * API function for adding new songs.
 * Handles song creation via REST API.
 */

/**
 * Add a new song via API call
 * @param {string} songName - The name of the song to add
 * @returns {Promise<string>} Promise that resolves to the song ID
 */
export function apiSongAdd(songName) {
    // Log the operation
    console.log(`Adding new song with name: ${songName}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the request to the server
    return fetch('/api_song_add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
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
        if (data.status === 'success' && data.song_id) {
            console.log('Add operation returned success, new song id: ', data.song_id);
            return data.song_id;
        } else {
            console.log('No data.status received or song_id missing');
            throw new Error('Failed to add song or song_id missing in response');
        }
    })
    .catch(error => {
        console.error('Error adding song:', error);
        throw error;
    });
}
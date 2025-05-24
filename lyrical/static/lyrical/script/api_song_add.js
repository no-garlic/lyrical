
export function apiSongAdd(songName) {
    // Log the operation
    console.log(`adding new song with name: ${songName}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the rating to the server
    return fetch('/api_song_add', { // Add return here
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
            console.log('add operation returned success, new song id: ', data.song_id);
            return data.song_id; // Resolve with song_id
        } else {
            console.log('no data.status received or song_id missing');
            throw new Error('Failed to add song or song_id missing in response');
        }
    })
    .catch(error => {
        console.error('Error adding song:', error);
        throw error; // Re-throw the error to be caught by the caller
    });
}
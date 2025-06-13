/**
 * Edit song lyrics via API call
 * @param {string} songId - The ID of the song to edit
 * @param {string} lyrics - The lyrics content to update
 * @returns {Promise<string>} Promise that resolves to the song ID
 */
export function apiLyricsEdit(songId, lyrics) {
    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { song_id: songId, lyrics: lyrics };

    // log the request body for debugging
    console.log('Request body for song lyrics edit:', JSON.stringify(requestBody, null, 2));

    // send the request to the server
    return fetch('/api_lyrics_edit', {
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
            throw new Error('Failed to edit song lyrics');
        }
    })
    .catch(error => {
        console.error('Error editing song lyrics:', error);
        throw error;
    });
}

export function api_song_delete(songId) {
    // Log the operation
    console.log(`deleting song_id: ${songId}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the rating to the server
    fetch('/api_song_delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        },
        body: `song_id=${songId}`,
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('delete operation returned success')
            return true;
        } else {
            console.log('no data.status received')
        }

    })
    .catch(error => {
        console.error('Error deleting song:', error);
        return false;
    });    

    return true;
}
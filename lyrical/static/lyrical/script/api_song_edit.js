
export function api_song_edit(songId, songName) {
    // Log the operation
    console.log(`editing song_id: ${songId} to new name: ${songName}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the rating to the server
    fetch('/api_song_edit', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            song_id: songId,
            song_name: songName
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('edit operation returned success')
            return true;
        } else {
            console.log('no data.status received')
        }

    })
    .catch(error => {
        console.error('Error editing song:', error);
        return false;
    });    

    return true;
}

export function apiSongAdd(songName) {
    // Log the operation
    console.log(`adding new song with name: ${songName}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the rating to the server
    fetch('/api_song_add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            song_name: songName
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('add operation returned success')
            return true;
        } else {
            console.log('no data.status received')
        }

    })
    .catch(error => {
        console.error('Error adding song:', error);
        return false;
    });    

    return true;
}
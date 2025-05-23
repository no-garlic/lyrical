
export function apiSongStage(songId, songStage) {
    // Log the operation
    console.log(`moving song_id: ${songId} to new stage: ${songStage}`);

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the rating to the server
    fetch('/api_song_stage', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            song_id: songId,
            song_stage: songStage
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('update song stage operation returned success')
            return true;
        } else {
            console.log('no data.status received')
        }

    })
    .catch(error => {
        console.error('Error updating song stage:', error);
        return false;
    });    

    return true;
}
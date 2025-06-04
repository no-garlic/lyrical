
import { apiLyricsEdit } from './api_lyrics_edit.js';
import { toastSystem } from './util_toast.js';


const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
});


function initPageActions() {
    document.getElementById('btn-navigate-next').onclick = exportSong;
    document.getElementById('btn-navigate-prev').onclick = navigatePrevious;

    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');

    document.getElementById('btn-navigate-next').innerHTML = '<p>Export Song</p>';

    const saveButton = document.getElementById('btn-save');
    saveButton.classList.remove('btn-disabled');
    saveButton.onclick = saveLyrics;
}


function saveLyrics() {
    let lyrics = {}

    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
         console.log(`saving lyrics for id='${item.dataset.lyricsId}' with words='${item.value}'`);
         lyrics[item.dataset.lyricsId] = item.value;
        });

    console.log(`the lyrics are: ${lyrics}`);

    apiLyricsEdit(songId, lyrics)
        .then(songId => {
            console.log(`sucessfully saved song lyrics for song id=${songId}`)
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song lyrics:', error);
            toastSystem.showError('Failed to update the song lyrics. Please try again.');
        });

}


function exportSong() {
    
}


function navigatePrevious() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/hook/${songId}`;
}

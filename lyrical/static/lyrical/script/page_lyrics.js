
import { apiLyricsEdit } from './api_lyrics_edit.js';
import { toastSystem } from './util_toast.js';


let lyricsDirty = false;
let lyricsHistory = {}


const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    copyToSaveHistory();
});


function initPageActions() {
    document.getElementById('btn-navigate-next').onclick = exportSong;
    document.getElementById('btn-navigate-prev').onclick = navigatePrevious;

    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');

    document.getElementById('btn-navigate-next').innerHTML = '<p>Export Song</p>';

    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        item.addEventListener('input', setLyricsDirty);
    });

    const saveButton = document.getElementById('btn-save');
    saveButton.onclick = saveLyrics;
    const cancelButton = document.getElementById('btn-cancel');
    cancelButton.onclick = cancelLyrics;
}


function setLyricsDirty(dirty = true) {
    if (dirty && !lyricsDirty) {
        lyricsDirty = true;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.remove('btn-disabled');
        const cancelButton = document.getElementById('btn-cancel');
        cancelButton.classList.remove('btn-disabled');
    } else if (!dirty && lyricsDirty) {
        lyricsDirty = false;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.add('btn-disabled');
        const cancelButton = document.getElementById('btn-cancel');
        cancelButton.classList.add('btn-disabled');
    }
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
            copyToSaveHistory();
            setLyricsDirty(false);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song lyrics:', error);
            toastSystem.showError('Failed to update the song lyrics. Please try again.');
        });
}


function cancelLyrics() {
    copyFromSaveHistory();
    setLyricsDirty(false);
}


function copyToSaveHistory() {
    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        lyricsHistory[item.dataset.lyricsId] = item.value;
    });
}


function copyFromSaveHistory() {
    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        item.value = lyricsHistory[item.dataset.lyricsId];
    });
}


function exportSong() {    
}


function navigatePrevious() {
    window.location.href = `/hook/${songId}`;
}

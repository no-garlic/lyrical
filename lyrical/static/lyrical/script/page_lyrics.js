
import { StreamHelper } from "./util_stream_helper.js";
import { apiLyricsEdit } from './api_lyrics_edit.js';
import { toastSystem } from './util_toast.js';


let streamHelper;
let lyricsDirty = false;
let lyricsHistory = {}


const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initGeneration();
    copyToSaveHistory();
    updateLyricsListing();
});


function initPageActions() {
    document.getElementById('btn-navigate-next').onclick = navigateNext;
    document.getElementById('btn-navigate-prev').onclick = navigatePrevious;

    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');

    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        item.addEventListener('input', setLyricsDirty);
    });

    const saveButton = document.getElementById('btn-save');
    saveButton.onclick = saveLyrics;
    const undoButton = document.getElementById('btn-undo');
    undoButton.onclick = undoLyrics;
    const copyButton = document.getElementById('btn-copy');
    copyButton.onclick = copyLyrics;
    const exportButton = document.getElementById('btn-export');
    exportButton.onclick = exportLyrics;
}


function initGeneration() {
    const generateButton = document.getElementById('btn-generate');
    if (generateButton) {
        streamHelper = createStreamHelper();
        generateButton.addEventListener('click', handleGenerateClick);
    }
}


function handleGenerateClick() {
    const requestParams = buildRequestParams();
    streamHelper.initiateRequest(requestParams);
}


function buildRequestParams() {
    let params = {
        prompt: 'song_lyrics',
        song_id: songId,
    };

    return params;
}


function createStreamHelper() {
    return new StreamHelper('/api_gen_song_lyrics', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleLoadingStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleIncomingData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: () => {
                console.log("stream complete");
                handleLoadingEnd();
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleIncomingError(error);
            }
        }
    });
}


function handleIncomingData(data) {
    if (data) {
        for (const [section, words] of Object.entries(data)) {
            const lyrics = words.join('\n');
            displayLyrics(section, lyrics);
        }
    } else {
        handleIncomingError(data);
    }
}


function handleIncomingError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


function handleLoadingStart() {
    // get the buttons
    const generateButton = document.getElementById('btn-generate');
    const generatingButton = document.getElementById('btn-generating');
    
    // hide the generate button
    if (generateButton) {
        generateButton.classList.add('hidden');
    }

    // show the generating button in disabled state
    if (generatingButton) {
        generatingButton.classList.remove('hidden');
    }
}


function handleLoadingEnd() {
    // get the buttons
    const generateButton = document.getElementById('btn-generate');
    const generatingButton = document.getElementById('btn-generating');
    
    // hide the generate button
    if (generateButton) {
        generateButton.classList.remove('hidden');
    }

    // show the generating button in disabled state
    if (generatingButton) {
        generatingButton.classList.add('hidden');
    }
}


function displayLyrics(section, words) {
    document.querySelectorAll(`.section-${section}`).forEach(element => {
        element.value = words;
        setLyricsDirty(true);
    });
}


function updateLyricsListing() {
    const container = document.getElementById('song-lyrics-text')
    container.innerHTML = '';


    document.querySelectorAll('.badge').forEach(element => {
        const sectionType = element.dataset.sectionType;
        const sectionIndex = element.dataset.sectionIndex;
        const sectionWordsId = element.dataset.sectionWordsId;

        if (sectionType === 'INTRO') {
            container.innerHTML += '[INSTRUMENTAL INTRO]<br>';
        } else if (sectionType === 'INTERLUDE') {
            container.innerHTML += '[MELODIC INTERLUDE]<br>';
        } else if (sectionIndex > 0) {
            container.innerHTML += '[' + sectionType + ' ' + sectionIndex + ']<br>';
        } else {
            container.innerHTML += '[' + sectionType + ']<br>';
        }

        if (sectionWordsId.length > 0) {
            const textArea = document.getElementById(sectionWordsId);
            const textValue = textArea.value;
            const htmlValue = textValue.replace(/\n/g, '<br>');

            container.innerHTML += htmlValue + '<br>';
        }
        container.innerHTML += '<br>';
    });

    container.innerHTML += '[END]';

    if (container.innerHTML.length > 0) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}


function copyLyrics() {
    const container = document.getElementById('song-lyrics-text')
    const lyrics = container.innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(lyrics).then(() => {
            console.log('Lyrics copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy lyrics:', err);
            toastSystem.showError('Failed to copy lyrics to clipboard');
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = lyrics;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            console.log('Lyrics copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy lyrics:', err);
            toastSystem.showError('Failed to copy lyrics to clipboard');
        }
        
        document.body.removeChild(textArea);
    }
}


function exportLyrics() {
    const container = document.getElementById('song-lyrics-text')
    const lyrics = container.innerText;

    const exportButton = document.getElementById('btn-export');
    const songName = exportButton.dataset.songName;

    // Clean up the filename by replacing spaces and removing special characters
    // Fallback to 'song_lyrics' if songName is empty or undefined
    const cleanName = (songName || 'song_lyrics')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim() || 'song_lyrics';
    const fileName = cleanName + '.txt';

    // Create a blob with the lyrics content
    const blob = new Blob([lyrics], { type: 'text/plain' });
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`Lyrics exported as ${fileName}`);
}


function setLyricsDirty(dirty = true) {
    if (dirty) updateLyricsListing();

    if (dirty && !lyricsDirty) {
        lyricsDirty = true;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.remove('btn-disabled');
        const undoButton = document.getElementById('btn-undo');
        undoButton.classList.remove('btn-disabled');
    } else if (!dirty && lyricsDirty) {
        lyricsDirty = false;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.add('btn-disabled');
        const undoButton = document.getElementById('btn-undo');
        undoButton.classList.add('btn-disabled');
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


function undoLyrics() {
    copyFromSaveHistory();
    updateLyricsListing();
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


function navigateNext() {
    window.location.href = `/edit/${songId}`;
}


function navigatePrevious() {
    window.location.href = `/structure/${songId}`;
}

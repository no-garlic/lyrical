
import { StreamHelper } from "./util_stream_helper.js";
import { apiLyricsEdit } from './api_lyrics_edit.js';
import { toastSystem } from './util_toast.js';


let streamHelper;
let lyricsDirty = false;
let lyricsHistory = {}


const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initBadgeActions();
    initStreamHelper();
    copyToSaveHistory();
    updateLyricsListing();
});


// =================================================================================
// Initialise the systems
// =================================================================================


function initPageActions() {
    // navigate next button
    const nextButton = document.getElementById('btn-navigate-next');
    nextButton.classList.remove('btn-disabled');
    nextButton.onclick = () => { window.location.href = `/edit/${songId}`; };

    // navigate previous button
    const prevButton = document.getElementById('btn-navigate-prev');
    prevButton.classList.remove('btn-disabled');
    prevButton.onclick = () => { window.location.href = `/structure/${songId}`; };

    // text input event handlers
    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        item.addEventListener('input', setLyricsDirty);
    });

    // general page actions
    document.getElementById('btn-save').onclick = saveLyrics;
    document.getElementById('btn-undo').onclick = undoLyrics;
    document.getElementById('btn-copy').onclick = copyLyrics;
    document.getElementById('btn-export').onclick = exportLyrics;
}


function initBadgeActions() {
    document.querySelectorAll('.badge-tools-button').forEach(button => {
        button.onclick = badgeToolsButtonClick;
    });
    document.querySelectorAll('.badge-exit-button').forEach(button => {
        button.onclick = badgeExitButtonClick;
    });
    document.querySelectorAll('.badge-interactive-button').forEach(button => {
        button.onclick = badgeInteractiveButtonClick;
    });
    document.querySelectorAll('.badge-textedit-button').forEach(button => {
        button.onclick = badgeTextEditButtonClick;
    });
    document.querySelectorAll('.badge-regenerate-button').forEach(button => {
        button.onclick = badgeRegenerateButtonClick;
    });
}


function initStreamHelper() {
    const generateButton = document.getElementById('btn-generate');
    if (generateButton) {
        streamHelper = createStreamHelper();
        generateButton.addEventListener('click', handleGenerateClick);
    }
}


// =================================================================================
// Streaming Data for Song Generation
// =================================================================================


function handleGenerateClick() {
    const requestParams = {
        prompt: 'song_lyrics',
        song_id: songId,
    };
    streamHelper.initiateRequest(requestParams);
}


function createStreamHelper() {
    return new StreamHelper('/api_gen_song_lyrics', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleDataStreamStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleDataStreamData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: () => {
                console.log("stream complete");
                handleDataStreamEnd();
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleDataStreamError(error);
            }
        }
    });
}


function handleDataStreamStart() {
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


function handleDataStreamEnd() {
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


function handleDataStreamData(data) {
    if (data) {
        for (const [section, words] of Object.entries(data)) {
            const lyrics = words.join('\n');
            displayLyrics(section, lyrics);
        }
    } else {
        handleDataStreamError(data);
    }
}


function handleDataStreamError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


// =================================================================================
// Lyrics Management & Actions
// =================================================================================


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
            container.innerHTML += '<strong>[INSTRUMENTAL INTRO]</strong>';
        } else if (sectionType === 'INTERLUDE') {
            container.innerHTML += '<strong>[MELODIC INTERLUDE]</strong>';
        } else if (sectionIndex > 0) {
            container.innerHTML += '<strong>[' + sectionType + ' ' + sectionIndex + ']</strong>';
        } else {
            container.innerHTML += '<strong>[' + sectionType + ']</strong>';
        }

        if (sectionWordsId.length > 0) {
            const textArea = document.getElementById(sectionWordsId);
            const textValue = textArea.value;
            const htmlValue = textValue.replace(/\n/g, '<br>');

            container.innerHTML += htmlValue + '<br>';
        }
        container.innerHTML += '<br>';
    });

    container.innerHTML += '<strong>[END]</strong>';

    if (container.innerHTML.length > 0) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}


function copyLyrics() {
    const container = document.getElementById('song-lyrics-text')
    const lyrics = container.innerText.replace(/\n\s*\n\s*\n+/g, '\n\n');

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
    const lyrics = container.innerText.replace(/\n\s*\n\s*\n+/g, '\n\n');

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


// =================================================================================
// Badge Actions
// =================================================================================


function badgeToolsButtonClick() {
    const buttonEdit = this;

    const songSectionCard = buttonEdit.parentNode.parentNode;
    const buttonExit = buttonEdit.previousElementSibling;
    const buttonInteractive = buttonExit.previousElementSibling;
    const buttonTextEdit = buttonInteractive.previousElementSibling;
    const buttonRegenerate = buttonTextEdit.previousElementSibling;

    buttonEdit.classList.add('hidden');
    buttonExit.classList.remove('hidden');
    buttonInteractive.classList.remove('hidden');
    buttonTextEdit.classList.remove('hidden');
    buttonRegenerate.classList.remove('hidden');   

    hideOrShowAllSections('hide', songSectionCard);
}


function badgeExitButtonClick() {
    const buttonExit = this;

    
    const buttonEdit = buttonExit.nextElementSibling;
    const buttonInteractive = buttonExit.previousElementSibling;
    const buttonTextEdit = buttonInteractive.previousElementSibling;
    const buttonRegenerate = buttonTextEdit.previousElementSibling;

    buttonEdit.classList.remove('hidden');
    buttonExit.classList.add('hidden');
    buttonInteractive.classList.add('hidden');
    buttonTextEdit.classList.add('hidden');
    buttonRegenerate.classList.add('hidden');

    const editPanel = buttonEdit.parentNode.nextElementSibling.children[0];
    const textArea = buttonEdit.parentNode.nextElementSibling.children[1];

    editPanel.classList.add('hidden');
    textArea.classList.remove('hidden');

    hideOrShowAllSections('show');
}


function badgeInteractiveButtonClick() {
    const buttonInteractive = this;

    const editPanel = buttonInteractive.parentNode.nextElementSibling.children[0];
    const textArea = buttonInteractive.parentNode.nextElementSibling.children[1];
    const lyrics = textArea.value;

    editPanel.innerText = lyrics;

    editPanel.classList.remove('hidden');
    textArea.classList.add('hidden');    
}


function badgeTextEditButtonClick() {
    
}


function badgeRegenerateButtonClick() {
    
}


function hideOrShowAllSections(showOrHide, except=null) {
    document.querySelectorAll('.song-section-card').forEach(card => {
        if (card != except) {
            if (showOrHide === 'show') {
                card.classList.remove('hidden');
            } else if (showOrHide === 'hide') {
                card.classList.add('hidden');
            } else {
                console.error(`hideOrShowAllSections: invalid showOrHide argument (${showOrHide}), must be 'show' or 'hide' `);
            }
        }
    });
}



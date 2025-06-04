
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

    const filterType = getFilterType();
    if (filterType != undefined) {
        params.filter = filterType;
    }

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






function getFilterType() {
    let filterType = undefined;

    document.querySelectorAll('[id*="tab-filter-"]').forEach(tab => {
        if (tab.checked) {
            filterType = tab.dataset.filterType;
        }
    });

    return filterType;
}


function applyFilter() {
    /*
    const filterType = getFilterType();
    const container = document.getElementById('generated-styles');

    if (filterType === undefined) {
        Array.from(container.children).forEach(node => {
            node.classList.remove('hidden');
        });
    } else {
        Array.from(container.children).forEach(node => {
            if (node.dataset.styleType === filterType) {
                node.classList.remove('hidden');
            } else {
                node.classList.add('hidden');
            }
        });
    }
    */
}






function displayLyrics(section, words) {
    console.log(`lyrics [${section}]:\n${words}\n`);

    document.querySelectorAll(`.section-${section}`).forEach(element => {
        element.value = words;
    });

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

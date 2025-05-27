
/**
 * Song name generation functionality.
 * Handles streaming requests, generation parameters, and data processing.
 */

import { StreamHelper } from "./util_stream_helper.js";
import { handleLoadingStart, handleLoadingEnd } from './page_names_ui_state.js';
import { toastSystem } from './util_toast.js';

let streamHelper;

/**
 * Initialize the generation system.
 */
export function initGeneration() {
    
    // disable the generating button
    const generatingButton = document.getElementById('btn-generating-song-names');
    if (generatingButton) {
        generatingButton.disabled = true;
        generatingButton.classList.add('hidden', 'btn-disabled');
    }

    // set the event listener on the generate button
    const generateButton = document.getElementById('btn-generate-song-names');
    if (generateButton) {
        streamHelper = createStreamHelper();
        generateButton.addEventListener('click', handleGenerateClick);
    }

    // Add event listener for Enter key on form inputs
    document.querySelectorAll('.input-control').forEach(inputControl => {
        if (inputControl) {
            inputControl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleGenerateClick();
                }
            });
        }
    });
}

/**
 * Handle the generate button click event.
 * Builds request parameters and initiates the stream request.
 */
function handleGenerateClick() {
    const requestParams = buildRequestParams();
    streamHelper.initiateRequest(requestParams);
}

/**
 * Create and configure the stream helper.
 * Sets up callbacks for handling stream events and data.
 * @returns {StreamHelper} Configured stream helper instance.
 */
function createStreamHelper() {
    return new StreamHelper('/api_gen_song_names', {
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

/**
 * Build the request parameters for the stream.
 * Configures the parameters for generating song names.
 * @returns {Object} Request parameters object.
 */
function buildRequestParams() {
    return {
        prompt: 'song_names',
        include_themes: document.getElementById('input-include-themes').value,
        exclude_themes: document.getElementById('input-exclude-themes').value,
        include_words: document.getElementById('input-include-words').value,
        exclude_words: document.getElementById('input-exclude-words').value,
        starts_with: document.getElementById('input-starts-with').value,
        ends_with: document.getElementById('input-ends-with').value,
        count: parseInt(document.getElementById('input-count').value, 10),
        min_words: parseInt(document.getElementById('input-min-words').value, 10),
        max_words: parseInt(document.getElementById('input-max-words').value, 10)
    };
}

/**
 * Handle incoming data from the stream.
 * Processes new song data and adds it to the page.
 * @param {Object} data - The incoming song data containing id and name.
 */
function handleIncomingData(data) {
    if (data && data.id && typeof data.id === 'number') {
        // Dispatch custom event with song data
        const event = new CustomEvent('newSongGenerated', {
            detail: { songId: data.id, songName: data.name }
        });
        document.dispatchEvent(event);
    } else {
        handleIncomingError(data);
    }
}

/**
 * Handle incoming errors from the stream.
 * @param {*} error - The error data.
 */
function handleIncomingError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}

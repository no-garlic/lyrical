
/**
 * Song style generation functionality.
 * Handles streaming requests, generation parameters, and data processing.
 */

import { StreamHelper } from "./util_stream_helper.js";
import { toastSystem } from './util_toast.js';
import { apiRenderComponent } from './api_render_component.js';
import { apiSectionEdit } from './api_section_edit.js';


let streamHelper;


document.addEventListener('DOMContentLoaded', () => {
    initStyleCards();
    initGeneration();
});


/**
 * Initialize the generation system.
 */
function initGeneration() {
    
    // set the event listener on the generate button
    const generateButton = document.getElementById('btn-generate');
    if (generateButton) {
        streamHelper = createStreamHelper();
        generateButton.addEventListener('click', handleGenerateClick);
    }

    // Add event listener for Enter key on form inputs
    document.getElementById('prompt-text').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleGenerateClick();
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
    return new StreamHelper('/api_gen_song_styles', {
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
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);

    return {
        prompt: 'song_styles',
        custom_prompt: document.getElementById('prompt-text').value,
        song_id: songId,
    };
}


/**
 * Handle incoming data from the stream.
 * Processes new song data and adds it to the page.
 * @param {Object} data - The incoming song data containing id and name.
 */
function handleIncomingData(data) {
    if (data && data.id && typeof data.id === 'number') {
        addStyleCardFromData(data);
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


/**
 * Handle UI changes when loading starts.
 */
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


/**
 * Handle UI changes when loading ends.
 */
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


function addStyleCardFromData(data) {
    if (data.theme != undefined) {
        addStyleCard('badge-success', 'THEME', data.theme, data.id);
    } else if (data.narrative != undefined) {
        addStyleCard('badge-warning', 'NARRATIVE', data.narrative, data.id);
    } else if (data.mood != undefined) {
        addStyleCard('badge-info', 'MOOD', data.mood, data.id);
    } else {
        toastSystem.showError(`Bad data received for style: ${JSON.stringify(data)}`);
    }
}


function addStyleCard(badgeStyle, badgeName, cardText, sectionId) {
    apiRenderComponent('card_style', 'generated-styles', { section: { id: sectionId, badge_name: badgeName, badge_style: badgeStyle, text: cardText }})
        .then(html => {
            // initialize the new style card for interactions
            initNewStyleCard(sectionId);
        })
        .catch(error => {
            // handle the error if the component rendering fails
            console.error('Failed to render or initialize new style card:', error);
            toastSystem.showError('Failed to display the new style. Please refresh the page.');
        });
}


function initStyleCards() {
    const container = document.getElementById('generated-styles');
    Array.from(container.children).forEach(node => {
        initNewStyleCard(node.dataset.styleId);
    });
}


function initNewStyleCard(sectionId) {
    const hideButton = document.getElementById(`btn-style-hide-${sectionId}`);

    hideButton.onclick = (event) => {
        const styleCard = document.getElementById(`style-card-${sectionId}`);
        const container = document.getElementById('generated-styles');

        // call the api to update the section to set the hidden flag to true
        apiSectionEdit(sectionId, true)
            .then(sectionId => {
                // update the text on the song card
                console.log(`Successfully updated sectionId: ${sectionId}`);

                // hide the card from the list
                container.removeChild(styleCard);
            })
            .catch(error => {
                // handle the error if the API call fails
                console.error('Failed to edit the section:', error);
                toastSystem.showError('Failed to update the section. Please try again.');
            });

        
    }
}


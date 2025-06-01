/**
 * Song hook generation functionality.
 * Handles streaming requests, generation parameters, and data processing.
 */

import { StreamHelper } from "./util_stream_helper.js";
import { toastSystem } from './util_toast.js';
import { apiRenderComponent } from './api_render_component.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiSectionEdit } from './api_section_edit.js';
import { apiSectionEditBulk } from './api_section_edit_bulk.js';
import { DragDropSystem } from './util_dragdrop.js';


let streamHelper;
let dragDropSystem;
let hookTextDirty = false;
let songParamsDirty = false;
let saveHistory = { theme: '', narrative: '', mood: '' };


document.addEventListener('DOMContentLoaded', () => {
    initHookCards();
    initGeneration();
    initPageActions();
    initDragDrop();

    updateSaveHistory();
    updateNavigationButtonStates();
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
 * Initialize the drag and drop system.
 * @returns {DragDropSystem} The initialized drag drop system.
 */
function initDragDrop() {
    
    // create the drag and drop system and assign to module-level variable
    dragDropSystem = new DragDropSystem({ 
        insertElementOnDrop: false
    });

    // initialise it
    dragDropSystem.init({
        onDragStart: (item, event) => {
        },
        onDrop: handleDragDrop,
        canDrop: (item, zone, event) => {
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
        },
        onDragLeaveZone: (item, zone, event) => {
        }
    });

    // register draggable items (song cards)
    document.querySelectorAll('.style-card').forEach(card => {
        registerCardForDragDrop(card);
    });

    return dragDropSystem;
}


/**
 * Handle the drag and drop of a song card.
 * Updates the song stage when dropped into a new zone and sorts the cards.
 * @param {Object} item - The dragged item containing element and data.
 * @param {Object} zone - The drop zone where the item was dropped.
 * @param {Event} event - The drop event.
 */
function handleDragDrop(item, zone, event) {
    const styleId = item.element.dataset.styleId;
    const styleType = item.element.dataset.styleType;
    const textElement = document.getElementById(`style-card-text-${styleId}`);
    const destinationId = 'hook-text'
    const destination = document.getElementById(destinationId);

    let text = textElement.innerHTML.trim();
    text = text.replace('<br>', '\n');

    console.log(`dropping hook ${styleId} [${styleType}] with text: '${text}'`);

    if (destination.value.trim() != text) {
        destination.value = text;
        setSongHookDirty();
    }
}

/**
 * Register a card for the drag and drop system.
 * @param {HTMLElement} card - The card element to register.
 */
function registerCardForDragDrop(card) {
    const styleId = card.dataset.sectionId;
    const sectionType = card.dataset.sectionType;
    console.log(`registering card for drag-drop: ${card.dataset.styleId}`)
    dragDropSystem.registerDraggable(card, { styleId, sectionType });
}


function initPageActions() {
    document.getElementById('btn-navigate-next').onclick = navigateNext;
    document.getElementById('btn-navigate-prev').onclick = navigatePrevious;
    document.getElementById('btn-clear').onclick = clearGeneratedHooks;
    document.getElementById('btn-save').onclick = saveHook;
    document.getElementById('btn-save-parameters').onclick = saveParameters;
    document.getElementById('btn-cancel').onclick = cancelHook;

    document.getElementById('hook-text').addEventListener('input', setSongHookDirty);

    document.getElementById('prompt-text').addEventListener('input', setSongParamsDirty);
    document.getElementById('rhyme-with').addEventListener('input', setSongParamsDirty);
    document.getElementById('vocalisation-level').addEventListener('input', setSongParamsDirty);
    document.getElementById('vocalisation-terms').addEventListener('input', setSongParamsDirty);
    document.getElementById('max-hook-lines').addEventListener('input', setSongParamsDirty);
    document.getElementById('max-syllables-per-line').addEventListener('input', setSongParamsDirty);
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
    return new StreamHelper('/api_gen_song_hooks', {
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

    let params = {
        prompt: 'song_hooks',
        custom_prompt: document.getElementById('prompt-text').value,
        vocalisation_terms: document.getElementById('vocalisation-terms').value,
        vocalisation_level: document.getElementById('vocalisation-level').value,
        lines: parseInt(document.getElementById('max-hook-lines').value),
        count: 10,
        syllables: parseInt(document.getElementById('max-syllables-per-line').value),
        rhyme: document.getElementById('rhyme-with').value,
        song_id: songId,
    };

    return params;
}


/**
 * Handle incoming data from the stream.
 * Processes new song data and adds it to the page.
 * @param {Object} data - The incoming song data containing id and name.
 */
function handleIncomingData(data) {
    if (data && data.id && typeof data.id === 'number') {
        addHookCardFromData(data);
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


function addHookCardFromData(data) {
    if (data.hook != undefined) {
        addStyleCard('badge-hook', 'HOOK', data.hook, data.id);
    } else {
        toastSystem.showError(`Bad data received for hook: ${JSON.stringify(data)}`);
    }
}


function addStyleCard(badgeStyle, badgeName, cardText, sectionId) {
    apiRenderComponent('card_style', 'generated-hooks', { section: { id: sectionId, badge_name: badgeName, badge_style: badgeStyle, text: cardText }})
        .then(html => {
            // initialize the new style card for interactions
            initNewStyleCard(sectionId);

            // register with the drag-drop system
            const styleCard = document.getElementById(`style-card-${sectionId}`);
            registerCardForDragDrop(styleCard);

            // update the UI button states
            updateClearButtonState();
        })
        .catch(error => {
            // handle the error if the component rendering fails
            console.error('Failed to render or initialize new style card:', error);
            toastSystem.showError('Failed to display the new hook. Please refresh the page.');
        });
}


function initHookCards() {
    const container = document.getElementById('generated-hooks');
    Array.from(container.children).forEach(node => {
        initNewStyleCard(node.dataset.styleId);
    });

    updateClearButtonState();
}


function initNewStyleCard(sectionId) {
    const hideButton = document.getElementById(`btn-style-hide-${sectionId}`);

    hideButton.onclick = (event) => {
        const styleCard = document.getElementById(`style-card-${sectionId}`);
        const container = document.getElementById('generated-hooks');

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


function setSongParamsDirty() {
    if (!songParamsDirty) {
        songParamsDirty = true;

        const saveButton = document.getElementById('btn-save-parameters');
        saveButton.classList.remove('btn-disabled');
    }
}


function setSongHookDirty() {
    if (!hookTextDirty) {
        hookTextDirty = true;

        const saveButton = document.getElementById('btn-save');
        const cancelButton = document.getElementById('btn-cancel');
        saveButton.classList.remove('btn-disabled');
        cancelButton.classList.remove('btn-disabled');

        // update the state of the navigation buttons
        updateNavigationButtonStates();
    }
}


function updateClearButtonState() {
    const container = document.getElementById('generated-hooks');
    const clearButton = document.getElementById('btn-clear');
    if (container.children.length > 0) {
        clearButton.classList.remove('btn-disabled');
    } else {
        clearButton.classList.add('btn-disabled');
    }
}


function updateNavigationButtonStates() {
    const nextButton = document.getElementById('btn-navigate-next');
    const prevButton = document.getElementById('btn-navigate-prev');
    const hook = document.getElementById('hook-text');

    const isSaved = !hookTextDirty;
    const hasHook = hook.value.trim().length > 0;

    if (isSaved && hasHook) {
        nextButton.classList.remove('btn-disabled');
    } else {
        nextButton.classList.add('btn-disabled');
    }

    if (isSaved) {
        prevButton.classList.remove('btn-disabled');
    } else {
        prevButton.classList.add('btn-disabled');
    }
}


function clearGeneratedHooks() {
    const clearButton = document.getElementById('btn-clear');
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);    

    // call the api to update the section to set the hidden flag to true
    apiSectionEditBulk(songId, true)
        .then(songId => {
            // update the text on the song card
            console.log(`Successfully updated sections for songId: ${songId}`);

            // remove all cards from the list
            const container = document.getElementById('generated-hooks');
            Array.from(container.children).forEach(node => {

                // remove the card from the drag drop system
                dragDropSystem.unregisterDraggable(node);

                // remove the card from the container
                container.removeChild(node);
            });

            clearButton.classList.add('btn-disabled');
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the sections for the song:', error);
            toastSystem.showError('Failed to update the sections for the song. Please try again.');
        });
}


function updateSaveHistory() {
    const hookElement = document.getElementById('hook-text');
    saveHistory.hook = hookElement.value.trim();
}


function revertSaveHistory() {
    const hookElement = document.getElementById('hook-text');
    hookElement.value = saveHistory.hook;

    hookTextDirty = false;

    const saveButton = document.getElementById('btn-save');
    const cancelButton = document.getElementById('btn-cancel');
    saveButton.classList.add('btn-disabled');
    cancelButton.classList.add('btn-disabled');

    // update the state of the navigation buttons
    updateNavigationButtonStates();
}


function saveHook() {
    const hookElement = document.getElementById('hook-text');
    const newSongHook = hookElement.value.trim();

    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);    

    // call the api to update the song styles
    apiSongEdit(songId, { hook: newSongHook })
        .then(songId => {
            console.log(`Successfully updated the song hook for songId: ${songId}`);

            // update the dirty state and the UI for the save button
            hookTextDirty = false;
            const saveButton = document.getElementById('btn-save');
            const cancelButton = document.getElementById('btn-cancel');
            saveButton.classList.add('btn-disabled');
            cancelButton.classList.add('btn-disabled');

            // update the save history so we can cancel / undo
            updateSaveHistory();

            // update the state of the navigation buttons
            updateNavigationButtonStates();
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song hook:', error);
            toastSystem.showError('Failed to update the song hook. Please try again.');
        });
}


function cancelHook() {
    revertSaveHistory();
}


function saveParameters() {
    const customPrompt = document.getElementById('prompt-text').value.trim();
    const rhymeWith = document.getElementById('rhyme-with').value.trim();
    const vocalisationLevel  = document.getElementById('vocalisation-level').value.trim();
    const vocalisationTerms = document.getElementById('vocalisation-terms').value.trim();
    const maxHookLines = document.getElementById('max-hook-lines').value.trim();
    const maxSyllablesPerLine = document.getElementById('max-syllables-per-line').value.trim();

    console.log(`custom_prompt: ${customPrompt},
        rhyme_with: ${rhymeWith},
        vocalisation_level: ${vocalisationLevel},
        vocalisation_terms: ${vocalisationTerms},
        max_hook_lines: ${maxHookLines},
        max_syllables_per_line: ${maxSyllablesPerLine}`)

    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);    

    // call the api to update the song parameters
    apiSongEdit(songId, { 
        hook_custom_request: customPrompt,
        hook_rhyme_with: rhymeWith,
        hook_vocalisation_level: vocalisationLevel,
        hook_vocalisation_terms: vocalisationTerms,
        hook_max_lines: maxHookLines,
        hook_average_syllables: maxSyllablesPerLine
     })
        .then(songId => {
            console.log(`Successfully updated the song parameters for songId: ${songId}`);

            // update the dirty state and the UI for the save button
            songParamsDirty = false;
            const saveButton = document.getElementById('btn-save-parameters');
            saveButton.classList.add('btn-disabled');
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song parameters:', error);
            toastSystem.showError('Failed to update the song parameters. Please try again.');
        });
}


function navigateNext() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/lyrics/${songId}`;
}


function navigatePrevious() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/structure/${songId}`;
}

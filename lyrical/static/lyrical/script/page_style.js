/**
 * Song style generation functionality.
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
let styleTextDirty = false;
let saveHistory = { theme: '', narrative: '', mood: '' };


document.addEventListener('DOMContentLoaded', () => {
    initStyleCards();
    initGeneration();
    initPageActions();
    applyFilter();
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
    const destinationId = `style-text-${styleType.toLowerCase()}`
    const destination = document.getElementById(destinationId);

    const text = textElement.innerHTML.trim();

    console.log(`dropping style ${styleId} [${styleType}] with text: '${text}'`);

    if (destination.value.trim() != text) {
        destination.value = text;
        setSongStyleDirty();
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
    document.getElementById('btn-clear').onclick = clearGeneratedStyles;
    document.getElementById('btn-save').onclick = saveStyle;
    document.getElementById('btn-cancel').onclick = cancelStyle;
    document.getElementById('tab-filter-all').onclick = applyFilter;
    document.getElementById('tab-filter-themes').onclick = applyFilter;
    document.getElementById('tab-filter-narratives').onclick = applyFilter;
    document.getElementById('tab-filter-moods').onclick = applyFilter;
    document.getElementById('style-text-theme').addEventListener('input', setSongStyleDirty);
    document.getElementById('style-text-narrative').addEventListener('input', setSongStyleDirty);
    document.getElementById('style-text-mood').addEventListener('input', setSongStyleDirty);
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

    let params = {
        prompt: 'song_styles',
        custom_prompt: document.getElementById('prompt-text').value,
        song_id: songId,
    };

    const styleFilter = getFilterStyleType();
    if (styleFilter != undefined) {
        params.style_filter = styleFilter;
    }

    return params;
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
        addStyleCard('badge-theme', 'THEME', data.theme, data.id);
    } else if (data.narrative != undefined) {
        addStyleCard('badge-narrative', 'NARRATIVE', data.narrative, data.id);
    } else if (data.mood != undefined) {
        addStyleCard('badge-mood', 'MOOD', data.mood, data.id);
    } else {
        toastSystem.showError(`Bad data received for style: ${JSON.stringify(data)}`);
    }
}


function addStyleCard(badgeStyle, badgeName, cardText, sectionId) {
    apiRenderComponent('card_style', 'generated-styles', { section: { id: sectionId, badge_name: badgeName, badge_style: badgeStyle, text: cardText }})
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
            toastSystem.showError('Failed to display the new style. Please refresh the page.');
        });
}


function initStyleCards() {
    const container = document.getElementById('generated-styles');
    Array.from(container.children).forEach(node => {
        initNewStyleCard(node.dataset.styleId);
    });

    updateClearButtonState();
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


function setSongStyleDirty() {
    if (!styleTextDirty) {
        styleTextDirty = true;

        const saveButton = document.getElementById('btn-save');
        const cancelButton = document.getElementById('btn-cancel');
        saveButton.classList.remove('btn-disabled');
        cancelButton.classList.remove('btn-disabled');

        // update the state of the navigation buttons
        updateNavigationButtonStates();
    }
}


function updateClearButtonState() {
    const container = document.getElementById('generated-styles');
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
    const theme = document.getElementById('style-text-theme');
    const narrative = document.getElementById('style-text-narrative');
    const mood = document.getElementById('style-text-mood');

    const isSaved = !styleTextDirty;

    const hasTheme = theme.value.trim().length > 0;
    const hasNarrative = narrative.value.trim().length > 0;
    const hasMood = mood.value.trim().length > 0;

    if (isSaved && hasTheme && hasNarrative && hasMood) {
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


function clearGeneratedStyles() {
    const clearButton = document.getElementById('btn-clear');
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);    

    // call the api to update the section to set the hidden flag to true
    apiSectionEditBulk(songId, true)
        .then(songId => {
            // update the text on the song card
            console.log(`Successfully updated sections for songId: ${songId}`);

            // remove all cards from the list
            const container = document.getElementById('generated-styles');
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
    const themeElement = document.getElementById('style-text-theme');
    const narrativeElement = document.getElementById('style-text-narrative');
    const moodElement = document.getElementById('style-text-mood');

    saveHistory.theme = themeElement.value.trim();
    saveHistory.narrative = narrativeElement.value.trim();
    saveHistory.mood = moodElement.value.trim();
}


function revertSaveHistory() {
    const themeElement = document.getElementById('style-text-theme');
    const narrativeElement = document.getElementById('style-text-narrative');
    const moodElement = document.getElementById('style-text-mood');

    themeElement.value = saveHistory.theme;
    narrativeElement.value = saveHistory.narrative;
    moodElement.value = saveHistory.mood;

    styleTextDirty = false;

    const saveButton = document.getElementById('btn-save');
    const cancelButton = document.getElementById('btn-cancel');
    saveButton.classList.add('btn-disabled');
    cancelButton.classList.add('btn-disabled');

    // update the state of the navigation buttons
    updateNavigationButtonStates();
}


function saveStyle() {
    const themeElement = document.getElementById('style-text-theme');
    const narrativeElement = document.getElementById('style-text-narrative');
    const moodElement = document.getElementById('style-text-mood');

    const newSongTheme = themeElement.value.trim();
    const newSongNarrative = narrativeElement.value.trim();
    const newSongMood = moodElement.value.trim();

    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);    

    // call the api to update the song styles
    apiSongEdit(songId, { song_theme: newSongTheme, song_narrative: newSongNarrative, song_mood: newSongMood })
        .then(songId => {
            console.log(`Successfully updated the song style for songId: ${songId}`);

            // update the dirty state and the UI for the save button
            styleTextDirty = false;
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
            console.error('Failed to edit the song style:', error);
            toastSystem.showError('Failed to update the song style. Please try again.');
        });
}


function cancelStyle() {
    revertSaveHistory();
}


function getFilterStyleType() {
    let styleType = undefined;

    document.querySelectorAll('[id*="tab-filter-"]').forEach(tab => {
        if (tab.checked) {
            styleType = tab.dataset.styleType;
        }
    });

    return styleType;
}


function applyFilter() {
    const styleType = getFilterStyleType();
    const container = document.getElementById('generated-styles');

    if (styleType === undefined) {
        Array.from(container.children).forEach(node => {
            node.classList.remove('hidden');
        });
    } else {
        Array.from(container.children).forEach(node => {
            if (node.dataset.styleType === styleType) {
                node.classList.remove('hidden');
            } else {
                node.classList.add('hidden');
            }
        });
    }
}


function navigateNext() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/structure/${songId}`;
}


function navigatePrevious() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/song?id=${songId}`;
}

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
import { checkSummarizationAndGenerate } from './util_summarization_modal.js';


let streamHelper;
let dragDropSystem;
let styleTextDirty = false;
let saveHistory = { theme: '', narrative: '', mood: '' };


const songId = document.body.dataset.songId;


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


/**
 * Initialize page action buttons and event handlers
 * Sets up click handlers for navigation, save/cancel, clear, and filter buttons
 * Also sets up input change listeners for style text fields
 */
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
    const actualGenerate = () => {
        const requestParams = buildRequestParams();
        streamHelper.initiateRequest(requestParams);
    };
    
    checkSummarizationAndGenerate(songId, actualGenerate, 'style');
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
            onComplete: (summaryInfo) => {
                console.log("stream complete");
                handleLoadingEnd(summaryInfo);
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
    let params = {
        prompt: 'song_styles',
        custom_request: document.getElementById('prompt-text').value,
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
function handleLoadingEnd(summaryInfo) {
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


/**
 * Add a style card from incoming data based on the data type
 * @param {Object} data - The style data containing theme, narrative, or mood
 * @param {string} [data.theme] - Theme text if this is a theme style
 * @param {string} [data.narrative] - Narrative text if this is a narrative style
 * @param {string} [data.mood] - Mood text if this is a mood style
 * @param {number} data.id - The ID of the style section
 */
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


/**
 * Add a new style card to the page and initialize it
 * @param {string} badgeStyle - CSS class for the badge styling
 * @param {string} badgeName - Display name for the badge
 * @param {string} cardText - The text content for the card
 * @param {number} sectionId - The ID of the style section
 */
function addStyleCard(badgeStyle, badgeName, cardText, sectionId) {
    apiRenderComponent('card_style', 'generated-styles', { section: { id: sectionId, badge_name: badgeName, badge_style: badgeStyle, text: cardText }})
        .then(html => {
            // initialize the new style card for interactions
            initNewStyleCard(sectionId);

            // register with the drag-drop system
            const styleCard = document.getElementById(`style-card-${sectionId}`);
            registerCardForDragDrop(styleCard);

            // scroll into view
            styleCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // update the UI button states
            updateClearButtonState();            
        })
        .catch(error => {
            // handle the error if the component rendering fails
            console.error('Failed to render or initialize new style card:', error);
            toastSystem.showError('Failed to display the new style. Please refresh the page.');
        });
}


/**
 * Initialize all existing style cards on page load
 * Registers existing cards for drag-drop and updates button states
 */
function initStyleCards() {
    const container = document.getElementById('generated-styles');
    Array.from(container.children).forEach(node => {
        initNewStyleCard(node.dataset.styleId);
    });

    updateClearButtonState();
}


/**
 * Initialize event handlers for a new style card
 * Sets up the hide button functionality for the specified section
 * @param {number} sectionId - The ID of the style section to initialize
 */
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


/**
 * Mark the song style as dirty (unsaved changes) and update UI accordingly
 * Enables save/cancel buttons and updates navigation button states
 */
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


/**
 * Update the clear button state based on whether there are any generated styles
 * Enables the button if there are style cards, disables it if empty
 */
function updateClearButtonState() {
    const container = document.getElementById('generated-styles');
    const clearButton = document.getElementById('btn-clear');
    if (container.children.length > 0) {
        clearButton.classList.remove('btn-disabled');
    } else {
        clearButton.classList.add('btn-disabled');
    }
}


/**
 * Update navigation button states based on save status and content completion
 * Next button requires all fields filled and saved, previous button only requires saved state
 */
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


/**
 * Clear all generated style cards by hiding them via API call
 * Removes cards from UI and unregisters them from drag-drop system
 */
function clearGeneratedStyles() {
    const clearButton = document.getElementById('btn-clear');

    let styleIds = [];
    const container = document.getElementById('generated-styles');
    Array.from(container.children).forEach(node => {
        if (!node.classList.contains('hidden')) {
            styleIds.push(node.dataset.styleId);
        }
    });

    // call the api to update the section to set the hidden flag to true
    apiSectionEditBulk(songId, true, styleIds)
        .then(songId => {
            // update the text on the song card
            console.log(`Successfully updated sections for songId: ${songId}`);

            // remove all cards from the list
            const container = document.getElementById('generated-styles');
            Array.from(container.children).forEach(node => {

                // only clear the visible items
                if (!node.classList.contains('hidden')) {
                    // remove the card from the drag drop system
                    dragDropSystem.unregisterDraggable(node);

                    // remove the card from the container
                    container.removeChild(node);
                }
            });

            clearButton.classList.add('btn-disabled');
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the sections for the song:', error);
            toastSystem.showError('Failed to update the sections for the song. Please try again.');
        });
}


/**
 * Update the save history with current values from style text fields
 * Used to track the last saved state for cancel/revert functionality
 */
function updateSaveHistory() {
    const themeElement = document.getElementById('style-text-theme');
    const narrativeElement = document.getElementById('style-text-narrative');
    const moodElement = document.getElementById('style-text-mood');

    saveHistory.theme = themeElement.value.trim();
    saveHistory.narrative = narrativeElement.value.trim();
    saveHistory.mood = moodElement.value.trim();
}


/**
 * Revert style text fields to their last saved state
 * Restores values from save history and resets dirty state
 */
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


/**
 * Save the current style text values via API call
 * Updates the song with theme, narrative, and mood values and resets dirty state
 */
function saveStyle() {
    const themeElement = document.getElementById('style-text-theme');
    const narrativeElement = document.getElementById('style-text-narrative');
    const moodElement = document.getElementById('style-text-mood');

    const newSongTheme = themeElement.value.trim();
    const newSongNarrative = narrativeElement.value.trim();
    const newSongMood = moodElement.value.trim();

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


/**
 * Cancel unsaved changes and revert to last saved state
 * Calls revertSaveHistory to restore previous values
 */
function cancelStyle() {
    revertSaveHistory();
}


/**
 * Get the currently selected style filter type from the filter tabs
 * @returns {string|undefined} The selected style type ('themes', 'narratives', 'moods') or undefined if 'all' is selected
 */
function getFilterStyleType() {
    let styleType = undefined;

    document.querySelectorAll('[id*="tab-filter-"]').forEach(tab => {
        if (tab.checked) {
            styleType = tab.dataset.styleType;
        }
    });

    return styleType;
}


/**
 * Apply the current filter to show/hide style cards based on their type
 * Shows all cards if no specific filter is selected, otherwise shows only matching types
 */
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


/**
 * Navigate to the next page in the song creation workflow (structure page)
 */
function navigateNext() {
    window.location.href = `/structure/${songId}`;
}


/**
 * Navigate to the previous page in the song creation workflow (song details page)
 */
function navigatePrevious() {
    window.location.href = `/song?id=${songId}`;
}

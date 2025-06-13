
/**
 * Song selection page - Song list filtering and navigation
 * Handles song filtering, selection, and navigation to song editing
 */

import { SelectSystem } from './util_select.js';

let selectSystem = null;

/**
 * Initialize the page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    applyFilters();
    initEventHandlers();
    initSelectSystem();
});


/**
 * Initialize the selection system for song cards
 */
function initSelectSystem() {
    // create the select system and assign to module-level variable
    selectSystem = new SelectSystem();

    // initialise the select system
    selectSystem.init(
        {
            allowMultiSelect: false,
            allowSelectOnClick: true,
            allowDeselectOnClick: false,
            allowNoSelection: true,
            autoSelectFirstElement: false,
            canDeselectOnEscape: true,
            canDeselectOnClickAway: false,
            selectOnMouseDown: true
        },
        {
            onElementSelected: (element, allSelectedElements) => {
                //const elementName = element ? element.dataset.songName : 'null';
                //console.log(`onElementSelected: (${elementName})`)
                applySelectionStyles(element);
                updateButtonStylesForSelection(element);
            },
            onElementDeselected: (element, allSelectedElements) => {
                //const elementName = element ? element.dataset.songName : 'null';
                //console.log(`onElementDeselected: (${elementName})`)
                removeSelectionStyles(element);
            },
            onAfterElementChanged: (allSelectedElements, changedElement) => {
                // if no elements are selected, update the button styles to disabled
                const selectedElement = selectSystem.getSelectedElement();
                if (selectedElement === null) {
                    updateButtonStylesForSelection(null);
                }
            }
        }
    );

    // begin with all buttons disabled
    updateButtonStylesForSelection(null);

    // register existing song cards with the select system and setup the
    // dblclick event to go to the style page
    document.querySelectorAll('.song-card').forEach(card => {
        selectSystem.addElement(card);
        card.addEventListener('dblclick', (event) => {
            const songId = card.dataset.songId;
            const url = `/style/${songId}`
            window.location.href = url;
        });
    });

    // hide the button controls on all song cards
    document.querySelectorAll('.buttons-container').forEach(container => {
        container.classList.add('hidden');
    });

    // pressing the enter key will click the next button
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (document.activeElement === document.body) {
                if (selectSystem.hasSelectedElement()) {
                    navigateNext();
                }
            }
        }
    });

    document.getElementById('btn-clear').onclick = () => {
        const filterTerm = document.getElementById('filter-term');
        filterTerm.value = '';
        applyFilters();
        document.getElementById('btn-clear').classList.add('btn-disabled');
    };

    // select the first visible card
    selectFirstVisisbleCard();
}


/**
 * Initialize event handlers for filters and navigation
 */
function initEventHandlers() {
    const filterTerm = document.getElementById('filter-term');
    const filterNew = document.getElementById('filter-new');
    const filterLiked = document.getElementById('filter-liked');
    const filterGenerated = document.getElementById('filter-generated');
    const filterPublished = document.getElementById('filter-published');
    const btnNext = document.getElementById('btn-navigate-next');
    const btnPrev = document.getElementById('btn-navigate-prev');

    filterTerm.onkeyup = applyFilters;
    filterNew.onchange = applyFilters;
    filterLiked.onchange = applyFilters;
    filterGenerated.onchange = applyFilters;
    filterPublished.onchange = applyFilters;
    if (btnNext) btnNext.onclick = navigateNext;
    if (btnPrev) btnPrev.classList.add('hidden');
}


/**
 * Apply filters to show/hide songs based on stage and search term
 */
function applyFilters() {
    // get the form filters
    const filterTerm = document.getElementById('filter-term');
    const filterNew = document.getElementById('filter-new');
    const filterLiked = document.getElementById('filter-liked');
    const filterGenerated = document.getElementById('filter-generated');
    const filterPublished = document.getElementById('filter-published');

    // get the song list and the search term
    const songList = document.getElementById('song-list');
    const searchTerm = filterTerm.value.trim();

    // filter the list of song names, by adding the 'hidden' class to those that are
    // filtered out.
    Array.from(songList.children).forEach(node => {
        if (searchTerm === '' || node.dataset.songName.toLowerCase().includes(searchTerm.toLowerCase())) {
            if (node.dataset.songStage === 'new' && filterNew.checked) {
                node.classList.remove('hidden');
            } else if (node.dataset.songStage === 'liked' && filterLiked.checked) {
                node.classList.remove('hidden');
            } else if (node.dataset.songStage === 'generated' && filterGenerated.checked) {
                node.classList.remove('hidden');
            } else if (node.dataset.songStage === 'published' && filterPublished.checked) {
                node.classList.remove('hidden');
            } else {
                node.classList.add('hidden');
            }
        } else {
            node.classList.add('hidden');
        }
    });

    // if the select system has been created, then we manage the selection on filter change
    if (selectSystem) {
        if (!isSelectedCardVisible()) {
            console.log('selected card is not visible, deselecting it.')
            selectSystem.deselectAllElements();
        }
    }

    if (searchTerm != '') {
        document.getElementById('btn-clear').classList.remove('btn-disabled');
    } else {
        document.getElementById('btn-clear').classList.add('btn-disabled');
    }
}


/**
 * Apply visual selection styles to an element
 * @param {Element} element - The element to style
 */
function applySelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToAdd);
    element.classList.remove(...selectionStyleToRemove);
}


/**
 * Remove visual selection styles from an element
 * @param {Element} element - The element to remove styles from
 */
function removeSelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToRemove);
    element.classList.remove(...selectionStyleToAdd);
}


/**
 * Update button styles based on current selection
 * @param {Element|null} element - The selected element or null
 */
function updateButtonStylesForSelection(element) {
    const btnNext = document.getElementById('btn-navigate-next')

    if (btnNext) {
        if (element) {
            btnNext.classList.remove('btn-disabled')
        } else {
            btnNext.classList.add('btn-disabled')
        }
    }
}


/**
 * Select the first visible card in the song list
 */
function selectFirstVisisbleCard() {
    const songList = document.getElementById('song-list');

    for (const node of Array.from(songList.children)) {
        if (!node.classList.contains('hidden')) {
            console.log(`selecting first visible card: ${node.dataset.songName}`)
            selectSystem.selectElement(node);
            return;
        }
    }
}


/**
 * Check if the currently selected card is visible
 * @returns {boolean} True if selected card is visible, false otherwise
 */
function isSelectedCardVisible() {
    const selected = selectSystem.getSelectedElement();

    if (!selected) return false;
    return !selected.classList.contains('hidden');
}


/**
 * Navigate to the style page for the selected song
 */
function navigateNext() {
    const songId = selectSystem.getSelectedElement().dataset.songId;
    const url = `/style/${songId}`
    window.location.href = url;
}

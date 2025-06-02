
import { SelectSystem } from './util_select.js';


let selectSystem = null;


document.addEventListener('DOMContentLoaded', () => {
    applyFilters();
    initEventHandlers();
    initSelectSystem();
});


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

    // register existing song cards with the select system
    document.querySelectorAll('.song-card').forEach(card => {
        selectSystem.addElement(card);
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
    btnNext.onclick = navigateNext;
    btnPrev.classList.add('hidden');
}


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


function applySelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToAdd);
    element.classList.remove(...selectionStyleToRemove);
}


function removeSelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToRemove);
    element.classList.remove(...selectionStyleToAdd);
}


function updateButtonStylesForSelection(element) {
    const btnNext = document.getElementById('btn-navigate-next')

    if (element) {
        btnNext.classList.remove('btn-disabled')
    } else {
        btnNext.classList.add('btn-disabled')
    }
}


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


function isSelectedCardVisible() {
    const selected = selectSystem.getSelectedElement();

    if (!selected) return false;
    return !selected.classList.contains('hidden');
}


function navigateNext() {
    const songId = selectSystem.getSelectedElement().dataset.songId;
    const url = `/style/${songId}`
    window.location.href = url;
}


import { SelectSystem } from './util_select.js';


let selectSystem;


document.addEventListener('DOMContentLoaded', () => {
    applyFilter();
    createEventHandlers();

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
                applySelectionStyles(element);
                updateButtonStylesForSelection(element);
            },
            onElementDeselected: (element, allSelectedElements) => {
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

    // register click away elements
    // selectSystem.addClickAwayElement(document.getElementById('new-songs-container'));

    // add event listener for Enter key press when no input is focused to
    // edit the selected song
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (document.activeElement === document.body) {
                if (selectSystem.hasSelectedElement()) {

// next button -->

                }
            }
        }
    });



// ---> select first *visible* element



});


function createEventHandlers() {
    const filterTerm = document.getElementById('filter-term');
    const filterNew = document.getElementById('filter-new');
    const filterLiked = document.getElementById('filter-liked');
    const filterGenerated = document.getElementById('filter-generated');
    const filterPublished = document.getElementById('filter-published');

    filterTerm.onkeyup = applyFilter;
    filterNew.onchange = applyFilter;
    filterLiked.onchange = applyFilter;
    filterGenerated.onchange = applyFilter;
    filterPublished.onchange = applyFilter;
}


function applyFilter() {
    // get the form filters
    const filterTerm = document.getElementById('filter-term');
    const filterNew = document.getElementById('filter-new');
    const filterLiked = document.getElementById('filter-liked');
    const filterGenerated = document.getElementById('filter-generated');
    const filterPublished = document.getElementById('filter-published');

    // get the song list and the search term
    const songList = document.getElementById('song-list');
    const searchTerm = filterTerm.value.trim();


// ---> consider updating selection


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

}

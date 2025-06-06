
import { StreamHelper } from "./util_stream_helper.js";
import { toastSystem } from './util_toast.js';
import { DragDropSystem } from './util_dragdrop.js';
import { apiLyricsEdit } from './api_lyrics_edit.js';
import { apiSectionEdit } from './api_section_edit.js';
import { apiRenderComponent } from './api_render_component.js';


let streamHelperPrimary;
let streamHelperSecondary;
let streamHelperSecondaryClickedButton;
let dragDropSystem;
let lyricsDirty = false;
let lyricsHistory = {};
let editCard = null;


const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initBadgeActions();
    initStreamHelpers();
    initDragDrop();
    copyToSaveHistory();
    updateLyricsListing();
    applyFilter();
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
    document.querySelectorAll('.badge-marker-button').forEach(button => {
        button.onclick = badgeMarkerButtonClick;
    });
    document.querySelectorAll('.badge-eraser-button').forEach(button => {
        button.onclick = badgeEraserButtonClick;
    });
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
    document.querySelectorAll('.badge-hide-button').forEach(button => {
        button.onclick = badgeHideButtonClick;
    });
}


function initStreamHelpers() {
    document.getElementById('btn-generate').addEventListener('click', handleGenerateClick);

    document.querySelectorAll('.btn-regenerate').forEach(button => {
        button.addEventListener('click', function() {
            streamHelperSecondaryClickedButton = this;
            console.log(`clicked button: ${streamHelperSecondaryClickedButton}`);

            handleRegenerateClick.call();
        });
    });

    streamHelperPrimary = createStreamHelperPrimary();
    streamHelperSecondary = createStreamHelperSecondary();
}


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

    // register draggable items
    document.querySelectorAll('.section-text-card').forEach(card => {
        registerCardForDragDrop(card);
    });

    return dragDropSystem;
}


// =================================================================================
// Streaming Data for Song Generation
// =================================================================================


function handleGenerateClick() {
    const requestParams = {
        prompt: 'song_lyrics',
        song_id: songId,
    };
    streamHelperPrimary.initiateRequest(requestParams);
}


function handleRegenerateClick() {
    if (editCard) {
        const sectionType = editCard.firstElementChild.dataset.sectionName;
        console.log(`initiate request for sectionType: ${sectionType}`)

        const requestParams = {
            prompt: 'song_lyrics_section',
            song_id: songId,
            section_type: sectionType,
            count: 2,
        };
        streamHelperSecondary.initiateRequest(requestParams);
    } else {
        console.error('editCard is null!!')
    }
}


function createStreamHelperPrimary() {
    return new StreamHelper('/api_gen_song_lyrics', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handlePrimaryDataStreamStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handlePrimaryDataStreamData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: () => {
                console.log("stream complete");
                handlePrimaryDataStreamEnd();
            },
            onError: (error) => {
                console.error("stream error:", error);
                handlePrimaryDataStreamError(error);
            }
        }
    });
}


function createStreamHelperSecondary() {
    return new StreamHelper('/api_gen_song_lyrics_section', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleSecondaryDataStreamStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleSecondaryDataStreamData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: () => {
                console.log("stream complete");
                handleSecondaryDataStreamEnd();
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleSecondaryDataStreamError(error);
            }
        }
    });
}


function handlePrimaryDataStreamStart() {
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


function handleSecondaryDataStreamStart() {
    console.log(`handleSecondaryDataStreamStart: ${streamHelperSecondaryClickedButton}`);

    // get the buttons
    const regenerateButton = streamHelperSecondaryClickedButton;
    const regeneratingButton = regenerateButton.nextElementSibling;
    
    // hide the regenerate button
    if (regenerateButton) {
        regenerateButton.classList.add('hidden');
    }

    // show the regenerating button in disabled state
    if (regeneratingButton) {
        regeneratingButton.classList.remove('hidden');
    }
}


function handlePrimaryDataStreamEnd() {
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


function handleSecondaryDataStreamEnd() {
    console.log(`handleSecondaryDataStreamEnd: ${streamHelperSecondaryClickedButton}`);

    // get the buttons
    const regenerateButton = streamHelperSecondaryClickedButton;
    const regeneratingButton = regenerateButton.nextElementSibling;
    
    // hide the regenerate button
    if (regenerateButton) {
        regenerateButton.classList.remove('hidden');
    }

    // show the regenerating button in disabled state
    if (regeneratingButton) {
        regeneratingButton.classList.add('hidden');
    }

    streamHelperSecondaryClickedButton = null;
}


function handlePrimaryDataStreamData(data) {
    if (data) {
        for (const [section, words] of Object.entries(data)) {
            const lyrics = words.join('\n');
            displayLyrics(section, lyrics);
        }
    } else {
        handlePrimaryDataStreamError(data);
    }
}


function handleSecondaryDataStreamData(data) {
    let section = '';
    let lyrics = '';
    let id = 0;

    if (data) {
        for (const [key, value] of Object.entries(data)) {
            console.log(`handleSecondaryDataStreamData: key:${key} value:${value}`)

            if (key == 'id') {
                id = parseInt(value);
            } else {
                section = key;
                lyrics = value.join('\n');
            }
        }
        addNewLyricsSection(id, section, lyrics);
    } else {
        handleSecondaryDataStreamError(data);
    }
}


function handlePrimaryDataStreamError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


function handleSecondaryDataStreamError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


// =================================================================================
// Drag Drop System
// =================================================================================


function handleDragDrop(item, zone, event) {
    const sectionId = item.element.dataset.sectionId;
    const sourceTextElement = document.getElementById(`section-text-${sectionId}`);
    const sourceText = sourceTextElement.innerHTML.trim();

    const destination = zone.element.children[1].children[0];

    if (destination.value.trim() != sourceText) {
        destination.value = sourceText;
        setLyricsDirty();
    }
}


function registerCardForDragDrop(card) {
    const sectionId = card.dataset.sectionId;
    console.log(`registering card for drag-drop: ${sectionId}`)
    dragDropSystem.registerDraggable(card, { sectionId: sectionId });
}


// =================================================================================
// Lyrics Management & Actions
// =================================================================================


function saveLyrics() {
    let lyrics = {}

    if (editCard) {
        const textareaId = editCard.dataset.textareaId;
        const textarea = document.getElementById(textareaId);
        console.log(`saving lyrics for id='${textarea.dataset.lyricsId}' with words='${textarea.value}'`);
        lyrics[textarea.dataset.lyricsId] = textarea.value;
        updateAllDuplicateSections(textarea);
    } else {
        document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
            console.log(`saving lyrics for id='${item.dataset.lyricsId}' with words='${item.value}'`);
            lyrics[item.dataset.lyricsId] = item.value;
        });
    }

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


function updateAllDuplicateSections(textarea) {
    const lyricsId = textarea.dataset.lyricsId;

    document.querySelectorAll('[id*="lyrics-text-"').forEach(destination => {
        if (destination != textarea && destination.dataset.lyricsId === lyricsId) {
            console.log(`copying contents of ${textarea.id} to ${destination.id}`);
            destination.value = textarea.value;
        }
    });
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

    document.querySelectorAll('.badge-lyrics').forEach(element => {
        const sectionType = element.dataset.sectionType;
        const sectionIndex = element.dataset.sectionIndex;
        const sectionWordsId = element.dataset.sectionWordsId;

        if (sectionType === 'INTRO') {
            container.innerHTML += '[INSTRUMENTAL INTRO]<br>';
        } else if (sectionType === 'INTERLUDE') {
            container.innerHTML += '[MELODIC INTERLUDE]<br>';
        } else if (sectionIndex > 0) {
            container.innerHTML += '[' + sectionType + ' ' + sectionIndex + ']<br>';
        } else {
            container.innerHTML += '[' + sectionType + ']<br>';
        }

        if (sectionWordsId.length > 0) {
            const textArea = document.getElementById(sectionWordsId);
            const textValue = textArea.value;
            const htmlValue = textValue.replace(/\n/g, '<br>');

            container.innerHTML += htmlValue + '<br>';
        }
        container.innerHTML += '<br>';
    });

    container.innerHTML += '[END]';

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


function badgeMarkerButtonClick() {
    // TODO: select the marker tool
}


function badgeEraserButtonClick() {
    // TODO: select the eraser tool
}


function badgeToolsButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('textedit', allButtons);
    applyFilter();
}


function badgeExitButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    if (lyricsDirty) {
        undoLyrics();
    }    
    enterEditMode('none', allButtons);
}


function badgeInteractiveButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('interactive', allButtons);  
}


function badgeTextEditButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('textedit', allButtons);    
}


function badgeRegenerateButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('regenerate', allButtons);
}


function badgeHideButtonClick() {
    const sectionId = this.dataset.lyricsId;
    console.log(`hiding section with Id=${sectionId}`);

    const sectionCard = this.parentNode.parentNode;
    const container = document.getElementById('generated-sections');

    apiSectionEdit(sectionId, true)
        .then(sectionId => {
            // update the text on the song card
            console.log(`Successfully updated sectionId: ${sectionId}`);

            // hide the card from the list
            container.removeChild(sectionCard);

            // remove the card from the drag drop system
            dragDropSystem.unregisterDraggable(sectionCard);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the section:', error);
            toastSystem.showError('Failed to update the section. Please try again.');
        });
}


function enterEditMode(mode, allButtons) {
    const buttonMarker = allButtons[0];
    const buttonEraser = allButtons[1];
    const buttonInteractive = allButtons[2];
    const buttonRegenerate = allButtons[3];
    const buttonTextEdit = allButtons[4];
    const buttonExit = allButtons[5];
    const buttonTools = allButtons[6];
    const songSectionCard = buttonTools.parentNode.parentNode;
    
    if (mode === 'none') {
        editCard = null;
        console.log(`setting editCard=null`);
        document.getElementById('btn-generate').classList.remove('btn-disabled');
        document.getElementById('btn-generating').classList.remove('btn-disabled');
    } else {
        console.log(`setting editCard=${songSectionCard}`);
        editCard = songSectionCard;
        document.getElementById('btn-generate').classList.add('btn-disabled');
        document.getElementById('btn-generating').classList.add('btn-disabled');
    }

    if (mode === 'none') {
        showEditTextArea(false, buttonTextEdit);
        showEditInteractive(false, buttonInteractive);
        showEditRegenerate(false, buttonRegenerate);
        updateButtonAppearance(buttonTools, 'shown');
        updateButtonAppearance(buttonExit, 'hidden');
        updateButtonAppearance(buttonInteractive, 'hidden');
        updateButtonAppearance(buttonTextEdit, 'hidden');
        updateButtonAppearance(buttonRegenerate, 'hidden');
        updateButtonAppearance(buttonMarker, 'hidden');
        updateButtonAppearance(buttonEraser, 'hidden');
        hideOrShowAllSections('show');
    } else if (mode === 'textedit') {
        showEditInteractive(false, buttonInteractive);
        showEditRegenerate(false, buttonRegenerate);
        showEditTextArea(true, buttonTextEdit);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonInteractive, 'shown');
        updateButtonAppearance(buttonTextEdit, 'active');
        updateButtonAppearance(buttonRegenerate, 'shown');
        updateButtonAppearance(buttonMarker, 'hidden');
        updateButtonAppearance(buttonEraser, 'hidden');
        hideOrShowAllSections('hide', songSectionCard);
    } else if (mode === 'interactive') {
        showEditTextArea(false, buttonTextEdit);
        showEditRegenerate(false, buttonRegenerate);
        showEditInteractive(true, buttonInteractive);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonInteractive, 'active');
        updateButtonAppearance(buttonTextEdit, 'shown');
        updateButtonAppearance(buttonRegenerate, 'shown');
        updateButtonAppearance(buttonMarker, 'active');  //TODO: use 'active' if this is the active tool (call the Markup utility), otherwise use 'shown'
        updateButtonAppearance(buttonEraser, 'shown');  //TODO: use 'active' if this is the active tool (call the Markup utility), otherwise use 'shown'
        hideOrShowAllSections('hide', songSectionCard);
    } else if (mode === 'regenerate') {
        showEditTextArea(false, buttonTextEdit);
        showEditInteractive(false, buttonInteractive);
        showEditRegenerate(true, buttonRegenerate);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonInteractive, 'shown');
        updateButtonAppearance(buttonTextEdit, 'shown');
        updateButtonAppearance(buttonRegenerate, 'active');
        updateButtonAppearance(buttonMarker, 'hidden');
        updateButtonAppearance(buttonEraser, 'hidden');
        hideOrShowAllSections('hide', songSectionCard);
    } else {
        console.error(`enterEditMode: invalid mode argument (${mode}), must be 'none', 'textedit', 'interactive', or 'regenerate' `);
    }
}


function showEditTextArea(show, buttonTextEdit) {
    const panels = buttonTextEdit.parentNode.nextElementSibling.children;
    const textArea = panels[0];

    if (show) {
        textArea.readOnly = false;
    } else {
        textArea.readOnly = true;
    }
}


function showEditRegenerate(show, buttonRegenerate) {
    const panels = buttonRegenerate.parentNode.nextElementSibling.children;
    const editRegeneratePanel = panels[2];
    const regenerateContainer = document.getElementById('generated-sections');

    if (show) {
        editRegeneratePanel.classList.remove('hidden');
        regenerateContainer.classList.remove('hidden');
    } else {
        editRegeneratePanel.classList.add('hidden');
        regenerateContainer.classList.add('hidden');
    }
}


function showEditInteractive(show, buttonInteractive) {
    const panels = buttonInteractive.parentNode.nextElementSibling.children;
    const editInteractivePanel = panels[1];
    const editRegeneratePanel = panels[2];
    const textArea = panels[0];
    const regenerateContainer = document.getElementById('generated-sections');

    if (show) {
        // show the ui elements
        textArea.classList.add('hidden');  
        editInteractivePanel.classList.remove('hidden');
        editRegeneratePanel.classList.remove('hidden');
        regenerateContainer.classList.remove('hidden');

        // copy the lyrics into the panel for selection
        const lyrics = textArea.value;
        copyTextToInteractivePanel(lyrics, editInteractivePanel);
    } else {
        // show the ui elements
        editInteractivePanel.classList.add('hidden');
        editRegeneratePanel.classList.add('hidden');
        regenerateContainer.classList.add('hidden');
        textArea.classList.remove('hidden');  
    }
}


function copyTextToInteractivePanel(lyrics, panel) {
    // TODO: this needs to call the Markup utility
    panel.innerText = lyrics;
}


function getTextFromInteractivePanel(panel) {
    // TODO: this needs to call the Markup utility
    return panel.innerText;
}


function updateButtonAppearance(button, appearance) {
    if (appearance === 'shown') {
        button.classList.remove('hidden', 'bg-primary', 'hover:border-primary');
        button.classList.add('text-neutral');

    } else if (appearance === 'active') {
        button.classList.remove('hidden', 'text-neutral');
        button.classList.add('bg-primary', 'hover:border-primary');

    } else if (appearance === 'hidden') {
        button.classList.add('hidden', 'text-neutral');
        button.classList.remove('bg-primary', 'hover:border-primary');
    } else {
        console.error(`updateButtonAppearance: invalid apperance argument (${appearance}), must be 'shown', 'active', or 'hidden' `);
    }
}


function hideOrShowAllSections(showOrHide, except=null) {
    document.querySelectorAll('.song-section-card').forEach(card => {
        if (card != except) {
            if (showOrHide === 'show') {
                showSectionCard(card);
            } else if (showOrHide === 'hide') {
                hideSectionCard(card);
            } else {
                console.error(`hideOrShowAllSections: invalid showOrHide argument (${showOrHide}), must be 'show' or 'hide' `);
            }
        }
    });
}


function addNewLyricsSection(sectionId, section, lyrics) {
    console.log(`create card for section (${section}) with lyrics:\n${lyrics}.`)

    apiRenderComponent('card_lyrics_section', 'generated-sections', { section: { id: sectionId, type: section, text: lyrics }})
        .then(html => {
            // initialize the new section card for interactions
            document.getElementById(`badge-hide-button-${sectionId}`).onclick = badgeHideButtonClick;

            // register with the drag-drop system
            const sectionCard = document.getElementById(`section-card-${sectionId}`);
            registerCardForDragDrop(sectionCard);

        })
        .catch(error => {
            // handle the error if the component rendering fails
            console.error('Failed to render or initialize new song section card:', error);
            toastSystem.showError('Failed to display the new song section. Please refresh the page.');
        });
}


function applyFilter() {
    if (editCard) {
        const filter = editCard.firstElementChild.dataset.sectionName;
        document.querySelectorAll('.section-text-card').forEach(card => {
            if (card.firstElementChild.dataset.sectionName === filter) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }
}


function hideSectionCard(card) {
    // If already hidden or in process of hiding, do nothing
    if (card.classList.contains('collapsed') || card.classList.contains('collapsing-hide')) {
        return;
    }
    
    // Get the current height and set it explicitly
    const height = card.offsetHeight;
    card.style.height = height + 'px';
    
    // Use requestAnimationFrame to avoid forced reflow
    requestAnimationFrame(() => {
        // Add collapsing-hide class to start opacity/margin animation
        card.classList.add('collapsing-hide');
        
        // Start the height animation in the next frame
        requestAnimationFrame(() => {
            card.style.height = '0px';
        });
    });
    
    // After animation completes, add collapsed class and clean up
    setTimeout(() => {
        card.classList.remove('collapsing-hide');
        card.classList.add('collapsed');
        card.style.height = '';
    }, 500);
}


function showSectionCard(card) {
    // If already visible or in process of showing, do nothing
    if (!card.classList.contains('collapsed') && !card.classList.contains('collapsing-show')) {
        return;
    }
    
    // Remove collapsed state
    card.classList.remove('collapsed');
    
    // Get the natural height by temporarily removing height restriction
    card.style.height = 'auto';
    const height = card.offsetHeight;
    
    // Use requestAnimationFrame to avoid forced reflow
    requestAnimationFrame(() => {
        // Set height to 0 and prepare for animation
        card.style.height = '0px';
        card.classList.add('collapsing-show');
        
        // Start the height animation in the next frame
        requestAnimationFrame(() => {
            card.style.height = height + 'px';
        });
    });
    
    // After animation completes, clean up
    setTimeout(() => {
        card.classList.remove('collapsing-show');
        card.style.height = '';
    }, 500);
}



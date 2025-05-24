# LLM Guidelines
This document contains guidelines for any LLM when working on files for this project.

## Code Formatting
### Javascript
Do not use any end of line commenting, for example, dont do this:
```js
    const requestParams = {
            song_vocalisation_level: 3, // 0 is off, 1 is low, 2 is medium, 3 is high
            syllables: 9
        }
```
Instead, do this:
```js
    // song_vocalisation_level: 0 is off, 1 is low, 2 is medium, 3 is high
    const requestParams = {
            song_vocalisation_level: 3, 
            syllables: 9
        }
```
Always comment methods using jsdoc, for example:
```js
/**
 * Add a new song name.
 * This function is typically called as an event handler for a button click.
 * @param {Event} event - The click event that triggered the function.
 */
function addSongName(event) {
    ...
```

Always comment inside of functions, and group lines of code together that are related, and then create a comment for those lines of code. Always use lower case comments (including the first letter of the comment) for comments that are inside of functions.  Here is an example of a well commented function:
```js
function deleteSongName() {
    // get the selected song card
    const card = selectSystem.getSelectedElement();

    // check that a card is selected
    if (!card) {
        console.error('No song card is selected for deletion.');
        return;
    }

    // get the song id from the card
    const songId = card.dataset.songId;
    console.log(`Deleting song name for songId: ${songId}`);

    // set the event handler for the delete confirmation dialog
    document.getElementById('modal-delete-yes').onclick = (event) => {
        apiSongDelete(songId)
            .then(() => {
                // deselect the song card and update button styles
                selectSystem.removeElement(card);
                updateButtonStylesForSelection(selectSystem.getSelectedElement());

                // Remove from the drag and drop system
                dragDropSystem.unregisterDraggable(card);

                // remove the song card from the DOM
                const container = card.parentElement;
                container.removeChild(card);
            })
            .catch(error => {
                // handle the error if the API call fails
                console.error('Failed to delete song:', error);
                toastSystem.showError('Failed to delete the song. Please try again.');
            });
    }

    // show the delete confirmation dialog
    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${card.dataset.songName}'?`;
    document.getElementById('modal-delete').showModal();
}
```

As much as possible, create new functions rather than embedding functions inside of other functions.  For example, rather than including all of the initialisation logic within this function (which would be a very long function), create utility functions and call them.  Also, when binding event functions (onclick for example), always make them a separate function unless the code that they will run is only 1-2 lines of code.  For example, this is a well structured initialisation function:
```js
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Initialize the toast system
    initToastSystem();

    // Bind the generate song names and add song buttons
    document.getElementById('btn-generate-song-names').onclick = generateSongNames;
    document.getElementById('btn-add-song-name').onclick = addSongName;

    // Bind the click events for the song edit and delete buttons
    document.getElementById('btn-liked-edit-song-name').onclick = editSongName;
    document.getElementById('btn-liked-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-disliked-edit-song-name').onclick = editSongName;
    document.getElementById('btn-disliked-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-new-edit-song-name').onclick = editSongName;
    document.getElementById('btn-new-delete-song-name').onclick = deleteSongName;

    // Initialize Drag and Drop
    initDragDropSystem();

    // Initialize Select System
    initSelectSystem();
});
```

### Python

TODO
# LLM Guidelines
This document contains guidelines for any LLM when working on files for this project.

## General guidelines
Always look at related code and related files when generating code, and match the algorithm such that there is consistency between source files that do related things.  For example, if the other python views return an error message to the client in the response in a parameter named "error", then do the same thing when you generate new code that performs a similar action.  Always update any inconsistent code you find, even if it is not directly related to my request.  For example, if I ask you to create a new view, and you notice that 4 out of the 5 existing views return the error message using a parameter named "error", and only 1 of the views uses the parameter name of "error_message", then rename "error_message" to "error" such that they are consistent, even though I didn't specifically ask you to in that prompt.  Do the same with documentation style, and all aspects of code formatting and structure.

## Error handling
When generating server code (in python), especially views, ensure you return descriptive error messages back to the client so they can be displayed on web pages.  Do not return an error like: "an error occured", rather use an error like "Failed to create the song, a song by the name of 'Finally Free' already exists.".  Then on the client, use the ToastSystem to show these errors.

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

Use 2 lines of space between all declarations at the root level of a file, for example:
```js
/**
 * Declare selectSystem at the module level
 */
let selectSystem;


/**
 * Declare the toast system at the module level
 */
let toastSystem;


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    ...    
});


/**
 * Add a new song name.
 * This function is typically called as an event handler for a button click.
 * @param {Event} event - The click event that triggered the function.
 */
function addSongName(event) {
    ...
}


/**
```

### Naming Conventions
Use camelCase for variables and functions:
```js
// good
const songNameInput = document.getElementById('song-name');
const generateSongNames = () => { ... };

// bad
const song_name_input = document.getElementById('song-name');
const generate_song_names = () => { ... };
```

Use PascalCase for classes and constructors:
```js
// good
class SongManager {
    constructor() { ... }
}

// bad
class songManager {
    constructor() { ... }
}
```

Use SCREAMING_SNAKE_CASE for constants:
```js
// good
const API_ENDPOINTS = {
    SONG_DELETE: '/api/song/delete',
    SONG_GENERATE: '/api/song/generate'
};

// bad
const apiEndpoints = {
    songDelete: '/api/song/delete',
    songGenerate: '/api/song/generate'
};
```

### Error Handling
Always handle errors gracefully and provide user feedback:
```js
// good
apiSongDelete(songId)
    .then(() => {
        // handle success
        toastSystem.showSuccess('Song deleted successfully');
    })
    .catch(error => {
        // log technical error for debugging
        console.error('Failed to delete song:', error);
        
        // show user-friendly message
        toastSystem.showError('Failed to delete the song. Please try again.');
    });

// bad
apiSongDelete(songId).then(() => {
    // handle success
});
```

### API Integration
When making API calls, always include proper error handling and loading states:
```js
// good
function deleteSong(songId) {
    // show loading state
    const deleteButton = document.getElementById('btn-delete');
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting...';
    
    return apiSongDelete(songId)
        .then(response => {
            // handle success
            toastSystem.showSuccess('Song deleted successfully');
            return response;
        })
        .catch(error => {
            console.error('Delete failed:', error);
            toastSystem.showError('Failed to delete song');
            throw error;
        })
        .finally(() => {
            // restore button state
            deleteButton.disabled = false;
            deleteButton.textContent = 'Delete';
        });
}
```

### DOM Manipulation
Cache DOM elements when used multiple times:
```js
// good
function initializeModal() {
    const modal = document.getElementById('modal-delete');
    const modalMessage = document.getElementById('modal-delete-message');
    const confirmButton = document.getElementById('modal-delete-yes');
    
    // use cached elements
    confirmButton.onclick = () => {
        modalMessage.textContent = 'Processing...';
        modal.close();
    };
}

// bad
function initializeModal() {
    document.getElementById('modal-delete-yes').onclick = () => {
        document.getElementById('modal-delete-message').textContent = 'Processing...';
        document.getElementById('modal-delete').close();
    };
}
```

## Python

### Code Formatting
Follow PEP 8 standards with these specific preferences:

Use 4 spaces for indentation (never tabs):
```python
# good
def generate_song_names(request):
    if request.method == 'POST':
        data = request.POST
        return render(request, 'template.html', {'data': data})
    
    return HttpResponse(status=405)

# bad
def generate_song_names(request):
	if request.method == 'POST':
		data = request.POST
		return render(request, 'template.html', {'data': data})
	
	return HttpResponse(status=405)
```

### Naming Conventions
Use snake_case for variables, functions, and file names:
```python
# good
def get_song_names():
    song_name_list = []
    return song_name_list

# bad
def getSongNames():
    songNameList = []
    return songNameList
```

Use PascalCase for classes:
```python
# good
class SongManager:
    def __init__(self):
        pass

# bad
class song_manager:
    def __init__(self):
        pass
```

### Django-Specific Guidelines
Structure views clearly with proper and complete error handling:
```python
def api_song_delete(request, song_id):
    """
    Delete a song by ID.
    
    Args:
        request: The HTTP request object
        song_id: The ID of the song to delete
    
    Returns:
        JsonResponse: Success/error response
    """
    # validate request method
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        # get the song object
        song = Song.objects.get(id=song_id, user=request.user)
        
        # delete the song
        song.delete()
        
        return JsonResponse({'success': True, 'message': 'Song deleted successfully'})
        
    except Song.DoesNotExist:
        return JsonResponse({'error': 'Song not found'}, status=404)
    except Exception as e:
        # log the error for debugging
        logger.error(f'Failed to delete song {song_id}: {str(e)}')
        
        return JsonResponse({'error': 'Internal server error'}, status=500)
```

## HTML/CSS Guidelines

### HTML Structure
Use semantic HTML elements and proper accessibility attributes:
```html
<!-- good -->
<main class="container">
    <section class="song-list" role="main">
        <h2 class="sr-only">Song Library</h2>
        <article class="card" role="article" aria-labelledby="song-title-1">
            <h3 id="song-title-1">Song Title</h3>
            <button type="button" aria-label="Delete song">Delete</button>
        </article>
    </section>
</main>

<!-- bad -->
<div class="container">
    <div class="song-list">
        <div class="card">
            <div>Song Title</div>
            <div onclick="deleteSong()">Delete</div>
        </div>
    </div>
</div>
```

### daisyUI Usage
Follow the component patterns established in your project:
```html
<!-- use consistent card structure -->
<div class="card bg-base-100 shadow-xl">
    <div class="card-body">
        <h2 class="card-title">Song Name</h2>
        <p>Song description...</p>
        <div class="card-actions justify-end">
            <button class="btn btn-primary">Edit</button>
            <button class="btn btn-error">Delete</button>
        </div>
    </div>
</div>
```

## Project-Specific Conventions

### File Organization
- JavaScript files go in `lyrical/static/lyrical/script/`
- CSS files go in `lyrical/static/lyrical/style/`
- Templates use the Cotton component system when possible
- API views should be prefixed with `api_`
- Page views should be prefixed with `page_`

### System Integration
Always integrate with existing systems:
```js
// integrate with toast system for user feedback
toastSystem.showSuccess('Operation completed successfully');
toastSystem.showError('Operation failed');

// integrate with select system for UI state
selectSystem.selectElement(element);
selectSystem.removeElement(element);

// integrate with drag/drop system for interactive elements
dragDropSystem.registerDraggable(element);
dragDropSystem.unregisterDraggable(element);
```

### Git Commit Messages
Use conventional commit format:
```
feat: add song deletion functionality
fix: resolve toast notification timing issue
docs: update LLM guidelines with Python section
refactor: extract modal handling into separate module
```
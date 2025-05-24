# lyrical

## Done
 - Create README with TODO list
 - Only show edit & delete buttons when hovering the card
 - Bug with floating circle from top left corner, likely in my drag-drop code
 - Rename MANAGE to NEW
 - Look at fonts and font sizes for the panel titles
 - Set cursor to the end of the field when setting focus, or select all
 - Look at changing Temperature and Max Tokens to orange or blue
 - Look at changing the timeline to orange
 - Show the selected LLM cost per 1M tokens on the sidebar
 - Remove SONG TITLE on names page, put MANAGE SONG NAMES in middle of the page or something
 - Rename util_streamhelper to util_stream_helper
 - Save song status when drag-dropping
 - Refactor song-card javascript out of names.js into util_card_song, so it can be reused
 - Able to create a new song name
 - Refactor other apiXxx javascript files to return a promise
 - Work out how to show errors and implement that for all current api calls (eg, duplicate song name)
 - Try moving edit and delete buttons to the header, edit can then show a modal.
 - Validation for song name editing
 - Stop drag and drop when editing
 - When editing, hide all other edit and delete buttons when hovering


## Todo
 - Remove hard coded reference to id's like panel-top-content so I can name them as I wish
 - Filtering & sorting song names
 - Generate Song Names (basic functionality) and add them to the NEW section
 - API call and update UI for showing the current LLM details, and changing to a different LLM
 - API call and update UI for showing LLM parameters (temperature and max tokens)
 - Generate Song Names with parameters
 - Generate Song Names with message history when calling the LLM


## Next
 - Refactor js code, tidy up, rename apis, etc
 - Save Column Widths
 - Login Required for all pages
 - Drag and drop not showing custom cursors
 - Hide girl in media query for short page
 - When a new card is added, make sure it is visible (scroll to it), depends on sorting, etc

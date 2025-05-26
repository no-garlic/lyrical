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
 - Refactor js code, tidy up, rename apis, etc
 - API call and update UI for showing the current LLM details, and changing to a different LLM
 - API call and update UI for showing LLM parameters (temperature and max tokens)
 - Generate Song Names (basic functionality) and add them to the NEW section
 - Dislike All button
 - Archive All button and archive song stage
 - Highlight new cards until clicked on


## Todo
 - Refactor initDragDropSystem
 - Generate Song Names with parameters
 - Hook up max_tokens and temperature
 - Save default values for all form fields (in browser? or in database?)
 - Fix scrollbars
 - Published song stage and add all my songs in the migration 

 - Edit Song button for liked (or a > button in the top right next to the X)
 - Make this page page 1 of the timeline
 - Sort lists and sort cards when added to lists, and scroll to card






## Next
 - Change Toast system to be a singleton
 - Remove hard coded reference to id's like panel-top-content so I can name them as I wish
 - Filtering & sorting song names
 - At init time, vertical slider position should be such that the panel below it consumes the full space and no gap
 - Able to set default panel widths and panel slider position
 - Save Column Widths & panel slider position
 - Login Required for all pages
 - Drag and drop not showing custom cursors
 - Media query to hide the girl image, and reduce the padding when the page height is reduced
 - When a new card is added, make sure it is visible (scroll to it), depends on sorting, etc
 - Icons on buttons?


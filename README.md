# LYRICAL

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
 - Refactor initDragDropSystem
 - Sort lists and sort cards when added to lists
 - Hook up max_tokens and temperature
 - Use Generate values when doing llm call
 - Improve layout of generate values dialog
 - Save default values for all form fields (in browser? or in database?)
 - Fix scrollbars
 - Then scroll to card on drag-drop and add-new
 - Move GENERATE NAMES to top, NEW to bottom
 - Remove hard coded reference to id's like panel-top-content so I can name them as I wish
 - At init time, vertical slider position should be such that the panel below it consumes the full space and no gap
 - Names page should have 4 columns, with the left most column being the generate dialog.
 - Remove the timeline and footer, add a title (maybe a new base template - base_navigation)
 - Add a sidebar entry for names.html, and clean up the view
 - Show Generation Progress on Generate button
 - Press Enter on selected should edit
 - Trim whitespace when editing
 - Published song stage and add all my songs in the migration 
 - Refactor llm generation code in python mostly
 - Make sure llm generation errors flow to the page with a useful error shown
 - Simplify all views
 - Refactor names.js - its too long
 - Add the include and exclude song theme's to the song model, so they can be used when generating the style.  
 - If they dont exist, use the user's defaults.  Update the yaml prompt.
 - Add a filter to show only theme, mood, narrative.
 - Generate for just the selected tab
 - Add custom styles for badges, instead of badge-correct, use badge-mood for example.
 - Use message history for song styles
 - Convert all prints to logger, use claude to do it, and enable logger categories
 - Login Required for all pages
 - Fixed: Gemini Flash 1.5: LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: ```ndjson, Error: Expecting value: line 1 column 1 (char 0)
 - Previous button should work on song style page as long as saved.
 - Swap side of lists on style and hook pages
 - Change order: Song -> Style -> Structure -> Hook -> Lyrics
 - Move hook page generation params into the database
 - Fix Previous button's for new flow
 - Update layout so Save and Cancel appear to apply to the whole page
 - Implement Save and Cancel of Song Sections
 - Structure page can set song tags, and all song generation parameters
 - Structure page can save, save as, delete, and select (assign to song) structure templates - assigning it to a song copies it
 - Show grab hands when can drag drop an item
 - Implement Save and Cancel of Settings
 - Implement Settings Controls and Default Values
 - Implement Clear
 - Implement Templates
 - bug: API's dont send blank values to the database, so if I delete all text in a textbox and save, it wont delete it.



## Todo
 - SMS to Martin
 - Structure: drag and drop not working to the last slot
 - Add a cancel button for Structure page

 - Lyrics page is 2 parts: first time, show: Generate Lyrics only, after that change the controls so can only generate new lyrics for sections, and edit lines of sections
 - Update prompts about combining vocalisations, eg, ah, aah or ah-ah-ah, ooh-ah-ahh
 - Update prompt about other rules, like ... and rrrrrrun
 - Song Structure dialog needs to be a few px wider to match style page width
 
 - badge.scrollIntoView({ behavior: 'smooth', block: 'center' });
 - refactor using btn-generate for songId - get it from document.body instead
 - drag and drop items dont animate back into place on Song Names page like they do on Structure page

 
 

## Backlog
 - Update navigation system hyperlinks
 - Make all modals looks the same
 - Fix jitter upon closing a modal
 - Add href# to Navigation Timeline
 - Make all panels use scrollbars the same
 - Create follow up prompts, eg, song_hooks.follow_up.
 - Redo the song names page, remove disliked list
 - Song Names should have a thumbs up and thumbs down on them
 - Get rid of archived status from songs
 - Song page same height as style page
 - Make DragDrop target certain drop zones based on drag item
 - Add bootstrap icons to buttons
 - Update register and login pages
 - Make the library page page 1 of the timeline
 - Create Lyrics button on names.html goes to page 2 of edit
 - Use tabs on song page instead of booleans
 - Complete or delete the implementation of util_navigation.js
 - Update LLM Costs and maybe add other models for testing
 - Change Toast system to be a singleton
 - Filtering song names (library page)
 - Drag and drop not showing custom cursors
 - Media query to hide the girl image, and reduce the padding when the page height is reduced
 - Change font color on login and register pages
 - Link to home on login and register pages
 - Click close button on a card, shows another X and Tick as a confirmation
 - review scrollbars use on all pages


## Maybe
 - Able to set default panel widths and panel slider position
 - Save Column Widths & panel slider position
 - When a new card is added, make sure it is visible (scroll to it), depends on sorting, etc
 - Put instructional text on every page to tell the user what to do


## Bugs:
 - Unable to save an empty Song Hook, Theme, Mood, Narrative, etc...
 
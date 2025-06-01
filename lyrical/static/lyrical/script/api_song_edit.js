
/**
 * Edit a song via API call.
 * @param {string} songId - The ID of the song to edit.
 * @param {Object} updates - Object containing fields to update (song_name and/or song_stage).
 * @returns {Promise<string>} Promise that resolves to the song ID.
 */
export function apiSongEdit(songId, updates = {}) {
    // accept updates object with specific parameters only
    const {
        song_name: songName,
        song_stage: songStage,
        song_theme: songTheme,
        song_narrative: songNarrative,
        song_mood: songMood,
        
        hook: songHook,
        hook_custom_request: hookCustomRequest,
        hook_rhyme_with: hookRhymeWith,
        hook_vocalisation_level: hookVocalisationLevel,
        hook_vocalisation_terms: hookVocalisationTerms,
        hook_max_lines: hookMaxLines,
        hook_average_syllables: hookAverageSyllables,

        structure_intro_lines: structureIntroLines,
        structure_outro_lines: structureOutroLines,
        structure_verse_count: structureVerseCount,
        structure_verse_lines: structureVerseLines,
        structure_pre_chorus_lines: structurePreChorusLines,
        structure_chorus_lines: structureChorusLines,
        structure_bridge_lines: structureBridgeLines,
        structure_average_syllables: structureSyllables,
        structure_vocalisation_level: structureVocalisationLevel,
        structure_vocalisation_lines: structureVocalisationLines,
        structure_vocalisation_terms: structureVocalisationTerms,
        structure_custom_request: structureCustomRequest,
        structure: songStructure,
    } = updates;

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { song_id: songId };

    // base fields
    if (songName != undefined) requestBody.song_name = songName;
    if (songStage != undefined) requestBody.song_stage = songStage;
    if (songTheme != undefined) requestBody.song_theme = songTheme;
    if (songNarrative  != undefined) requestBody.song_narrative = songNarrative;
    if (songMood != undefined) requestBody.song_mood = songMood;

    // song hook fields
    if (songHook != undefined) requestBody.hook = songHook;
    if (hookCustomRequest != undefined) requestBody.hook_custom_request = hookCustomRequest;
    if (hookRhymeWith != undefined) requestBody.hook_rhyme_with = hookRhymeWith;
    if (hookVocalisationLevel != undefined) requestBody.hook_vocalisation_level = hookVocalisationLevel;
    if (hookVocalisationTerms != undefined) requestBody.hook_vocalisation_terms = hookVocalisationTerms;
    if (hookMaxLines != undefined) requestBody.hook_max_lines = hookMaxLines;
    if (hookAverageSyllables != undefined) requestBody.hook_average_syllables = hookAverageSyllables;

    // song structure fields
    if (structureIntroLines != undefined) requestBody.structure_intro_lines = structureIntroLines;
    if (structureOutroLines != undefined) requestBody.structure_outro_lines = structureOutroLines;
    if (structureVerseCount != undefined) requestBody.structure_verse_count = structureVerseCount;
    if (structureVerseLines != undefined) requestBody.structure_verse_lines = structureVerseLines;
    if (structurePreChorusLines != undefined) requestBody.structure_pre_chorus_lines = structurePreChorusLines;
    if (structureChorusLines != undefined) requestBody.structure_chorus_lines = structureChorusLines;
    if (structureBridgeLines != undefined) requestBody.structure_bridge_lines = structureBridgeLines;
    if (structureSyllables != undefined) requestBody.structure_average_syllables = structureSyllables;
    if (structureVocalisationLevel != undefined) requestBody.structure_vocalisation_level = structureVocalisationLevel;
    if (structureVocalisationLines != undefined) requestBody.structure_vocalisation_lines = structureVocalisationLines;
    if (structureVocalisationTerms != undefined) requestBody.structure_vocalisation_terms = structureVocalisationTerms;
    if (structureCustomRequest != undefined) requestBody.structure_custom_request = structureCustomRequest;
    if (songStructure != undefined) requestBody.structure = songStructure;

    // log the request body for debugging
    console.log('Request body for song edit:', JSON.stringify(requestBody, null, 2));

    // send the request to the server
    return fetch('/api_song_edit', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('edit operation returned success');
            return data.song_id;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit song');
        }
    })
    .catch(error => {
        console.error('Error editing song:', error);
        throw error;
    });
}
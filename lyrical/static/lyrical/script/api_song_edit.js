/**
 * API function for editing song properties.
 * Handles updating song names, stages, themes, and structure settings.
 */

/**
 * Edit a song via API call
 * @param {string} songId - The ID of the song to edit
 * @param {Object} [updates={}] - Object containing fields to update
 * @param {string} [updates.song_name] - New song name
 * @param {string} [updates.song_stage] - New song stage
 * @param {string} [updates.song_theme] - New song theme
 * @param {string} [updates.song_narrative] - New song narrative
 * @param {string} [updates.song_mood] - New song mood
 * @param {number} [updates.structure_intro_lines] - Number of intro lines
 * @param {number} [updates.structure_outro_lines] - Number of outro lines
 * @param {number} [updates.structure_verse_lines] - Number of verse lines
 * @param {number} [updates.structure_pre_chorus_lines] - Number of pre-chorus lines
 * @param {number} [updates.structure_chorus_lines] - Number of chorus lines
 * @param {number} [updates.structure_bridge_lines] - Number of bridge lines
 * @param {number} [updates.structure_average_syllables] - Average syllables per line
 * @param {number} [updates.structure_vocalisation_level] - Vocalisation level
 * @param {number} [updates.structure_vocalisation_lines] - Number of vocalisation lines
 * @param {string} [updates.structure_vocalisation_terms] - Vocalisation terms
 * @param {string} [updates.structure_custom_request] - Custom structure request
 * @param {string} [updates.structure] - Song structure as comma-separated string
 * @returns {Promise<string>} Promise that resolves to the song ID
 */
export function apiSongEdit(songId, updates = {}) {
    // Accept updates object with specific parameters only
    const {
        song_name: songName,
        song_stage: songStage,
        song_theme: songTheme,
        song_narrative: songNarrative,
        song_mood: songMood,
        
        structure_intro_lines: structureIntroLines,
        structure_outro_lines: structureOutroLines,
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

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = { song_id: songId };

    // Base fields
    if (songName != undefined) requestBody.song_name = songName;
    if (songStage != undefined) requestBody.song_stage = songStage;
    if (songTheme != undefined) requestBody.song_theme = songTheme;
    if (songNarrative  != undefined) requestBody.song_narrative = songNarrative;
    if (songMood != undefined) requestBody.song_mood = songMood;

    // Song structure fields
    if (structureIntroLines != undefined) requestBody.structure_intro_lines = structureIntroLines;
    if (structureOutroLines != undefined) requestBody.structure_outro_lines = structureOutroLines;
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

    // Log the request body for debugging
    console.log('Request body for song edit:', JSON.stringify(requestBody, null, 2));

    // Send the request to the server
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
            console.log('Edit operation returned success');
            return data.song_id;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to edit song');
        }
    })
    .catch(error => {
        console.error('Error editing song:', error);
        throw error;
    });
}
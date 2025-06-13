/**
 * API functions for chat history summarisation.
 * Provides methods to check summarisation status and trigger summarisation.
 */

/**
 * Check if any conversations for a song need summarisation
 * @param {string|number} songId - The ID of the song to check
 * @returns {Promise<Object>} Promise that resolves to summarisation status information
 */
export function apiCheckSummarisationStatus(songId) {
    const url = new URL('/api_check_summarisation_status', window.location.origin);
    url.searchParams.append('song_id', songId);

    console.log('Checking summarisation status for song:', songId);

    return fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Summarisation status check result:', data);
        return data;
    })
    .catch(error => {
        console.error('Error checking summarisation status:', error);
        throw error;
    });
}

/**
 * Summarise chat history for a specific conversation type
 * @param {string|number} songId - The ID of the song
 * @param {string} messageType - The type of conversation ('style' or 'lyrics')
 * @param {boolean} [forceSummarise=false] - Whether to force summarisation even if not needed
 * @returns {Promise<Object>} Promise that resolves to summarisation result
 */
export function apiSummariseChatHistory(songId, messageType, forceSummarise = false) {
    // Validate message type
    if (!['style', 'lyrics'].includes(messageType)) {
        return Promise.reject(new Error('Message type must be "style" or "lyrics"'));
    }

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body
    const requestBody = {
        song_id: songId,
        message_type: messageType,
        force_summarise: forceSummarise
    };

    console.log('Summarisation request:', JSON.stringify(requestBody, null, 2));

    return fetch('/api_summarise_chat_history', {
        method: 'POST',
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
        console.log('Summarisation result:', data);
        
        if (data.status === 'success') {
            console.log(`Successfully summarised ${data.messages_summarised} messages for ${messageType} conversation`);
            return data;
        } else if (data.status === 'not_needed') {
            console.log(`Summarisation not needed for ${messageType} conversation`);
            return data;
        } else {
            throw new Error(data.error || 'Unknown error occurred during summarisation');
        }
    })
    .catch(error => {
        console.error('Error summarising chat history:', error);
        throw error;
    });
}

/**
 * Summarise all conversations for a song that need summarisation
 * @param {string|number} songId - The ID of the song
 * @param {boolean} [forceSummarise=false] - Whether to force summarisation even if not needed
 * @returns {Promise<Object>} Promise that resolves to combined summarisation results
 */
export function apiSummariseAllConversations(songId, forceSummarise = false) {
    console.log('Starting summarisation for all conversations for song:', songId);

    // First check what needs summarisation
    return apiCheckSummarisationStatus(songId)
        .then(status => {
            const promises = [];
            const results = {
                song_id: songId,
                style: null,
                lyrics: null,
                any_summarised: false
            };

            // Summarise style conversation if needed or forced
            if (forceSummarise || status.style.needs_summarisation) {
                console.log('Queueing style conversation for summarisation');
                promises.push(
                    apiSummariseChatHistory(songId, 'style', forceSummarise)
                        .then(result => {
                            results.style = result;
                            if (result.status === 'success') {
                                results.any_summarised = true;
                            }
                        })
                        .catch(error => {
                            results.style = { status: 'error', error: error.message };
                        })
                );
            } else {
                console.log('Style conversation does not need summarisation');
                results.style = { status: 'not_needed', message: 'Style conversation does not need summarisation' };
            }

            // Summarise lyrics conversation if needed or forced
            if (forceSummarise || status.lyrics.needs_summarisation) {
                console.log('Queueing lyrics conversation for summarisation');
                promises.push(
                    apiSummariseChatHistory(songId, 'lyrics', forceSummarise)
                        .then(result => {
                            results.lyrics = result;
                            if (result.status === 'success') {
                                results.any_summarised = true;
                            }
                        })
                        .catch(error => {
                            results.lyrics = { status: 'error', error: error.message };
                        })
                );
            } else {
                console.log('Lyrics conversation does not need summarisation');
                results.lyrics = { status: 'not_needed', message: 'Lyrics conversation does not need summarisation' };
            }

            // Wait for all summarisations to complete
            return Promise.all(promises).then(() => results);
        })
        .then(results => {
            console.log('All conversation summarisation completed:', results);
            return results;
        });
}

/**
 * Show a user notification about summarisation status.
 * This function can be used to inform users when summarisation is needed or completed.
 * @param {Object} statusData - Status data from apiCheckSummarisationStatus
 * @param {Function} notificationFunction - Function to display notifications (e.g., showErrorToast)
 */
export function showSummarisationNotification(statusData, notificationFunction) {
    if (!statusData.any_needs_summarisation) {
        return; // No notification needed
    }

    const conversationsNeedingSummary = [];
    if (statusData.style.needs_summarisation) {
        conversationsNeedingSummary.push('style');
    }
    if (statusData.lyrics.needs_summarisation) {
        conversationsNeedingSummary.push('lyrics');
    }

    const message = `Your ${conversationsNeedingSummary.join(' and ')} conversation${conversationsNeedingSummary.length > 1 ? 's' : ''} ${conversationsNeedingSummary.length > 1 ? 'are' : 'is'} getting long. Consider summarising to improve performance.`;
    
    if (notificationFunction) {
        notificationFunction(message);
    } else {
        console.warn('Summarisation needed:', message);
    }
}
/**
 * Helper class for handling streaming HTTP requests with NDJSON responses.
 * Provides callbacks for different stages of the streaming process.
 */
export class StreamHelper {
    /**
     * Creates a new StreamHelper instance
     * @param {string} baseUrl - The base URL for the streaming endpoint
     * @param {Object} [options={}] - Configuration options
     * @param {Object} [options.callbacks] - Callback functions for stream events
     * @param {string} [options.csrfTokenSelector] - CSS selector for CSRF token element
     */
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.params = new URLSearchParams();
        this.callbacks = {
            onPreRequest: () => {},
            onIncomingData: () => {},
            onStreamEnd: () => {},
            onComplete: () => {},
            onError: () => {},
            ...options.callbacks,
        };
        this.csrfTokenSelector = options.csrfTokenSelector || '[name=csrfmiddlewaretoken]';
        this.abortController = null;
    }

    /**
     * Sets a URL parameter that will be included in requests
     * @param {string} name - The name of the parameter
     * @param {string} value - The value of the parameter
     */
    setParameter(name, value) {
        this.params.set(name, value);
    }

    /**
     * Removes a default URL parameter
     * @param {string} name - The name of the parameter
     */
    removeParameter(name) {
        this.params.delete(name);
    }

    /**
     * Clears all default URL parameters
     */
    clearParameters() {
        this.params = new URLSearchParams();
    }

    /**
     * Initiates the streaming request
     * @param {Object} [requestSpecificParams={}] - Parameters for this specific request
     *                                            These are combined with and can override default parameters
     */
    initiateRequest(requestSpecificParams = {}) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Store request params for later use (e.g., in completion handler)
        this.lastRequestParams = requestSpecificParams;

        this.callbacks.onPreRequest();

        const finalParams = this._buildFinalParams(requestSpecificParams);
        const csrfToken = this._getCsrfToken();
        const url = `${this.baseUrl}?${finalParams.toString()}`;

        const fetchOptions = this._buildFetchOptions(csrfToken, signal);

        fetch(url, fetchOptions)
            .then(response => this._handleResponse(response))
            .catch(error => this._handleError(error));
    }

    /**
     * Builds final parameters combining default and request-specific params
     * @param {Object} requestSpecificParams - Request-specific parameters
     * @returns {URLSearchParams} Combined parameters
     * @private
     */
    _buildFinalParams(requestSpecificParams) {
        const finalParams = new URLSearchParams(this.params);
        for (const key in requestSpecificParams) {
            if (Object.hasOwnProperty.call(requestSpecificParams, key)) {
                finalParams.set(key, requestSpecificParams[key]);
            }
        }
        return finalParams;
    }

    /**
     * Retrieves CSRF token from the document
     * @returns {string|null} CSRF token value or null if not found
     * @private
     */
    _getCsrfToken() {
        const csrfTokenInput = document.querySelector(this.csrfTokenSelector);
        const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

        if (!csrfToken) {
            console.warn('CSRF token not found using selector:', this.csrfTokenSelector, '. Request might fail.');
        }

        return csrfToken;
    }

    /**
     * Builds fetch options for the request
     * @param {string|null} csrfToken - CSRF token
     * @param {AbortSignal} signal - Abort signal
     * @returns {Object} Fetch options
     * @private
     */
    _buildFetchOptions(csrfToken, signal) {
        return {
            method: 'GET',
            headers: {
                ...(csrfToken && { 'X-CSRFToken': csrfToken }),
                'Accept': 'application/x-ndjson',
            },
            signal,
        };
    }

    /**
     * Handles the fetch response
     * @param {Response} response - Fetch response
     * @returns {Promise} Promise that resolves after processing the stream
     * @private
     */
    _handleResponse(response) {
        if (!response.ok) {
            return this._handleServerError(response);
        }
        if (!response.body) {
            throw { type: 'network', message: 'Response body is missing.', response: response };
        }
        return this._processStream(response.body);
    }

    /**
     * Handles server error responses
     * @param {Response} response - Fetch response with error
     * @returns {Promise} Rejected promise with error details
     * @private
     */
    _handleServerError(response) {
        return response.json()
            .then(errData => {
                throw {
                    type: 'server',
                    status: response.status,
                    message: errData.error || errData.detail || response.statusText || 'Server error',
                    data: errData,
                    response: response
                };
            })
            .catch(() => {
                throw {
                    type: 'server',
                    status: response.status,
                    message: response.statusText || 'Server error with non-JSON response',
                    response: response
                };
            });
    }

    /**
     * Handles fetch errors
     * @param {Error} error - Error object
     * @private
     */
    _handleError(error) {
        if (error.name === 'AbortError') {
            console.log('Fetch aborted by user.');
            return;
        }
        const errorObject = {
            type: error.type || 'network',
            message: error.message || 'An unexpected network or request error occurred.',
            status: error.status,
            data: error.data,
            originalError: error
        };
        this.callbacks.onError(errorObject);
        this._handleCompletion();
    }

    /**
     * Aborts the current streaming request, if any
     */
    abortRequest() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Processes the streaming response body
     * @param {ReadableStream} readableStream - The response stream
     * @returns {Promise} Promise that resolves when stream processing is complete
     * @private
     */
    async _processStream(readableStream) {
        const reader = readableStream.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this._processRemainingData(accumulatedData);
                    this.callbacks.onStreamEnd();
                    break;
                }

                accumulatedData += decoder.decode(value, { stream: true });
                accumulatedData = this._processLines(accumulatedData);
            }
        } catch (error) {
            this._handleStreamError(error);
        } finally {
            reader.releaseLock();
            if (!this.abortController || !this.abortController.signal.aborted) {
                this._handleCompletion();
            }
            this.abortController = null;
        }
    }

    /**
     * Processes any remaining data in the buffer when stream ends
     * @param {string} accumulatedData - Remaining data
     * @private
     */
    _processRemainingData(accumulatedData) {
        if (accumulatedData.trim() !== '') {
            console.warn('Stream ended with unprocessed data in buffer:', accumulatedData);
            try {
                const jsonData = JSON.parse(accumulatedData);
                this.callbacks.onIncomingData(jsonData);
            } catch (e) {
                this.callbacks.onError({
                    type: 'parsing',
                    message: 'Failed to parse final JSON object from stream buffer.',
                    raw_content: accumulatedData,
                    details: e.toString(),
                });
            }
        }
    }

    /**
     * Processes complete lines from accumulated data
     * @param {string} accumulatedData - Accumulated stream data
     * @returns {string} Remaining unprocessed data
     * @private
     */
    _processLines(accumulatedData) {
        let newlineIndex;
        while ((newlineIndex = accumulatedData.indexOf('\n')) >= 0) {
            const line = accumulatedData.substring(0, newlineIndex);
            accumulatedData = accumulatedData.substring(newlineIndex + 1);

            if (line.trim() !== '') {
                this._parseLine(line);
            }
        }
        return accumulatedData;
    }

    /**
     * Parses a single line as JSON
     * @param {string} line - Line to parse
     * @private
     */
    _parseLine(line) {
        try {
            const jsonData = JSON.parse(line);
            this.callbacks.onIncomingData(jsonData);
        } catch (e) {
            this.callbacks.onError({
                type: 'parsing',
                message: 'Failed to parse NDJSON line from stream.',
                raw_content: line,
                details: e.toString(),
            });
        }
    }

    /**
     * Handles errors during stream processing
     * @param {Error} error - Error object
     * @private
     */
    _handleStreamError(error) {
        if (error.name === 'AbortError') {
            console.log('Stream reading aborted by user.');
            return;
        }
        this.callbacks.onError({
            type: 'stream_processing',
            message: 'Error while processing the data stream.',
            details: error.toString(),
            originalError: error,
        });
    }

    /**
     * Handles completion by checking summarization status and calling onComplete callback
     * @private
     */
    async _handleCompletion() {
        try {
            // Check if this is a generation endpoint that should check summarization
            // Try to get song_id from either the default params or the last request params
            let songId = this.params.get('song_id');
            if (!songId && this.lastRequestParams) {
                songId = this.lastRequestParams['song_id'];
            }
            
            const shouldCheck = this._shouldCheckSummarization();
            
            if (songId && shouldCheck) {
                // Import the summarization API
                const { apiCheckSummarisationStatus } = await import('./api_summarise_chat_history.js');
                
                // Check summarization status
                const statusData = await apiCheckSummarisationStatus(songId);
                
                const callbackData = {
                    needsSummarisation: statusData.any_needs_summarisation,
                    summarisationDetails: statusData
                };
                
                // Call onComplete with summarization information
                this.callbacks.onComplete(callbackData);
            } else {
                // Call onComplete without summarization data for backwards compatibility
                this.callbacks.onComplete();
            }
        } catch (error) {
            console.warn('Failed to check summarization status after stream completion:', error);
            // Fall back to standard completion call
            this.callbacks.onComplete();
        }
    }

    /**
     * Determines if summarization status should be checked for this endpoint
     * @returns {boolean} True if summarization check should be performed
     * @private
     */
    _shouldCheckSummarization() {
        // Check if this is a generation endpoint that creates messages
        const generationEndpoints = [
            'api_gen_song_lyrics',
            'api_gen_song_lyrics_section', 
            'api_gen_song_styles'
        ];
        
        return generationEndpoints.some(endpoint => this.baseUrl.includes(endpoint));
    }
}
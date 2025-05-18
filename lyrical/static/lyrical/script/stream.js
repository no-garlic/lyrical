class StreamHelper {
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.params = new URLSearchParams(); // For default/persistent params
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
     * Sets a URL parameter that will be included in requests.
     * @param {string} name - The name of the parameter.
     * @param {string} value - The value of the parameter.
     */
    setParameter(name, value) {
        this.params.set(name, value);
    }

    /**
     * Removes a default URL parameter.
     * @param {string} name - The name of the parameter.
     */
    removeParameter(name) {
        this.params.delete(name);
    }

    /**
     * Clears all default URL parameters.
     */
    clearParameters() {
        this.params = new URLSearchParams();
    }

    /**
     * Initiates the streaming request.
     * @param {object} [requestSpecificParams={}] - Parameters for this specific request.
     *                                            These are combined with and can override default parameters.
     */
    initiateRequest(requestSpecificParams = {}) {
        if (this.abortController) {
            this.abortController.abort(); // Abort any ongoing request
        }
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        this.callbacks.onPreRequest();

        // Combine default params with request-specific params
        const finalParams = new URLSearchParams(this.params);
        for (const key in requestSpecificParams) {
            if (Object.hasOwnProperty.call(requestSpecificParams, key)) {
                finalParams.set(key, requestSpecificParams[key]);
            }
        }

        const csrfTokenInput = document.querySelector(this.csrfTokenSelector);
        const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

        if (!csrfToken) {
            // It's better to let the application decide how to handle missing CSRF,
            // so we won't throw an error here but the onError callback will be triggered by fetch failure if CSRF is mandatory.
            console.warn('CSRF token not found using selector:', this.csrfTokenSelector, '. Request might fail.');
        }

        const url = `${this.baseUrl}?${finalParams.toString()}`;

        fetch(url, {
            method: 'GET',
            headers: {
                ...(csrfToken && { 'X-CSRFToken': csrfToken }), // Conditionally add CSRF token
                'Accept': 'application/x-ndjson',
            },
            signal,
        })
        .then(response => {
            if (!response.ok) {
                // Try to get more detailed error from server response
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
                    .catch(() => { // Fallback if response is not JSON or other error
                        throw {
                            type: 'server',
                            status: response.status,
                            message: response.statusText || 'Server error with non-JSON response',
                            response: response
                        };
                    });
            }
            if (!response.body) {
                throw { type: 'network', message: 'Response body is missing.', response: response };
            }
            return this._processStream(response.body);
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted by user.');
                // Do not call onError or onComplete for user-initiated aborts.
                // Specific cleanup for aborts could be handled by a dedicated onAbort callback if needed.
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
            this.callbacks.onComplete(); // Ensure onComplete is called to finalize UI, e.g., hide loaders
        });
    }

    /**
     * Aborts the current streaming request, if any.
     */
    abortRequest() {
        if (this.abortController) {
            this.abortController.abort();
            // this.abortController = null; // Cleared in _processStream finally or fetch catch
        }
    }

    async _processStream(readableStream) {
        const reader = readableStream.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // Process any remaining data in accumulatedData before ending
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
                    this.callbacks.onStreamEnd(); // Signal that all data has been received and processed
                    break;
                }

                accumulatedData += decoder.decode(value, { stream: true });
                let newlineIndex;
                while ((newlineIndex = accumulatedData.indexOf('\n')) >= 0) {
                    const line = accumulatedData.substring(0, newlineIndex);
                    accumulatedData = accumulatedData.substring(newlineIndex + 1);

                    if (line.trim() !== '') {
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
                            // Depending on desired behavior, one might choose to stop the stream here
                            // or continue processing subsequent lines. For now, we continue.
                        }
                    }
                }
            }
        } catch (error) {
            // This catch block handles errors during the stream reading process itself (e.g., network drop mid-stream)
            // It does not handle AbortError if the abort was initiated before or during reader.read()
            if (error.name === 'AbortError') {
                console.log('Stream reading aborted by user.');
                 // Handled by the main fetch().catch()
                return;
            }
            this.callbacks.onError({
                type: 'stream_processing',
                message: 'Error while processing the data stream.',
                details: error.toString(),
                originalError: error,
            });
        } finally {
            reader.releaseLock();
            // onComplete is called regardless of success or stream processing error,
            // but not if it was an AbortError handled by the outer fetch catch.
            if (!this.abortController || !this.abortController.signal.aborted) {
                 this.callbacks.onComplete();
            }
            this.abortController = null; // Clean up controller
        }
    }
}

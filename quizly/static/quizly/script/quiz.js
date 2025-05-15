document.addEventListener('DOMContentLoaded', function () {
    initRatingSystem();
    initSaveForLater();
    initAttemptNow();
});

function initRatingSystem() {
    const rateButton = document.querySelector(
        '.quiz-btn:has(i.bi-star), .quiz-btn:has(i.bi-star-fill)'
    );
    // Check if the button exists and add the click event listener
    if (rateButton) {
        rateButton.addEventListener('click', handleRateButtonClick);
    }
}

function handleRateButtonClick() {
    // Get user's previous rating if it exists
    const userRating = parseInt(this.dataset.userRating) || 0;

    // Create and show the rating popup
    showRatingPopup(userRating);
}

function initSaveForLater() {
    // Get the save for later button and add the click event listener
    const saveButton = document.getElementById('save-for-later');
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveButtonClick);
    }
}

function handleSaveButtonClick() {
    // Get the quiz ID from the URL
    const path = window.location.pathname;
    const quizId = path.split('/').pop();

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the save for later request
    fetch('/save_for_later', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        },
        body: `quiz_id=${quizId}`,
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update the button appearance and text
                const icon = this.querySelector('i');
                const isSaved = data.is_saved;

                // Change the icon and text based on the saved status
                if (isSaved) {
                    icon.classList.remove('bi-bookmark');
                    icon.classList.add('bi-bookmark-fill');
                    this.textContent = '';
                    this.appendChild(icon);
                    this.appendChild(document.createTextNode('Saved For Later'));
                    this.dataset.saved = 'true';
                } else {
                    icon.classList.remove('bi-bookmark-fill');
                    icon.classList.add('bi-bookmark');
                    this.textContent = '';
                    this.appendChild(icon);
                    this.appendChild(document.createTextNode('Save For Later'));
                    this.dataset.saved = 'false';
                }

                // Remove focus from the button
                this.blur();
            }
        })
        .catch(error => {
            console.error('Error saving quiz for later:', error);
        });
}

function initAttemptNow() {
    // Get the attempt now button and add the click event listener
    const attemptButton = document.getElementById('attempt-now');
    if (attemptButton) {
        attemptButton.addEventListener('click', handleAttemptButtonClick);
    }
}

function handleAttemptButtonClick() {
    // Get the quiz ID from the URL
    const path = window.location.pathname;
    const quizId = path.split('/').pop();

    // Navigate to the attempt page
    window.location.href = `/new_attempt/${quizId}`;
}

function showRatingPopup(userRating = 0) {
    // Create the popup container
    const popup = document.createElement('div');
    popup.classList.add('rating-popup');

    // Create popup content
    popup.innerHTML = `
        <div class="rating-popup-content">
            <h3>Rate</h3>
            <div class="stars-container">
                ${Array(5)
                    .fill()
                    .map((_, i) => `<i class="bi bi-star star-rating" data-rating="${i + 1}"></i>`)
                    .join('')}
            </div>
        </div>
    `;

    // Add popup to the body
    document.body.appendChild(popup);

    // Add event listeners to stars
    const stars = popup.querySelectorAll('.star-rating');

    // Initialize with user's previous rating if available
    if (userRating > 0) {
        updateStars(stars, userRating);
    }

    stars.forEach(star => {
        // Setup the hover effect for the stars
        star.addEventListener('mouseenter', handleStarMouseEnter);

        // Setup the click event to submit the rating
        star.addEventListener('click', function (e) {
            handleStarClick(e, popup);
        });
    });

    // Reset the stars when the mouse leaves the container, but only if no rating was previously selected
    const starsContainer = popup.querySelector('.stars-container');
    starsContainer.addEventListener('mouseleave', function () {
        handleStarsContainerMouseLeave(stars, userRating);
    });

    // Close the popup when clicking outside
    popup.addEventListener('click', function (e) {
        handlePopupClick(e, popup);
    });

    // Show the popup with a slight delay for better UX
    setTimeout(() => {
        popup.classList.add('active');
    }, 10);
}

function handleStarMouseEnter() {
    // Get the rating and stars node
    const rating = parseInt(this.dataset.rating);
    const stars = this.parentNode.querySelectorAll('.star-rating');

    // Update the stars based on the hovered rating
    updateStars(stars, rating);
}

function handleStarClick(e, popup) {
    // Get the clicked star and its rating
    const star = e.currentTarget;
    const rating = parseInt(star.dataset.rating);

    // Submit the rating to the server
    submitRating(rating);

    // Update the button's data attribute with the new rating
    document.querySelector(
        '.quiz-btn:has(i.bi-star), .quiz-btn:has(i.bi-star-fill)'
    ).dataset.userRating = rating;

    // Close popup after a short delay
    setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => {
            popup.remove();
        }, 300);
    }, 500);
}

function handleStarsContainerMouseLeave(stars, userRating) {
    if (userRating > 0) {
        // If the user has already rated, show their rating
        updateStars(stars, userRating);
    } else {
        // If no rating, reset all stars to empty
        resetStars(stars);
    }
}

function handlePopupClick(e, popup) {
    if (e.target === popup) {
        // If the click is outside the popup then close it
        popup.remove();
    }
}

function updateStars(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            // Fill the star if its index is less than the rating
            star.classList.remove('bi-star');
            star.classList.add('bi-star-fill');
        } else {
            // Empty the star if its index is greater than or equal to the rating
            star.classList.remove('bi-star-fill');
            star.classList.add('bi-star');
        }
    });
}

function resetStars(stars) {
    // Reset all stars to empty
    stars.forEach(star => {
        star.classList.remove('bi-star-fill');
        star.classList.add('bi-star');
    });
}

function submitRating(rating) {
    // Get the quiz ID from the URL
    const path = window.location.pathname;
    const quizId = path.split('/').pop();

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send the rating to the server
    fetch('/rate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        },
        body: `quiz_id=${quizId}&rating=${rating}`,
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update the rate button icon
                const rateButton = document.querySelector(
                    '.quiz-btn:has(i.bi-star), .quiz-btn:has(i.bi-star-fill)'
                );
                const starIcon = rateButton.querySelector('i');

                // Change to a solid star since the user has now rated the quiz
                starIcon.classList.remove('bi-star');
                starIcon.classList.add('bi-star-fill');

                // Update the button's data attribute
                rateButton.dataset.userRating = rating;

                // Log the success message
                console.log('Rating submitted successfully');

                // Refresh the page to show the updated average rating
                window.location.reload();
            }
        })
        .catch(error => {
            console.error('Error submitting rating:', error);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    initQuizForm();
    initRadioButtonHandling();
});

function initQuizForm() {
    // Get the form element
    const quizForm = document.getElementById('quiz-form');

    // Check if the form exists and add the submit event listener
    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizFormSubmit);
    }
}

function handleQuizFormSubmit(e) {
    // Prevent the default form submission
    e.preventDefault();

    // Collect all answers
    const answers = {};
    const questionForms = document.querySelectorAll('.question-options');

    // Loop through each question form
    questionForms.forEach(form => {
        const radioButtons = form.querySelectorAll('input[type="radio"]');

        // Loop through each radio button in the question form
        for (const radio of radioButtons) {
            if (radio.checked) {
                // Extract the question ID from the name (question_X)
                const questionId = radio.name.split('_')[1];
                answers[questionId] = radio.value;
                break;
            }
        }
    });

    // Set the answers data in the hidden input
    document.getElementById('answers-data').value = JSON.stringify(answers);

    // Submit the form
    this.submit();
}

function initRadioButtonHandling() {
    // Handle radio button clicks to update the visual state
    const radioLabels = document.querySelectorAll('.option-label');

    // Add click event listener to each label
    radioLabels.forEach(label => {
        label.addEventListener('click', handleRadioLabelClick);
    });
}

function handleRadioLabelClick() {
    // Find the associated radio input
    const radioInput = document.getElementById(this.getAttribute('for'));

    // Get all radio buttons in this question group
    const questionOptions = this.closest('.question-options');
    const allRadioButtons = questionOptions.querySelectorAll('.radio-button');

    // Remove the selected class from all radio buttons
    allRadioButtons.forEach(rb => rb.classList.remove('selected'));

    // Add the selected class to the clicked radio button
    const clickedRadioButton = this.querySelector('.radio-button');
    clickedRadioButton.classList.add('selected');
}

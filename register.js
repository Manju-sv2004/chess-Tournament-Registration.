document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const clearButton = document.querySelector('.clear-button');
    const cancelButton = document.querySelector('.cancel-button');

    // Get all required input fields
    const requiredInputs = registrationForm.querySelectorAll('input[required]');
    const phoneNumberInput = document.getElementById('phoneNumber');

    let API_BASE = 'http://localhost:3000/api'; // Default, will be updated

    async function getApiBase() {
        try {
            const savedPort = localStorage.getItem('apiPort');
            if (savedPort) {
                API_BASE = `http://localhost:${savedPort}/api`;
                return API_BASE;
            }
            const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005];
            for (const port of commonPorts) {
                try {
                    const response = await fetch(`http://localhost:${port}/api/port`, { method: 'GET' });
                    if (response.ok) {
                        const data = await response.json();
                        API_BASE = `http://localhost:${data.port}/api`;
                        localStorage.setItem('apiPort', data.port);
                        return API_BASE;
                    }
                } catch (e) {}
            }
            return API_BASE;
        } catch (error) {
            console.error('Error getting API base:', error);
            return API_BASE;
        }
    }

    // On DOMContentLoaded, update API_BASE dynamically
    getApiBase().then((base) => {
        API_BASE = base;
        console.log('API Base URL:', API_BASE);
    });

    // Function to validate a single input field
    function validateInput(input) {
        const value = input.value.trim();
        const isRequired = input.hasAttribute('required');
        let isValid = true;

        if (isRequired && value === '') {
            isValid = false; // Required field is empty
        } else if (input.id === 'phoneNumber') {
            // Validate phone number for exactly 10 digits
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
            }
        } else if (input.type === 'email') {
            // Basic email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value !== '' && !emailRegex.test(value)) {
                 isValid = false;
            }
        }

        // Apply validation styles
        if (isValid) {
            input.classList.add('valid');
            input.classList.remove('invalid');
        } else {
            input.classList.add('invalid');
            input.classList.remove('valid');
        }
        
        // If the field is not required and empty, remove both classes
        if (!isRequired && value === '') {
            input.classList.remove('valid', 'invalid');
        }
    }

    // Add real-time validation to required input fields on input event
    requiredInputs.forEach(input => {
        input.addEventListener('input', () => {
            validateInput(input);
        });
        // Also validate on blur (when the user clicks out of the field)
         input.addEventListener('blur', () => {
            validateInput(input);
        });
    });

    // Add validation to optional chess rating input on input and blur
    const chessRatingInput = document.getElementById('chessRating');
    if (chessRatingInput) {
        chessRatingInput.addEventListener('input', () => {
            validateInput(chessRatingInput);
        });
        chessRatingInput.addEventListener('blur', () => {
            validateInput(chessRatingInput);
        });
    }

    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            // Perform validation for all required fields before submitting
            let formIsValid = true;
            requiredInputs.forEach(input => {
                validateInput(input);
                if (input.classList.contains('invalid')) {
                    formIsValid = false;
                }
            });

            // Validate the optional chess rating if something is entered
            if (chessRatingInput && chessRatingInput.value.trim() !== '') {
                 validateInput(chessRatingInput);
                 if (chessRatingInput.classList.contains('invalid')) {
                     formIsValid = false;
                 }
            }

            if (!formIsValid) {
                event.preventDefault(); // Prevent submission if form is invalid
                alert('Please fill out all required fields correctly.');
            } else {
                event.preventDefault(); // Prevent default form submission
                
                // Collect form data
                const formData = new FormData(registrationForm);
                const playerData = {};
                formData.forEach((value, key) => {
                    playerData[key] = value;
                });

                // Send registration to backend
                fetch(`${API_BASE}/players`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(playerData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Registration failed: ' + data.error);
                    } else {
                        alert('Registration successful!');
                        window.location.href = 'chess.html'; // or the correct page
                    }
                })
                .catch(error => {
                    console.error('Registration error:', error);
                    alert('Network error. Please try again.');
                });
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (registrationForm) {
                registrationForm.reset(); // Clear all form fields
                // Also remove validation styles
                registrationForm.querySelectorAll('input').forEach(input => {
                    input.classList.remove('valid', 'invalid');
                });
            }
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Redirect to home page (index.html) when Cancel is clicked
            window.location.href = 'index.html';
        });
    }
}); 
// The Web App URL you just generated
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyRblIjmCa606y6ByCWnrBkSwqx6s3bN4YYnMnmar5OpjrOv0r1s1ROvlunc324vUgI/exec";

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Set today's date automatically in the date picker
    const dateInput = document.getElementById("log-date");
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // 2. Grab the form and the submit button
    const form = document.getElementById("macro-form");
    const submitBtn = form.querySelector(".submit-btn");

    // 3. Listen for the form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Prevents the page from refreshing

        // Change button text to show loading state
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "Logging...";
        submitBtn.disabled = true;

        // Gather all the inputs from the form
        const formInputs = form.querySelectorAll("input");
        
        // Build the data package (the payload)
        const payload = {
            date: dateInput.value,
            foodName: formInputs[0].value,
            servings: formInputs[1].value,
            calories: formInputs[2].value || 0, // Defaults to 0 if she leaves it blank
            protein: formInputs[3].value || 0,
            carbs: formInputs[4].value || 0,
            fat: formInputs[5].value || 0,
            sugar: formInputs[6].value || 0
        };

        try {
            // Send the data to your Google Apps Script
            const response = await fetch(WEB_APP_URL, {
                method: "POST",
                // Using text/plain avoids the strict CORS preflight check while still passing JSON data
                headers: {
                    "Content-Type": "text/plain;charset=utf-8", 
                },
                body: JSON.stringify(payload),
                redirect: "follow" // Essential for Google's internal routing
            });

            // UI feedback: Success!
            form.reset(); // Clears the inputs for the next meal
            submitBtn.innerText = "Logged! ✅";
            submitBtn.style.backgroundColor = "#7FB77E"; // Temporarily turn green
            
            // Reset the button after 2 seconds
            setTimeout(() => {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = "var(--accent-peach)"; // Reset to peach
            }, 2000);

        } catch (error) {
            console.error("Error logging meal:", error);
            submitBtn.innerText = "Error. Try Again.";
            submitBtn.style.backgroundColor = "#ff6b6b"; // Turn red on error
            
            setTimeout(() => {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = "var(--accent-peach)";
            }, 3000);
        }
    });
});

// The Web App URL you just generated
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxufWB6MvSdHIK0KAA2T4MpJHfwmM1mIjIT5GYvzKs-6AOlETourG58eaLVDJ36EH3h/exec";

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
    // --- TOP 10 LOGIC ---
    
    const topTenList = document.querySelector(".top-ten-list");
    const inputs = form.querySelectorAll("input"); // Grab all inputs again

    // Function to fetch and display the top 10
    async function loadTop10() {
        topTenList.innerHTML = "<li><span style='color: #888;'>Loading favorites...</span></li>";
        
        try {
            // Fetch the data from your Apps Script doGet function
            const response = await fetch(WEB_APP_URL);
            const data = await response.json();
            
            topTenList.innerHTML = ""; // Clear the "Loading" text
            
            // If the sheet is empty
            if (data.length === 0) {
                topTenList.innerHTML = "<li><span style='color: #888;'>No foods logged yet!</span></li>";
                return;
            }
            
            // Build the list items
            data.forEach(food => {
                const li = document.createElement("li");
                
                const span = document.createElement("span");
                span.innerText = food.name;
                
                const btn = document.createElement("button");
                btn.className = "add-btn";
                btn.innerText = "+";
                
                // When the [+] button is clicked...
                btn.addEventListener("click", () => {
                    inputs[0].value = food.name;
                    inputs[1].value = food.servings;
                    inputs[2].value = food.calories;
                    inputs[3].value = food.protein;
                    inputs[4].value = food.carbs;
                    inputs[5].value = food.fat;
                    inputs[6].value = food.sugar;
                    
                    // Smooth scroll back to the top of the form (great for mobile)
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                
                li.appendChild(span);
                li.appendChild(btn);
                topTenList.appendChild(li);
            });
            
        } catch (error) {
            console.error("Error loading top 10:", error);
            topTenList.innerHTML = "<li><span style='color: #ff6b6b;'>Error loading list.</span></li>";
        }
    }

    // Run the function as soon as the page loads
    loadTop10();
    
    // Optional: Also run it after a new meal is logged so the list updates instantly
    form.addEventListener("submit", () => {
        setTimeout(loadTop10, 2500); // Wait a moment for the sheet to update before fetching
    });
});

// The Web App URL you just generated
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzny5dfMKrktqj_Mh3KYFkS3IXrf-0QBeR2kChuddbUKseCmQIu8OJCg87GwBdz1crH/exec";

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
   // --- MASTER DATA HANDLER ---
    
    let allLogs = []; // Stores the whole database locally for instant math
    
    // Placeholder goals until we build the Settings page
    const goals = { protein: 120, carbs: 150, fat: 50 }; 

    const topTenList = document.querySelector(".top-ten-list");
    const inputs = form.querySelectorAll("input");

    // Fetch everything from the sheet
    async function fetchAppData() {
        topTenList.innerHTML = "<li><span style='color: #888;'>Syncing data...</span></li>";
        
        try {
            const response = await fetch(WEB_APP_URL, { method: "GET", redirect: "follow" });
            allLogs = await response.json();
            
            updateDashboard(); // Run the math
            
        } catch (error) {
            console.error("Data sync error:", error);
            topTenList.innerHTML = "<li><span style='color: #ff6b6b;'>Sync failed.</span></li>";
        }
    }

    // Recalculate everything based on the selected date
    function updateDashboard() {
        renderTop10();
        renderProgress();
    }

    function renderProgress() {
        const selectedDate = document.getElementById("log-date").value;
        let totals = { protein: 0, carbs: 0, fat: 0 };
        
        // Add up macros for the selected date
        allLogs.forEach(log => {
            if (log.date === selectedDate) {
                totals.protein += Number(log.protein) || 0;
                totals.carbs += Number(log.carbs) || 0;
                totals.fat += Number(log.fat) || 0;
            }
        });

        // Update the text labels
        document.getElementById("protein-text").innerText = `${totals.protein} / ${goals.protein}g`;
        document.getElementById("carbs-text").innerText = `${totals.carbs} / ${goals.carbs}g`;
        document.getElementById("fat-text").innerText = `${totals.fat} / ${goals.fat}g`;

        // Animate the progress bars (caps at 100% so it doesn't break the UI if she goes over)
        document.getElementById("protein-bar").style.width = `${Math.min((totals.protein / goals.protein) * 100, 100)}%`;
        document.getElementById("carbs-bar").style.width = `${Math.min((totals.carbs / goals.carbs) * 100, 100)}%`;
        document.getElementById("fat-bar").style.width = `${Math.min((totals.fat / goals.fat) * 100, 100)}%`;
    }

    function renderTop10() {
        topTenList.innerHTML = "";
        if (allLogs.length === 0) return;

        const foodMap = {};
        
        // Count frequencies
        allLogs.forEach(log => {
            const cleanName = log.name.toString().trim();
            if (!cleanName) return;
            
            if (!foodMap[cleanName]) {
                foodMap[cleanName] = { ...log, count: 0 };
            }
            foodMap[cleanName].count += 1;
            
            // Always keep the most recent macro values
            foodMap[cleanName].servings = log.servings;
            foodMap[cleanName].calories = log.calories;
            foodMap[cleanName].protein = log.protein;
            foodMap[cleanName].carbs = log.carbs;
            foodMap[cleanName].fat = log.fat;
            foodMap[cleanName].sugar = log.sugar;
        });

        // Sort and slice top 10
        const top10 = Object.values(foodMap).sort((a, b) => b.count - a.count).slice(0, 10);
        
        top10.forEach(food => {
            const li = document.createElement("li");
            
            const span = document.createElement("span");
            span.innerText = food.name;
            
            const btn = document.createElement("button");
            btn.className = "add-btn";
            btn.innerText = "+";
            btn.addEventListener("click", () => {
                inputs[0].value = food.name;
                inputs[1].value = food.servings;
                inputs[2].value = food.calories;
                inputs[3].value = food.protein;
                inputs[4].value = food.carbs;
                inputs[5].value = food.fat;
                inputs[6].value = food.sugar;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            li.appendChild(span);
            li.appendChild(btn);
            topTenList.appendChild(li);
        });
    }

    // Listen for date changes so the graph updates instantly
    document.getElementById("log-date").addEventListener("change", updateDashboard);
    // --- DATE ARROW LOGIC ---
    const dateArrows = document.querySelectorAll(".date-arrow");
    const dateInput = document.getElementById("log-date");

    // Left Arrow (-1 Day)
    dateArrows[0].addEventListener("click", () => {
        let currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() - 1);
        dateInput.value = currentDate.toISOString().split('T')[0];
        updateDashboard(); // Recalculate graphs for the new date
    });

    // Right Arrow (+1 Day)
    dateArrows[1].addEventListener("click", () => {
        let currentDate = new Date(dateInput.value);
        
        // Prevent going into the future
        const today = new Date().toISOString().split('T')[0];
        if (dateInput.value >= today) return; 

        currentDate.setDate(currentDate.getDate() + 1);
        dateInput.value = currentDate.toISOString().split('T')[0];
        updateDashboard(); // Recalculate graphs for the new date
    });
    // Initial load
    fetchAppData();
    
    // Refresh data after a new meal is logged
    form.addEventListener("submit", () => {
        setTimeout(fetchAppData, 2000); 
    });
    
    // Run the function as soon as the page loads
    loadTop10();
    
    // Optional: Also run it after a new meal is logged so the list updates instantly
    form.addEventListener("submit", () => {
        setTimeout(loadTop10, 2500); // Wait a moment for the sheet to update before fetching
    });
});

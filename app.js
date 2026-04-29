const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzny5dfMKrktqj_Mh3KYFkS3IXrf-0QBeR2kChuddbUKseCmQIu8OJCg87GwBdz1crH/exec";

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Set today's date automatically (Locked to Local Time)
    const dateInput = document.getElementById("log-date");
    const now = new Date();
    // Build the YYYY-MM-DD string manually to avoid UTC shifts
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateInput.value = todayStr;

    // 2. Grab the form and the submit button
    const form = document.getElementById("macro-form");
    const submitBtn = form.querySelector(".submit-btn");

    // --- MASTER DATA HANDLER ---
    let allLogs = []; 
    const goals = { protein: 120, carbs: 150, fat: 50 }; // Placeholder goals
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
        const selectedDate = dateInput.value;
        let totals = { protein: 0, carbs: 0, fat: 0 };
        
        // Add up macros for the selected date
        allLogs.forEach(log => {
            // Force both dates into standard strings before comparing
            const cleanLogDate = String(log.date).split('T')[0]; 
            
            if (cleanLogDate === selectedDate) {
                totals.protein += Number(log.protein) || 0;
                totals.carbs += Number(log.carbs) || 0;
                totals.fat += Number(log.fat) || 0;
            }
        });

        // Update the text labels
        document.getElementById("protein-text").innerText = `${totals.protein} / ${goals.protein}g`;
        document.getElementById("carbs-text").innerText = `${totals.carbs} / ${goals.carbs}g`;
        document.getElementById("fat-text").innerText = `${totals.fat} / ${goals.fat}g`;

        // Animate the progress bars
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

    // --- FORM LOGGING LOGIC ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault(); 

        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "Logging...";
        submitBtn.disabled = true;

        const formInputs = form.querySelectorAll("input");
        
        const payload = {
            date: dateInput.value,
            foodName: formInputs[0].value,
            servings: formInputs[1].value,
            calories: formInputs[2].value || 0,
            protein: formInputs[3].value || 0,
            carbs: formInputs[4].value || 0,
            fat: formInputs[5].value || 0,
            sugar: formInputs[6].value || 0
        };

        try {
            await fetch(WEB_APP_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
                redirect: "follow" 
            });

            form.reset(); 
            submitBtn.innerText = "Logged! ✅";
            submitBtn.style.backgroundColor = "#7FB77E"; 
            
            setTimeout(() => {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = "var(--accent-peach)"; 
            }, 2000);

            // Resync data after logging
            setTimeout(fetchAppData, 1500);

        } catch (error) {
            console.error("Error logging meal:", error);
            submitBtn.innerText = "Error. Try Again.";
            submitBtn.style.backgroundColor = "#ff6b6b"; 
            
            setTimeout(() => {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = "var(--accent-peach)";
            }, 3000);
        }
    });

    // --- DATE ARROW LOGIC ---
    const dateArrows = document.querySelectorAll(".date-arrow");

    // Left Arrow (-1 Day)
    dateArrows[0].addEventListener("click", () => {
        // Add noon to the string so JavaScript doesn't shift the day backward based on timezone
        let currentDate = new Date(dateInput.value + "T12:00:00");
        currentDate.setDate(currentDate.getDate() - 1);
        
        dateInput.value = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        updateDashboard(); 
    });

    // Right Arrow (+1 Day)
    dateArrows[1].addEventListener("click", () => {
        let currentDate = new Date(dateInput.value + "T12:00:00");
        
        const nowLocal = new Date();
        const localToday = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
        
        if (dateInput.value >= localToday) return; // Prevent future dates

        currentDate.setDate(currentDate.getDate() + 1);
        dateInput.value = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        updateDashboard(); 
    });

    // Listen for manual date changes
    dateInput.addEventListener("change", updateDashboard);

    // Initial load
    fetchAppData();
});

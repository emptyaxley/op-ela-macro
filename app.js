const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzny5dfMKrktqj_Mh3KYFkS3IXrf-0QBeR2kChuddbUKseCmQIu8OJCg87GwBdz1crH/exec";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- SECURITY CHECK ---
    const REQUIRED_KEY = "LizMacrosByMatt2017";
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('key') !== REQUIRED_KEY) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px; color:#aaa; font-family:sans-serif;'>Unauthorized Access</h2>";
        return; 
    }

    // 1. Set today's date automatically (Locked to Local Time)
    const dateInput = document.getElementById("log-date");
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateInput.value = todayStr;

    // 2. DOM Elements
    const form = document.getElementById("macro-form");
    const submitBtn = form.querySelector(".submit-btn");
    const topTenList = document.querySelector(".top-ten-list");
    const inputs = form.querySelectorAll("input");
    const syncBanner = document.getElementById("sync-banner");

    // --- MASTER DATA HANDLER ---
    let allLogs = []; 
    let goals = JSON.parse(localStorage.getItem('lizMacroGoals')) || {
        calories: 2000, protein: 120, carbs: 150, fat: 50
    };

    // Fetch everything from the sheet
    async function fetchAppData() {
        if (syncBanner) syncBanner.classList.remove("hidden");
        if (topTenList) topTenList.innerHTML = "<li><span style='color: #888;'>Syncing data...</span></li>";
        
        try {
            const response = await fetch(WEB_APP_URL, { method: "GET", redirect: "follow" });
            allLogs = await response.json();
            updateDashboard(); 
            if (syncBanner) syncBanner.classList.add("hidden"); 
        } catch (error) {
            console.error("Data sync error:", error);
            if (topTenList) topTenList.innerHTML = "<li><span style='color: #ff6b6b;'>Sync failed.</span></li>";
            if (syncBanner) {
                syncBanner.innerText = "Sync Failed ❌";
                setTimeout(() => {
                    syncBanner.classList.add("hidden");
                    syncBanner.innerText = "Syncing... ⏳"; // reset text for next time
                }, 3000);
            }
        }
    }

    function updateDashboard() {
        renderTop10();
        renderProgress();
        renderHistory();
    }

    function renderProgress() {
        const selectedDate = dateInput.value;
        let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }; 
        
        allLogs.forEach(log => {
            const cleanLogDate = String(log.date).split('T')[0]; 
            if (cleanLogDate === selectedDate) {
                totals.calories += Number(log.calories) || 0; 
                totals.protein += Number(log.protein) || 0;
                totals.carbs += Number(log.carbs) || 0;
                totals.fat += Number(log.fat) || 0;
            }
        });

        function formatMacroText(current, goal, unit) {
            const roundedCurrent = Math.round(current * 10) / 10; 
            const isOver = roundedCurrent > goal;
            return `<span style="color: ${isOver ? '#ff6b6b' : 'inherit'}; font-weight: ${isOver ? 'bold' : 'normal'};">${roundedCurrent}</span> / ${goal}${unit}`;
        }

        document.getElementById("calories-text").innerHTML = formatMacroText(totals.calories, goals.calories, ""); 
        document.getElementById("protein-text").innerHTML = formatMacroText(totals.protein, goals.protein, "g");
        document.getElementById("carbs-text").innerHTML = formatMacroText(totals.carbs, goals.carbs, "g");
        document.getElementById("fat-text").innerHTML = formatMacroText(totals.fat, goals.fat, "g");

        document.getElementById("calories-bar").style.width = `${Math.min((totals.calories / goals.calories) * 100, 100)}%`; 
        document.getElementById("protein-bar").style.width = `${Math.min((totals.protein / goals.protein) * 100, 100)}%`;
        document.getElementById("carbs-bar").style.width = `${Math.min((totals.carbs / goals.carbs) * 100, 100)}%`;
        document.getElementById("fat-bar").style.width = `${Math.min((totals.fat / goals.fat) * 100, 100)}%`;
    }

    function renderTop10() {
        if (!topTenList) return;
        topTenList.innerHTML = "";
        if (allLogs.length === 0) return;

        const foodMap = {};
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

        const top10 = Object.values(foodMap).sort((a, b) => b.count - a.count).slice(0, 10);
        
        top10.forEach(food => {
            const li = document.createElement("li");
            const span = document.createElement("span");
            span.innerText = food.name;
            
            const btn = document.createElement("button");
            btn.className = "add-btn";
            btn.innerText = "+";
            btn.addEventListener("click", () => {
                inputs[0].value = food.name; inputs[1].value = food.servings;
                inputs[2].value = food.calories; inputs[3].value = food.protein;
                inputs[4].value = food.carbs; inputs[5].value = food.fat;
                inputs[6].value = food.sugar;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            li.appendChild(span);
            li.appendChild(btn);
            topTenList.appendChild(li);
        });
    }

    // --- HISTORY & DELETE LOGIC ---
    function renderHistory() {
        const container = document.getElementById("history-container");
        if (!container) return; 
        container.innerHTML = "";
        
        if (allLogs.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#888;'>No meals logged yet!</p>";
            return;
        }

        const groupedLogs = {};
        allLogs.forEach(log => {
            const cleanDate = String(log.date).split('T')[0];
            if (!groupedLogs[cleanDate]) groupedLogs[cleanDate] = [];
            groupedLogs[cleanDate].push(log);
        });

        const sortedDates = Object.keys(groupedLogs).sort().reverse().slice(0, 30);

        sortedDates.forEach(dateStr => {
            const dateObj = new Date(dateStr + "T12:00:00"); 
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = dateObj.toLocaleDateString('en-US', options);

            const groupDiv = document.createElement("div");
            groupDiv.className = "history-day-group";
            groupDiv.innerHTML = `<div class="history-day-header">${formattedDate}</div>`;

            const ul = document.createElement("ul");
            ul.className = "history-list";

            groupedLogs[dateStr].forEach(log => {
                const li = document.createElement("li");
                li.className = "history-item";

                const addBtn = document.createElement("button");
                addBtn.className = "add-btn";
                addBtn.innerText = "+";
                addBtn.addEventListener("click", () => {
                    inputs[0].value = log.name; inputs[1].value = log.servings;
                    inputs[2].value = log.calories; inputs[3].value = log.protein;
                    inputs[4].value = log.carbs; inputs[5].value = log.fat;
                    inputs[6].value = log.sugar;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });

                const infoDiv = document.createElement("div");
                infoDiv.className = "history-info";
                infoDiv.innerHTML = `<strong>${log.name}</strong><small>${log.servings} servings | ${log.calories} kcal</small>`;

                const delBtn = document.createElement("button");
                delBtn.className = "del-btn";
                delBtn.innerText = "−";
                delBtn.addEventListener("click", () => deleteLog(log.id, delBtn));

                li.appendChild(addBtn);
                li.appendChild(infoDiv);
                li.appendChild(delBtn);
                ul.appendChild(li);
            });

            groupDiv.appendChild(ul);
            container.appendChild(groupDiv);
        });
    }

    async function deleteLog(logId, btnElement) {
        btnElement.innerText = "⏳";
        btnElement.disabled = true;

        const payload = { action: "delete", id: logId };

        try {
            await fetch(WEB_APP_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
                redirect: "follow"
            });
            
            allLogs = allLogs.filter(log => log.id !== logId);
            updateDashboard(); 
            fetchAppData(); 
            
        } catch (error) {
            console.error("Failed to delete:", error);
            btnElement.innerText = "−";
            btnElement.disabled = false;
            alert("Error deleting item. Please try again.");
        }
    }

    // --- FORM LOGGING LOGIC ---
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault(); 

            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Logging...";
            submitBtn.disabled = true;
            
            const payload = {
                date: dateInput.value,
                foodName: inputs[0].value,
                servings: inputs[1].value,
                calories: inputs[2].value || 0,
                protein: inputs[3].value || 0,
                carbs: inputs[4].value || 0,
                fat: inputs[5].value || 0,
                sugar: inputs[6].value || 0
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
    }

    // --- DATE ARROW LOGIC ---
    const dateArrows = document.querySelectorAll(".date-arrow");
    if (dateArrows.length >= 2) {
        dateArrows[0].addEventListener("click", () => {
            let currentDate = new Date(dateInput.value + "T12:00:00");
            currentDate.setDate(currentDate.getDate() - 1);
            dateInput.value = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            updateDashboard(); 
        });

        dateArrows[1].addEventListener("click", () => {
            let currentDate = new Date(dateInput.value + "T12:00:00");
            const nowLocal = new Date();
            const localToday = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
            
            if (dateInput.value >= localToday) return; 

            currentDate.setDate(currentDate.getDate() + 1);
            dateInput.value = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            updateDashboard(); 
        });
    }

    if (dateInput) dateInput.addEventListener("change", updateDashboard);

    // --- SETTINGS LOGIC ---
    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) {
        document.getElementById("goal-calories").value = goals.calories;
        document.getElementById("goal-protein").value = goals.protein;
        document.getElementById("goal-carbs").value = goals.carbs;
        document.getElementById("goal-fat").value = goals.fat;

        settingsForm.addEventListener("submit", (e) => {
            e.preventDefault();
            goals = {
                calories: Number(document.getElementById("goal-calories").value) || 0,
                protein: Number(document.getElementById("goal-protein").value) || 0,
                carbs: Number(document.getElementById("goal-carbs").value) || 0,
                fat: Number(document.getElementById("goal-fat").value) || 0
            };
            localStorage.setItem('lizMacroGoals', JSON.stringify(goals));
            
            const saveBtn = settingsForm.querySelector("button");
            saveBtn.innerText = "Saved! ✅";
            saveBtn.style.backgroundColor = "#7FB77E";
            updateDashboard(); 
            setTimeout(() => {
                saveBtn.innerText = "Save Goals";
                saveBtn.style.backgroundColor = "var(--accent-peach)";
            }, 2000);
        });
    }

    // --- MENU NAVIGATION LOGIC ---
    const hamburgerBtn = document.querySelector(".hamburger-menu");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("menu-overlay");
    const closeBtn = document.getElementById("close-menu");
    const menuLinks = document.querySelectorAll(".menu-links a");
    const pages = document.querySelectorAll(".page");

    function closeMenu() {
        if (sidebar) sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("active");
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener("click", () => {
        sidebar.classList.add("open");
        overlay.classList.add("active");
    });

    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    if (overlay) overlay.addEventListener("click", closeMenu);

    menuLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute("data-target");
            if(!targetId) return; 
            
            // Hide all pages, show the selected one
            pages.forEach(p => p.classList.remove("active"));
            document.getElementById(targetId).classList.add("active");
            
            // Run the math if they open the Streaks page
            if(targetId === "streaks-page") {
                calculateStreak();
                calculateGoalDays(); 
            }
            
            closeMenu(); // This guarantees the menu slides away!
        });
    });

    // --- STREAK CALCULATOR ---
    const milestones = [1, 7, 30, 60, 90, 180, 365];

    function calculateStreak() {
        if (allLogs.length === 0) return;

        const uniqueDates = [...new Set(allLogs.map(log => String(log.date).split('T')[0]))].sort().reverse();
        
        let currentStreak = 0;
        const nowLocal = new Date();
        const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
        
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        let currentDateCheck = new Date(todayStr + "T12:00:00");
        
        if (uniqueDates[0] === todayStr) {
            // Includes today
        } else if (uniqueDates[0] === yesterdayStr) {
            currentDateCheck = new Date(yesterdayStr + "T12:00:00");
        } else {
            renderStreak(0);
            return;
        }

        for (let i = 0; i < uniqueDates.length; i++) {
            let logDate = new Date(uniqueDates[i] + "T12:00:00");
            if (logDate.getTime() === currentDateCheck.getTime()) {
                currentStreak++;
                currentDateCheck.setDate(currentDateCheck.getDate() - 1); 
            } else {
                break; 
            }
        }
        renderStreak(currentStreak);
    }

    function renderStreak(streak) {
        const countSpan = document.getElementById("current-streak-count");
        if (countSpan) countSpan.innerText = streak;
        
        const timeline = document.getElementById("rewards-timeline");
        if (!timeline) return;
        timeline.innerHTML = ""; 

        milestones.forEach(day => {
            const isUnlocked = streak >= day;
            const milestoneDiv = document.createElement("div");
            milestoneDiv.className = `milestone ${isUnlocked ? 'unlocked' : ''}`;
            
            let emoji = "🔒";
            let text = "Keep going!";
            if (isUnlocked) {
                if(day === 1) { emoji = "🎉"; text = "First step!"; }
                if(day === 7) { emoji = "🥉"; text = "One week down!"; }
                if(day === 30) { emoji = "🥈"; text = "One month strong!"; }
                if(day === 60) { emoji = "🌟"; text = "Two months! Amazing!"; }
                if(day === 90) { emoji = "🥇"; text = "Quarter year of health!"; }
                if(day === 180) { emoji = "👑"; text = "Half a year! Unstoppable!"; }
                if(day === 365) { emoji = "💎"; text = "ONE FULL YEAR!"; }
            }
    // --- PERFECT DAY CALCULATOR ---
    function calculateGoalDays() {
        if (allLogs.length === 0) return;

        // 1. Group all logs by date and sum their macros
        const groupedLogs = {};
        allLogs.forEach(log => {
            const cleanDate = String(log.date).split('T')[0];
            if (!groupedLogs[cleanDate]) {
                groupedLogs[cleanDate] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
            }
            groupedLogs[cleanDate].calories += Number(log.calories) || 0;
            groupedLogs[cleanDate].protein += Number(log.protein) || 0;
            groupedLogs[cleanDate].carbs += Number(log.carbs) || 0;
            groupedLogs[cleanDate].fat += Number(log.fat) || 0;
        });

        let perfectDays = 0;

        // 2. Check each day's totals against the current goals
        for (const date in groupedLogs) {
            const day = groupedLogs[date];
            
            // Round them exactly like the dashboard does so 55.1 fails but 55.0 passes
            const cal = Math.round(day.calories * 10) / 10;
            const pro = Math.round(day.protein * 10) / 10;
            const crb = Math.round(day.carbs * 10) / 10;
            const fat = Math.round(day.fat * 10) / 10;

            if (cal <= goals.calories && pro <= goals.protein && crb <= goals.carbs && fat <= goals.fat) {
                perfectDays++;
            }
        }

        // 3. Update the UI
        const countSpan = document.getElementById("goal-met-count");
        if (countSpan) countSpan.innerText = perfectDays;
    }
            milestoneDiv.innerHTML = `
                <div class="milestone-day">${day}d</div>
                <div class="milestone-text">${text}</div>
                <div class="milestone-icon">${emoji}</div>
            `;
            timeline.appendChild(milestoneDiv);
        });
    }

    // Initial load
    fetchAppData();
});

// Elements
const startBtn = document.getElementById("startRace");
const resetBtn = document.getElementById("resetBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const resultsOverlay = document.getElementById("resultsOverlay");
const closeResultsBtn = document.getElementById("closeResults");

// State
let raceInterval, timerInterval, timeRemaining;
let raceFinished = false;
let finishTimes = [];
let allticsFinished = false;

// Event Listeners
startBtn.addEventListener("click", startRace);
resetBtn.addEventListener("click", resetRace);
fullscreenBtn.addEventListener("click", toggleFullscreen);
closeResultsBtn.addEventListener("click", () => resultsOverlay.style.display = "none");

document.querySelectorAll(".keypad-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById("raceDuration");
    if (btn.id === "clearBtn") {
      input.value = "";
    } else {
      const numbers = input.value.replace(/:/g, '');
      if (numbers.length >= 4) return;
      const newValue = numbers + btn.dataset.value;
      input.value = formatDurationInput(newValue);
    }
  });
});

document.getElementById("raceDuration").addEventListener("input", (e) => {
  const numbers = e.target.value.replace(/[^\d]/g, '');
  e.target.value = formatDurationInput(numbers);
});

// Core Functions
function startRace() {
  const numTic = parseInt(document.getElementById("numTic").value);
  const durationInput = document.getElementById("raceDuration").value;
  
  // Parse duration
  let minutes = 0, seconds = 0;
  const parts = durationInput.split(':');
  if (parts.length === 2) {
    minutes = parseInt(parts[0]) || 0;
    seconds = parseInt(parts[1]) || 0;
  } else {
    const totalSeconds = parseInt(durationInput) || 0;
    minutes = Math.floor(totalSeconds / 60);
    seconds = totalSeconds % 60;
  }

  if (minutes < 0 || minutes > 99 || seconds < 0 || seconds > 59) {
    alert("Please enter valid minutes (0-99) and seconds (0-59)!");
    return;
  }

  const duration = minutes * 60 + seconds;
  
  if (!validateInputs(numTic, duration)) return;

  document.getElementById("overlay").style.display = "none";
  document.querySelector(".race-container").style.display = "block";

  generateTic(numTic);
  startRaceLogic(duration);
}

function generateTic(num) {
  const track = document.getElementById("raceTrack");
  track.innerHTML = "";
  
  const ticImages = Array.from({length: 50}, (_, i) => `tic${i+1}.png`);
  shuffleArray(ticImages);

  // Get dimensions
  const header = document.querySelector('.race-header');
  const headerHeight = header.offsetHeight;
  const startY = headerHeight + 50; // 50px buffer below header
  const availableHeight = track.clientHeight - startY;
  const ticHeight = 180;

  // Calculate dynamic spacing
  let spacing;
  if (num === 1) {
    spacing = 0; // Center single tic vertically
    const tic = createTicElement(1, ticImages[0]);
    tic.style.top = `${startY + (availableHeight - ticHeight)/2}px`;
    track.appendChild(tic);
    return;
  } else {
    spacing = (availableHeight - ticHeight) / (num - 1);
    spacing = Math.max(50, spacing); // Minimum 50px spacing
  }

  // Create tics with top positioning
  for (let i = 0; i < num; i++) {
    const tic = document.createElement("div");
    tic.className = "tic";
    tic.id = `tic${i+1}`;
    tic.innerHTML = `<img src="images/${ticImages[i % 50]}" alt="Tic ${i+1}">`;
    
    // Position from top with buffer
    tic.style.top = `${startY + (spacing * i)}px`;
    tic.style.left = "0";
    
    track.appendChild(tic);
  }
}

function startRaceLogic(duration) {
  const tics = document.querySelectorAll(".tic");
  const timerDisplay = document.getElementById("timerDisplay");
  
  // Reset state
  timeRemaining = duration;
  finishTimes = [];
  allTicssFinished = false;
  raceFinished = false;
  timerDisplay.textContent = formatTime(timeRemaining);
  
  // Store tic movement states
  const ticStates = Array.from(tics).map(() => ({
    currentPosition: 0,
    currentSpeed: 0.5 + Math.random() * 1.5, // More randomization
    lastUpdateTime: Date.now(),
    finished: false
  }));

  // Race calculations
  const trackWidth = document.querySelector(".race-track").clientWidth;
  const baseSpeedPerMs = (trackWidth - 180) / (duration * 1000);

  // Timer
  const startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    timeRemaining = duration - Math.floor(elapsed / 1000);
    timerDisplay.textContent = formatTime(timeRemaining);
    
    if (timeRemaining <= 0 && !allTicssFinished) {
      clearInterval(timerInterval);
      checkAllFinished(tics, ticStates);
    }
  }, 100);

  // Tics movement
  raceInterval = setInterval(() => {
    const now = Date.now();
    
    tics.forEach((tic, i) => {
      if (ticStates[i].finished) return;
      
      const state = ticStates[i];
      const deltaTime = now - state.lastUpdateTime;
      
      // More dynamic speed changes
      if (Math.random() < 0.2) { // More frequent speed changes
        state.currentSpeed = 0.3 + Math.random() * 2.0; // Wider speed range
      }
      
      const distanceMoved = baseSpeedPerMs * state.currentSpeed * deltaTime;
      state.currentPosition += distanceMoved;
      
      if (state.currentPosition >= trackWidth - 180) {
        state.currentPosition = trackWidth - 180;
        state.finished = true;
        finishTimes.push({
          id: tic.id,
          time: (Date.now() - startTime) / 1000,
          element: tic
        });
        
        if (!raceFinished) {
          raceFinished = true;
          timerDisplay.textContent = "00:00";
        }
      }

      tic.style.left = `${state.currentPosition}px`;
      state.lastUpdateTime = now;
    });

    // Check if all tics finished
    if (finishTimes.length === tics.length) {
      allTicssFinished = true;
      endRace();
    }
  }, 16);
}

function endRace() {
  clearInterval(raceInterval);
  clearInterval(timerInterval);
  
  // Sort results
  finishTimes.sort((a, b) => a.time - b.time);
  
  // Show results overlay
  showResults(finishTimes);
}

function showResults(results) {
  const podiumImages = document.querySelectorAll('.podium-img');
  const leaderboardBody = document.querySelector('#leaderboardTable tbody');
  
  // Clear previous results
  leaderboardBody.innerHTML = '';
  
  // Set podium images
  podiumImages[0].src = results[0].element.querySelector('img').src;
  podiumImages[1].src = results[1].element.querySelector('img').src;
  podiumImages[2].src = results[2].element.querySelector('img').src;
  
  // Populate leaderboard with all results
  results.forEach((result, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${result.id.replace('tic', 'Tic ')}</td>
      <td>${result.time.toFixed(2)}s</td>
    `;
    leaderboardBody.appendChild(row);
  });

  // Show results overlay
  resultsOverlay.style.display = 'flex';
}

// Helper Functions
function validateInputs(tics, duration) {
  if (isNaN(tics) || tics < 1 || tics > 100) {
    alert("Please enter between 1-100 tics!");
    return false;
  }
  if (duration < 1) {
    alert("Duration must be at least 1 second!");
    return false;
  }
  return true;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function resetRace() {
  clearInterval(raceInterval);
  clearInterval(timerInterval);
  document.getElementById("overlay").style.display = "flex";
  document.querySelector(".race-container").style.display = "none";
  resultsOverlay.style.display = "none";
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function formatDurationInput(numbers) {
  if (numbers.length <= 2) return numbers;
  return numbers.substring(0, 2) + ':' + numbers.substring(2, 4);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function checkAllFinished(tics, ticStates) {
  allticsFinished = ticStates.every(state => state.finished);
  if (!allticsFinished) {
    // Continue updating positions until all tics finish
    requestAnimationFrame(() => checkAllFinished(tics, ticStates));
  }
}
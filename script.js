let currentSong = new Audio();
let songs = [];
let currentIndex = 0;
let currentAlbum = '';

// Convert seconds to minutes:seconds
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// Load songs for an album and auto-play first song
async function loadSongs(albumName) {
    
    try {
        // Reset current song
        currentSong.pause();
        currentSong.currentTime = 0;
        currentIndex = 0;
        currentAlbum = albumName;
        
        // Load songs from songs.json
        const response = await fetch('songs.json');
        const songsData = await response.json();
        
        songs = songsData[albumName] || [];
        
        // Update song list UI
        const songList = document.querySelector(".songlist ul");
        songList.innerHTML = songs.map((song, index) => `
            <li onclick="playSong(${index})">
                <img class="invert" width="34" src="img/music.svg" alt="">
                <div class="info">
                    <div>${song.name}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>
        `).join("");

        // Update song info
        document.querySelector(".songinfo").innerHTML = "Select a song";
        document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
        document.querySelector(".circle").style.left = "0%";

        // AUTO-PLAY FIRST SONG
        if (songs.length > 0) {
            // Small delay to ensure UI is updated
            setTimeout(() => {
                playSong(0);
            }, 100);
        }

        // Open hamburger menu on mobile after album selection
        if (window.innerWidth <= 768) {
            document.querySelector(".left").style.left = "0";
        }

    } catch (error) {
    }
}

// Play a specific song
function playSong(index) {
    if (songs.length === 0) return;
    
    currentIndex = index;
    const song = songs[currentIndex];
    
    
    // Stop current song
    currentSong.pause();
    currentSong.currentTime = 0;
    
    // Load new song
    currentSong.src = song.url;
    
    // Update UI - Show actual song name
    document.querySelector(".songinfo").innerHTML = song.name;
    document.getElementById("play").src = "img/pause.svg";
    
    // Setup time update for seekbar
    currentSong.ontimeupdate = () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songtime").innerHTML = 
                `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            
            // Update seekbar position
            const progressPercent = (currentSong.currentTime / currentSong.duration) * 100;
            document.querySelector(".circle").style.left = progressPercent + "%";
        }
    };
    
    // Setup metadata loaded event
    currentSong.onloadedmetadata = () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songtime").innerHTML = 
                `00:00 / ${secondsToMinutesSeconds(currentSong.duration)}`;
        }
    };
    
    // Song ended - play next
    currentSong.onended = () => {
        playNext();
    };
    
    // Play the song with better error handling
    const playPromise = currentSong.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            document.getElementById("play").src = "img/pause.svg";
        }).catch(error => {
            document.querySelector(".songinfo").innerHTML = `Error: ${song.name}`;
            document.getElementById("play").src = "img/play.svg";
        });
    }
}

// Play/Pause toggle - FIXED VERSION
function togglePlayPause() {
    
    // If no song is loaded, try to play the first song of current album
    if (!currentSong.src && songs.length > 0) {
        playSong(0);
        return;
    }
    
    // If song is loaded but no source, return
    if (!currentSong.src) {
        return;
    }
    
    if (currentSong.paused) {
        currentSong.play().then(() => {
            document.getElementById("play").src = "img/pause.svg";
        }).catch(error => {
            document.getElementById("play").src = "img/play.svg";
        });
    } else {
        currentSong.pause();
        document.getElementById("play").src = "img/play.svg";
    }
}

// Play next song
function playNext() {
    if (songs.length === 0) return;
    
    currentIndex = (currentIndex + 1) % songs.length;
    playSong(currentIndex);
}

// Play previous song
function playPrevious() {
    if (songs.length === 0) return;
    
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(currentIndex);
}

// Seekbar functionality
function setupSeekbar() {
    const seekbar = document.querySelector(".seekbar");
    const circle = document.querySelector(".circle");
    let isDragging = false;

    // Click on seekbar to seek
    seekbar.addEventListener("click", (e) => {
        if (!currentSong.src || isNaN(currentSong.duration)) return;
        
        const rect = seekbar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const seekTime = percent * currentSong.duration;
        
        currentSong.currentTime = seekTime;
    });

    // Drag circle for seeking
    circle.addEventListener("mousedown", (e) => {
        isDragging = true;
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging || !currentSong.src || isNaN(currentSong.duration)) return;
        
        const rect = seekbar.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent)); // Clamp between 0-1
        
        const seekTime = percent * currentSong.duration;
        currentSong.currentTime = seekTime;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
}

// Load albums from external albums.json
async function createAlbumCards() {
    try {
        const response = await fetch('albums.json');
        const albumsData = await response.json();
        const albums = albumsData.albums;

        const cardContainer = document.querySelector(".cardContainer");
        
        cardContainer.innerHTML = albums.map(album => `
            <div class="card" onclick="loadSongs('${album.folder}')">
                <div class="play">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18">
                        <path fill="black" d="M15.544 9.59a1 1 0 0 1-.053 1.728L6.476 16.2A1 1 0 0 1 5 15.321V4.804a1 1 0 0 1 1.53-.848l9.014 5.634Z"/>
                    </svg>
                </div>
                <img src="${album.cover}" alt="${album.title}" onerror="this.style.display='none'">
                <h2>${album.title}</h2>
                <p>${album.description}</p>
            </div>
        `).join("");

    } catch (error) {
        // Fallback to hardcoded albums if JSON fails
        createFallbackAlbums();
    }
}

// Fallback albums if albums.json fails
function createFallbackAlbums() {
    const cardContainer = document.querySelector(".cardContainer");
    
    cardContainer.innerHTML = albums.map(album => `
        <div class="card" onclick="loadSongs('${album.folder}')">
            <div class="play">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18">
                    <path fill="black" d="M15.544 9.59a1 1 0 0 1-.053 1.728L6.476 16.2A1 1 0 0 1 5 15.321V4.804a1 1 0 0 1 1.53-.848l9.014 5.634Z"/>
                </svg>
            </div>
            <img src="${album.cover}" alt="${album.title}" onerror="this.style.display='none'">
            <h2>${album.title}</h2>
            <p>${album.description}</p>
        </div>
    `).join("");
}

// Setup event listeners
function setupEventListeners() {
    // Play/Pause button - FIXED
    const playButton = document.getElementById("play");
    playButton.addEventListener("click", togglePlayPause);
    
    // Next button
    document.getElementById("next").addEventListener("click", playNext);
    
    // Previous button
    document.getElementById("previous").addEventListener("click", playPrevious);
    
    // Hamburger menu
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    
    // Close menu
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });
    
    // Setup seekbar
    setupSeekbar();
    
}

// Initialize the app
async function initializeApp() {
    
    await createAlbumCards();
    setupEventListeners();
    
}

// Start the app when page loads
window.addEventListener('load', initializeApp);

// Make functions global for HTML onclick
window.loadSongs = loadSongs;
window.playSong = playSong;
window.togglePlayPause = togglePlayPause;

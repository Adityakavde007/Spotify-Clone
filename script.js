console.log("let write java script");

// Constants and State
const APP_STATE = {
    currentSong: null,
    songs: [],
    currFolder: '',
    currentIndex: 0,
    isDragging: false
};

// DOM Elements Cache
const DOM = {};

// Initialize DOM Elements
function initializeDOMElements() {
    const elements = {
        play: 'play',
        previous: 'previous', 
        next: 'next',
        songUL: '.songlist ul',
        songInfo: '.songinfo',
        songTime: '.songtime',
        seekbar: '.seekbar',
        circle: '.circle',
        hamburger: '.hamburger',
        close: '.close',
        leftPanel: '.left',
        cardContainer: '.cardContainer'
    };
    
    Object.keys(elements).forEach(key => {
        const selector = elements[key];
        DOM[key] = selector.startsWith('.') 
            ? document.querySelector(selector)
            : document.getElementById(selector);
        
        console.log(`${key}:`, DOM[key]);
    });
}

// Utility Functions
const utils = {
    secondsToMinutesSeconds(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    },

    sanitizeName(name) {
        return name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    },

    resetEventListeners() {
        ['play', 'previous', 'next'].forEach(btn => {
            if (DOM[btn]) {
                DOM[btn].replaceWith(DOM[btn].cloneNode(true));
                DOM[btn] = document.getElementById(btn);
            }
        });
    }
};

// Audio Controls
const audioControls = {
    resetSeekbar() {
        if (DOM.circle) DOM.circle.style.left = "0%";
        if (DOM.songTime) DOM.songTime.innerHTML = "00:00 / 00:00";
        if (APP_STATE.currentSong) {
            APP_STATE.currentSong.currentTime = 0;
        }
    },

    updateSeekbar(e) {
        if (!DOM.seekbar || !DOM.circle || !APP_STATE.currentSong) return;
        
        const rect = DOM.seekbar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100;
        DOM.circle.style.left = percent + "%";
        
        if (!isNaN(APP_STATE.currentSong.duration)) {
            APP_STATE.currentSong.currentTime = (APP_STATE.currentSong.duration * percent) / 100;
        }
    },

    setupSeekbar() {
        if (!DOM.seekbar || !DOM.circle) return;
        
        const seekHandler = (e) => this.updateSeekbar(e);
        
        DOM.seekbar.addEventListener("click", seekHandler);
        DOM.circle.addEventListener("mousedown", () => APP_STATE.isDragging = true);
        
        document.addEventListener("mousemove", (e) => {
            if (APP_STATE.isDragging) seekHandler(e);
        });
        
        document.addEventListener("mouseup", () => APP_STATE.isDragging = false);

        if (APP_STATE.currentSong) {
            APP_STATE.currentSong.addEventListener("timeupdate", () => {
                if (!APP_STATE.isDragging && !isNaN(APP_STATE.currentSong.duration) && DOM.circle && DOM.songTime) {
                    DOM.circle.style.left = (APP_STATE.currentSong.currentTime / APP_STATE.currentSong.duration) * 100 + "%";
                    DOM.songTime.innerHTML = `${utils.secondsToMinutesSeconds(APP_STATE.currentSong.currentTime)} / ${utils.secondsToMinutesSeconds(APP_STATE.currentSong.duration)}`;
                }
            });

            APP_STATE.currentSong.addEventListener("loadedmetadata", () => {
                if (!isNaN(APP_STATE.currentSong.duration) && DOM.songTime) {
                    DOM.songTime.innerHTML = `00:00 / ${utils.secondsToMinutesSeconds(APP_STATE.currentSong.duration)}`;
                }
            });
        }
    },

    playMusic(url, pause = false) {
        console.log("Playing:", url);
        
        if (!APP_STATE.currentSong) {
            APP_STATE.currentSong = new Audio();
        }
        
        APP_STATE.currentSong.pause();
        APP_STATE.currentSong.currentTime = 0;
        
        APP_STATE.currentSong.src = url;
        this.resetSeekbar();
        
        const songList = Array.from(DOM.songUL.querySelectorAll("li"));
        const index = songList.findIndex(li => li.getAttribute("data-url") === url);
        
        if (index !== -1) {
            APP_STATE.currentIndex = index;
        }
        
        if (DOM.songInfo) {
            DOM.songInfo.innerHTML = utils.sanitizeName(url.split(/[/\\]/).pop());
        }
        
        if (!pause) {
            APP_STATE.currentSong.play();
            if (DOM.play) DOM.play.src = "img/pause.svg";
        } else {
            if (DOM.play) DOM.play.src = "img/play.svg";
        }
    },

    setupPlayPause() {
        if (!DOM.play) return;
        
        DOM.play.onclick = () => {
            if (!APP_STATE.currentSong) return;
            
            if (APP_STATE.currentSong.paused) {
                APP_STATE.currentSong.play();
                DOM.play.src = "img/pause.svg";
            } else {
                APP_STATE.currentSong.pause();
                DOM.play.src = "img/play.svg";
            }
        };
    },

    setupNavigation() {
        if (DOM.previous) {
            DOM.previous.onclick = () => {
                const songList = Array.from(DOM.songUL.querySelectorAll("li"));
                if (APP_STATE.currentIndex > 0) {
                    APP_STATE.currentIndex--;
                    this.playMusic(songList[APP_STATE.currentIndex].getAttribute("data-url"));
                }
            };
        }

        if (DOM.next) {
            DOM.next.onclick = () => {
                const songList = Array.from(DOM.songUL.querySelectorAll("li"));
                if (APP_STATE.currentIndex < songList.length - 1) {
                    APP_STATE.currentIndex++;
                    this.playMusic(songList[APP_STATE.currentIndex].getAttribute("data-url"));
                }
            };
        }
    },

    setupSongEndedHandler() {
        if (!APP_STATE.currentSong) return;
        
        APP_STATE.currentSong.onended = null;
        
        APP_STATE.currentSong.onended = () => {
            const songList = Array.from(DOM.songUL.querySelectorAll("li"));
            
            if (songList.length === 0) return;
            
            let nextIndex = APP_STATE.currentIndex + 1;
            
            if (nextIndex >= songList.length) {
                nextIndex = 0;
            }
            
            APP_STATE.currentIndex = nextIndex;
            const nextSongUrl = songList[nextIndex].getAttribute("data-url");
            
            this.playMusic(nextSongUrl);
        };
    }
};

// UI Controls
const uiControls = {
    setupHamburgerMenu() {
        if (DOM.hamburger && DOM.leftPanel) {
            DOM.hamburger.addEventListener("click", () => {
                DOM.leftPanel.style.left = "0";
            });
        }
        if (DOM.close && DOM.leftPanel) {
            DOM.close.addEventListener("click", () => {
                DOM.leftPanel.style.left = "-120%";
            });
        }
    },

    createSongListItem(song) {
        const cleanName = utils.sanitizeName(song.name);
        return `
            <li data-url="${song.url}" data-name="${cleanName}">
                <img class="invert" width="34" src="img/music.svg" alt="">
                <div class="info">
                    <div>${cleanName}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>
        `;
    },

    createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-folder', album.folder);
        card.innerHTML = `
            <div class="play">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18">
                    <path fill="black" d="M15.544 9.59a1 1 0 0 1-.053 1.728L6.476 16.2A1 1 0 0 1 5 15.321V4.804a1 1 0 0 1 1.53-.848l9.014 5.634Z"/>
                </svg>
            </div>
            <img src="${album.cover}" alt="${album.title}" onerror="this.style.display='none'">
            <h2>${album.title}</h2>
            <p>${album.description}</p>
        `;
        
        card.addEventListener('click', async () => {
            console.log("Album clicked:", album.folder);
            APP_STATE.songs = await getSongs(album.folder);
        });
        
        return card;
    }
};

// Main Functions
async function getSongs(folder) {
    try {
        console.log("Loading songs for:", folder);
        
        APP_STATE.currentIndex = 0;
        APP_STATE.isDragging = false;
        APP_STATE.currFolder = folder;
        
        if (APP_STATE.currentSong) {
            APP_STATE.currentSong.pause();
            APP_STATE.currentSong.currentTime = 0;
        }
        
        APP_STATE.currentSong = new Audio();
        
        utils.resetEventListeners();
        audioControls.resetSeekbar();

        // Load from static songs.json
        const response = await fetch('./songs.json');
        
        if (!response.ok) {
            console.error("Failed to load songs.json");
            return [];
        }
        
        const data = await response.json();
        const songs = data[folder] || [];
        
        console.log("Found songs:", songs);

        if (DOM.songUL) {
            DOM.songUL.innerHTML = songs.map(song => uiControls.createSongListItem(song)).join("");
        }

        if (DOM.songUL) {
            DOM.songUL.querySelectorAll("li").forEach(li => {
                li.addEventListener("click", () => {
                    const songUrl = li.getAttribute("data-url");
                    audioControls.playMusic(songUrl);
                });
            });
        }

        audioControls.setupSeekbar();
        audioControls.setupPlayPause();
        audioControls.setupNavigation();
        audioControls.setupSongEndedHandler();

        if (songs.length > 0 && DOM.songInfo && DOM.songTime) {
            const firstSong = songs[0];
            DOM.songInfo.innerHTML = utils.sanitizeName(firstSong.name);
            DOM.songTime.innerHTML = "00:00 / 00:00";
            APP_STATE.currentSong.src = firstSong.url;
            if (DOM.play) DOM.play.src = "img/play.svg";
        }

        return songs;

    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

async function displayAlbums() {
    try {
        console.log("Loading albums...");
        
        // Load from static albums.json
        const response = await fetch('./albums.json');
        
        if (!response.ok) {
            console.error("Failed to load albums.json - Status:", response.status);
            
            // Create fallback albums if JSON fails
            createFallbackAlbums();
            return;
        }
        
        const data = await response.json();
        console.log("Loaded albums:", data.albums);
        
        if (DOM.cardContainer) {
            DOM.cardContainer.innerHTML = '';
        }
        
        data.albums.forEach(album => {
            if (DOM.cardContainer) {
                DOM.cardContainer.appendChild(uiControls.createAlbumCard(album));
            }
        });
        
    } catch (error) {
        console.error("Error displaying albums:", error);
        createFallbackAlbums();
    }
}

// Fallback if albums.json doesn't load
function createFallbackAlbums() {
    console.log("Creating fallback albums");
    
    if (!DOM.cardContainer) return;
    
    const fallbackAlbums = [
        {
            folder: "arjit_singh",
            title: "Arijit Singh",
            description: "Soulful romantic hits",
            cover: "img/default-cover.jpg"
        },
        {
            folder: "english",
            title: "English Songs",
            description: "International pop hits", 
            cover: "img/default-cover.jpg"
        }
    ];
    
    DOM.cardContainer.innerHTML = '';
    
    fallbackAlbums.forEach(album => {
        DOM.cardContainer.appendChild(uiControls.createAlbumCard(album));
    });
}

async function main() {
    console.log("Initializing app...");
    initializeDOMElements();
    
    // Load albums
    await displayAlbums();
    
    // Setup UI controls
    uiControls.setupHamburgerMenu();
    
    console.log("App initialized");
}

// Initialize app
main();

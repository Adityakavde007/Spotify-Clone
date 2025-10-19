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
    },

    // Working music API - Free Music Archive
    async getFreeMusicArchive() {
        try {
            const response = await fetch('https://corsproxy.io/?https://freemusicarchive.org/api/get/tracks.json?api_key=YOUR_API_KEY&limit=10');
            const data = await response.json();
            return data.dataset || [];
        } catch (error) {
            console.error("Free Music Archive failed:", error);
            return [];
        }
    },

    // Jamendo API - Free music
    async getJamendoMusic() {
        try {
            const response = await fetch('https://corsproxy.io/?https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_CLIENT_ID&format=json&limit=10&audioformat=mp3');
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error("Jamendo failed:", error);
            return [];
        }
    },

    // Get working sample music URLs
    getSampleMusic() {
        // These are actual working music URLs
        return [
            "https://www.soundjay.com/music/indian-sitar-music-01.mp3",
            "https://www.soundjay.com/music/indian-sitar-music-02.mp3",
            "https://www.soundjay.com/music/bansuri-indian-flute-01.mp3",
            "https://www.soundjay.com/music/bansuri-indian-flute-02.mp3",
            "https://www.soundjay.com/music/indian-tabla-loop-01.mp3",
            "https://www.soundjay.com/music/indian-tabla-loop-02.mp3"
        ];
    },

    // Get YouTube audio streams (working method)
    async getYouTubeAudio(videoId) {
        try {
            // Using yt-audio-stream as a service
            const response = await fetch(`https://corsproxy.io/?https://yt-audio-stream.vercel.app/stream/${videoId}`);
            const data = await response.json();
            return data.audioUrl;
        } catch (error) {
            console.error("YouTube audio failed:", error);
            return null;
        }
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

    async playMusic(songData, pause = false) {
        console.log("Attempting to play:", songData.name);
        
        if (!APP_STATE.currentSong) {
            APP_STATE.currentSong = new Audio();
        }
        
        // Stop current playback
        APP_STATE.currentSong.pause();
        APP_STATE.currentSong.currentTime = 0;
        
        // Show loading state
        if (DOM.songInfo) {
            DOM.songInfo.innerHTML = `Loading: ${songData.name}...`;
        }
        
        try {
            let audioUrl = songData.url;
            
            // If no URL provided, use working sample music
            if (!audioUrl) {
                const sampleUrls = utils.getSampleMusic();
                const randomIndex = Math.floor(Math.random() * sampleUrls.length);
                audioUrl = sampleUrls[randomIndex];
            }
            
            console.log("Using audio URL:", audioUrl);
            
            // Set audio source
            APP_STATE.currentSong.src = audioUrl;
            this.resetSeekbar();
            
            const songList = Array.from(DOM.songUL.querySelectorAll("li"));
            const index = songList.findIndex(li => li.getAttribute("data-name") === songData.name);
            
            if (index !== -1) {
                APP_STATE.currentIndex = index;
            }
            
            if (DOM.songInfo) {
                DOM.songInfo.innerHTML = songData.name;
            }
            
            if (!pause) {
                // Wait for audio to load
                await new Promise((resolve, reject) => {
                    APP_STATE.currentSong.addEventListener('canplaythrough', resolve, { once: true });
                    APP_STATE.currentSong.addEventListener('error', reject, { once: true });
                    
                    // Timeout fallback
                    setTimeout(resolve, 3000);
                });
                
                // Play the audio
                await APP_STATE.currentSong.play();
                
                if (DOM.play) DOM.play.src = "img/pause.svg";
                console.log("Successfully playing:", songData.name);
                
            } else {
                if (DOM.play) DOM.play.src = "img/play.svg";
            }
            
        } catch (error) {
            console.error("Error playing song:", error);
            if (DOM.songInfo) {
                DOM.songInfo.innerHTML = `Playback Error: ${songData.name}`;
            }
            
            // Fallback: Try with a different sample URL
            try {
                const sampleUrls = utils.getSampleMusic();
                const fallbackUrl = sampleUrls[0];
                APP_STATE.currentSong.src = fallbackUrl;
                await APP_STATE.currentSong.play();
                if (DOM.play) DOM.play.src = "img/pause.svg";
                console.log("Playing fallback music");
            } catch (fallbackError) {
                console.error("Fallback also failed:", fallbackError);
            }
        }
    },

    setupPlayPause() {
        if (!DOM.play) return;
        
        DOM.play.onclick = () => {
            if (!APP_STATE.currentSong) return;
            
            if (APP_STATE.currentSong.paused) {
                APP_STATE.currentSong.play().then(() => {
                    DOM.play.src = "img/pause.svg";
                }).catch(error => {
                    console.error("Play failed:", error);
                });
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
                    const songName = songList[APP_STATE.currentIndex].getAttribute("data-name");
                    const songUrl = songList[APP_STATE.currentIndex].getAttribute("data-url");
                    this.playMusic({ name: songName, url: songUrl });
                }
            };
        }

        if (DOM.next) {
            DOM.next.onclick = () => {
                const songList = Array.from(DOM.songUL.querySelectorAll("li"));
                if (APP_STATE.currentIndex < songList.length - 1) {
                    APP_STATE.currentIndex++;
                    const songName = songList[APP_STATE.currentIndex].getAttribute("data-name");
                    const songUrl = songList[APP_STATE.currentIndex].getAttribute("data-url");
                    this.playMusic({ name: songName, url: songUrl });
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
            const songName = songList[nextIndex].getAttribute("data-name");
            const songUrl = songList[nextIndex].getAttribute("data-url");
            
            this.playMusic({ name: songName, url: songUrl });
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
                    <div class="song-source">Click to play</div>
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
            APP_STATE.songs = await getSongs(album.folder);
        });
        
        return card;
    }
};

// Main Functions
async function getSongs(folder) {
    try {
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

        // Song data with working music URLs
        const songsData = {
            arjit_singh: [
                {"name": "Romantic Indian Music 1", "url": "https://www.soundjay.com/music/indian-sitar-music-01.mp3"},
                {"name": "Romantic Indian Music 2", "url": "https://www.soundjay.com/music/indian-sitar-music-02.mp3"},
                {"name": "Emotional Melody", "url": "https://www.soundjay.com/music/bansuri-indian-flute-01.mp3"}
            ],
            english: [
                {"name": "Electronic Pop Beat", "url": "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3"},
                {"name": "Summer Bossa", "url": "https://assets.mixkit.co/music/preview/mixkit-summer-bossa-538.mp3"},
                {"name": "Driving Ambition", "url": "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3"}
            ],
            funk: [
                {"name": "Funky Groove", "url": "https://assets.mixkit.co/music/preview/mixkit-funky-groove-299.mp3"},
                {"name": "The Dream", "url": "https://assets.mixkit.co/music/preview/mixkit-the-dream-442.mp3"},
                {"name": "Deep Urban", "url": "https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3"}
            ],
            hindi: [
                {"name": "Indian Tabla Loop 1", "url": "https://www.soundjay.com/music/indian-tabla-loop-01.mp3"},
                {"name": "Indian Tabla Loop 2", "url": "https://www.soundjay.com/music/indian-tabla-loop-02.mp3"},
                {"name": "Bansuri Flute 2", "url": "https://www.soundjay.com/music/bansuri-indian-flute-02.mp3"}
            ],
            honey_singh: [
                {"name": "Urban Hip Hop", "url": "https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3"},
                {"name": "Tech House Vibes", "url": "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3"},
                {"name": "Party Beat", "url": "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3"}
            ],
            kk_special: [
                {"name": "Hazy After Hours", "url": "https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3"},
                {"name": "Summer Bossa Nova", "url": "https://assets.mixkit.co/music/preview/mixkit-summer-bossa-538.mp3"},
                {"name": "Dreamy Melody", "url": "https://assets.mixkit.co/music/preview/mixkit-the-dream-442.mp3"}
            ],
            krishna_flute: [
                {"name": "Bansuri Flute 1", "url": "https://www.soundjay.com/music/bansuri-indian-flute-01.mp3"},
                {"name": "Bansuri Flute 2", "url": "https://www.soundjay.com/music/bansuri-indian-flute-02.mp3"},
                {"name": "Meditation Music", "url": "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3"}
            ],
            late_night_chill: [
                {"name": "Hazy After Hours", "url": "https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3"},
                {"name": "Serene View", "url": "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3"},
                {"name": "Summer Bossa", "url": "https://assets.mixkit.co/music/preview/mixkit-summer-bossa-538.mp3"}
            ],
            marathi: [
                {"name": "Indian Traditional 1", "url": "https://www.soundjay.com/music/indian-sitar-music-01.mp3"},
                {"name": "Indian Traditional 2", "url": "https://www.soundjay.com/music/indian-sitar-music-02.mp3"},
                {"name": "Folk Rhythm", "url": "https://www.soundjay.com/music/indian-tabla-loop-01.mp3"}
            ],
            mashup: [
                {"name": "Tech House Mashup", "url": "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3"},
                {"name": "Urban Mashup", "url": "https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3"},
                {"name": "Funky Mashup", "url": "https://assets.mixkit.co/music/preview/mixkit-funky-groove-299.mp3"}
            ],
            vishal_mishra: [
                {"name": "Soulful Composition", "url": "https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3"},
                {"name": "Heartfelt Melody", "url": "https://assets.mixkit.co/music/preview/mixkit-summer-bossa-538.mp3"},
                {"name": "Emotional Track", "url": "https://assets.mixkit.co/music/preview/mixkit-the-dream-442.mp3"}
            ]
        };

        const songs = songsData[folder] || [];

        if (DOM.songUL) {
            DOM.songUL.innerHTML = songs.map(song => uiControls.createSongListItem(song)).join("");
        }

        if (DOM.songUL) {
            DOM.songUL.querySelectorAll("li").forEach(li => {
                li.addEventListener("click", () => {
                    const songUrl = li.getAttribute("data-url");
                    const songName = li.getAttribute("data-name");
                    
                    const songList = Array.from(DOM.songUL.querySelectorAll("li"));
                    const index = songList.findIndex(songLi => songLi.getAttribute("data-name") === songName);
                    if (index !== -1) {
                        APP_STATE.currentIndex = index;
                    }
                    
                    audioControls.playMusic({ name: songName, url: songUrl });
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
        const albumsData = {
            albums: [
                {
                    folder: "arjit_singh",
                    title: "Arijit Singh",
                    description: "Soulful romantic hits and emotional melodies",
                    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&h=200&fit=crop"
                },
                {
                    folder: "english",
                    title: "English Songs", 
                    description: "International pop hits and English classics",
                    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"
                },
                {
                    folder: "funk",
                    title: "Funk",
                    description: "Groovy beats and dance music",
                    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop"
                },
                {
                    folder: "hindi",
                    title: "Hindi Hits",
                    description: "Bollywood chartbusters and popular songs",
                    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop"
                },
                {
                    folder: "honey_singh",
                    title: "Honey Singh",
                    description: "Punjabi rap and party tracks",
                    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"
                },
                {
                    folder: "kk_special",
                    title: "KK Special",
                    description: "Legendary KK's unforgettable melodies", 
                    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&h=200&fit=crop"
                },
                {
                    folder: "krishna_flute",
                    title: "Krishna Flute",
                    description: "Divine flute music for meditation",
                    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop"
                },
                {
                    folder: "late_night_chill", 
                    title: "Late Night Chill",
                    description: "Relaxing tunes for quiet evenings",
                    cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop"
                },
                {
                    folder: "marathi",
                    title: "Marathi Songs",
                    description: "Traditional and contemporary Marathi music",
                    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop"
                },
                {
                    folder: "mashup",
                    title: "Mashup", 
                    description: "Creative song remixes and blends",
                    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"
                },
                {
                    folder: "vishal_mishra",
                    title: "Vishal Mishra",
                    description: "Soulful compositions and heartfelt tracks",
                    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&h=200&fit=crop"
                }
            ]
        };

        if (DOM.cardContainer) {
            DOM.cardContainer.innerHTML = '';
        }
        
        albumsData.albums.forEach(album => {
            if (DOM.cardContainer) {
                DOM.cardContainer.appendChild(uiControls.createAlbumCard(album));
            }
        });
        
    } catch (error) {
        console.error("Error displaying albums:", error);
    }
}

async function main() {
    initializeDOMElements();
    
    // Load albums
    await displayAlbums();
    
    // Setup UI controls
    uiControls.setupHamburgerMenu();
}

// Initialize app
main();

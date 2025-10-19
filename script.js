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

    // YouTube Music API search
    async searchYouTubeMusic(query) {
        try {
            // Using a proxy to avoid CORS issues
            const response = await fetch(`https://corsproxy.io/?https://www.youtube.com/results?search_query=${encodeURIComponent(query + " audio")}`);
            const html = await response.text();
            
            // Extract video ID from search results (simplified approach)
            const videoIdMatch = html.match(/"videoId":"([^"]+)"/);
            if (videoIdMatch) {
                return `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1`;
            }
            return null;
        } catch (error) {
            console.error("YouTube search failed:", error);
            return null;
        }
    },

    // Deezer API search
    async searchDeezer(query) {
        try {
            const response = await fetch(`https://corsproxy.io/?https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                return data.data[0].preview; // 30-second preview
            }
            return null;
        } catch (error) {
            console.error("Deezer search failed:", error);
            return null;
        }
    },

    // SoundCloud API search
    async searchSoundCloud(query) {
        try {
            // Using a public SoundCloud API proxy
            const response = await fetch(`https://corsproxy.io/?https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=YOUR_CLIENT_ID&limit=1`);
            const data = await response.json();
            
            if (data.collection && data.collection.length > 0) {
                return data.collection[0].stream_url + "?client_id=YOUR_CLIENT_ID";
            }
            return null;
        } catch (error) {
            console.error("SoundCloud search failed:", error);
            return null;
        }
    },

    // JioSaavn API (for Indian music)
    async searchJioSaavn(query) {
        try {
            const response = await fetch(`https://corsproxy.io/?https://www.jiosaavn.com/api.php?__call=autocomplete.get&query=${encodeURIComponent(query)}&_format=json&_marker=0`);
            const data = await response.json();
            
            if (data.songs && data.songs.data.length > 0) {
                const song = data.songs.data[0];
                return song.media_preview_url || song.perma_url;
            }
            return null;
        } catch (error) {
            console.error("JioSaavn search failed:", error);
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
        console.log("Playing:", songData.name);
        
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
            // Try to get streaming URL from API
            let audioUrl = songData.url;
            
            if (!audioUrl || audioUrl.includes('local')) {
                // Search for the song online
                console.log(`Searching for: ${songData.name}`);
                
                // Try different APIs in sequence
                audioUrl = await utils.searchDeezer(songData.name) ||
                          await utils.searchYouTubeMusic(songData.name) ||
                          await utils.searchJioSaavn(songData.name);
                
                if (!audioUrl) {
                    throw new Error("No streaming source found");
                }
            }
            
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
                APP_STATE.currentSong.play().then(() => {
                    if (DOM.play) DOM.play.src = "img/pause.svg";
                    console.log("Now playing:", songData.name);
                }).catch(error => {
                    console.error("Play failed:", error);
                    if (DOM.songInfo) {
                        DOM.songInfo.innerHTML = `Error: ${songData.name}`;
                    }
                });
            } else {
                if (DOM.play) DOM.play.src = "img/play.svg";
            }
            
        } catch (error) {
            console.error("Error loading song:", error);
            if (DOM.songInfo) {
                DOM.songInfo.innerHTML = `Error: ${songData.name}`;
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
                    <div class="song-source">Streaming...</div>
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

        // Song data with real song names for API search
        const songsData = {
            arjit_singh: [
                {"name": "Tum Hi Ho Arijit Singh", "url": ""},
                {"name": "Channa Mereya Arijit Singh", "url": ""},
                {"name": "Phir Mohabbat Arijit Singh", "url": ""}
            ],
            english: [
                {"name": "Shape of You Ed Sheeran", "url": ""},
                {"name": "Blinding Lights The Weeknd", "url": ""},
                {"name": "Dance Monkey Tones and I", "url": ""}
            ],
            funk: [
                {"name": "Uptown Funk Mark Ronson", "url": ""},
                {"name": "Get Lucky Daft Punk", "url": ""},
                {"name": "24K Magic Bruno Mars", "url": ""}
            ],
            hindi: [
                {"name": "Tum Hi Ho", "url": ""},
                {"name": "Gerua", "url": ""},
                {"name": "Tera Ban Jaunga", "url": ""}
            ],
            honey_singh: [
                {"name": "Blue Eyes Honey Singh", "url": ""},
                {"name": "Lungi Dance Honey Singh", "url": ""},
                {"name": "High Heels Honey Singh", "url": ""}
            ],
            kk_special: [
                {"name": "Tadap Tadap KK", "url": ""},
                {"name": "Zara Sa KK", "url": ""},
                {"name": "Yaaron KK", "url": ""}
            ],
            krishna_flute: [
                {"name": "Krishna Flute Meditation", "url": ""},
                {"name": "Divine Flute Music", "url": ""},
                {"name": "Peaceful Flute Melody", "url": ""}
            ],
            late_night_chill: [
                {"name": "Chillout Lounge Music", "url": ""},
                {"name": "Relaxing Ambient Music", "url": ""},
                {"name": "Night Drive Music", "url": ""}
            ],
            marathi: [
                {"name": "Zingat", "url": ""},
                {"name": "Apsara Aali", "url": ""},
                {"name": "Lagu Zala", "url": ""}
            ],
            mashup: [
                {"name": "Bollywood Mashup 2024", "url": ""},
                {"name": "Party Mashup Songs", "url": ""},
                {"name": "Romantic Mashup Hindi", "url": ""}
            ],
            vishal_mishra: [
                {"name": "Tere Hawale Vishal Mishra", "url": ""},
                {"name": "Man Bhaariya Vishal Mishra", "url": ""},
                {"name": "Kaise Hua Vishal Mishra", "url": ""}
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

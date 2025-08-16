class MusicPlayer {
    constructor() {
        // Player state
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.isShuffled = false;
        this.repeatMode = 0; // 0: no repeat, 1: repeat all, 2: repeat one
        this.volume = 0.5;
        this.isMuted = false;
        this.originalOrder = [];
        
        // Audio context for visualizer
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        
        // DOM elements
        this.initializeElements();
        
        // Event listeners
        this.initializeEventListeners();
        
        // Initialize audio visualizer
        this.initializeVisualizer();
        
        console.log('🎵 Music Player initialized!');
    }
    
    initializeElements() {
        // Audio element
        this.audio = document.getElementById('audio-player');
        
        // Controls
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.shuffleBtn = document.getElementById('shuffle-btn');
        this.repeatBtn = document.getElementById('repeat-btn');
        
        // Volume
        this.volumeSlider = document.getElementById('volume-slider');
        this.muteBtn = document.getElementById('mute-btn');
        this.volumeDisplay = document.getElementById('volume-display');
        
        // Progress
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        this.progressHandle = document.getElementById('progress-handle');
        
        // Track info
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
        this.trackImage = document.getElementById('track-image');
        this.currentTime = document.getElementById('current-time');
        this.trackDuration = document.getElementById('track-duration');
        this.trackArt = document.querySelector('.track-art');
        
        // Playlist
        this.playlist_container = document.getElementById('playlist');
        this.fileInput = document.getElementById('file-input');
        this.uploadBtn = document.getElementById('upload-btn');
        this.clearPlaylistBtn = document.getElementById('clear-playlist');
        this.sortSelect = document.getElementById('sort-playlist');
        this.demoPlaylistsSelect = document.getElementById('demo-playlists');
        
        // Visualizer
        this.canvas = document.getElementById('visualizer');
        this.canvasCtx = this.canvas.getContext('2d');
    }
    
    initializeEventListeners() {
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateTrackInfo());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('loadstart', () => this.showLoading());
        this.audio.addEventListener('canplay', () => this.hideLoading());
        
        // Control buttons
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Volume controls
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.progressHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // File upload
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Playlist controls
        this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());
        this.sortSelect.addEventListener('change', (e) => this.sortPlaylist(e.target.value));
        this.demoPlaylistsSelect.addEventListener('change', (e) => this.loadDemoPlaylist(e.target.value));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Drag and drop
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.body.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
        });
        
        document.addEventListener('dragleave', () => {
            document.body.style.backgroundColor = '';
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            document.body.style.backgroundColor = '';
            this.handleFileDrop(e);
        });
    }
    
    initializeVisualizer() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.drawVisualizer();
        } catch (error) {
            console.warn('Audio visualizer not supported:', error);
        }
    }
    
    drawVisualizer() {
        if (!this.analyser) return;
        
        requestAnimationFrame(() => this.drawVisualizer());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const canvas = this.canvas;
        const ctx = this.canvasCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#ffeaa7');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        const barWidth = (width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            barHeight = (this.dataArray[i] / 255) * height * 0.8;
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        this.addFilesToPlaylist(files);
        event.target.value = ''; // Reset input
    }
    
    handleFileDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        const audioFiles = files.filter(file => file.type.startsWith('audio/'));
        this.addFilesToPlaylist(audioFiles);
    }
    
    async addFilesToPlaylist(files) {
        for (const file of files) {
            if (file.type.startsWith('audio/')) {
                try {
                    const track = await this.createTrackFromFile(file);
                    this.playlist.push(track);
                    this.originalOrder.push(track);
                } catch (error) {
                    console.error('Error adding file:', error);
                }
            }
        }
        
        this.renderPlaylist();
        
        // If no track is loaded, load the first one
        if (this.playlist.length === 1) {
            this.loadTrack(0);
        }
    }
    
    createTrackFromFile(file) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const audio = new Audio();
            
            audio.onloadedmetadata = () => {
                const track = {
                    id: Date.now() + Math.random(),
                    title: this.extractFileName(file.name),
                    artist: 'Unknown Artist',
                    src: url,
                    file: file,
                    duration: audio.duration,
                    blob: file
                };
                resolve(track);
            };
            
            audio.src = url;
        });
    }
    
    extractFileName(filename) {
        return filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
    }
    
    renderPlaylist() {
        this.playlist_container.innerHTML = '';
        
        if (this.playlist.length === 0) {
            this.playlist_container.innerHTML = `
                <div class="empty-playlist">
                    <i class="fas fa-music"></i>
                    <p>Your playlist is empty</p>
                    <p class="empty-subtitle">Add some music to get started!</p>
                </div>
            `;
            return;
        }
        
        this.playlist.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = `track-item ${index === this.currentTrackIndex ? 'playing' : ''}`;
            trackElement.innerHTML = `
                <div class="track-number">${index + 1}</div>
                <div class="track-details-playlist">
                    <div class="track-name">${track.title}</div>
                    <div class="track-artist-playlist">${track.artist}</div>
                </div>
                <div class="track-duration">${this.formatTime(track.duration)}</div>
                <div class="track-actions">
                    <button class="track-action-btn" onclick="musicPlayer.removeTrack(${index})" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            trackElement.addEventListener('click', () => this.playTrack(index));
            this.playlist_container.appendChild(trackElement);
        });
    }
    
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        this.audio.src = track.src;
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;
        
        // Update playing state in playlist
        this.renderPlaylist();
        
        // Load metadata
        this.audio.load();
    }
    
    playTrack(index) {
        if (index === this.currentTrackIndex && this.isPlaying) {
            this.pause();
        } else {
            this.loadTrack(index);
            this.play();
        }
    }
    
    async play() {
        if (this.playlist.length === 0) {
            this.showMessage('No tracks in playlist');
            return;
        }
        
        try {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.trackArt.classList.add('playing');
        } catch (error) {
            console.error('Playback failed:', error);
            this.showMessage('Playback failed. Please try again.');
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.trackArt.classList.remove('playing');
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    playNext() {
        if (this.playlist.length === 0) return;
        
        let nextIndex;
        if (this.repeatMode === 2) {
            // Repeat current track
            nextIndex = this.currentTrackIndex;
        } else if (this.currentTrackIndex < this.playlist.length - 1) {
            nextIndex = this.currentTrackIndex + 1;
        } else if (this.repeatMode === 1) {
            // Repeat all - go to first track
            nextIndex = 0;
        } else {
            // No repeat - stop at end
            this.pause();
            return;
        }
        
        this.loadTrack(nextIndex);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    playPrevious() {
        if (this.playlist.length === 0) return;
        
        // If more than 3 seconds have passed, restart current track
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }
        
        let prevIndex;
        if (this.currentTrackIndex > 0) {
            prevIndex = this.currentTrackIndex - 1;
        } else if (this.repeatMode === 1) {
            // Go to last track if repeat all is enabled
            prevIndex = this.playlist.length - 1;
        } else {
            prevIndex = 0;
        }
        
        this.loadTrack(prevIndex);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active', this.isShuffled);
        
        if (this.isShuffled) {
            this.shufflePlaylist();
        } else {
            this.restoreOriginalOrder();
        }
        
        this.showMessage(`Shuffle ${this.isShuffled ? 'enabled' : 'disabled'}`);
    }
    
    shufflePlaylist() {
        const currentTrack = this.playlist[this.currentTrackIndex];
        
        // Fisher-Yates shuffle
        for (let i = this.playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
        }
        
        // Find the new index of the current track
        this.currentTrackIndex = this.playlist.findIndex(track => track.id === currentTrack.id);
        this.renderPlaylist();
    }
    
    restoreOriginalOrder() {
        const currentTrack = this.playlist[this.currentTrackIndex];
        this.playlist = [...this.originalOrder];
        this.currentTrackIndex = this.playlist.findIndex(track => track.id === currentTrack.id);
        this.renderPlaylist();
    }
    
    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        
        const repeatIcon = this.repeatBtn.querySelector('i');
        this.repeatBtn.classList.remove('active');
        
        switch (this.repeatMode) {
            case 0:
                repeatIcon.className = 'fas fa-redo';
                this.showMessage('Repeat disabled');
                break;
            case 1:
                repeatIcon.className = 'fas fa-redo';
                this.repeatBtn.classList.add('active');
                this.showMessage('Repeat all enabled');
                break;
            case 2:
                repeatIcon.className = 'fas fa-redo';
                this.repeatBtn.classList.add('active');
                // Add "1" indicator for repeat one
                this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i><span style="font-size: 0.7em; position: absolute; top: 5px; right: 5px;">1</span>';
                this.showMessage('Repeat one enabled');
                break;
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.volume;
        this.volumeSlider.value = this.volume * 100;
        this.volumeDisplay.textContent = Math.round(this.volume * 100) + '%';
        
        // Update mute button icon
        this.updateVolumeIcon();
    }
    
    toggleMute() {
        if (this.isMuted) {
            this.audio.volume = this.volume;
            this.isMuted = false;
        } else {
            this.audio.volume = 0;
            this.isMuted = true;
        }
        
        this.updateVolumeIcon();
    }
    
    updateVolumeIcon() {
        const icon = this.muteBtn.querySelector('i');
        const volume = this.isMuted ? 0 : this.volume;
        
        if (volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }
    
    seekTo(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        const time = percent * this.audio.duration;
        
        if (isFinite(time)) {
            this.audio.currentTime = time;
        }
    }
    
    startDrag(event) {
        event.preventDefault();
        
        const onMouseMove = (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const time = percent * this.audio.duration;
            
            if (isFinite(time)) {
                this.audio.currentTime = time;
            }
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    updateProgress() {
        if (this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressFill.style.width = percent + '%';
            this.progressHandle.style.left = percent + '%';
            
            this.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }
    
    updateTrackInfo() {
        if (this.audio.duration) {
            this.trackDuration.textContent = this.formatTime(this.audio.duration);
        }
    }
    
    updatePlayButton() {
        const icon = this.playPauseBtn.querySelector('i');
        icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    
    handleTrackEnd() {
        if (this.repeatMode === 2) {
            // Repeat one
            this.audio.currentTime = 0;
            this.play();
        } else {
            this.playNext();
        }
    }
    
    removeTrack(index) {
        if (index === this.currentTrackIndex && this.isPlaying) {
            this.pause();
        }
        
        // Remove from both arrays
        this.playlist.splice(index, 1);
        this.originalOrder = this.originalOrder.filter(track => 
            track.id !== this.playlist[index]?.id
        );
        
        // Adjust current track index
        if (index < this.currentTrackIndex) {
            this.currentTrackIndex--;
        } else if (index === this.currentTrackIndex) {
            if (this.playlist.length === 0) {
                this.currentTrackIndex = 0;
                this.resetPlayer();
            } else if (this.currentTrackIndex >= this.playlist.length) {
                this.currentTrackIndex = 0;
                this.loadTrack(0);
            } else {
                this.loadTrack(this.currentTrackIndex);
            }
        }
        
        this.renderPlaylist();
    }
    
    clearPlaylist() {
        if (confirm('Are you sure you want to clear the entire playlist?')) {
            this.pause();
            this.playlist = [];
            this.originalOrder = [];
            this.currentTrackIndex = 0;
            this.resetPlayer();
            this.renderPlaylist();
            this.showMessage('Playlist cleared');
        }
    }
    
    sortPlaylist(sortBy) {
        if (this.playlist.length === 0) return;
        
        const currentTrack = this.playlist[this.currentTrackIndex];
        
        switch (sortBy) {
            case 'name':
                this.playlist.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'duration':
                this.playlist.sort((a, b) => a.duration - b.duration);
                break;
            case 'default':
                this.playlist = [...this.originalOrder];
                break;
        }
        
        // Update current track index
        this.currentTrackIndex = this.playlist.findIndex(track => track.id === currentTrack.id);
        this.renderPlaylist();
        this.showMessage(`Playlist sorted by ${sortBy}`);
    }
    
    resetPlayer() {
        this.trackTitle.textContent = 'Select a track to play';
        this.trackArtist.textContent = 'Unknown Artist';
        this.currentTime.textContent = '0:00';
        this.trackDuration.textContent = '0:00';
        this.progressFill.style.width = '0%';
        this.progressHandle.style.left = '0%';
        this.trackArt.classList.remove('playing');
        this.audio.src = '';
    }
    
    handleKeyboard(event) {
        // Prevent default if input is focused
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') return;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.playPrevious();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.playNext();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.setVolume(this.volume + 0.1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.setVolume(this.volume - 0.1);
                break;
            case 'KeyM':
                event.preventDefault();
                this.toggleMute();
                break;
            case 'KeyS':
                event.preventDefault();
                this.toggleShuffle();
                break;
            case 'KeyR':
                event.preventDefault();
                this.toggleRepeat();
                break;
        }
    }
    
    formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    showMessage(message) {
        // Create or update message display
        let messageEl = document.getElementById('player-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'player-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                z-index: 1000;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                transform: translateX(100%);
            `;
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.style.transform = 'translateX(0)';
        
        // Hide after 3 seconds
        setTimeout(() => {
            messageEl.style.transform = 'translateX(100%)';
        }, 3000);
    }
    
    showLoading() {
        // Add loading state to play button
        this.playPauseBtn.style.opacity = '0.6';
    }
    
    hideLoading() {
        this.playPauseBtn.style.opacity = '1';
    }
    
    // Demo playlists data
    getDemoPlaylists() {
        return {
            'pop-hits': {
                name: '🎵 Pop Hits',
                tracks: [
                    { title: 'Blinding Lights', artist: 'The Weeknd', duration: 200 },
                    { title: 'Watermelon Sugar', artist: 'Harry Styles', duration: 174 },
                    { title: 'Levitating', artist: 'Dua Lipa', duration: 203 },
                    { title: 'Good 4 U', artist: 'Olivia Rodrigo', duration: 178 },
                    { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', duration: 141 },
                    { title: 'Anti-Hero', artist: 'Taylor Swift', duration: 200 },
                    { title: 'As It Was', artist: 'Harry Styles', duration: 167 }
                ]
            },
            'rock-classics': {
                name: '🎸 Rock Classics',
                tracks: [
                    { title: 'Bohemian Rhapsody', artist: 'Queen', duration: 355 },
                    { title: 'Hotel California', artist: 'Eagles', duration: 391 },
                    { title: 'Stairway to Heaven', artist: 'Led Zeppelin', duration: 482 },
                    { title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', duration: 356 },
                    { title: 'November Rain', artist: 'Guns N\' Roses', duration: 537 },
                    { title: 'Don\'t Stop Believin\'', artist: 'Journey', duration: 251 },
                    { title: 'Free Bird', artist: 'Lynyrd Skynyrd', duration: 548 }
                ]
            },
            'jazz-lounge': {
                name: '🎷 Jazz Lounge',
                tracks: [
                    { title: 'Take Five', artist: 'Dave Brubeck', duration: 324 },
                    { title: 'Blue in Green', artist: 'Miles Davis', duration: 337 },
                    { title: 'So What', artist: 'Miles Davis', duration: 563 },
                    { title: 'Autumn Leaves', artist: 'Bill Evans', duration: 456 },
                    { title: 'All Blues', artist: 'Miles Davis', duration: 691 },
                    { title: 'Giant Steps', artist: 'John Coltrane', duration: 287 },
                    { title: 'Round Midnight', artist: 'Thelonious Monk', duration: 382 }
                ]
            },
            'electronic-vibes': {
                name: '🎛️ Electronic Vibes',
                tracks: [
                    { title: 'One More Time', artist: 'Daft Punk', duration: 320 },
                    { title: 'Strobe', artist: 'Deadmau5', duration: 636 },
                    { title: 'Midnight City', artist: 'M83', duration: 244 },
                    { title: 'Language', artist: 'Porter Robinson', duration: 387 },
                    { title: 'Shelter', artist: 'Porter Robinson & Madeon', duration: 213 },
                    { title: 'Ghosts \'n\' Stuff', artist: 'Deadmau5', duration: 324 },
                    { title: 'Genesis', artist: 'Justice', duration: 244 }
                ]
            },
            'indie-favorites': {
                name: '🎭 Indie Favorites',
                tracks: [
                    { title: 'Mr. Brightside', artist: 'The Killers', duration: 222 },
                    { title: 'Take Me Out', artist: 'Franz Ferdinand', duration: 237 },
                    { title: 'Time to Dance', artist: 'The Sounds', duration: 195 },
                    { title: 'Electric Feel', artist: 'MGMT', duration: 228 },
                    { title: 'Pumped Up Kicks', artist: 'Foster the People', duration: 238 },
                    { title: 'Somebody Told Me', artist: 'The Killers', duration: 197 },
                    { title: 'Float On', artist: 'Modest Mouse', duration: 208 }
                ]
            },
            'chill-out': {
                name: '😌 Chill Out',
                tracks: [
                    { title: 'Weightless', artist: 'Marconi Union', duration: 485 },
                    { title: 'Teardrop', artist: 'Massive Attack', duration: 329 },
                    { title: 'Porcelain', artist: 'Moby', duration: 240 },
                    { title: 'Breathe Me', artist: 'Sia', duration: 268 },
                    { title: 'Mad World', artist: 'Gary Jules', duration: 189 },
                    { title: 'The Night We Met', artist: 'Lord Huron', duration: 207 },
                    { title: 'Holocene', artist: 'Bon Iver', duration: 337 }
                ]
            }
        };
    }
    
    loadDemoPlaylist(playlistKey) {
        if (!playlistKey) return;
        
        const demoPlaylists = this.getDemoPlaylists();
        const selectedPlaylist = demoPlaylists[playlistKey];
        
        if (!selectedPlaylist) return;
        
        // Clear current playlist
        this.playlist = [];
        this.originalOrder = [];
        this.currentTrackIndex = 0;
        
        // Create demo tracks with mock audio data
        selectedPlaylist.tracks.forEach(trackData => {
            const track = this.createDemoTrack(trackData);
            this.playlist.push(track);
            this.originalOrder.push(track);
        });
        
        // Render the playlist
        this.renderPlaylist();
        
        // Load first track
        if (this.playlist.length > 0) {
            this.loadTrack(0);
        }
        
        // Reset dropdown
        this.demoPlaylistsSelect.value = '';
        
        // Show success message
        this.showMessage(`Loaded ${selectedPlaylist.name} playlist with ${this.playlist.length} tracks`);
    }
    
    createDemoTrack(trackData) {
        // Create a silent audio data URL for demo purposes
        const silentAudioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmczBTGH0vDZhjkIHm7A7+OZURE/ctXQ3ZM+CRpqwPDhlSkEKnbH7+OQQAkTXrTp7qpVEAhEnt7zvGY0BTCFze/agjcFKG280dpaSDMfcsXmfzIrCRpbWWj7rCqyFTGBz+/ZgjoGK3O79NqCOQUraLzy2Y8+CRdPs+dZe4E0BSGDz+/YgTsBK2u89NiCOAYSccXk6HRUBzZKZTlEf0c7Hyiw4f/ijiME';
        
        return {
            id: Date.now() + Math.random(),
            title: trackData.title,
            artist: trackData.artist,
            src: silentAudioData,
            duration: trackData.duration,
            isDemoTrack: true
        };
    }
}

// Initialize the music player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});

// Expose for debugging
if (typeof window !== 'undefined') {
    window.MusicPlayer = MusicPlayer;
}

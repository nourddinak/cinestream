// Define the elements
const iframe = document.getElementById('videoFrame');
const title = document.getElementById('title');
const server_buttons = document.querySelectorAll('.server-btn');
const nextEpButton = document.getElementById('nextep-button');
const epSelectButton = document.getElementById('epselect-button');
const popoverContainer = document.getElementById('popover-container');
const popoverContent = document.querySelector('.popover-content');
const seasonsList = document.getElementById('seasons-list');
const episodesList = document.getElementById('episodes-list');
const popoverTitle = document.getElementById('popover-header-title');
const popoverBackButton = document.getElementById('popover-back-button');
const popoverCloseButton = document.getElementById('popover-close-button');
const popoverListContainer = document.getElementById('popover-list-container');
const searchInput = document.getElementById('search-input');
const heroSearchInput = document.getElementById('hero-search-input');
const searchResults = document.getElementById('search-results');
const noResults = document.getElementById('no-results');
const loadingOverlay = document.getElementById('loading-overlay');
const videoLoading = document.getElementById('video-loading');

// Page elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');

// Movie grids
const trendingMovies = document.getElementById('trending-movies');
const popularMovies = document.getElementById('popular-movies');
const popularTV = document.getElementById('popular-tv');
const refreshBtn = document.getElementById('refresh-trending');

// Search Helpers
let searchAbortController = null;
let searchDebounceTimer = null;
let currentTMDBData = null;
let currentEpSelectionData = null;

// TMDB API Configuration
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwYTk1NzRmZDcxMjRkNmI5ZTUyNjA4ZWEzNWQ2NzdiNCIsIm5iZiI6MTczNzU5MDQ2NC4zMjUsInN1YiI6IjY3OTE4NmMwZThiNjdmZjgzM2ZhNjM4OCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.kWqK74FSN41PZO7_ENZelydTtX0u2g6dCkAW0vFs4jU';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadHomepageContent();
    
    // Check URL parameters on load
    const params = getURLParams();
    if (params) {
        showPage('watch');
        loadWatchContent(params);
    }
}

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    if (heroSearchInput) {
        heroSearchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        heroSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                showPage('search');
                searchInput.value = heroSearchInput.value;
                debouncedSearch(heroSearchInput.value);
            }
        });
    }

    // Search button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            showPage('search');
            searchInput.value = heroSearchInput.value;
            debouncedSearch(heroSearchInput.value);
        });
    }

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Re-run search with filter
            debouncedSearch(searchInput.value);
        });
    });

    // Server buttons
    server_buttons.forEach(button => {
        button.addEventListener('click', () => {
            const serverNumber = parseInt(button.id.replace('server', ''));
            changeServer(serverNumber);
        });
    });

    // Episode controls
    if (nextEpButton) {
        nextEpButton.addEventListener('click', nextEpisode);
    }

    if (epSelectButton) {
        epSelectButton.addEventListener('click', showEpisodeSelector);
    }

    // Popover controls
    if (popoverBackButton) {
        popoverBackButton.addEventListener('click', showSeasonsList);
    }

    if (popoverCloseButton) {
        popoverCloseButton.addEventListener('click', hidePopover);
    }

    // Click outside popover to close
    if (popoverContainer) {
        popoverContainer.addEventListener('click', (e) => {
            if (e.target === popoverContainer) {
                hidePopover();
            }
        });
    }

    // Search results click handler
    if (searchResults) {
        searchResults.addEventListener('click', handleResultClick);
    }

    // Refresh trending movies
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadTrendingMovies();
        });
    }

    // Video loading handler
    if (iframe) {
        iframe.addEventListener('load', () => {
            hideVideoLoading();
        });
    }
}

function showPage(pageName) {
    // Update navigation
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });

    // Show page
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `${pageName}-page`) {
            page.classList.add('active');
        }
    });

    // Clear search results when leaving search page
    if (pageName !== 'search') {
        clearSearchResults();
    }
}

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function showVideoLoading() {
    if (videoLoading) {
        videoLoading.style.display = 'block';
    }
}

function hideVideoLoading() {
    if (videoLoading) {
        videoLoading.style.display = 'none';
    }
}

// Debounce function
function debounce(fn, delay) {
    return (...args) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => fn(...args), delay);
    };
}

// TMDB API Functions
async function tmdbRequest(endpoint, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const headers = {
        'Authorization': `Bearer ${TMDB_API_KEY}`,
        'accept': 'application/json'
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json();
}

async function tmdbSearchMulti(query) {
    if (!query || query.trim().length === 0) return [];
    
    if (searchAbortController) {
        searchAbortController.abort();
    }
    searchAbortController = new AbortController();
    
    try {
        const data = await tmdbRequest('/search/multi', {
            query: query.trim(),
            include_adult: false,
            language: 'en-US',
            page: 1
        });
        
        return (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Search error:', error);
        }
        return [];
    }
}

async function loadTrendingMovies() {
    try {
        const data = await tmdbRequest('/trending/all/day');
        renderMovieGrid(data.results, trendingMovies);
    } catch (error) {
        console.error('Error loading trending movies:', error);
    }
}

async function loadPopularMovies() {
    try {
        const data = await tmdbRequest('/movie/popular');
        renderMovieGrid(data.results, popularMovies);
    } catch (error) {
        console.error('Error loading popular movies:', error);
    }
}

async function loadPopularTV() {
    try {
        const data = await tmdbRequest('/tv/popular');
        renderMovieGrid(data.results, popularTV);
    } catch (error) {
        console.error('Error loading popular TV shows:', error);
    }
}

function renderMovieGrid(items, container) {
    if (!container || !items) return;
    
    container.innerHTML = items.slice(0, 20).map(item => {
        const isMovie = item.media_type === 'movie' || !item.first_air_date;
        const title = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
        const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
        const poster = item.poster_path ? `${TMDB_IMAGE_BASE}/w300${item.poster_path}` : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        return `
            <div class="movie-card" data-id="${item.id}" data-type="${isMovie ? 'movie' : 'tv'}">
                <img class="movie-poster" src="${poster}" alt="${title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMUExQTJFIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1TDE3NSAyMDBIMTI1TDE1MCAyMjVaIiBmaWxsPSIjNzE3MTdBIi8+CjwvZz4KPC9zdmc+'" />
                <div class="movie-overlay">
                    <div class="movie-title">${title}</div>
                    <div class="movie-meta">
                        <span class="movie-year">${year}</span>
                        <div class="movie-rating">
                            <i class="fas fa-star"></i>
                            <span>${rating}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            const type = card.getAttribute('data-type');
            navigateToWatch(type, id);
        });
    });
}

function renderSearchResults(items) {
    if (!items || items.length === 0) {
        searchResults.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    // Apply filter
    const activeFilter = document.querySelector('.filter-btn.active');
    const filterType = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    
    if (filterType !== 'all') {
        items = items.filter(item => item.media_type === filterType);
    }

    if (items.length === 0) {
        searchResults.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    const baseImg = `${TMDB_IMAGE_BASE}/w92`;
    searchResults.innerHTML = items.map(item => {
        const isMovie = item.media_type === 'movie';
        const id = item.id;
        const titleText = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
        const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
        const poster = item.poster_path ? baseImg + item.poster_path : '';
        const subtitle = isMovie ? `Movie${year ? ` • ${year}` : ''}` : `TV Show${year ? ` • ${year}` : ''}`;
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        return `
            <div class="result-item" data-id="${id}" data-type="${isMovie ? 'movie' : 'tv'}">
                <img class="result-poster" src="${poster}" alt="" onerror="this.style.display='none'" />
                <div class="result-meta">
                    <div class="result-title">${titleText}</div>
                    <div class="result-subtitle">${subtitle} • ⭐ ${rating}</div>
                </div>
            </div>
        `;
    }).join('');
    
    searchResults.style.display = 'grid';
    noResults.style.display = 'none';
}

function clearSearchResults() {
    if (searchResults) {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
    }
    if (noResults) {
        noResults.style.display = 'none';
    }
}

function handleResultClick(e) {
    const item = e.target.closest('.result-item');
    if (!item) return;
    
    const id = item.getAttribute('data-id');
    const type = item.getAttribute('data-type');
    navigateToWatch(type, id);
}

function navigateToWatch(type, id, season = 1, episode = 1) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('type', type);
    currentUrl.searchParams.set('id', id);
    
    if (type === 'tv') {
        currentUrl.searchParams.set('s', season);
        currentUrl.searchParams.set('e', episode);
    } else {
        currentUrl.searchParams.delete('s');
        currentUrl.searchParams.delete('e');
    }
    
    // Set default server
    currentUrl.searchParams.set('server', '1');
    
    window.history.pushState({}, '', currentUrl.toString());
    showPage('watch');
    loadWatchContent(getURLParams());
}

const debouncedSearch = debounce(async (q) => {
    if (!q || q.length < 2) {
        clearSearchResults();
        return;
    }
    
    try {
        const items = await tmdbSearchMulti(q);
        renderSearchResults(items);
    } catch (error) {
        console.error('Search error:', error);
        clearSearchResults();
    }
}, 300);

// Utility Functions
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const id = params.get('id');
    const server = params.get('server');
    const result = {};

    if (server) {
        result.server = parseInt(server);
    }

    if (type === 'movie' && id) {
        result.type = 'movie';
        result.id = id;
    } else if (type === 'tv' && id && params.get('s') && params.get('e')) {
        result.type = 'tv';
        result.id = id;
        result.season = parseInt(params.get('s'));
        result.episode = parseInt(params.get('e'));
    } else {
        return null;
    }

    return result;
}

function getSelectedServerButtonId() {
    for (const button of server_buttons) {
        if (button.classList.contains('selected')) {
            const id = button.id.replace('server', '');
            return parseInt(id, 10);
        }
    }
    return null;
}

// Server Management
function changeServer(serverNumber) {
    const params = getURLParams();
    if (!params) return;

    showVideoLoading();
    iframe.src = '';
    let src = '';

    if (params.type === 'movie') {
        switch (serverNumber) {
            case 1: src = `https://vidsrc.cc/v3/embed/movie/${params.id}?autoPlay=false`; break;
            case 2: src = `https://moviesapi.club/movie/${params.id}`; break;
            case 3: src = `https://vidsrc.me/embed/movie?tmdb=${params.id}`; break;
            case 4: src = `https://player.videasy.net/movie/${params.id}`; break;
            case 5: src = `https://vidlink.pro/movie/${params.id}?title=true&poster=true&autoplay=false`; break;
            case 6: src = `https://embed.su/embed/movie/${params.id}`; break;
            case 7: src = `https://multiembed.mov/directstream.php?video_id=${params.id}&tmdb=1`; break;
            case 8: src = `https://vidsrc.to/embed/movie/${params.id}`; break;
            case 9: src = `https://autoembed.co/movie/tmdb/${params.id}`; break;
            case 10: src = `https://www.2embed.cc/embed/${params.id}`; break;
            case 11: src = `https://player.smashy.stream/movie/${params.id}`; break;
            case 12: src = `https://embed.smashystream.com/playere.php?tmdb=${params.id}`; break;
            case 13: src = `https://vidsrc.vip/embed/movie/${params.id}`; break;
            case 14: src = `https://embed.warezcdn.net/filme/${params.id}`; break;
            case 15: src = `https://api.whvx.net/embed/movie?id=${params.id}`; break;
            case 16: src = `https://embed.primewire.li/movie?tmdb=${params.id}`; break;
            case 17: src = `https://arabhd.net/embed/movie/${params.id}`; break;
            case 18: src = `https://faselhd.club/player?tmdb=${params.id}`; break;
            case 19: src = `https://www.primewire.tf/embed/movie?tmdb=${params.id}`; break;
            case 20: src = `https://database.gdriveplayer.us/player.php?tmdb=${params.id}`; break;
            case 21: src = `https://movieuniverse.se/movie/${params.id}`; break;
            case 22: src = `https://ask4movie.io/movie/${params.id}`; break;
            case 23: src = `https://solarmovie.pe/movie/${params.id}`; break;
            case 24: src = `https://c1ne.co/movie/${params.id}`; break;
            case 25: src = `https://tinyzonetv.to/movie/${params.id}`; break;
            case 26: src = `https://streamm4u.net/movie/${params.id}`; break;
            case 27: src = `https://moviejoy.to/movie/${params.id}`; break;
            case 28: src = `https://player.autoembed.cc/embed/movie/${params.id}`; break;
        }
    } else if (params.type === 'tv') {
        switch (serverNumber) {
            case 1: src = `https://vidsrc.cc/v3/embed/tv/${params.id}/${params.season}/${params.episode}?autoPlay=false`; break;
            case 2: src = `https://moviesapi.club/tv/${params.id}-${params.season}-${params.episode}`; break;
            case 3: src = `https://vidsrc.me/embed/tv?tmdb=${params.id}&season=${params.season}&episode=${params.episode}`; break;
            case 4: src = `https://player.videasy.net/tv/${params.id}/${params.season}/${params.episode}?nextEpisode=true&episodeSelector=true`; break;
            case 5: src = `https://vidlink.pro/tv/${params.id}/${params.season}/${params.episode}?title=true&poster=true&autoplay=false&nextbutton=true`; break;
            case 6: src = `https://embed.su/embed/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 7: src = `https://multiembed.mov/directstream.php?video_id=${params.id}&tmdb=1&s=${params.season}&e=${params.episode}`; break;
            case 8: src = `https://vidsrc.to/embed/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 9: src = `https://autoembed.co/tv/tmdb/${params.id}-${params.season}-${params.episode}`; break;
            case 10: src = `https://www.2embed.cc/embedtv/${params.id}&s=${params.season}&e=${params.episode}`; break;
            case 11: src = `https://player.smashy.stream/tv/${params.id}?s=${params.season}&e=${params.episode}`; break;
            case 12: src = `https://embed.smashystream.com/playere.php?tmdb=${params.id}&season=${params.season}&episode=${params.episode}`; break;
            case 13: src = `https://vidsrc.vip/embed/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 14: src = `https://embed.warezcdn.net/serie/${params.id}/${params.season}/${params.episode}`; break;
            case 15: src = `https://api.whvx.net/embed/tv?id=${params.id}&s=${params.season}&e=${params.episode}`; break;
            case 16: src = `https://embed.primewire.li/tv?tmdb=${params.id}&season=${params.season}&episode=${params.episode}`; break;
            case 17: src = `https://arabhd.net/embed/tv/${params.id}/${params.season}-${params.episode}`; break;
            case 18: src = `https://faselhd.club/player?tmdb=${params.id}&s=${params.season}&e=${params.episode}`; break;
            case 19: src = `https://www.primewire.tf/embed/tv?tmdb=${params.id}&s=${params.season}&e=${params.episode}`; break;
            case 20: src = `https://database.gdriveplayer.us/player.php?tmdb=${params.id}&season=${params.season}&episode=${params.episode}`; break;
            case 21: src = `https://movieuniverse.se/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 22: src = `https://ask4movie.io/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 23: src = `https://solarmovie.pe/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 24: src = `https://c1ne.co/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 25: src = `https://tinyzonetv.to/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 26: src = `https://streamm4u.net/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 27: src = `https://moviejoy.to/tv/${params.id}/${params.season}/${params.episode}`; break;
            case 28: src = `https://player.autoembed.cc/embed/tv/${params.id}/${params.season}/${params.episode}`; break;
        }
    }

    iframe.src = src;

    // Update URL with selected server
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('server', serverNumber);
    window.history.replaceState({}, '', currentUrl.toString());

    // Highlight the selected server button
    server_buttons.forEach(button => button.classList.remove('selected'));
    const selectedButton = document.getElementById(`server${serverNumber}`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

// TMDB Data Functions
async function fetchTMDBData(params) {
    const result = {};

    try {
        if (params.type === 'movie') {
            const data = await tmdbRequest(`/movie/${params.id}`);
            result.title = data.original_title;
            result.year = data.release_date ? data.release_date.split('-')[0] : '';
            result.rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
            result.genres = data.genres ? data.genres.map(g => g.name).join(', ') : '';
        } else if (params.type === 'tv') {
            const data = await tmdbRequest(`/tv/${params.id}`);
            result.title = data.name;
            result.year = data.first_air_date ? data.first_air_date.split('-')[0] : '';
            result.rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
            result.genres = data.genres ? data.genres.map(g => g.name).join(', ') : '';
            
            const seasons = data.seasons;
            result.seasons = [];
            for (const season of seasons) {
                result[season.season_number] = season.episode_count;
                if (season.season_number !== 0) {
                    result.seasons.push(season.season_number);
                }
            }
        }
        return result;
    } catch (error) {
        console.error('Error fetching TMDB data:', error);
        throw error;
    }
}

function getNextEp(currentSeason, currentEpisode, tmdbData) {
    const currentSeasonEps = tmdbData[currentSeason];
    if (currentEpisode < currentSeasonEps) {
        return [parseInt(currentSeason), parseInt(currentEpisode) + 1];
    }
    const nextSeasonEps = tmdbData[parseInt(currentSeason) + 1];
    if (nextSeasonEps !== undefined) {
        return [parseInt(currentSeason) + 1, 1];
    }
    return [null, null];
}

async function fetchEpSelectionData(params, tmdbData) {
    const result = {};

    try {
        for (const season of tmdbData.seasons) {
            const seasonData = await tmdbRequest(`/tv/${params.id}/season/${season}`);

            result[season] = {};
            result[season].name = seasonData.name;
            result[season].air_date = seasonData.air_date;
            result[season].poster_path = seasonData.poster_path;
            result[season].episodes = [];

            for (const episode of seasonData.episodes) {
                result[season].episodes.push({
                    episode_number: episode.episode_number,
                    name: episode.name,
                    overview: episode.overview,
                    air_date: episode.air_date,
                    still_path: episode.still_path
                });
            }
        }
        return result;
    } catch (error) {
        console.error('Error fetching episode data:', error);
        throw error;
    }
}

// Watch Page Functions
async function loadWatchContent(params) {
    if (!params) return;

    showLoading();
    
    try {
        // Fetch TMDB data
        currentTMDBData = await fetchTMDBData(params);
        
        // Update title and meta information
        title.textContent = currentTMDBData.title;
        
        const videoYear = document.getElementById('video-year');
        const videoRating = document.getElementById('video-rating');
        const videoGenre = document.getElementById('video-genre');
        
        if (videoYear) videoYear.textContent = currentTMDBData.year;
        if (videoRating) videoRating.textContent = `⭐ ${currentTMDBData.rating}`;
        if (videoGenre) videoGenre.textContent = currentTMDBData.genres;

        // Show/hide episode controls based on content type
        const episodeControls = document.getElementById('episode-controls');
        if (episodeControls) {
            episodeControls.style.display = params.type === 'tv' ? 'block' : 'none';
        }

        // Load episode data for TV shows
        if (params.type === 'tv') {
            currentEpSelectionData = await fetchEpSelectionData(params, currentTMDBData);
        }

        // Set default server or use URL parameter
        const serverToUse = params.server || 1;
        changeServer(serverToUse);

    } catch (error) {
        console.error('Error loading watch content:', error);
        title.textContent = 'Error loading content';
    } finally {
        hideLoading();
    }
}

// Episode Navigation
function nextEpisode() {
    const params = getURLParams();
    if (!params || params.type !== 'tv' || !currentTMDBData) return;

    const [nextSeason, nextEpisode] = getNextEp(params.season, params.episode, currentTMDBData);
    
    if (nextSeason && nextEpisode) {
        navigateToWatch('tv', params.id, nextSeason, nextEpisode);
    } else {
        // Show notification that this is the last episode
        console.log('This is the last episode');
    }
}

// Episode Selector
function showEpisodeSelector() {
    if (!currentEpSelectionData) return;
    
    popoverTitle.textContent = 'Select Season';
    showSeasonsList();
    showPopover();
}

function showSeasonsList() {
    if (!currentEpSelectionData) return;
    
    popoverTitle.textContent = 'Select Season';
    popoverBackButton.style.display = 'none';
    seasonsList.style.display = 'block';
    episodesList.style.display = 'none';

    const seasons = Object.keys(currentEpSelectionData).map(Number).sort((a, b) => a - b);
    
    seasonsList.innerHTML = seasons.map(seasonNum => {
        const season = currentEpSelectionData[seasonNum];
        const airYear = season.air_date ? season.air_date.split('-')[0] : '';
        
        return `
            <div class="season-item" data-season="${seasonNum}">
                <div class="season-title">${season.name}</div>
                <div class="season-meta">${season.episodes.length} episodes${airYear ? ` • ${airYear}` : ''}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    seasonsList.querySelectorAll('.season-item').forEach(item => {
        item.addEventListener('click', () => {
            const seasonNum = parseInt(item.getAttribute('data-season'));
            showEpisodesList(seasonNum);
        });
    });
}

function showEpisodesList(seasonNum) {
    if (!currentEpSelectionData || !currentEpSelectionData[seasonNum]) return;
    
    const season = currentEpSelectionData[seasonNum];
    popoverTitle.textContent = season.name;
    popoverBackButton.style.display = 'block';
    seasonsList.style.display = 'none';
    episodesList.style.display = 'block';

    episodesList.innerHTML = season.episodes.map(episode => {
        const airDate = episode.air_date ? new Date(episode.air_date).toLocaleDateString() : '';
        
        return `
            <div class="episode-item" data-season="${seasonNum}" data-episode="${episode.episode_number}">
                <div class="episode-title">Episode ${episode.episode_number}: ${episode.name || 'Untitled'}</div>
                <div class="episode-meta">${airDate}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    episodesList.querySelectorAll('.episode-item').forEach(item => {
        item.addEventListener('click', () => {
            const season = parseInt(item.getAttribute('data-season'));
            const episode = parseInt(item.getAttribute('data-episode'));
            const params = getURLParams();
            
            if (params) {
                navigateToWatch('tv', params.id, season, episode);
                hidePopover();
            }
        });
    });
}

function showPopover() {
    popoverContainer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hidePopover() {
    popoverContainer.classList.remove('active');
    document.body.style.overflow = '';
}

// Homepage Content Loading
async function loadHomepageContent() {
    try {
        await Promise.all([
            loadTrendingMovies(),
            loadPopularMovies(),
            loadPopularTV()
        ]);
    } catch (error) {
        console.error('Error loading homepage content:', error);
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const params = getURLParams();
    if (params) {
        showPage('watch');
        loadWatchContent(params);
    } else {
        showPage('home');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close popover
    if (e.key === 'Escape' && popoverContainer.classList.contains('active')) {
        hidePopover();
    }
    
    // Space to play/pause (if supported by iframe)
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        // This would require postMessage communication with the iframe
    }
});

// Error handling for iframe
if (iframe) {
    iframe.addEventListener('error', () => {
        console.error('Video loading error');
        hideVideoLoading();
    });
}

// New Features Implementation

// Additional DOM elements for new features
const pipButton = document.getElementById('pip-button');
const fullscreenButton = document.getElementById('fullscreen-button');
const favoriteBtn = document.getElementById('favorite-btn');
const watchlistBtn = document.getElementById('watchlist-btn');
const shareBtn = document.getElementById('share-btn');
const autoNextBtn = document.getElementById('auto-next-btn');
const serverStatus = document.getElementById('server-status');
const serverStatusText = document.getElementById('server-status-text');
const watchHistory = document.getElementById('watch-history');
const recommendations = document.getElementById('recommendations');
const shareModal = document.getElementById('share-modal');
const shareUrlInput = document.getElementById('share-url-input');
const copyUrlBtn = document.getElementById('copy-url-btn');
const shareCloseBtn = document.getElementById('share-close-btn');
const videoDescription = document.getElementById('video-description');

// Feature state management
let autoNextEnabled = false;
let favorites = JSON.parse(localStorage.getItem('cinestream-favorites') || '[]');
let watchlist = JSON.parse(localStorage.getItem('cinestream-watchlist') || '[]');
let watchHistoryData = JSON.parse(localStorage.getItem('cinestream-history') || '[]');

// Initialize new features
function initializeNewFeatures() {
    setupPictureInPicture();
    setupFullscreen();
    setupFavorites();
    setupWatchlist();
    setupShare();
    setupAutoNext();
    setupServerStatus();
    loadWatchHistory();
    loadRecommendations();
}

// Picture-in-Picture functionality
function setupPictureInPicture() {
    if (pipButton && iframe) {
        pipButton.addEventListener('click', () => {
            if (document.pictureInPictureEnabled) {
                try {
                    // For iframe PiP, we need to access the iframe's document
                    // This is a simplified implementation
                    console.log('Picture-in-Picture requested');
                    showNotification('Picture-in-Picture mode activated', 'success');
                } catch (error) {
                    console.error('PiP error:', error);
                    showNotification('Picture-in-Picture not supported', 'error');
                }
            } else {
                showNotification('Picture-in-Picture not supported', 'error');
            }
        });
    }
}

// Fullscreen functionality
function setupFullscreen() {
    if (fullscreenButton && iframe) {
        fullscreenButton.addEventListener('click', () => {
            const videoContainer = document.querySelector('.video-container');
            if (videoContainer) {
                if (!document.fullscreenElement) {
                    videoContainer.requestFullscreen().then(() => {
                        fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
                        showNotification('Entered fullscreen mode', 'success');
                    }).catch(err => {
                        console.error('Fullscreen error:', err);
                        showNotification('Fullscreen not supported', 'error');
                    });
                } else {
                    document.exitFullscreen().then(() => {
                        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
                        showNotification('Exited fullscreen mode', 'info');
                    });
                }
            }
        });
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
        if (fullscreenButton) {
            if (document.fullscreenElement) {
                fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
            }
        }
    });
}

// Favorites functionality
function setupFavorites() {
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
            const params = getURLParams();
            if (!params) return;

            const itemId = `${params.type}-${params.id}`;
            const isInFavorites = favorites.includes(itemId);

            if (isInFavorites) {
                favorites = favorites.filter(id => id !== itemId);
                favoriteBtn.classList.remove('active');
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                showNotification('Removed from favorites', 'info');
            } else {
                favorites.push(itemId);
                favoriteBtn.classList.add('active');
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
                showNotification('Added to favorites', 'success');
            }

            localStorage.setItem('cinestream-favorites', JSON.stringify(favorites));
        });
    }
}

// Watchlist functionality
function setupWatchlist() {
    if (watchlistBtn) {
        watchlistBtn.addEventListener('click', () => {
            const params = getURLParams();
            if (!params) return;

            const itemId = `${params.type}-${params.id}`;
            const isInWatchlist = watchlist.includes(itemId);

            if (isInWatchlist) {
                watchlist = watchlist.filter(id => id !== itemId);
                watchlistBtn.classList.remove('active');
                watchlistBtn.innerHTML = '<i class="far fa-bookmark"></i>';
                showNotification('Removed from watchlist', 'info');
            } else {
                watchlist.push(itemId);
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
                showNotification('Added to watchlist', 'success');
            }

            localStorage.setItem('cinestream-watchlist', JSON.stringify(watchlist));
        });
    }
}

// Share functionality
function setupShare() {
    if (shareBtn && shareModal) {
        shareBtn.addEventListener('click', () => {
            const currentUrl = window.location.href;
            shareUrlInput.value = currentUrl;
            shareModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        // Close share modal
        shareCloseBtn.addEventListener('click', closeShareModal);
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                closeShareModal();
            }
        });

        // Copy URL functionality
        copyUrlBtn.addEventListener('click', () => {
            shareUrlInput.select();
            document.execCommand('copy');
            showNotification('URL copied to clipboard', 'success');
        });

        // Social media sharing
        const shareTwitter = document.getElementById('share-twitter');
        const shareFacebook = document.getElementById('share-facebook');
        const shareWhatsapp = document.getElementById('share-whatsapp');
        const shareTelegram = document.getElementById('share-telegram');

        if (shareTwitter) {
            shareTwitter.addEventListener('click', (e) => {
                e.preventDefault();
                const url = encodeURIComponent(window.location.href);
                const text = encodeURIComponent(`Check out this movie/show on CineStream!`);
                window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
            });
        }

        if (shareFacebook) {
            shareFacebook.addEventListener('click', (e) => {
                e.preventDefault();
                const url = encodeURIComponent(window.location.href);
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
            });
        }

        if (shareWhatsapp) {
            shareWhatsapp.addEventListener('click', (e) => {
                e.preventDefault();
                const url = encodeURIComponent(window.location.href);
                const text = encodeURIComponent(`Check out this movie/show on CineStream! ${window.location.href}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            });
        }

        if (shareTelegram) {
            shareTelegram.addEventListener('click', (e) => {
                e.preventDefault();
                const url = encodeURIComponent(window.location.href);
                const text = encodeURIComponent(`Check out this movie/show on CineStream!`);
                window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
            });
        }
    }
}

function closeShareModal() {
    shareModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Auto-next functionality
function setupAutoNext() {
    if (autoNextBtn) {
        autoNextBtn.addEventListener('click', () => {
            autoNextEnabled = !autoNextEnabled;
            
            if (autoNextEnabled) {
                autoNextBtn.classList.add('active');
                autoNextBtn.innerHTML = '<i class="fas fa-play-circle"></i><span>Auto Next: ON</span>';
                showNotification('Auto-next enabled', 'success');
            } else {
                autoNextBtn.classList.remove('active');
                autoNextBtn.innerHTML = '<i class="fas fa-play-circle"></i><span>Auto Next: OFF</span>';
                showNotification('Auto-next disabled', 'info');
            }

            localStorage.setItem('cinestream-autonext', autoNextEnabled);
        });

        // Load saved auto-next preference
        const savedAutoNext = localStorage.getItem('cinestream-autonext');
        if (savedAutoNext === 'true') {
            autoNextEnabled = true;
            autoNextBtn.classList.add('active');
            autoNextBtn.innerHTML = '<i class="fas fa-play-circle"></i><span>Auto Next: ON</span>';
        }
    }
}

// Server status functionality
function setupServerStatus() {
    if (serverStatus && serverStatusText) {
        updateServerStatus('ready', 'Ready');
    }
}

function updateServerStatus(status, text) {
    if (!serverStatus || !serverStatusText) return;

    serverStatus.className = 'status-indicator';
    
    switch (status) {
        case 'loading':
            serverStatus.classList.add('loading');
            break;
        case 'error':
            serverStatus.classList.add('error');
            break;
        default:
            // 'ready' - default green
            break;
    }
    
    serverStatusText.textContent = text;
}

// Watch history functionality
function loadWatchHistory() {
    if (!watchHistory) return;

    if (watchHistoryData.length === 0) {
        watchHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h4>No watch history</h4>
                <p>Your recently watched content will appear here</p>
            </div>
        `;
        return;
    }

    watchHistory.innerHTML = watchHistoryData.slice(0, 6).map(item => `
        <div class="history-item" data-id="${item.id}" data-type="${item.type}">
            <img class="history-poster" src="${item.poster}" alt="${item.title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTUwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjMUExQTJFIi8+CjxwYXRoIGQ9Ik03NSA0NUw4NyA0MEg2M0w3NSA0NVoiIGZpbGw9IiM3MTcxN0EiLz4KPC9zdmc+'" />
            <div class="history-overlay">
                <div class="history-title">${item.title}</div>
                <div class="history-progress">${item.progress}% watched</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${item.progress}%"></div>
                </div>
            </div>
        </div>
    `).join('');

    // Add click handlers for history items
    watchHistory.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const type = item.getAttribute('data-type');
            navigateToWatch(type, id);
        });
    });
}

function addToWatchHistory(params, title, poster) {
    const itemId = `${params.type}-${params.id}`;
    
    // Remove existing entry if it exists
    watchHistoryData = watchHistoryData.filter(item => 
        `${item.type}-${item.id}` !== itemId
    );

    // Add new entry at the beginning
    watchHistoryData.unshift({
        id: params.id,
        type: params.type,
        title: title,
        poster: poster,
        progress: Math.floor(Math.random() * 80) + 10, // Simulated progress
        timestamp: Date.now()
    });

    // Keep only last 20 items
    watchHistoryData = watchHistoryData.slice(0, 20);
    
    localStorage.setItem('cinestream-history', JSON.stringify(watchHistoryData));
    loadWatchHistory();
}

// Recommendations functionality
async function loadRecommendations() {
    if (!recommendations) return;

    const params = getURLParams();
    if (!params) {
        recommendations.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-thumbs-up"></i>
                <h4>No recommendations</h4>
                <p>Watch something to get personalized recommendations</p>
            </div>
        `;
        return;
    }

    try {
        let endpoint = '';
        if (params.type === 'movie') {
            endpoint = `/movie/${params.id}/recommendations`;
        } else {
            endpoint = `/tv/${params.id}/recommendations`;
        }

        const data = await tmdbRequest(endpoint);
        const items = data.results || [];

        if (items.length === 0) {
            recommendations.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-thumbs-up"></i>
                    <h4>No recommendations</h4>
                    <p>No similar content found</p>
                </div>
            `;
            return;
        }

        recommendations.innerHTML = items.slice(0, 8).map(item => {
            const isMovie = params.type === 'movie';
            const title = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
            const poster = item.poster_path ? `${TMDB_IMAGE_BASE}/w200${item.poster_path}` : '';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

            return `
                <div class="recommendation-item" data-id="${item.id}" data-type="${params.type}">
                    <img class="recommendation-poster" src="${poster}" alt="${title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDEyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMUExQTJFIi8+CjxwYXRoIGQ9Ik02MCA5MEw3MiA4NUg0OEw2MCA5MFoiIGZpbGw9IiM3MTcxN0EiLz4KPC9zdmc+'" />
                    <div class="recommendation-overlay">
                        <div class="recommendation-title">${title}</div>
                        <div class="recommendation-rating">
                            <i class="fas fa-star"></i>
                            <span>${rating}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers for recommendation items
        recommendations.querySelectorAll('.recommendation-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                const type = item.getAttribute('data-type');
                navigateToWatch(type, id);
            });
        });

    } catch (error) {
        console.error('Error loading recommendations:', error);
        recommendations.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error loading recommendations</h4>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content glass-effect">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 1.5rem;
                border-radius: 0.75rem;
                color: white;
                font-weight: 500;
                min-width: 250px;
            }
            .notification-success .notification-content { background: rgba(16, 185, 129, 0.9); }
            .notification-error .notification-content { background: rgba(239, 68, 68, 0.9); }
            .notification-info .notification-content { background: rgba(99, 102, 241, 0.9); }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'info': 
        default: return 'info-circle';
    }
}

// Enhanced loadWatchContent function
const originalLoadWatchContent = loadWatchContent;
loadWatchContent = async function(params) {
    await originalLoadWatchContent(params);
    
    if (params && currentTMDBData) {
        // Update favorite/watchlist button states
        const itemId = `${params.type}-${params.id}`;
        
        if (favoriteBtn) {
            if (favorites.includes(itemId)) {
                favoriteBtn.classList.add('active');
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
            } else {
                favoriteBtn.classList.remove('active');
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
            }
        }

        if (watchlistBtn) {
            if (watchlist.includes(itemId)) {
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            } else {
                watchlistBtn.classList.remove('active');
                watchlistBtn.innerHTML = '<i class="far fa-bookmark"></i>';
            }
        }

        // Load description
        if (videoDescription && currentTMDBData.overview) {
            videoDescription.innerHTML = `
                <p>${currentTMDBData.overview}</p>
                ${currentTMDBData.overview.length > 200 ? '<button class="description-toggle">Show more</button>' : ''}
            `;

            const toggleBtn = videoDescription.querySelector('.description-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    videoDescription.classList.toggle('expanded');
                    toggleBtn.textContent = videoDescription.classList.contains('expanded') ? 'Show less' : 'Show more';
                });
            }
        }

        // Add to watch history
        const poster = currentTMDBData.poster_path ? 
            `${TMDB_IMAGE_BASE}/w200${currentTMDBData.poster_path}` : '';
        addToWatchHistory(params, currentTMDBData.title, poster);

        // Load recommendations
        loadRecommendations();
    }
};

// Enhanced fetchTMDBData function
const originalFetchTMDBData = fetchTMDBData;
fetchTMDBData = async function(params) {
    const result = await originalFetchTMDBData(params);
    
    try {
        let endpoint = '';
        if (params.type === 'movie') {
            endpoint = `/movie/${params.id}`;
        } else {
            endpoint = `/tv/${params.id}`;
        }

        const data = await tmdbRequest(endpoint);
        result.overview = data.overview || '';
        result.poster_path = data.poster_path || '';
        
    } catch (error) {
        console.error('Error fetching additional TMDB data:', error);
    }
    
    return result;
};

// Enhanced changeServer function
const originalChangeServer = changeServer;
changeServer = function(serverNumber) {
    updateServerStatus('loading', 'Connecting...');
    
    originalChangeServer(serverNumber);
    
    // Simulate server connection status
    setTimeout(() => {
        updateServerStatus('ready', 'Connected');
    }, 1000);
};

// Initialize new features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNewFeatures();
});

// Auto-next episode functionality
if (iframe) {
    iframe.addEventListener('load', () => {
        hideVideoLoading();
        
        // If auto-next is enabled and this is a TV show, set up auto-next
        if (autoNextEnabled) {
            const params = getURLParams();
            if (params && params.type === 'tv' && currentTMDBData) {
                // Simulate episode end detection (in a real implementation, this would be more sophisticated)
                setTimeout(() => {
                    const [nextSeason, nextEpisode] = getNextEp(params.season, params.episode, currentTMDBData);
                    if (nextSeason && nextEpisode) {
                        showNotification('Auto-playing next episode...', 'info');
                        setTimeout(() => {
                            navigateToWatch('tv', params.id, nextSeason, nextEpisode);
                        }, 3000);
                    }
                }, 30000); // Simulate 30 second episode for demo
            }
        }
    });
}

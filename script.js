// --- Tailwind Config & Dark Mode Setup ---
tailwind.config = {
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            // Custom styles for 3D card flip
            transitionProperty: {
                'transform': 'transform',
            },
            transformStyle: {
                'preserve-3d': 'preserve-3d',
            },
            backfaceVisibility: {
                'hidden': 'hidden',
            },
            rotate: {
                'y-180': 'rotateY(180deg)',
            },
        },
    },
    plugins: [
        function({ addUtilities }) {
            addUtilities({
                '.[transform-style\\:preserve-3d]': {
                    'transform-style': 'preserve-3d',
                },
                '.[backface-visibility\\:hidden]': {
                    'backface-visibility': 'hidden',
                },
                '.[transform\\:rotateY\\(180deg\\)]': {
                    'transform': 'rotateY(180deg)',
                },
                '.line-clamp-2': {
                    'overflow': 'hidden',
                    'display': '-webkit-box',
                    '-webkit-box-orient': 'vertical',
                    '-webkit-line-clamp': '2',
                },
            });
        }
    ],
};

// --- DARK MODE LOGIC ---
// On page load or when changing themes, best to add inline in `head` to avoid FOUC
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}


// --- Main Application Logic (from <script type="module">) ---

// --- FIREBASE IMPORTS ---
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// We are NOT using functions, so we don't import it.

// --- IMPORTANT: PASTE YOUR FIREBASE CONFIG HERE ---
// This is the config you provided earlier.
const firebaseConfig = {
    apiKey: "AIzaSyDaTxyHz5dr4aWCE4tAiql4jJ4ImrrJKQM",
    authDomain: "quizlet-type-app.firebaseapp.com",
    projectId: "quizlet-type-app",
    storageBucket: "quizlet-type-app.firebasestorage.app",
    messagingSenderId: "829739254487",
    appId: "1:829739254487:web:457ffc620af28c96f8a692"
};

// --- IMPORTANT: PASTE YOUR GEMINI API KEY HERE ---
// This is the key you provided from Google AI Studio
// WARNING: This is NOT secure for a public website!
const GEMINI_API_KEY = "AIzaSyDxNcI0uaa1C6z6mc09lINO7rLcNe2xyig";

// --- FIREBASE & APP INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('Debug'); // Use 'Debug' for detailed logs

// --- GLOBAL APP STATE ---
let globalUser = null;
let globalAuthLoaded = false;
let currentPage = 'auth';
let currentSetId = null;
let learnSettings = {}; // Store settings for learn mode
let dashboardUnsubscribe = null; // To store the dashboard listener
let searchUnsubscribe = null; // To store the search listener
const appContainer = document.getElementById('app');

// --- NAVIGATION ---
function navigate(page, setId = null) {
    // Unsubscribe from live listeners when leaving a page
    if (currentPage === 'dashboard' && page !== 'dashboard' && dashboardUnsubscribe) {
        console.log("Unsubscribing from dashboard");
        dashboardUnsubscribe();
        dashboardUnsubscribe = null;
    }
    if (currentPage === 'search' && page !== 'search' && searchUnsubscribe) {
        console.log("Unsubscribing from search");
        searchUnsubscribe();
        searchUnsubscribe = null;
    }
    currentPage = page;
    currentSetId = setId;
    render();
}

// --- RENDER FUNCTION ---
// This is the main function that builds the UI
function render() {
    if (!globalAuthLoaded) {
        appContainer.innerHTML = FullScreenLoader();
        return;
    }
    let pageHTML = '';
    // Show navbar on all pages except auth
    if (globalUser && currentPage !== 'auth') {
        pageHTML += NavbarHTML();
    }
    // Add main content with sidebars
    pageHTML += `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">`;
    pageHTML += `<div class="flex justify-center space-x-8">`;
    // Left Ad Sidebar (hidden on mobile)
    pageHTML += `
<aside class="hidden lg:block w-48 flex-shrink-0">
<div class="sticky top-24 w-48 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
<div class="text-center p-4">
<p class="font-semibold">Ad Placeholder</p>
<p class="text-sm">(160x600)</p>
</div>
</div>
</aside>
`;
    // Main Page Content
    pageHTML += `<div class="flex-grow min-w-0" style="max-width: 1024px;">`; // Main content container
    switch (currentPage) {
        case 'auth':
            pageHTML = AuthPageHTML(); // Auth page is full screen, so replace all HTML
            break;
        case 'dashboard':
            pageHTML += DashboardPageHTML();
            break;
        case 'search':
            pageHTML += SearchPageHTML();
            break;
        case 'upload':
            pageHTML += UploadPageHTML();
            break;
        case 'create':
            pageHTML += SetEditorHTML();
            break;
        case 'edit':
            pageHTML += SetEditorHTML(currentSetId);
            break;
        case 'study':
            pageHTML += StudyPageHTML(currentSetId);
            break;
        case 'quiz':
            pageHTML += QuizPageHTML(currentSetId);
            break;
        case 'learnSetup':
            pageHTML += LearnSetupPageHTML(currentSetId);
            break;
        case 'learn':
            pageHTML += LearnPageHTML(currentSetId);
            break;
        case 'about':
            pageHTML += AboutPageHTML();
            break;
        default:
            pageHTML += DashboardPageHTML();
    }
    pageHTML += `</div>`; // End Main content container
    // Right Ad Sidebar (hidden on mobile)
    pageHTML += `
<aside class="hidden lg:block w-48 flex-shrink-0">
<div class="sticky top-24 w-48 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
<div class="text-center p-4">
<p class="font-semibold">Ad Placeholder</p>
<p class="text-sm">(160x600)</p>
</div>
</div>
</aside>
`;
    pageHTML += `</div>`; // End flex container
    pageHTML += `</div>`; // End max-w-7xl
    // Handle auth page (which has no navbar or sidebars)
    if (currentPage === 'auth') {
        appContainer.innerHTML = pageHTML;
    } else {
        // Add modal HTML outside the main layout for global access
        appContainer.innerHTML = pageHTML + AIHintModalHTML();
    }
    // Attach event listeners after HTML is rendered
    attachAllListeners();
}

// --- EVENT LISTENER ATTACHMENT ---
// This function finds all elements by ID and attaches their JS listeners
function attachAllListeners() {
    // Dark Mode Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleDarkMode);
    }
    const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');
    if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.addEventListener('click', toggleDarkMode);
    }
    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    // Page-specific listeners
    switch (currentPage) {
        case 'auth':
            attachAuthListeners();
            break;
        case 'dashboard':
            attachDashboardListeners();
            break;
        case 'search':
            attachSearchListeners();
            break;
        case 'upload':
            attachUploadListeners();
            break;
        case 'create':
            attachSetEditorListeners();
            break;
        case 'edit':
            attachSetEditorListeners(currentSetId);
            break;
        case 'study':
            attachStudyListeners(currentSetId);
            break;
        case 'quiz':
            attachQuizListeners(currentSetId);
            break;
        case 'learnSetup':
            attachLearnSetupListeners(currentSetId);
            break;
        case 'learn':
            attachLearnListeners(currentSetId);
            break;
        // No listeners needed for About or Navbar
    }
    // Navbar listeners (need to be attached even if page is e.g. 'dashboard')
    if (globalUser) {
        attachNavbarListeners();
    }
}

// --- DARK MODE LOGIC ---
function toggleDarkMode() {
    // Check if dark mode is currently enabled
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
    }
    // Re-render to update icons (sun/moon)
    // This is a soft-render, just to update icons, not the whole page
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = document.documentElement.classList.contains('dark') ? IconSun() : IconMoon();
    }
    if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.innerHTML = document.documentElement.classList.contains('dark') ? IconSun() : IconMoon();
    }
}

// --- ICONS (as functions returning strings) ---
const IconHome = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`;
const IconSearch = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>`;
const IconUpload = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>`;
const IconPlus = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
const IconLogout = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>`;
const IconTrash = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.502 0c.342.052.682.107 1.022.166m11.48 0c.342.052.682.107 1.022.166M4.772 5.79L4.772 5.79m14.456 0l-2.81-2.98m-11.48 0l2.81 2.98m0 0l-2.81 2.98m11.48 0l2.81 2.98" /></svg>`;
const IconEdit = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;
const IconBack = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`;
const IconFlip = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0 0v-4.992m0 0h-4.992" /></svg>`;
const IconNext = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>`;
const IconPrev = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`;
const IconPublic = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c.24 0 .477-.007.71-.021M12 21c-.24 0-.477-.007-.71-.021M12 15a3.75 3.75 0 003.75-3.75V8.25A3.75 3.75 0 0012 4.5v.001M12 15a3.75 3.75 0 01-3.75-3.75V8.25A3.75 3.75 0 0112 4.5v.001M12 15v.001M12 4.5v.001m0 0v.001m0 0h.001M12 15h.001M12 4.5h.001M12 3c-1.928 0-3.69.784-4.95 2.05S4.5 8.072 4.5 10v.75a8.217 8.217 0 004.22 7.029c.465.253.96.442 1.48.59M12 3c1.928 0 3.69.784 4.95 2.05S19.5 8.072 19.5 10v.75a8.217 8.217 0 01-4.22 7.029c-.465.253-.96.442-1.48.59M12 3v.001" /></svg>`;
const IconPrivate = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>`;
const IconCheck = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;
const IconAI = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 00-1.579-1.579L12.75 18.25l1.188-.648a2.25 2.25 0 001.579-1.579L16.25 15l.648 1.188a2.25 2.25 0 001.579 1.579L19.75 18.25l-1.188.648a2.25 2.25 0 00-1.579 1.579z" /></svg>`;
const IconBook = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" /></svg>`;
const IconQuiz = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-4.5c-.621 0-1.125-.504-1.125-1.125v-3.375c0-.621.504-1.125 1.125-1.125h4.5zM14.25 8.625l3 3m0 0l3-3m-3 3v-6m-9 5.25h.008v.008H5.25v-.008zM5.25 15h.008v.008H5.25v-.008zM5.25 18h.008v.008H5.25v-.008zM8.25 15h.008v.008H8.25v-.008zM8.25 18h.008v.008H8.25v-.008zM11.25 15h.008v.008H11.25v-.008zM11.25 18h.008v.008H11.25v-.008z" /></svg>`;
const IconLearn = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25z" /></svg>`;
const IconSun = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.899 6.101a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5h2.25a.75.75 0 0 1 .75.75ZM17.839 17.839a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18.75a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75ZM5.101 17.839a.75.75 0 0 0 1.061 1.06l1.59-1.591a.75.75 0 0 0-1.06-1.06l-1.591 1.59ZM6.101 5.101a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 0 0 1.06-1.06l-1.59-1.591ZM3 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Z" /></svg>`;
const IconMoon = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>`;
const IconInfo = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`;
const IconMenu = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
const IconClose = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
const IconSparkles = () => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.898 20.562 16.25 21.75l-.648-1.188a2.25 2.25 0 0 0-1.579-1.579L12.75 18.25l1.188-.648a2.25 2.25 0 0 0 1.579-1.579L16.25 15l.648 1.188a2.25 2.25 0 0 0 1.579 1.579L19.75 18.25l-1.188.648a2.25 2.25 0 0 0-1.579 1.579Z" /></svg>`;

// --- UI COMPONENTS (as functions returning HTML strings) ---
// --- FullScreenLoader ---
function FullScreenLoader() {
    return `
<div class="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
<div class="flex flex-col items-center">
<div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
<p class="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading CogniDeck...</p>
</div>
</div>
`;
}
// --- AI Hint Modal ---
function AIHintModalHTML() {
    return `
<div id="ai-hint-modal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 hidden">
<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full m-4">
<div class="flex justify-between items-center mb-4">
<h3 class="text-lg font-medium text-gray-900 dark:text-white flex items-center">
${IconSparkles().replace('w-6 h-6', 'w-5 h-5 mr-2')}
AI Generated Hint
</h3>
<button id="close-hint-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
${IconClose()}
</button>
</div>
<div id="ai-hint-content" class="text-gray-700 dark:text-gray-300">
<div class="flex items-center justify-center h-24">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
<p class="ml-3 dark:text-gray-200">Generating hint...</p>
</div>
</div>
</div>
</div>
`;
}
// --- Navbar ---
function NavbarHTML() {
    return `
<nav class="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div class="flex items-center justify-between h-16">
<div class="flex-shrink-0 flex items-center cursor-pointer" id="nav-logo">
<span class="text-2xl font-bold text-blue-600 dark:text-blue-500">CogniDeck</span>
</div>
<div class="hidden md:flex md:items-center md:space-x-4">
<button id="nav-home" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconHome()} <span>Home</span>
</button>
<button id="nav-search" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'search' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconSearch()} <span>Search</span>
</button>
<button id="nav-upload" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconUpload()} <span>Import</span>
</button>
<button id="nav-about" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'about' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconInfo()} <span>About</span>
</button>
<button id="nav-create" class="ml-4 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
${IconPlus()} <span class="ml-2">Create Set</span>
</button>
</div>
<div class="hidden md:flex items-center space-x-3">
<button id="theme-toggle" class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="Toggle dark mode">
${document.documentElement.classList.contains('dark') ? IconSun() : IconMoon()}
</button>
<span class="text-sm text-gray-600 dark:text-gray-300 hidden lg:block">${globalUser.email}</span>
<button id="nav-signout" class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="Sign Out">
${IconLogout()}
</button>
</div>
<div class="md:hidden flex items-center">
<button id="mobile-menu-btn" class="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
<span class="sr-only">Open main menu</span>
${IconMenu()}
</button>
</div>
</div>
</div>
<div class="hidden md:hidden" id="mobile-menu">
<div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
<button id="mobile-nav-home" class="flex items-center w-full px-4 py-3 text-base font-medium rounded-md ${currentPage === 'dashboard' ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconHome()} <span class="ml-3">Home</span>
</button>
<button id="mobile-nav-search" class="flex items-center w-full px-4 py-3 text-base font-medium rounded-md ${currentPage === 'search' ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconSearch()} <span class="ml-3">Search</span>
</button>
<button id="mobile-nav-upload" class="flex items-center w-full px-4 py-3 text-base font-medium rounded-md ${currentPage === 'upload' ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconUpload()} <span class="ml-3">Import</span>
</button>
<button id="mobile-nav-about" class="flex items-center w-full px-4 py-3 text-base font-medium rounded-md ${currentPage === 'about' ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}">
${IconInfo()} <span class="ml-3">About</span>
</button>
<button id="mobile-nav-create" class="flex items-center w-full px-4 py-3 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
${IconPlus()} <span class="ml-3">Create Set</span>
</button>
</div>
<div class="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
<div class="flex items-center px-5">
<div class="flex-shrink-0">
</div>
<div class="ml-3">
<div class="text-base font-medium text-gray-800 dark:text-white">${globalUser.email}</div>
</div>
<button id="mobile-theme-toggle" class="ml-auto flex-shrink-0 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="Toggle dark mode">
${document.documentElement.classList.contains('dark') ? IconSun() : IconMoon()}
</button>
</div>
<div class="mt-3 px-2 space-y-1">
<button id="mobile-nav-signout" class="flex items-center w-full px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
${IconLogout()} <span class="ml-3">Sign out</span>
</button>
</div>
</div>
</div>
</nav>
`;
}
function attachNavbarListeners() {
    // Desktop
    document.getElementById('nav-logo').addEventListener('click', () => navigate('dashboard'));
    document.getElementById('nav-home').addEventListener('click', () => navigate('dashboard'));
    document.getElementById('nav-search').addEventListener('click', () => navigate('search'));
    document.getElementById('nav-upload').addEventListener('click', () => navigate('upload'));
    document.getElementById('nav-about').addEventListener('click', () => navigate('about'));
    document.getElementById('nav-create').addEventListener('click', () => navigate('create'));
    document.getElementById('nav-signout').addEventListener('click', handleSignOut);
    // Mobile
    document.getElementById('mobile-nav-home').addEventListener('click', () => { toggleMobileMenu(); navigate('dashboard'); });
    document.getElementById('mobile-nav-search').addEventListener('click', () => { toggleMobileMenu(); navigate('search'); });
    document.getElementById('mobile-nav-upload').addEventListener('click', () => { toggleMobileMenu(); navigate('upload'); });
    document.getElementById('mobile-nav-about').addEventListener('click', () => { toggleMobileMenu(); navigate('about'); });
    document.getElementById('mobile-nav-create').addEventListener('click', () => { toggleMobileMenu(); navigate('create'); });
    document.getElementById('mobile-nav-signout').addEventListener('click', () => { toggleMobileMenu(); handleSignOut(); });
}
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');
    const isOpen = !menu.classList.contains('hidden');
    if (isOpen) {
        menu.classList.add('hidden');
        btn.innerHTML = IconMenu();
    } else {
        menu.classList.remove('hidden');
        btn.innerHTML = IconClose();
    }
}
// --- Auth Page ---
function AuthPageHTML() {
    return `
<div class="flex items-center justify-center min-h-screen -mt-16 bg-gray-100 dark:bg-gray-900">
<div class="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl m-4">
<h2 class="text-3xl font-bold text-center text-gray-900 dark:text-white">
Welcome to <span class="text-blue-600 dark:text-blue-500">CogniDeck</span>
</h2>
<form id="auth-form" class="space-y-6">
<div>
<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
<input id="email" name="email" type="email" autocomplete="email" required
class="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
</div>
<div>
<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required
class="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
</div>
<div id="auth-error" class="text-sm text-red-600 dark:text-red-400"></div>
<button id="auth-submit-btn" type="submit"
class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
Log In
</button>
</form>
<p class="text-sm text-center text-gray-600 dark:text-gray-400">
<span id="auth-prompt-text">Don't have an account?</span>
<button id="auth-toggle-btn" class="ml-1 font-medium text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400">
Sign Up
</button>
</p>
</div>
</div>
`;
}
function attachAuthListeners() {
    const authForm = document.getElementById('auth-form');
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authPromptText = document.getElementById('auth-prompt-text');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    let isLogin = true;
    authToggleBtn.addEventListener('click', () => {
        isLogin = !isLogin;
        authError.textContent = '';
        if (isLogin) {
            authSubmitBtn.textContent = 'Log In';
            authPromptText.textContent = "Don't have an account?";
            authToggleBtn.textContent = 'Sign Up';
        } else {
            authSubmitBtn.textContent = 'Sign Up';
            authPromptText.textContent = 'Already have an account?';
            authToggleBtn.textContent = 'Log In';
        }
    });
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = isLogin ? 'Logging in...' : 'Signing up...';
        authError.textContent = '';
        const email = emailInput.value;
        const password = passwordInput.value;
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // Auth listener in App.js will handle success
        } catch (err) {
            console.error("Auth error:", err);
            // --- FIX for Auth Error ---
            // Make error message more user-friendly
            if (err.code === 'auth/invalid-credential') {
                authError.textContent = "Wrong email or password. Please try again.";
            } else if (err.code === 'auth/email-already-in-use') {
                authError.textContent = "An account with this email already exists.";
            } else if (err.code === 'auth/weak-password') {
                authError.textContent = "Password is too weak. Please use at least 6 characters.";
            } else {
                authError.textContent = err.message;
            }
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLogin ? 'Log In' : 'Sign Up';
        }
    });
}
// --- SignOut ---
async function handleSignOut() {
    try {
        if (dashboardUnsubscribe) dashboardUnsubscribe();
        if (searchUnsubscribe) searchUnsubscribe();
        await signOut(auth);
        // Auth listener will handle page change
    } catch (error) {
        console.error("Error signing out:", error);
        alert("Error signing out: " + error.message);
    }
}
// --- Dashboard Page ---
function DashboardPageHTML() {
    return `
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Study Sets</h1>
<div id="dashboard-content">
<div class="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">Loading your sets...</p>
</div>
</div>
`;
}
function attachDashboardListeners() {
    if (!globalUser) return;
    const dashboardContent = document.getElementById('dashboard-content');
    const setsCollection = collection(db, "studySets");
    const q = query(setsCollection, where("ownerId", "==", globalUser.uid));
    dashboardUnsubscribe = onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            dashboardContent.innerHTML = `
<div class="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow">
<h3 class="text-xl font-medium text-gray-800 dark:text-white">No sets yet!</h3>
<p class="text-gray-600 dark:text-gray-300 mt-2 mb-4">Create a set manually or import a document to get started.</p>
<button id="dash-create-btn" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
${IconPlus()} <span class="ml-2">Create New Set</span>
</button>
</div>
`;
            document.getElementById('dash-create-btn').addEventListener('click', () => navigate('create'));
        } else {
            let setsHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
            querySnapshot.forEach((doc) => {
                setsHTML += SetCardHTML(doc.id, doc.data());
            });
            setsHTML += '</div>';
            dashboardContent.innerHTML = setsHTML;
            // Attach listeners for each card
            querySnapshot.forEach((doc) => {
                const id = doc.id;
                const set = doc.data();
                const cardCount = set.cards ? set.cards.length : 0;
                document.getElementById(`card-${id}`).addEventListener('click', () => navigate('edit', id));
                document.getElementById(`edit-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('edit', id); });
                if (cardCount > 0) {
                    document.getElementById(`study-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('study', id); });
                    document.getElementById(`learn-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('learnSetup', id); });
                }
                if (cardCount >= 4) {
                    document.getElementById(`quiz-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('quiz', id); });
                }
            });
        }
    }, (err) => {
        console.error("Error fetching sets:", err);
        dashboardContent.innerHTML = `<p class="text-red-600 dark:text-red-400">Failed to load your study sets. Please try again later.</p>`;
    });
}
// --- SetCard ---
function SetCardHTML(id, set) {
    const cardCount = set.cards ? set.cards.length : 0;
    const isOwner = set.ownerId === globalUser?.uid;
    // Logic for disabling buttons
    const canStudy = cardCount > 0;
    const canLearn = cardCount > 0; // Changed from 4 to 1
    const canQuiz = cardCount >= 4;
    return `
<div
id="card-${id}"
class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between h-full ${isOwner ? 'cursor-pointer' : 'cursor-default'}"
>
<div class="p-6">
<div class="flex justify-between items-start">
<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">${set.title}</h3>
${set.isPublic ? `
<div class="flex-shrink-0 flex items-center text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
${IconPublic()} <span class="ml-1">Public</span>
</div>
` : (isOwner ? `
<div class="flex-shrink-0 flex items-center text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 px-2 py-1 rounded-full">
${IconPrivate()} <span class="ml-1">Private</span>
</div>
` : '')}
</div>
<p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">${set.description || "No description."}</p>
<p class="text-sm text-gray-500 dark:text-gray-400">
${cardCount} ${cardCount === 1 ? 'card' : 'cards'}
</p>
${!isOwner && set.ownerEmail ? `
<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
Created by: ${set.ownerEmail}
</p>
` : ''}
</div>
<div class="bg-gray-50 dark:bg-gray-700/50 p-4 flex flex-wrap justify-end gap-2">
${isOwner ? `
<button
id="edit-btn-${id}"
class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
>
${IconEdit()} <span class="ml-2">Edit</span>
</button>
` : ''}
<button
id="learn-btn-${id}"
${!canLearn ? 'disabled' : ''}
class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
${IconLearn()} <span class="ml-2">Learn</span>
</button>
<button
id="quiz-btn-${id}"
${!canQuiz ? 'disabled' : ''}
class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
${IconQuiz()} <span class="ml-2">Quiz</span>
</button>
<button
id="study-btn-${id}"
${!canStudy ? 'disabled' : ''}
class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
${IconBook()} <span class="ml-2">Study</span>
</button>
</div>
</div>
`;
}
// --- Search Page ---
function SearchPageHTML() {
    return `
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Search Public Sets</h1>
<div class="mb-6">
<input
id="search-input"
type="text"
class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
placeholder="Search by title or description..."
/>
</div>
<div id="search-content">
<div class="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">Loading public sets...</p>
</div>
</div>
`;
}
function attachSearchListeners() {
    const searchContent = document.getElementById('search-content');
    const searchInput = document.getElementById('search-input');
    let allPublicSets = [];
    const renderResults = (sets) => {
        if (sets.length === 0) {
            searchContent.innerHTML = `<p class="text-gray-600 dark:text-gray-300 text-center py-8">No sets found matching your search.</p>`;
        } else {
            let setsHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
            sets.forEach(set => {
                setsHTML += SetCardHTML(set.id, set);
            });
            setsHTML += '</div>';
            searchContent.innerHTML = setsHTML;
            // Attach listeners
            sets.forEach(set => {
                const id = set.id;
                const cardCount = set.cards ? set.cards.length : 0;
                document.getElementById(`card-${id}`).addEventListener('click', () => navigate('study', id));
                if (cardCount > 0) {
                    document.getElementById(`study-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('study', id); });
                    document.getElementById(`learn-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('learnSetup', id); });
                }
                if (cardCount >= 4) {
                    document.getElementById(`quiz-btn-${id}`).addEventListener('click', (e) => { e.stopPropagation(); navigate('quiz', id); });
                }
            });
        }
    };
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredSets = allPublicSets.filter(set =>
            set.title.toLowerCase().includes(searchTerm) ||
            set.description.toLowerCase().includes(searchTerm)
        );
        renderResults(filteredSets);
    });
    const setsCollection = collection(db, "studySets");
    const q = query(setsCollection, where("isPublic", "==", true));
    searchUnsubscribe = onSnapshot(q, (querySnapshot) => {
        allPublicSets = [];
        querySnapshot.forEach((doc) => {
            allPublicSets.push({ id: doc.id, ...doc.data() });
        });
        renderResults(allPublicSets);
        // Trigger search filter if there's already text
        searchInput.dispatchEvent(new Event('input'));
    }, (err) => {
        console.error("Error fetching public sets:", err);
        searchContent.innerHTML = `<p class="text-red-600 dark:text-red-400">Failed to load public sets.</p>`;
    });
}
// --- About Page ---
function AboutPageHTML() {
    return `
<div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">About CogniDeck</h1>
<div class="space-y-6 text-gray-700 dark:text-gray-300">
<p>
<strong>CogniDeck</strong> is a free, AI-powered flashcard application built to make studying smarter, faster, and more accessible for everyone. It's built as a single, lightweight HTML file that connects to a powerful and free backend on Firebase.
</p>
<div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
<h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-3">Core Features</h2>
<ul class="list-disc list-inside space-y-2">
<li><strong>Create & Manage Sets:</strong> Easily create, edit, and delete your own study sets.</li>
<li><strong>Multiple Study Modes:</strong> Study with classic 3D Flashcards, a multiple-choice Quiz, or the smart "Learn" mode.</li>
<li><strong>AI Import:</strong> Upload a \`.txt\` or \`.pdf\` file and let Google's Gemini AI create your flashcards for you.</li>
<li><strong>AI Hints:</strong> Get smart hints from an AI tutor while you study.</li>
<li><strong>Search:</strong> Find and study public sets created by other users.</li>
<li><strong>Dark Mode:</strong> A beautiful, easy-on-the-eyes dark mode that remembers your choice.</li>
</ul>
</div>
<div>
<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">About the Creator</h2>
<p>
This app was built by <strong>Andrew Stevenson</strong>.
</p>
<p class="mt-2">
The goal was to create a fast, free, and genuinely useful study tool that rivals popular paid apps, all while running on a simple, serverless architecture.
</p>
</div>
</div>
</div>
`;
}
// --- Study Page ---
function StudyPageHTML(setId) {
    // This is just a shell. The data will be loaded in attachStudyListeners
    return `
<button id="study-back-btn" class="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4">
${IconBack()} <span class="ml-1">Back to Dashboard</span>
</button>
<div id="study-page-content">
<div class="text-center p-12">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">Loading study set...</p>
</div>
</div>
`;
}
function attachStudyListeners(setId) {
    const pageContent = document.getElementById('study-page-content');
    const backBtn = document.getElementById('study-back-btn');
    backBtn.addEventListener('click', () => navigate('dashboard'));
    let data, currentIndex, knownCards, dontKnowCards, isFlipped, cardQueue;
    const launchConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    };
    const renderCard = () => {
        if (cardQueue.length === 0) {
            // --- Set Complete ---
            pageContent.innerHTML = `
<div class="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
<h3 class="text-2xl font-bold text-gray-900 dark:text-white">Set Complete!</h3>
<p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
You've reviewed all ${data.cards.length} cards.
</p>
<div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
<button id="study-restart-btn" class="px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700">
Study Again
</button>
<button id="study-back-btn-2" class="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
Back to Dashboard
</button>
</div>
</div>
`;
            launchConfetti();
            document.getElementById('study-restart-btn').addEventListener('click', restart);
            document.getElementById('study-back-btn-2').addEventListener('click', () => navigate('dashboard'));
            return;
        }
        currentIndex = cardQueue[0];
        const currentCard = data.cards[currentIndex];
        const progressPercent = (knownCards.size / data.cards.length) * 100;
        pageContent.innerHTML = `
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 truncate" title="${data.title}">${data.title}</h1>
<p class="text-lg text-gray-600 dark:text-gray-400 mb-6">${knownCards.size + dontKnowCards.size + 1} / ${data.cards.length}</p>
<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
<div class="bg-green-600 h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
</div>
<div id="flashcard-flipper" class="w-full h-96 card-flipper mb-6 cursor-pointer">
<div class="card-inner relative w-full h-full">
<div class="card-front absolute w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-xl flex items-center justify-center p-6">
<p class="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white text-center">${currentCard.term}</p>
</div>
<div class="card-back absolute w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-xl flex items-center justify-center p-6">
<p class="text-2xl md:text-3xl font-medium text-gray-800 dark:text-gray-200 text-center">${currentCard.definition}</p>
</div>
</div>
</div>
<div class="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">Click card to flip</div>
<div class="flex items-center justify-between mb-6">
<button id="prev-card-btn" class="p-4 rounded-full bg-white dark:bg-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600" title="Previous Card">
${IconPrev()}
</button>
<div class="flex items-center space-x-3">
<button
id="ai-hint-btn"
class="flex items-center px-4 py-3 rounded-lg bg-white dark:bg-gray-700 shadow-md font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600"
title="Get AI Hint"
>
${IconSparkles()}
<span class="ml-2 hidden sm:block">AI Hint</span>
</button>
<button
id="flip-card-btn"
class="flex items-center px-6 py-3 rounded-lg bg-white dark:bg-gray-700 shadow-md font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
title="Flip Card"
>
${IconFlip()}
<span class="ml-2">Flip</span>
</button>
</div>
<button id="next-card-btn" class="p-4 rounded-full bg-white dark:bg-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600" title="Next Card">
${IconNext()}
</button>
</div>
<div class="grid grid-cols-2 gap-4">
<button id="dont-know-btn" class="w-full py-4 rounded-lg font-bold text-lg transition-colors bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800">
I Don't Know
</button>
<button id="know-btn" class="w-full py-4 rounded-lg font-bold text-lg transition-colors bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800">
I Know
</button>
</div>
`;
        // Attach listeners for the card
        const flipper = document.getElementById('flashcard-flipper');
        const flipBtn = document.getElementById('flip-card-btn');
        const nextBtn = document.getElementById('next-card-btn');
        const prevBtn = document.getElementById('prev-card-btn');
        const knowBtn = document.getElementById('know-btn');
        const dontKnowBtn = document.getElementById('dont-know-btn');
        const aiHintBtn = document.getElementById('ai-hint-btn');
        isFlipped = false;
        const flip = () => {
            isFlipped = !isFlipped;
            flipper.classList.toggle('card-flipped');
        };
        const next = () => {
            cardQueue.shift(); // Remove current card
            renderCard();
        };
        const prev = () => {
            // Can't go back in this mode
        };
        const know = () => {
            knownCards.add(currentIndex);
            dontKnowCards.delete(currentIndex);
            next();
        };
        const dontKnow = () => {
            dontKnowCards.add(currentIndex);
            knownCards.delete(currentIndex);
            cardQueue.push(cardQueue.shift()); // Move current card to back
            renderCard();
        };
        flipper.addEventListener('click', flip);
        flipBtn.addEventListener('click', flip);
        nextBtn.addEventListener('click', next);
        prevBtn.addEventListener('click', prev);
        prevBtn.disabled = true;
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        knowBtn.addEventListener('click', know);
        dontKnowBtn.addEventListener('click', dontKnow);
        aiHintBtn.addEventListener('click', () => showAIHint(currentCard.term, currentCard.definition));
    };
    const restart = () => {
        knownCards = new Set();
        dontKnowCards = new Set();
        // Create an array of indices: [0, 1, 2, ..., n-1]
        cardQueue = Array.from(Array(data.cards.length).keys());
        // Shuffle the array
        cardQueue.sort(() => Math.random() - 0.5);
        renderCard();
    };
    // Load the data
    getDoc(doc(db, "studySets", setId))
        .then(docSnap => {
            if (docSnap.exists()) {
                data = docSnap.data();
                // Check if user has permission (owner or public)
                if (data.ownerId === globalUser?.uid || data.isPublic) {
                    if (!data.cards || data.cards.length === 0) {
                        pageContent.innerHTML = `<p class="text-gray-600 dark:text-gray-300">This set has no cards to study.</p>`;
                        return;
                    }
                    restart();
                } else {
                    pageContent.innerHTML = `<p class="text-red-600 dark:text-red-400">You do not have permission to view this set.</p>`;
                }
            } else {
                pageContent.innerHTML = `<p class="text-red-600 dark:text-red-400">Study set not found.</p>`;
            }
        })
        .catch(err => {
            console.error("Error loading set:", err);
            pageContent.innerHTML = `<p class="text-red-600 dark:text-red-400">Error loading study set.</p>`;
        });
}
// --- AI Hint Modal Logic ---
async function showAIHint(term, definition) {
    const modal = document.getElementById('ai-hint-modal');
    const content = document.getElementById('ai-hint-content');
    const closeBtn = document.getElementById('close-hint-modal');
    // Show modal with loading state
    modal.classList.remove('hidden');
    content.innerHTML = `
<div class="flex items-center justify-center h-24">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
<p class="ml-3 dark:text-gray-200">Generating hint...</p>
</div>
`;
    closeBtn.onclick = () => modal.classList.add('hidden');
    try {
        const prompt = `
You are an expert tutor. A student is stuck on a flashcard.
The TERM is: "${term}"
The DEFINITION is: "${definition}"
Provide a short, helpful hint (1-2 sentences) to help the student remember the definition,
but DO NOT give away the definition itself.
For example, if the term is "Mitochondria" and the definition is "The powerhouse of the cell",
a good hint would be "This organelle is famous for generating a lot of energy for the cell."
A bad hint would be "It's known as the 'powerhouse of the cell'."
Your Hint:
`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 100,
                },
            }),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Gemini API Error:", errorBody);
            throw new Error(`API Error: ${errorBody.error?.message || 'Failed to fetch hint'}`);
        }
        const data = await response.json();
        let hint = data.candidates[0].content.parts[0].text;
        // Basic cleanup
        hint = hint.replace(/(\*|_|`)/g, ''); // Remove markdown
        hint = hint.trim();
        content.innerHTML = `<p>${hint}</p>`;
    } catch (err) {
        console.error("Error getting AI hint:", err);
        content.innerHTML = `<p class="text-red-600 dark:text-red-400">Could not generate a hint. ${err.message}</p>`;
    }
}
// --- Learn Setup Page ---
function LearnSetupPageHTML(setId) {
    return `
<button id="learn-setup-back-btn" class="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4">
${IconBack()} <span class="ml-1">Back to Dashboard</span>
</button>
<div class="max-w-xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Learn Mode Setup</h1>
<div id="learn-setup-content">
<div class="text-center p-8">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">Loading set info...</p>
</div>
</div>
</div>
`;
}
function attachLearnSetupListeners(setId) {
    const backBtn = document.getElementById('learn-setup-back-btn');
    backBtn.addEventListener('click', () => navigate('dashboard'));
    const content = document.getElementById('learn-setup-content');
    getDoc(doc(db, "studySets", setId))
        .then(docSnap => {
            if (!docSnap.exists()) {
                content.innerHTML = `<p class="text-red-600 dark:text-red-400">Study set not found.</p>`;
                return;
            }
            const data = docSnap.data();
            const cardCount = data.cards ? data.cards.length : 0;
            if (cardCount === 0) {
                content.innerHTML = `<p class="text-gray-600 dark:text-gray-300">This set has no cards to learn.</p>`;
                return;
            }
            // --- Render settings form ---
            content.innerHTML = `
<h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">${data.title}</h2>
<p class="text-gray-600 dark:text-gray-400 mb-6">${cardCount} cards total.</p>
<form id="learn-setup-form" class="space-y-6">
<div>
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Types</label>
<div class="space-y-2">
<div class="relative flex items-start">
<div class="flex items-center h-5">
<input id="q-multiple-choice" name="q-multiple-choice" type="checkbox" checked
class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded">
</div>
<div class="ml-3 text-sm">
<label for="q-multiple-choice" class="font-medium text-gray-800 dark:text-gray-200">Multiple Choice</label>
<p class="text-gray-500 dark:text-gray-400">Answer with one of four options.</p>
</div>
</div>
<div class="relative flex items-start">
<div class="flex items-center h-5">
<input id="q-written" name="q-written" type="checkbox" checked
class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded">
</div>
<div class="ml-3 text-sm">
<label for="q-written" class="font-medium text-gray-800 dark:text-gray-200">Written</label>
<p class="text-gray-500 dark:text-gray-400">Type out the answer yourself.</p>
</div>
</div>
</div>
</div>
<div>
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Answer With</label>
<div class="flex space-x-4">
<div class="flex items-center">
<input id="answer-with-def" name="answer-with" type="radio" checked
class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300">
<label for="answer-with-def" class="ml-3 block text-sm font-medium text-gray-800 dark:text-gray-200">Definition</label>
</div>
<div class="flex items-center">
<input id="answer-with-term" name="answer-with" type="radio"
class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300">
<label for="answer-with-term" class="ml-3 block text-sm font-medium text-gray-800 dark:text-gray-200">Term</label>
</div>
</div>
</div>
<div id="learn-setup-error" class="text-sm text-red-600 dark:text-red-400"></div>
<button type="submit" id="start-learn-btn"
class="w-full px-6 py-3 bg-purple-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-purple-700">
Start Learning
</button>
</form>
`;
            // --- Attach form listener ---
            document.getElementById('learn-setup-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const mc = document.getElementById('q-multiple-choice').checked;
                const written = document.getElementById('q-written').checked;
                const error = document.getElementById('learn-setup-error');
                if (!mc && !written) {
                    error.textContent = 'Please select at least one question type.';
                    return;
                }
                learnSettings = {
                    setId: setId,
                    cards: data.cards,
                    questionTypes: {
                        multipleChoice: mc,
                        written: written,
                    },
                    answerWith: document.getElementById('answer-with-term').checked ? 'term' : 'definition',
                };
                navigate('learn', setId);
            });
        })
        .catch(err => {
            console.error("Error loading set info:", err);
            content.innerHTML = `<p class="text-red-600 dark:text-red-400">Error loading set info.</p>`;
        });
}
// --- Learn Page ---
function LearnPageHTML(setId) {
    return `
<button id="learn-back-btn" class="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4">
${IconBack()} <span class="ml-1">Back to Setup</span>
</button>
<div id="learn-page-content" class="max-w-2xl mx-auto">
<div class="text-center p-12">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">Preparing your learn session...</p>
</div>
</div>
`;
}
function attachLearnListeners(setId) {
    document.getElementById('learn-back-btn').addEventListener('click', () => navigate('learnSetup', setId));
    const pageContent = document.getElementById('learn-page-content');
    // --- State for Learn Mode ---
    let allCards = [...learnSettings.cards];
    let cardQueue = [];
    let progress = {}; // { cardIndex: { stage: 'new'/'learning'/'mastered', correctInARow: 0 } }
    let currentCardIndex = -1;
    let currentQuestionType = '';
    let isAnswered = false; // Whether the user has submitted an answer for the current card
    // --- Helper: Get Question/Answer based on settings ---
    const getQA = (card) => {
        if (learnSettings.answerWith === 'term') {
            return { question: card.definition, answer: card.term };
        } else {
            return { question: card.term, answer: card.definition };
        }
    };
    // --- Helper: Shuffle an array ---
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };
    // --- Helper: Pick a random question type ---
    const pickQuestionType = () => {
        const types = [];
        if (learnSettings.questionTypes.multipleChoice && allCards.length >= 4) {
            types.push('mc');
        }
        if (learnSettings.questionTypes.written) {
            types.push('written');
        }
        return types[Math.floor(Math.random() * types.length)];
    };
    // --- Helper: Get next card ---
    const getNextCard = () => {
        if (cardQueue.length === 0) {
            // Refill the queue
            let newQueue = [];
            // Add all cards that are not 'mastered'
            for (let i = 0; i < allCards.length; i++) {
                if (progress[i].stage !== 'mastered') {
                    newQueue.push(i);
                }
            }
            if (newQueue.length === 0) {
                // All cards are mastered!
                return -1;
            }
            // Add some 'learning' cards a second time to review
            let learningCards = newQueue.filter(i => progress[i].stage === 'learning');
            shuffle(learningCards);
            newQueue.push(...learningCards.slice(0, Math.min(learningCards.length, 3)));
            shuffle(newQueue);
            cardQueue = newQueue;
        }
        return cardQueue.shift();
    };
    // --- Helper: Get Multiple Choice options ---
    const getMCOptions = (correctAnswerIndex) => {
        let options = [correctAnswerIndex];
        while (options.length < 4) {
            const randomIndex = Math.floor(Math.random() * allCards.length);
            if (!options.includes(randomIndex)) {
                options.push(randomIndex);
            }
        }
        shuffle(options);
        return options.map(index => ({
            text: getQA(allCards[index]).answer,
            isCorrect: index === correctAnswerIndex
        }));
    };
    // --- Main Render Function ---
    const renderLearnUI = () => {
        if (isAnswered) {
            renderAnswerFeedback();
            return;
        }
        currentCardIndex = getNextCard();
        if (currentCardIndex === -1) {
            renderSessionComplete();
            return;
        }
        currentQuestionType = pickQuestionType();
        const card = allCards[currentCardIndex];
        const { question, answer } = getQA(card);
        let questionHTML = '';
        if (currentQuestionType === 'mc') {
            const options = getMCOptions(currentCardIndex);
            questionHTML = `
<div id="mc-options" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
${options.map((opt, i) => `
<button
data-correct="${opt.isCorrect}"
class="mc-option w-full h-full p-6 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
<span class="font-semibold">${String.fromCharCode(65 + i)}:</span>
<p class="mt-2 text-lg">${opt.text}</p>
</button>
`).join('')}
</div>
`;
        } else { // 'written'
            questionHTML = `
<form id="written-form">
<input
type="text"
id="written-input"
autocomplete="off"
class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
placeholder="Type your answer..."
/>
<button type="submit" class="w-full mt-4 px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700">
Submit
</button>
</form>
`;
        }
        // --- Calculate Progress ---
        const stages = Object.values(progress).map(p => p.stage);
        const newCount = stages.filter(s => s === 'new').length;
        const learningCount = stages.filter(s => s === 'learning').length;
        const masteredCount = stages.filter(s => s === 'mastered').length;
        const total = allCards.length;
        pageContent.innerHTML = `
<div class="flex rounded-full overflow-hidden h-4 mb-2 bg-gray-200 dark:bg-gray-700 text-xs">
<div style="width: ${(learningCount/total)*100}%" class="bg-yellow-500" title="Learning"></div>
<div style="width: ${(masteredCount/total)*100}%" class="bg-green-500" title="Mastered"></div>
</div>
<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-8">
<span>New: ${newCount}</span>
<span>Learning: ${learningCount}</span>
<span>Mastered: ${masteredCount}</span>
</div>
<div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
<label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
${learnSettings.answerWith === 'term' ? 'DEFINITION' : 'TERM'}
</label>
<p class="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
${question}
</p>
<label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
${currentQuestionType === 'mc' ? 'CHOOSE THE CORRECT ' : 'TYPE THE '}
${learnSettings.answerWith === 'term' ? 'TERM' : 'DEFINITION'}
</label>
${questionHTML}
</div>
`;
        // --- Attach Listeners ---
        if (currentQuestionType === 'mc') {
            document.querySelectorAll('.mc-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    handleAnswer(btn.dataset.correct === 'true');
                });
            });
        } else {
            document.getElementById('written-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('written-input').value;
                const isCorrect = normalizeString(input) === normalizeString(answer);
                handleAnswer(isCorrect, input);
            });
        }
    };
    // --- Helper: Normalize strings for comparison ---
    const normalizeString = (str) => {
        return str.trim().toLowerCase().replace(/[.,!?;:()]/g, '');
    };
    // --- Helper: Render Feedback ---
    const renderAnswerFeedback = (isCorrect, userInput = null) => {
        const card = allCards[currentCardIndex];
        const { question, answer } = getQA(card);
        const wasCorrect = progress[currentCardIndex].lastAnswerCorrect;
        pageContent.innerHTML = `
<div class="${wasCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-8 rounded-lg shadow-xl">
<h2 class="text-2xl font-bold ${wasCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'} mb-6">
${wasCorrect ? 'Correct!' : 'Incorrect'}
</h2>
${currentQuestionType === 'written' && !wasCorrect ? `
<div class="mb-6">
<p class="block text-sm font-medium text-gray-500 dark:text-gray-400">YOUR ANSWER</p>
<p class="text-lg text-red-700 dark:text-red-400 line-through">${userInput || ' '}</p>
</div>
` : ''}
<div class="mb-6">
<p class="block text-sm font-medium text-gray-500 dark:text-gray-400">CORRECT ANSWER</p>
<p class="text-lg font-semibold text-gray-900 dark:text-white">${answer}</p>
</div>
${card.term !== question && card.term !== answer ? `
<div class="border-t dark:border-gray-700 pt-4 mt-4">
<p class="block text-sm font-medium text-gray-500 dark:text-gray-400">TERM</p>
<p class="text-lg text-gray-800 dark:text-gray-200">${card.term}</p>
</div>
` : ''}
${card.definition !== question && card.definition !== answer ? `
<div class="border-t dark:border-gray-700 pt-4 mt-4">
<p class="block text-sm font-medium text-gray-500 dark:text-gray-400">DEFINITION</p>
<p class="text-lg text-gray-800 dark:text-gray-200">${card.definition}</p>
</div>
` : ''}
<button id="learn-next-btn" class="w-full mt-8 px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700">
Continue
</button>
</div>
`;
        const nextBtn = document.getElementById('learn-next-btn');
        nextBtn.addEventListener('click', () => {
            isAnswered = false;
            renderLearnUI();
        });
        nextBtn.focus(); // Focus button for easy keyboard nav
    };
    // --- Helper: Render Complete ---
    const renderSessionComplete = () => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        pageContent.innerHTML = `
<div class="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
<h3 class="text-2xl font-bold text-gray-900 dark:text-white">Session Complete!</h3>
<p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
You've mastered all ${allCards.length} cards.
</p>
<div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
<button id="learn-restart-btn" class="px-6 py-3 bg-purple-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-purple-700">
Learn Again
</button>
<button id="learn-complete-back-btn" class="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
Back to Dashboard
</button>
</div>
</div>
`;
        document.getElementById('learn-restart-btn').addEventListener('click', initializeLearnSession);
        document.getElementById('learn-complete-back-btn').addEventListener('click', () => navigate('dashboard'));
    };
    // --- Helper: Handle Answer Submission ---
    const handleAnswer = (isCorrect, userInput = null) => {
        isAnswered = true;
        let cardProgress = progress[currentCardIndex];
        cardProgress.lastAnswerCorrect = isCorrect;
        if (isCorrect) {
            cardProgress.correctInARow++;
            if (cardProgress.stage === 'new') {
                cardProgress.stage = 'learning';
            } else if (cardProgress.stage === 'learning' && cardProgress.correctInARow >= 2) {
                cardProgress.stage = 'mastered';
            }
        } else {
            cardProgress.correctInARow = 0;
            if (cardProgress.stage === 'mastered') {
                cardProgress.stage = 'learning'; // Demote from mastered
            }
            // Add card back to the queue to be repeated soon
            cardQueue.splice(Math.floor(Math.random() * Math.min(cardQueue.length, 3)), 0, currentCardIndex);
        }
        renderAnswerFeedback(isCorrect, userInput);
    };
    // --- Initialization ---
    const initializeLearnSession = () => {
        allCards = [...learnSettings.cards];
        shuffle(allCards);
        cardQueue = [];
        progress = {};
        for (let i = 0; i < allCards.length; i++) {
            progress[i] = { stage: 'new', correctInARow: 0, lastAnswerCorrect: false };
        }
        isAnswered = false;
        renderLearnUI();
    };
    // Start the session
    initializeLearnSession();
}
// --- Quiz Page ---
function QuizPageHTML(setId) {
    return `
<button id="quiz-back-btn" class="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4">
${IconBack()} <span class="ml-1">Back to Dashboard</span>
</button>
<div id="quiz-page-content">
<div class="text-center p-12">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">Loading quiz...</p>
</div>
</div>
`;
}
function attachQuizListeners(setId) {
    const pageContent = document.getElementById('quiz-page-content');
    document.getElementById('quiz-back-btn').addEventListener('click', () => navigate('dashboard'));
    let data, questions, currentQuestionIndex, score;
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };
    const generateQuestions = () => {
        let allCards = [...data.cards];
        shuffle(allCards);
        questions = allCards.map((card, index) => {
            // Pick 3 random wrong answers
            let options = [card.definition];
            let wrongCards = allCards.filter((c, i) => i !== index);
            shuffle(wrongCards);
            for (let i = 0; i < 3; i++) {
                options.push(wrongCards[i].definition);
            }
            return {
                question: card.term,
                options: shuffle(options),
                answer: card.definition
            };
        });
    };
    const renderQuestion = () => {
        if (currentQuestionIndex >= questions.length) {
            renderQuizResults();
            return;
        }
        const q = questions[currentQuestionIndex];
        pageContent.innerHTML = `
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 truncate" title="${data.title}">${data.title}</h1>
<p class="text-lg text-gray-600 dark:text-gray-400 mb-6">Question ${currentQuestionIndex + 1} of ${questions.length}</p>
<div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
<p class="text-2xl font-semibold text-gray-900 dark:text-white mb-8 text-center">
${q.question}
</p>
<div id="quiz-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
${q.options.map((option, i) => `
<button
data-answer="${option}"
class="quiz-option w-full h-full text-left p-6 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
<span class="font-semibold">${String.fromCharCode(65 + i)}:</span>
<p class="mt-2 text-lg">${option}</p>
</button>
`).join('')}
</div>
</div>
`;
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', handleAnswer);
        });
    };
    const handleAnswer = (e) => {
        const selectedAnswer = e.currentTarget.dataset.answer;
        const correctAnswer = questions[currentQuestionIndex].answer;
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(btn => {
            btn.disabled = true;
            const answer = btn.dataset.answer;
            if (answer === correctAnswer) {
                btn.classList.add('bg-green-100', 'dark:bg-green-900', 'border-green-500');
            } else if (answer === selectedAnswer) {
                btn.classList.add('bg-red-100', 'dark:bg-red-900', 'border-red-500');
            }
        });
        if (selectedAnswer === correctAnswer) {
            score++;
        }
        setTimeout(() => {
            currentQuestionIndex++;
            renderQuestion();
        }, 1500); // Wait 1.5 seconds before next question
    };
    const renderQuizResults = () => {
        const percent = Math.round((score / questions.length) * 100);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        pageContent.innerHTML = `
<div class="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
<h3 class="text-2xl font-bold text-gray-900 dark:text-white">Quiz Complete!</h3>
<p class="mt-4 text-5xl font-bold text-blue-600 dark:text-blue-500">${percent}%</p>
<p class="mt-2 text-lg text-gray-600 dark:text-gray-300">
You got ${score} out of ${questions.length} correct.
</p>
<div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
<button id="quiz-restart-btn" class="px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700">
Take Quiz Again
</button>
<button id="quiz-back-btn-2" class="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
Back to Dashboard
</button>
</div>
</div>
`;
        document.getElementById('quiz-restart-btn').addEventListener('click', startQuiz);
        document.getElementById('quiz-back-btn-2').addEventListener('click', () => navigate('dashboard'));
    };
    const startQuiz = () => {
        currentQuestionIndex = 0;
        score = 0;
        generateQuestions();
        renderQuestion();
    };
    // Load data and start
    getDoc(doc(db, "studySets", setId))
        .then(docSnap => {
            if (docSnap.exists()) {
                data = docSnap.data();
                if (data.ownerId === globalUser?.uid || data.isPublic) {
                    if (!data.cards || data.cards.length < 4) {
                        pageContent.innerHTML = `<p class="text-gray-600 dark:text-gray-300">This set needs at least 4 cards for a quiz.</p>`;
                        return;
                    }
                    startQuiz();
                } else {
                    pageContent.innerHTML = `<p class="text-red-600 dark:text-red-400">You do not have permission to view this set.</p>`;
                }
            } else {
                pageContent.innerHTML = `<p class="text-red-600 dark:text-red-400">Study set not found.</p>`;
            }
        })
        .catch(err => {
            console.error("Error loading set:", err);
            pageContent.innerHTML = `<p class="text-red-600 dark:text-red-400">Error loading quiz.</p>`;
        });
}
// --- Upload Page ---
function UploadPageHTML() {
    return `
<div class="max-w-2xl mx-auto">
<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Import from Document</h1>
<p class="text-lg text-gray-600 dark:text-gray-300 mb-6">
Let AI create a study set for you. Upload a \`.txt\` or \`.pdf\` file containing terms and definitions.
</p>
<div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
<div class="mb-6">
<label for="file-upload" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
Upload File (\`.txt\` or \`.pdf\`)
</label>
<input id="file-upload" name="file-upload" type="file" accept=".txt,.pdf"
class="block w-full text-sm text-gray-600 dark:text-gray-300
file:mr-4 file:py-2 file:px-4
file:rounded-full file:border-0
file:text-sm file:font-semibold
file:bg-blue-50 file:text-blue-700
dark:file:bg-blue-900 dark:file:text-blue-300
hover:file:bg-blue-100 dark:hover:file:bg-blue-800
"/>
</div>
<div class="mb-6">
<label for="import-delimiter" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
Delimiter (Optional)
</label>
<input id="import-delimiter" name="import-delimiter" type="text"
class="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
placeholder="e.g., '---' or ',' or 'tab'"
/>
<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
Tell the AI how your terms and definitions are separated. If blank, the AI will try to figure it out.
</Example: "Term 1,Definition 1". Delimiter is ",".
</p>
</div>
<button id="ai-import-btn" class="w-full px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700 flex items-center justify-center disabled:opacity-50">
${IconSparkles()} <span class="ml-2">Generate Set with AI</span>
</button>
<div id="import-status" class="mt-6"></div>
</div>
</div>
`;
}
function attachUploadListeners() {
    const fileUpload = document.getElementById('file-upload');
    const importBtn = document.getElementById('ai-import-btn');
    const statusDiv = document.getElementById('import-status');
    const delimiterInput = document.getElementById('import-delimiter');
    importBtn.addEventListener('click', async () => {
        const file = fileUpload.files[0];
        if (!file) {
            statusDiv.innerHTML = `<p class="text-red-600 dark:text-red-400">Please select a file to upload.</p>`;
            return;
        }
        let fileContent = '';
        importBtn.disabled = true;
        importBtn.innerHTML = `
<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
<span class="ml-2">Analyzing Document...</span>
`;
        statusDiv.innerHTML = '';
        try {
            // --- Read file content ---
            if (file.type === 'application/pdf') {
                fileContent = await readPdfFile(file);
            } else {
                fileContent = await file.text();
            }
            if (fileContent.trim().length === 0) {
                throw new Error("File is empty or could not be read.");
            }
            // --- Call Gemini API ---
            statusDiv.innerHTML = `<p class="text-blue-600 dark:text-blue-400">File read successfully. Asking AI to generate cards... This may take a moment.</p>`;
            importBtn.innerHTML = `
<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
<span class="ml-2">Generating Cards...</span>
`;
            const delimiter = delimiterInput.value.trim();
            const prompt = `
You are an expert at creating study sets.
Based on the following text, extract flashcard terms and definitions.
The user provided a delimiter: "${delimiter || 'None (auto-detect)'}".
If the delimiter is 'tab', assume terms and definitions are separated by a tab character.
If no delimiter is provided, auto-detect the structure.
The structure might be lines of "Term,Definition" or "Term --- Definition" or blocks of text.
Extract as many high-quality cards as you can.
Return ONLY a valid JSON object in the format:
{
"title": "A good title for the set",
"description": "A brief description of the set",
"cards": [
{"term": "Term 1", "definition": "Definition 1"},
{"term": "Term 2", "definition": "Definition 2"},
...
]
}
Do not include any other text, greetings, or explanations. Just the JSON.
Here is the text:
---
${fileContent.substring(0, 50000)}
`; // Limit text size
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2,
                    },
                }),
            });
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`API Error: ${errorBody.error?.message || 'Failed to fetch'}`);
            }
            const data = await response.json();
            const jsonText = data.candidates[0].content.parts[0].text;
            const studySetData = JSON.parse(jsonText);
            // --- Create new set in Firestore ---
            importBtn.innerHTML = `
<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
<span class="ml-2">Saving Set...</span>
`;
            const newSet = {
                title: studySetData.title || "AI Generated Set",
                description: studySetData.description || `Generated from ${file.name}`,
                cards: studySetData.cards || [],
                ownerId: globalUser.uid,
                ownerEmail: globalUser.email,
                isPublic: false,
                createdAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, "studySets"), newSet);
            statusDiv.innerHTML = `
<p class="text-green-600 dark:text-green-400 font-semibold">
Success! Created set "${newSet.title}" with ${newSet.cards.length} cards.
</p>
`;
            // Navigate to the new set's edit page
            setTimeout(() => {
                navigate('edit', docRef.id);
            }, 1500);
        } catch (err) {
            console.error("Import error:", err);
            statusDiv.innerHTML = `<p class="text-red-600 dark:text-red-400">Error during import: ${err.message}</p>`;
        } finally {
            importBtn.disabled = false;
            importBtn.innerHTML = `${IconSparkles()} <span class="ml-2">Generate Set with AI</span>`;
        }
    });
}
// --- PDF Reader Helper ---
async function readPdfFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const pdfData = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }
                resolve(fullText);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => {
            reject(new Error("File reading error: " + err));
        };
        reader.readAsArrayBuffer(file);
    });
}
// --- Set Editor Page ---
function SetEditorHTML(setId) {
    const isEditing = !!setId;
    return `
<div class="max-w-4xl mx-auto">
<div class="flex justify-between items-center mb-6">
<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
${isEditing ? 'Edit Study Set' : 'Create Study Set'}
</h1>
<button id="editor-back-btn" class="flex items-center text-blue-600 dark:text-blue-400 hover:underline">
${IconBack()} <span class="ml-1">Back to Dashboard</span>
</button>
</div>
<div id="editor-content">
<div class="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow">
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
<p class="mt-4 text-gray-600 dark:text-gray-300">
${isEditing ? 'Loading set...' : 'Initializing editor...'}
</p>
</div>
</div>
</div>
`;
}
function attachSetEditorListeners(setId) {
    const isEditing = !!setId;
    const content = document.getElementById('editor-content');
    document.getElementById('editor-back-btn').addEventListener('click', () => navigate('dashboard'));
    let cards = []; // Local state for cards
    // --- Render the main editor form ---
    const renderEditor = (data = {}) => {
        cards = data.cards ? [...data.cards] : [{ term: '', definition: '' }];
        content.innerHTML = `
<div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl space-y-6">
<div>
<label for="set-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
<input type="text" id="set-title" class="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg" value="${data.title || ''}" required>
</div>
<div>
<label for="set-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
<textarea id="set-description" rows="3" class="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">${data.description || ''}</textarea>
</div>
<div class="relative flex items-start">
<div class="flex items-center h-5">
<input id="set-public" type="checkbox" ${data.isPublic ? 'checked' : ''} class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded">
</div>
<div class="ml-3 text-sm">
<label for="set-public" class="font-medium text-gray-800 dark:text-gray-200">Make Public</label>
<p class="text-gray-500 dark:text-gray-400">Allow other users to find and study this set.</p>
</div>
</div>
</div>
<h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-6">Cards</h2>
<div id="cards-container" class="space-y-6">
</div>
<button id="add-card-btn" class="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
${IconPlus()} <span class="ml-2">Add Card</span>
</button>
<div class="flex justify-between items-center mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
<div>
${isEditing ? `
<button id="delete-set-btn" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
${IconTrash()} <span class="ml-2">Delete Set</span>
</button>
` : ''}
</div>
<button id="save-set-btn" class="inline-flex items-center px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700">
Save Set
</button>
</div>
<div id="save-status" class="mt-4 text-right"></div>
`;
        renderCards();
        attachEditorListeners();
    };
    // --- Render the cards list ---
    const renderCards = () => {
        const container = document.getElementById('cards-container');
        container.innerHTML = cards.map((card, index) => `
<div class="card-editor-item bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
<div class="flex justify-between items-center mb-4">
<span class="text-lg font-bold text-gray-800 dark:text-white">${index + 1}</span>
<button data-index="${index}" class="remove-card-btn text-red-500 hover:text-red-700" title="Remove card">
${IconTrash()}
</button>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Term</label>
<textarea data-index="${index}" data-field="term" class="card-input w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" rows="3">${card.term}</textarea>
</div>
<div>
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Definition</label>
<textarea data-index="${index}" data-field="definition" class="card-input w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" rows="3">${card.definition}</textarea>
</div>
</div>
</div>
`).join('');
    };
    // --- Attach listeners for the editor ---
    const attachEditorListeners = () => {
        // Add card
        document.getElementById('add-card-btn').addEventListener('click', () => {
            cards.push({ term: '', definition: '' });
            renderCards(); // Re-render just the cards
            attachCardInputListeners(); // Re-attach listeners for the new cards
        });
        // Save set
        document.getElementById('save-set-btn').addEventListener('click', saveSet);
        // Delete set
        if (isEditing) {
            document.getElementById('delete-set-btn').addEventListener('click', deleteSet);
        }
        attachCardInputListeners();
    };
    // --- Attach listeners for card inputs (term/def/remove) ---
    const attachCardInputListeners = () => {
        // Remove card
        document.querySelectorAll('.remove-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                cards.splice(index, 1);
                renderCards(); // Re-render cards
                attachCardInputListeners(); // Re-attach all listeners
            });
        });
        // Update card text
        document.querySelectorAll('.card-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const field = e.currentTarget.dataset.field;
                cards[index][field] = e.currentTarget.value;
            });
        });
    };
    // --- Save Set Logic ---
    const saveSet = async () => {
        const status = document.getElementById('save-status');
        const saveBtn = document.getElementById('save-set-btn');
        status.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Saving...</p>`;
        saveBtn.disabled = true;
        const title = document.getElementById('set-title').value;
        const description = document.getElementById('set-description').value;
        const isPublic = document.getElementById('set-public').checked;
        if (!title.trim()) {
            status.innerHTML = `<p class="text-red-600 dark:text-red-400">Title is required.</p>`;
            saveBtn.disabled = false;
            return;
        }
        // Filter out empty cards
        const finalCards = cards.filter(c => c.term.trim() !== '' && c.definition.trim() !== '');
        const setData = {
            title,
            description,
            isPublic,
            cards: finalCards,
            ownerId: globalUser.uid,
            ownerEmail: globalUser.email,
        };
        try {
            if (isEditing) {
                // Update existing doc
                setData.updatedAt = serverTimestamp();
                await updateDoc(doc(db, "studySets", setId), setData);
                status.innerHTML = `<p class="text-green-600 dark:text-green-400">Set saved successfully!</p>`;
            } else {
                // Create new doc
                setData.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, "studySets"), setData);
                // Navigate to the new edit page
                status.innerHTML = `<p class="text-green-600 dark:text-green-400">Set created! Navigating...</p>`;
                setTimeout(() => navigate('edit', docRef.id), 1000);
            }
        } catch (err) {
            console.error("Error saving set:", err);
            status.innerHTML = `<p class="text-red-600 dark:text-red-400">Error saving set: ${err.message}</p>`;
        } finally {
            saveBtn.disabled = false;
        }
    };
    // --- Delete Set Logic ---
    const deleteSet = async () => {
        if (!confirm("Are you sure you want to delete this set? This cannot be undone.")) {
            return;
        }
        const status = document.getElementById('save-status');
        status.innerHTML = `<p class="text-red-600 dark:text-red-400">Deleting...</p>`;
        try {
            await deleteDoc(doc(db, "studySets", setId));
            status.innerHTML = `<p class="text-green-600 dark:text-green-400">Set deleted. Navigating to dashboard...</p>`;
            setTimeout(() => navigate('dashboard'), 1500);
        } catch (err) {
            console.error("Error deleting set:", err);
            status.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: ${err.message}</p>`;
        }
    };
    // --- Load data if editing, else render empty editor ---
    if (isEditing) {
        getDoc(doc(db, "studySets", setId))
            .then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Check ownership
                    if (data.ownerId !== globalUser.uid) {
                        content.innerHTML = `<p class="text-red-600 dark:text-red-400">You do not have permission to edit this set.</p>`;
                        return;
                    }
                    renderEditor(data);
                } else {
                    content.innerHTML = `<p class="text-red-600 dark:text-red-400">Study set not found.</p>`;
                }
            })
            .catch(err => {
                console.error("Error loading set:", err);
                content.innerHTML = `<p class="text-red-600 dark:text-red-400">Error loading set data.</p>`;
            });
    } else {
        renderEditor();
    }
}
// --- AUTHENTICATION LISTENER ---
// This is the main entry point
onAuthStateChanged(auth, (user) => {
    globalAuthLoaded = true;
    if (user) {
        globalUser = user;
        if (currentPage === 'auth') {
            navigate('dashboard');
        } else {
            render(); // Re-render current page
        }
    } else {
        globalUser = null;
        navigate('auth');
    }
});

// --- Initial Render ---
// Render will show loader until auth is loaded
render();

// --- End of main script module ---

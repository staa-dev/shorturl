// ============================================
// SHORTLINK APP - FETCH API VERSION
// ============================================

// Konfigurasi Supabase - GANTI DENGAN KREDENSIAL ANDA
const SUPABASE_URL = 'https://wbibstumuvqytzlrqvoj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaWJzdHVtdXZxeXR6bHJxdm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDk5OTUsImV4cCI6MjEwMTM4NTk5NX0.TWQO4vS1tvHdve7dfrvZsrM34qiiQC_zO8B81bS-pKk';
const SUPABASE_TABLE = 'shortlinks';
const CLEAN_DOMAIN = window.location.origin;

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    urlInput: document.getElementById('urlInput'),
    customAlias: document.getElementById('customAlias'),
    submitBtn: document.getElementById('submitBtn'),
    btnText: document.getElementById('btnText'),
    clearBtn: document.getElementById('clearBtn'),
    result: document.getElementById('result'),
    shortUrl: document.getElementById('shortUrl'),
    previewLink: document.getElementById('previewLink'),
    copyBtn: document.getElementById('copyBtn'),
    newLinkBtn: document.getElementById('newLinkBtn'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('errorMessage'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    domainPrefix: document.getElementById('domainPrefix'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    connectionStatus: document.getElementById('connectionStatus')
};

// ============================================
// SUPABASE FETCH API FUNCTIONS
// ============================================
async function supabaseQuery(shortCode) {
    const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?short_code=eq.${encodeURIComponent(shortCode)}&select=*`;
    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

async function supabaseInsert(shortCode, originalUrl) {
    const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            short_code: shortCode,
            original_url: originalUrl,
            clicks: 0
        })
    });
    return response.ok;
}

async function supabaseUpdateClicks(shortCode, clicks) {
    const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?short_code=eq.${encodeURIComponent(shortCode)}`;
    await fetch(url, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clicks: clicks })
    });
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ShortLink App Ready');
    
    // Setup domain prefix
    elements.domainPrefix.textContent = CLEAN_DOMAIN + '/s/';
    
    // Check database connection
    await checkConnection();
    
    // Setup event listeners
    setupEventListeners();
    
    // Focus input
    elements.urlInput.focus();
});

async function checkConnection() {
    try {
        // Test query
        const testUrl = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=count`;
        const response = await fetch(testUrl, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            elements.statusDot.className = 'status-dot online';
            elements.statusText.textContent = '✅ Database Terhubung';
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        elements.statusDot.className = 'status-dot offline';
        elements.statusText.textContent = '⚠️ Database Offline';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Submit button
    elements.submitBtn.addEventListener('click', createShortlink);
    
    // Enter key on URL input
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createShortlink();
        }
    });
    
    // Enter key on alias input
    elements.customAlias.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createShortlink();
        }
    });
    
    // Clear button
    elements.clearBtn.addEventListener('click', clearInput);
    
    // Show/hide clear button
    elements.urlInput.addEventListener('input', toggleClearButton);
    
    // New link button
    elements.newLinkBtn.addEventListener('click', resetForm);
    
    // Copy button
    elements.copyBtn.addEventListener('click', copyToClipboard);
}

function toggleClearButton() {
    if (elements.urlInput.value.length > 0) {
        elements.clearBtn.classList.add('visible');
    } else {
        elements.clearBtn.classList.remove('visible');
    }
}

function clearInput() {
    elements.urlInput.value = '';
    elements.clearBtn.classList.remove('visible');
    elements.urlInput.focus();
}

function resetForm() {
    hideElement(elements.result);
    hideElement(elements.error);
    elements.urlInput.value = '';
    elements.customAlias.value = '';
    elements.clearBtn.classList.remove('visible');
    elements.urlInput.focus();
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// SHORTLINK CREATION
// ============================================
function generateShortCode(length = 5) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }
    return result;
}

async function createShortlink() {
    // Reset UI
    hideElement(elements.result);
    hideElement(elements.error);
    
    let url = elements.urlInput.value.trim();
    const customAlias = elements.customAlias.value.trim();
    
    // Validation
    if (!url) {
        showError('Mohon masukkan URL terlebih dahulu');
        shakeElement(elements.urlInput);
        elements.urlInput.focus();
        return;
    }
    
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        showError('Format URL tidak valid. Contoh: https://google.com');
        shakeElement(elements.urlInput);
        return;
    }
    
    // Validate custom alias
    if (customAlias && customAlias.length < 3) {
        showError('Custom alias minimal 3 karakter');
        return;
    }
    
    if (customAlias && !/^[a-zA-Z0-9\-_]+$/.test(customAlias)) {
        showError('Alias hanya boleh huruf, angka, dash (-) dan underscore (_)');
        return;
    }
    
    // Loading state
    setLoading(true);
    
    try {
        let shortCode;
        
        if (customAlias) {
            // Check if custom alias already exists
            const existing = await supabaseQuery(customAlias);
            if (existing && existing.length > 0) {
                showError('Alias sudah digunakan. Silakan pilih alias lain.');
                setLoading(false);
                return;
            }
            shortCode = customAlias;
        } else {
            // Generate unique short code
            let isUnique = false;
            do {
                shortCode = generateShortCode();
                const existing = await supabaseQuery(shortCode);
                if (!existing || existing.length === 0) {
                    isUnique = true;
                }
            } while (!isUnique);
        }
        
        // Insert to database
        const saved = await supabaseInsert(shortCode, url);
        
        if (!saved) {
            throw new Error('Gagal menyimpan ke database');
        }
        
        // Success!
        const shortUrl = `${CLEAN_DOMAIN}/s/${shortCode}`;
        
        // Update UI
        elements.shortUrl.value = shortUrl;
        elements.previewLink.href = url;
        showElement(elements.result);
        
        // Scroll to result with smooth animation
        setTimeout(() => {
            elements.result.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
        
        // Auto copy to clipboard
        setTimeout(() => copyToClipboard(), 500);
        
        // Show success toast
        showToast('✅ Link pendek berhasil dibuat!', 'success');
        
        // Clear inputs
        elements.urlInput.value = '';
        elements.customAlias.value = '';
        toggleClearButton();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError(error.message || 'Gagal membuat shortlink. Coba lagi.');
    } finally {
        setLoading(false);
        elements.urlInput.focus();
    }
}

// ============================================
// CLIPBOARD FUNCTION
// ============================================
async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(elements.shortUrl.value);
        
        // Update button UI
        const copyBtn = elements.copyBtn;
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Tersalin!</span>';
        
        // Show toast
        showToast('📋 Link berhasil disalin!', 'success');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Salin</span>';
        }, 2000);
        
    } catch (err) {
        // Fallback for older browsers
        elements.shortUrl.select();
        elements.shortUrl.setSelectionRange(0, 99999);
        document.execCommand('copy');
        showToast('📋 Link berhasil disalin!', 'success');
    }
}

// ============================================
// UI HELPERS
// ============================================
function setLoading(isLoading) {
    elements.submitBtn.disabled = isLoading;
    elements.loadingSpinner.classList.toggle('hidden', !isLoading);
    
    if (isLoading) {
        elements.btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    } else {
        elements.btnText.innerHTML = '<i class="fas fa-scissors"></i> Pendekkan Sekarang';
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showElement(elements.error);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideElement(elements.error);
    }, 5000);
}

function showToast(message, type = 'success') {
    const toast = elements.toast;
    const toastMessage = elements.toastMessage;
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    
    // Update icon based on type
    const icon = toast.querySelector('i');
    if (icon) {
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-times-circle';
        }
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
        element.classList.add('fade-in');
    }
}

function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
        element.classList.remove('fade-in');
    }
}

function shakeElement(element) {
    if (!element) return;
    element.style.animation = 'none';
    element.offsetHeight;
    element.style.animation = 'shakeError 0.5s ease-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================
window.copyToClipboard = copyToClipboard;

console.log('✅ ShortLink App Fully Loaded');
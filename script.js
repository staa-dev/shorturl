// ============================================
// SHORTLINK APP - CLEAN JAVASCRIPT
// ============================================

// Konfigurasi Supabase - GANTI DENGAN KREDENSIAL ANDA
const SUPABASE_URL = 'https://wbibstumuvqytzlrqvoj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaWJzdHVtdXZxeXR6bHJxdm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDk5OTUsImV4cCI6MjEwMTM4NTk5NX0.TWQO4vS1tvHdve7dfrvZsrM34qiiQC_zO8B81bS-pKk';

let supabaseClient;

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    urlInput: document.getElementById('urlInput'),
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
    toastMessage: document.getElementById('toastMessage')
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ShortLink App Ready');
    
    // Initialize Supabase
    await initSupabase();
    
    // Setup event listeners
    setupEventListeners();
    
    // Focus input
    elements.urlInput.focus();
});

async function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined') {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Test connection
            const { error } = await supabaseClient
                .from('shortlinks')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                console.error('❌ Database connection failed:', error);
                showError('Gagal terhubung ke database');
            } else {
                console.log('✅ Database connected');
            }
        } else {
            throw new Error('Supabase library not loaded');
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Gagal menginisialisasi aplikasi');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Submit button
    elements.submitBtn.addEventListener('click', createShortlink);
    
    // Enter key
    elements.urlInput.addEventListener('keypress', (e) => {
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
    elements.clearBtn.classList.remove('visible');
    elements.urlInput.focus();
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// SHORTLINK CREATION
// ============================================
function generateShortCode(length = 6) {
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
    
    // Loading state
    setLoading(true);
    
    try {
        if (!supabaseClient) {
            throw new Error('Database tidak terhubung. Silakan refresh halaman.');
        }
        
        const shortCode = generateShortCode();
        
        // Insert to database
        const { data, error } = await supabaseClient
            .from('shortlinks')
            .insert([{
                short_code: shortCode,
                original_url: url,
                clicks: 0
            }])
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                // Duplicate code, retry with new code
                return await createShortlink();
            }
            throw error;
        }
        
        // Success!
 // Di bagian createShortlink function, setelah sukses insert:
const shortUrl = `${window.location.origin}/s/${shortCode}`;
        
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
        
        // Clear input
        elements.urlInput.value = '';
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
        showToast('📋 Link berhasil disalin ke clipboard!', 'success');
        
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
    if (isLoading) {
        elements.btnText.innerHTML = '<span class="spinner"></span> Memproses...';
    } else {
        elements.btnText.innerHTML = '<i class="fas fa-scissors"></i> Pendekkan';
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
    element.offsetHeight; // Trigger reflow
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
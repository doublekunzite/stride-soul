// script.js

// --- 1. FOOTER INJECTION ---
function injectFooter() {
    const footerHTML = `
    <footer class="main-footer">
        <div class="footer-grid">
            
            <div class="footer-col">
                <h4>Help</h4>
                <a href="faq.html">FAQ</a>
                <a href="shipping.html">Shipping & Returns</a>
                <a href="size-guide.html">Size Guide</a>
                <a href="contact.html">Contact Us</a>
            </div>
            <div class="footer-col">
                <h4>About</h4>
                <a href="about.html">Our Story</a>
                <a href="sustainability.html">Sustainability</a>
                <a href="careers.html">Careers</a>
                <a href="press.html">Press</a>
            </div>
            <div class="footer-col">
                <h4>Newsletter</h4>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">Subscribe to get special offers and updates.</p>
                
                <!-- Form handles the Enter key submit -->
                <form onsubmit="handleNewsletterSubmit(event)" style="display: contents;">
                    <input 
                        type="email" 
                        id="newsletter-email"
                        value="test@gmail.com"
                        onclick="this.select();" 
                        placeholder="Enter your email" 
                        style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #333; background: #1e1e1e; color: #fff; margin-bottom: 10px;"
                    >
                    <button 
                        type="submit"
                        id="newsletter-btn"
                        style="width: 100%; padding: 10px; background: var(--primary-color); border: none; color: white; border-radius: 5px; cursor: pointer; transition: all 0.3s;">
                        Subscribe
                    </button>
                </form>
            </div>
        </div>
        <div class="footer-bottom">
            &copy; 2023 Stride & Soul. All rights reserved.
        </div>
    </footer>
    `;

    const container = document.getElementById('footer-container');
    if (container) {
        container.innerHTML = footerHTML;
    }
}

// Add this right after injectFooter function in script.js

function injectToastStyles() {
    const css = `
    #toast-notification {
        visibility: hidden;
        min-width: 250px;
        background-color: #333;
        color: #fff;
        text-align: center;
        border-radius: 8px;
        padding: 16px;
        position: fixed;
        z-index: 1000000; /* Above everything */
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        border: 1px solid #444;
        opacity: 0;
        transition: opacity 0.5s, visibility 0.5s;
    }

    #toast-notification.show {
        visibility: visible;
        opacity: 1;
    }
    `;
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);
}

// Add this helper function to actually show the toast
function showToast(message) {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }

    toast.innerHTML = message;
    
    // Inject styles (safe to call multiple times)
    injectToastStyles();

    // Add the "show" class
    toast.className = "show";

    // After 3 seconds, remove the show class
    setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
}

// Make it global so HTML onclick can use it
window.showToast = showToast;

// --- 2. PRODUCT DATA & STATE ---
const products = [
    { id: 1, name: "Urban Runner", price: 120, image: "images/1.jpg", sizes: [7, 8, 9, 10, 11] },
    { id: 2, name: "Classic Vegan Leather", price: 150, image: "images/2.jpg", sizes: [7, 8, 9, 10] },
    { id: 3, name: "Trail Blazer", price: 135, image: "images/3.jpg", sizes: [8, 9, 10, 11, 12] },
    { id: 4, name: "Midnight Sneak", price: 110, image: "images/4.jpg", sizes: [7, 8, 9] },
    { id: 5, name: "Cloud Walker", price: 140, image: "images/5.jpg", sizes: [8, 9, 10] },
    { id: 6, name: "Retro Wave", price: 125, image: "images/6.jpg", sizes: [7, 8, 9, 10, 11] }
];

let cart = [];
let selectedSize = null;
let currentProduct = null;

// --- 3. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Footer
    injectFooter();

    // 2. Inject Toast Container (hidden)
    injectToastStyles(); 

    // 3. Initialize Index Page Logic
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        initIndexPage();
    }

    // 4. Initialize Chat Widget
    const chatWidget = document.getElementById('chat-widget');
    if (chatWidget) {
        initChatWidget();
    }
});

// --- 4. INDEX PAGE LOGIC (Modal & Cart) ---
function initIndexPage() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalPrice = document.getElementById('modal-price');
    const sizeOptions = document.getElementById('size-options');
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const modalClose = document.getElementById('modal-close');
    
    const cartBtn = document.getElementById('cart-btn');
    const cartCount = document.getElementById('cart-count');
    const cartDrawer = document.getElementById('cart-drawer');
    const drawerClose = document.getElementById('drawer-close');
    const drawerItems = document.getElementById('drawer-items');

    // Make functions global so HTML onclick="" can see them
    window.openModal = function(id) {
        currentProduct = products.find(p => p.id === id);
        if (!currentProduct) return;
        modalImage.style.backgroundImage = `url('${currentProduct.image}')`;
        modalTitle.textContent = currentProduct.name;
        modalPrice.textContent = `$${currentProduct.price}`;
        sizeOptions.innerHTML = currentProduct.sizes.map(size => `
            <button class="size-btn" onclick="selectSize(event, ${size})">${size}</button>
        `).join('');
        selectedSize = null;
        modalOverlay.style.display = 'flex';
    }

    window.closeModal = function() {
        modalOverlay.style.display = 'none';
    }

    window.selectSize = function(event, size) {
        event.stopPropagation();
        selectedSize = size;
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }

    window.addToCart = function() {
        if (!selectedSize) { alert("Please select a size first."); return; }
        if (!currentProduct) return;

        const item = { ...currentProduct, selectedSize: selectedSize, cartId: Date.now() };
        cart.push(item);
        updateCartUI();
        closeModal();
        openDrawer();
    }

    window.removeFromCart = function(cartId) {
        cart = cart.filter(item => item.cartId !== cartId);
        updateCartUI();
    }

    function updateCartUI() {
        cartCount.textContent = cart.length;
        drawerItems.innerHTML = cart.length === 0 
            ? `<p style="color: #666; text-align: center; margin-top: 50px;">Your cart is empty.</p>`
            : cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-img" style="background-image: url('${item.image}')"></div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name} (Size: ${item.selectedSize})</div>
                        <div class="cart-item-price">$${item.price}</div>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.cartId})">Remove</button>
                    </div>
                </div>
            `).join('');
    }

    function openDrawer() { cartDrawer.classList.add('open'); }
    function closeDrawer() { cartDrawer.classList.remove('open'); }

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    addToCartBtn.addEventListener('click', addToCart);
    cartBtn.addEventListener('click', openDrawer);
    drawerClose.addEventListener('click', closeDrawer);
}

// --- 5. CHAT WIDGET LOGIC ---
function initChatWidget() {
    const API_URL = 'https://stride-soul.vercel.app/api/chat';

    const chatWidget = document.getElementById('chat-widget');
    const chatToggle = document.getElementById('chat-toggle');
    const messagesDiv = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sampleArea = document.getElementById('sample-area');

    // Make functions global for HTML onclick
    window.toggleChat = function() {
        const isVisible = chatWidget.style.display === 'flex';
        chatWidget.style.display = isVisible ? 'none' : 'flex';
        chatToggle.style.display = isVisible ? 'block' : 'none';
    }

    window.handleEnter = function(e) {
        if (e.key === 'Enter') sendMessage();
    }

    window.askSample = function(question) {
        userInput.value = question;
        sendMessage();
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';
        sampleArea.style.display = 'none'; 

        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'bot-msg');
        loadingDiv.textContent = 'Thinking...';
        messagesDiv.appendChild(loadingDiv);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: [{ role: 'user', content: text }] 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }

            const data = await response.json();
            loadingDiv.innerHTML = formatBotText(data.reply) || "Sorry, I couldn't process that.";

        } catch (error) {
            loadingDiv.textContent = `Error: ${error.message}`;
            console.error(error);
        }
    }

    function formatBotText(text) {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.classList.add('message', sender === 'user' ? 'user-msg' : 'bot-msg');
        
        if (sender === 'bot') {
            div.innerHTML = formatBotText(text);
        } else {
            div.textContent = text;
        }
        
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; 
    }
}

// --- NEWSLETTER LOGIC ---
function handleNewsletterSubmit(event) {
    // Prevent form from actually submitting/refreshing page
    event.preventDefault(); 

    const input = document.getElementById('newsletter-email');
    const button = document.getElementById('newsletter-btn');
    const email = input.value;

    // 1. Validate Email (Must have @ and .)
    if (!email.includes('@') || !email.includes('.')) {
        // Add shake class
        input.classList.add('shake-error');
        
        // Show toast error
        showToast('Please enter a valid email address');

        // Remove shake class after animation ends
        setTimeout(() => {
            input.classList.remove('shake-error');
        }, 400);

        return; // Stop execution
    }

    // 2. Success State
    button.innerHTML = "Subscribed!";
    button.classList.add('btn-subscribed');
    button.disabled = true; // Prevent clicking again
    input.disabled = true; // Prevent typing again

    // Show success toast
    showToast('Thanks for subscribing!');
}

// Make global for HTML
window.handleNewsletterSubmit = handleNewsletterSubmit;
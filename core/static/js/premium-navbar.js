/* ===================================
   AI PDF STUDIO PRO - PREMIUM NAVBAR
   Scroll-Aware Glass Navigation
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    initPremiumNavbar();
});

function initPremiumNavbar() {
    const navbar = document.getElementById('mainNavbar');
    if (!navbar) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    // Update navbar on scroll
    function updateNavbar() {
        const scrollY = window.scrollY;
        
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show on scroll direction (optional)
        if (scrollY > lastScrollY && scrollY > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }

        lastScrollY = scrollY;
        ticking = false;
    }

    // Throttled scroll handler for 60 FPS
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }, { passive: true });

    // Initial state
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    }

    // Add hover effect for nav links
    navbar.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                icon.style.transform = 'scale(1.2)';
            }
        });

        link.addEventListener('mouseleave', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1)';
            }
        });
    });

    // Add active link indicator animation
    navbar.querySelectorAll('.nav-link.active').forEach(link => {
        link.style.transition = 'all 0.3s ease';
    });
}

// ===== EXPORT =====
window.initPremiumNavbar = initPremiumNavbar;
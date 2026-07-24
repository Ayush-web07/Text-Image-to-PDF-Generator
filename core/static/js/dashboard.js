/* ===================================
   AI PDF STUDIO PRO - DASHBOARD JS
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

function initDashboard() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    initCounters();
    initChart();
    initStorageBar();
    hideSkeleton();
}

// ===== LIVE CLOCK =====
function updateDateTime() {
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (!dateEl || !timeEl) return;
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
    timeEl.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// ===== SKELETON LOADER =====
function hideSkeleton() {
    const skeleton = document.getElementById('skeletonLoader');
    const content = document.getElementById('dashboardContent');
    if (skeleton && content) {
        setTimeout(() => {
            skeleton.style.display = 'none';
            content.classList.add('loaded');
        }, 400);
    }
}

// ===== ANIMATED COUNTERS =====
function initCounters() {
    const counters = document.querySelectorAll('.dash-counter');
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target')) || 0;
        const duration = 1500;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(easeOut * target);
            counter.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.textContent = target;
            }
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(update);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        observer.observe(counter);
    });
}

// ===== STORAGE BAR COLOR =====
function initStorageBar() {
    const fill = document.querySelector('.dash-storage-fill');
    if (!fill) return;
    const pct = parseFloat(fill.getAttribute('data-pct')) || 0;
    fill.style.width = pct + '%';
    if (pct > 90) {
        fill.classList.add('red');
    } else if (pct > 70) {
        fill.classList.add('orange');
    } else {
        fill.classList.add('green');
    }
}

// ===== CHART.JS =====
function initChart() {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const chartData = JSON.parse(ctx.getAttribute('data-chart') || '[]');
    const chartLabels = JSON.parse(ctx.getAttribute('data-labels') || '[]');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Uploads',
                data: chartData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#1e293b',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#94a3b8', font: { size: 12 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#64748b', stepSize: 1 },
                    grid: { color: 'rgba(148, 163, 184, 0.08)' }
                },
                x: {
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(148, 163, 184, 0.08)' }
                }
            }
        }
    });
}
// ----delete-----//
function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {
            cookie = cookie.trim();

            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1)
                );
                break;
            }
        }
    }

    return cookieValue;
}

function deleteFile(fileId) {
    console.log("Deleting:", fileId);

    if (!confirm("Are you sure you want to delete this file?\n\nThis will permanently remove the file from storage and cannot be undone.")) {
        return;
    }

    const button = event.target.closest('button');
    const originalIcon = button.innerHTML;
    const card = button.closest('.file-card') || button.closest('.dash-file-table tbody tr');
    
    // Show loading state
    button.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
    button.disabled = true;

    fetch("/delete-file/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCookie("csrftoken"),
            "X-Requested-With": "XMLHttpRequest"
        },
        body: "file_id=" + encodeURIComponent(fileId)
    })

    .then(response => {
        console.log("Status:", response.status);
        return response.json();
    })

    .then(data => {
        console.log("Response:", data);

        if (data.status === "ok") {
            // Animate card removal
            if (card) {
                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    card.remove();
                    
                    // Update dashboard stats without page reload
                    updateDashboardStats(data.freed_space);
                    
                    // Show success notification
                    showToast('File deleted successfully', 'success');
                }, 400);
            } else {
                // Fallback to page reload if card not found
                location.reload();
            }
        } else {
            // Reset button state on error
            button.innerHTML = originalIcon;
            button.disabled = false;
            showToast(data.message || 'Failed to delete file', 'error');
        }
    })

    .catch(error => {
        console.error(error);
        button.innerHTML = originalIcon;
        button.disabled = false;
        showToast('An error occurred. Please try again.', 'error');
    });
}

function updateDashboardStats(freedSpace) {
    // Update storage display
    const storageDisplay = document.querySelector('.dash-stat-value');
    if (storageDisplay && freedSpace) {
        // Parse current storage value
        const currentText = storageDisplay.textContent || '0 B';
        let currentBytes = parseStorageString(currentText);
        let newBytes = Math.max(0, currentBytes - freedSpace);
        
        // Update display
        storageDisplay.textContent = formatStorageString(newBytes);
        
        // Update storage bar
        const storageBar = document.querySelector('.dash-storage-fill');
        if (storageBar) {
            const us = window.currentUserStorage || { storage_limit: 104857600, storage_used: 0 };
            const newPercent = Math.max(0, ((us.storage_used - freedSpace) / us.storage_limit) * 100);
            storageBar.setAttribute('data-pct', newPercent);
            storageBar.style.width = newPercent + '%';
        }
    }
    
    // Update file count
    const fileCountElements = document.querySelectorAll('.dash-counter[data-target]');
    fileCountElements.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target')) || 0;
        if (target > 0) {
            counter.setAttribute('data-target', target - 1);
            counter.textContent = target - 1;
        }
    });
}

function parseStorageString(storageStr) {
    const units = { 'B': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824 };
    const match = storageStr.match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i);
    if (match) {
        const value = parseFloat(match[1]);
        const unit = (match[2] || 'B').toUpperCase();
        return value * (units[unit] || 1);
    }
    return 0;
}

function formatStorageString(bytes) {
    if (bytes > 1048576) {
        return `${(bytes / 1048576).toFixed(1)} MB`;
    } else if (bytes > 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    const icon = type === 'success' ? 'check-circle-fill' : type === 'error' ? 'exclamation-circle-fill' : 'info-circle-fill';
    const color = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
    
    toast.style.cssText = `
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid ${color}33;
        border-left: 4px solid ${color};
        border-radius: 12px;
        padding: 1rem 1.25rem;
        color: #e2e8f0;
        font-size: 0.95rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 300px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    toast.innerHTML = `
        <i class="bi bi-${icon}" style="color: ${color}; font-size: 1.25rem;"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Add toast animation styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(toastStyles);

// Used in templates via onclick="trackDownload(fileId)"
// eslint-disable-next-line no-unused-vars
function trackDownload(fileId) {

    fetch("/download-count/", {

        method: "POST",

        headers: {

            "X-CSRFToken": getCookie("csrftoken"),

            "Content-Type": "application/x-www-form-urlencoded"

        },

        body: new URLSearchParams({

            file_id: fileId

        })

    });

}
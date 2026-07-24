document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // Settings Navigation
    // ==========================================

    const navItems = document.querySelectorAll(".settings-nav-item");
    const panels = document.querySelectorAll(".settings-panel");

    if (navItems.length && panels.length) {

        // Hide all panels except active one on page load
        panels.forEach(panel => {
            if (!panel.classList.contains("active")) {
                panel.style.display = "none";
            } else {
                panel.style.display = "block";
            }
        });

        navItems.forEach(item => {

            item.addEventListener("click", function (e) {

                e.preventDefault();

                // Remove active class from all menu items
                navItems.forEach(nav => nav.classList.remove("active"));

                // Hide all panels
                panels.forEach(panel => {
                    panel.classList.remove("active");
                    panel.style.display = "none";
                });

                // Activate selected menu
                this.classList.add("active");

                // Show selected panel
                const targetPanel = document.getElementById(
                    "panel-" + this.dataset.panel
                );

                if (targetPanel) {
                    targetPanel.classList.add("active");
                    targetPanel.style.display = "block";
                }

            });

        });

    }

    // ==========================================
    // Auto Hide Alerts
    // ==========================================

    const alerts = document.querySelectorAll(".alert");

    alerts.forEach(alert => {

        setTimeout(() => {

            alert.style.transition = "opacity 0.5s ease";
            alert.style.opacity = "0";

            setTimeout(() => {
                alert.remove();
            }, 500);

        }, 5000);

    });

});
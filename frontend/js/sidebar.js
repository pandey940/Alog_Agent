/**
 * Sidebar Navigation with Menus and Submenus
 * Provides collapsible menu functionality for easy navigation
 */

document.addEventListener('DOMContentLoaded', function () {
    // Get all menu toggles
    const menuToggles = document.querySelectorAll('.menu-toggle');

    menuToggles.forEach(toggle => {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();

            const parentItem = this.closest('.nav-group');
            const submenu = parentItem.querySelector('.submenu');
            const arrow = this.querySelector('.menu-arrow');

            // Close other open menus (accordion behavior)
            const allSubmenus = document.querySelectorAll('.submenu');
            const allArrows = document.querySelectorAll('.menu-arrow');

            allSubmenus.forEach(otherSubmenu => {
                if (otherSubmenu !== submenu && otherSubmenu.classList.contains('open')) {
                    otherSubmenu.classList.remove('open');
                    otherSubmenu.style.maxHeight = '0px';
                }
            });

            allArrows.forEach(otherArrow => {
                if (otherArrow !== arrow) {
                    otherArrow.classList.remove('rotate');
                }
            });

            // Toggle current submenu
            if (submenu.classList.contains('open')) {
                submenu.classList.remove('open');
                submenu.style.maxHeight = '0px';
                arrow.classList.remove('rotate');
            } else {
                submenu.classList.add('open');
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                arrow.classList.add('rotate');
            }
        });
    });

    // Auto-expand current section based on active page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isInPagesDir = window.location.pathname.includes('/pages/');

    // Try multiple href patterns to find the active link
    let activeLink = document.querySelector(`.submenu a[href="${currentPage}"]`);

    // If not found and we're in pages dir, try without pages/ prefix
    if (!activeLink && isInPagesDir) {
        activeLink = document.querySelector(`.submenu a[href="pages/${currentPage}"]`);
    }
    // If not found and we're at root, try with pages/ prefix
    if (!activeLink && !isInPagesDir) {
        activeLink = document.querySelector(`.submenu a[href="pages/${currentPage}"]`);
    }

    if (activeLink) {
        const parentGroup = activeLink.closest('.nav-group');
        if (parentGroup) {
            const submenu = parentGroup.querySelector('.submenu');
            const arrow = parentGroup.querySelector('.menu-arrow');

            if (submenu) {
                submenu.classList.add('open');
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
            }
            if (arrow) {
                arrow.classList.add('rotate');
            }
        }

        // Mark active link
        activeLink.classList.add('active-link');
    }

    // Also check for direct nav items (dashboard link)
    let directActiveLink = document.querySelector(`.nav-item[href="${currentPage}"]`);
    // Also check for index.html when at root
    if (!directActiveLink && (currentPage === 'index.html' || currentPage === '')) {
        directActiveLink = document.querySelector('.nav-item[href="index.html"]') ||
            document.querySelector('.nav-item[href="../index.html"]');
    }
    if (directActiveLink) {
        directActiveLink.classList.add('active-link');
    }

    // ================================
    // Sidebar Toggle (All Screens)
    // ================================
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Check for saved sidebar state
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true' && sidebar) {
        sidebar.classList.add('collapsed');
    }

    function toggleSidebar() {
        if (!sidebar) return;

        const isCollapsed = sidebar.classList.toggle('collapsed');

        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', isCollapsed);

        // Update icon
        if (sidebarToggleBtn) {
            const icon = sidebarToggleBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = isCollapsed ? 'menu' : 'close';
            }
        }
    }

    // Toggle button click
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }

    // Overlay click to close (mobile)
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function () {
            if (sidebar && !sidebar.classList.contains('collapsed')) {
                toggleSidebar();
            }
        });
    }

    // Close on ESC key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar && !sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    });
});

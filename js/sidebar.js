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
    const activeLink = document.querySelector(`.submenu a[href="${currentPage}"]`);

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

    // Also check for direct nav items
    const directActiveLink = document.querySelector(`.nav-item[href="${currentPage}"]`);
    if (directActiveLink) {
        directActiveLink.classList.add('active-link');
    }
});

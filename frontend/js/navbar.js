// Inicializar menú hamburguesa cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Añadir botón hamburguesa al navbar
    const navContainer = document.querySelector('.nav-container');
    if (navContainer) {
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger';
        hamburger.setAttribute('aria-label', 'Menú');
        hamburger.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        // Insertar después del brand
        const navBrand = navContainer.querySelector('.nav-brand');
        navBrand.after(hamburger);

        // Toggle menú al hacer clic
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            const navLinks = document.querySelector('.nav-links');
            navLinks.classList.toggle('active');
        });

        // Cerrar menú al hacer clic en un enlace
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                document.querySelector('.nav-links').classList.remove('active');
            });
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(event) {
            const navLinksElement = document.querySelector('.nav-links');
            if (!navContainer.contains(event.target) && navLinksElement.classList.contains('active')) {
                hamburger.classList.remove('active');
                navLinksElement.classList.remove('active');
            }
        });
    }
});

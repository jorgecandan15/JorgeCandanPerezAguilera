window.addEventListener("load", () => {
    const loader = document.getElementById("loader-screen");
    const main = document.getElementById("main-content");

    setTimeout(() => {
        loader.classList.add("fade-out");

        setTimeout(() => {
            loader.style.display = "none";
            main.classList.add("show");

            // Iniciar scroll
            initScrollAnimations();

            // Effecto en el nombre
            setTimeout(() => {
                iniciarTypewriter();
            }, 600);

        }, 800);
    }, 2000);
});

function initScrollAnimations() {
    // 1. IntersectionObserver for BOTTOM entry (appear when scrolling down)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Standard threshold for entry
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Only trigger "show" when entering from bottom or generally appearing
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                // Ensure manual styles are cleared when it enters
                entry.target.style.opacity = '';
                entry.target.style.filter = '';
                entry.target.style.transform = '';
            } else {
                // If it leaves via bottom, we can remove 'show' to let it slide down again
                // Check if it's below the viewport
                if (entry.boundingClientRect.top > 0) {
                    entry.target.classList.remove('show');
                }
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach(el => observer.observe(el));

    // 2. Scroll Event for TOP exit (gradual disappear when scrolling up)
    window.addEventListener('scroll', () => {
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const elementHeight = rect.height;

            // Define the zone where it starts failing out (e.g., top 150px)
            const fadeStart = 150;
            const fadeEnd = -50; // Element is gone when top is at -50

            if (rect.top < fadeStart) {
                // Calculate progress: 1 at fadeStart, 0 at fadeEnd
                let progress = (rect.top - fadeEnd) / (fadeStart - fadeEnd);

                // Clamp progress between 0 and 1
                progress = Math.max(0, Math.min(1, progress));

                // Apply styles directly
                el.style.opacity = progress;
                el.style.filter = `blur(${(1 - progress) * 10}px)`;

                // Optional: seamless transform up
                // el.style.transform = `translateY(${(1 - progress) * -20}px)`;

                // IMPORTANT: Disable CSS transition during manual control to prevent lag
                el.style.transition = 'none';
            } else {
                // Return control to CSS if not in the fade zone
                // But only if it has the 'show' class (meaning it's visible)
                if (el.classList.contains('show')) {
                    el.style.opacity = '';
                    el.style.filter = '';
                    el.style.transition = ''; // Restore CSS transition
                }
            }
        });
    });
}

// ===============
// EFECTO TYPEWRITER
// ===============
function iniciarTypewriter() {
    const text = "JORGE CANDÁN PÉREZ-AGUILERA";
    const element = document.getElementById("typewriter");
    if (!element) return; // Guard clause just in case

    let index = 0;
    // Clear previous content if any
    element.textContent = "";

    function typeWriter() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(typeWriter, 80);
        }
    }

    typeWriter();
}

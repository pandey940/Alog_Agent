document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentStep = 1;
    const totalSteps = 4;

    // Elements
    const form = document.getElementById('strategy-form');
    const steps = document.querySelectorAll('.wizard-step');
    const indicators = document.querySelectorAll('.step-indicator');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    const progressBars = [
        document.getElementById('progress-bar-1'),
        document.getElementById('progress-bar-2'),
        document.getElementById('progress-bar-3')
    ];

    // Functions
    const updateUI = () => {
        // Toggle Steps
        steps.forEach(step => {
            if (parseInt(step.id.split('-')[1]) === currentStep) {
                step.classList.remove('hidden');
            } else {
                step.classList.add('hidden');
            }
        });

        // Update Indicators & Progress Bars
        indicators.forEach(ind => {
            const stepNum = parseInt(ind.dataset.step);
            const circle = ind.querySelector('div');

            // Text color logic
            if (stepNum <= currentStep) {
                ind.classList.add('active');
                circle.classList.remove('bg-slate-200', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
                circle.classList.add('bg-primary', 'text-white', 'shadow-lg', 'shadow-primary/30');
            } else {
                ind.classList.remove('active');
                circle.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
                circle.classList.remove('bg-primary', 'text-white', 'shadow-lg', 'shadow-primary/30');
            }
        });

        // Update Progress Bars (lines between steps)
        progressBars.forEach((bar, index) => {
            // bar 0 connects step 1 and 2. It should be full if currentStep > 1
            if (currentStep > index + 1) {
                bar.classList.remove('w-0');
                bar.classList.add('w-full');
            } else {
                bar.classList.add('w-0');
                bar.classList.remove('w-full');
            }
        });

        // Button Visibility
        if (currentStep === 1) {
            btnBack.classList.add('hidden');
        } else {
            btnBack.classList.remove('hidden');
        }

        if (currentStep === totalSteps) {
            btnNext.classList.add('hidden');
            btnSubmit.classList.remove('hidden');
            updateReview();
        } else {
            btnNext.classList.remove('hidden');
            btnSubmit.classList.add('hidden');
        }
    };

    const updateReview = () => {
        const formData = new FormData(form);
        const name = formData.get('name') || 'New Strategy';
        const market = formData.get('market') || 'Crypto';
        const timeframe = formData.get('timeframe') || '15m';

        document.getElementById('review-name').textContent = name;
        document.getElementById('review-market').textContent = market.charAt(0).toUpperCase() + market.slice(1);
        document.getElementById('review-timeframe').textContent = timeframe;
    };

    // Event Listeners
    btnNext.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            // Simple validation for step 1
            if (currentStep === 1) {
                const nameInput = form.querySelector('input[name="name"]');
                if (!nameInput.value.trim()) {
                    nameInput.classList.add('border-rose-500', 'ring-1', 'ring-rose-500');
                    nameInput.focus();
                    return;
                } else {
                    nameInput.classList.remove('border-rose-500', 'ring-1', 'ring-rose-500');
                }
            }

            currentStep++;
            updateUI();
        }
    });

    btnBack.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateUI();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Strategy Created Successfully! Redirecting to library...');
        window.location.href = 'strategy_library.html';
    });

    // Initialize
    updateUI();
});

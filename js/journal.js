document.addEventListener('DOMContentLoaded', () => {
    // Mock journal entries
    const journalEntries = [
        { id: 1, title: 'RELIANCE Breakout Trade', symbol: 'RELIANCE', side: 'long', pnl: '+₹3,220', date: 'Feb 5', notes: 'Entered on breakout above ₹2,450 resistance. Strong volume confirmation. Exited at ₹2,485 on target.' },
        { id: 2, title: 'TATASTEEL Short - Overbought', symbol: 'TATASTEEL', side: 'short', pnl: '+₹1,340', date: 'Feb 4', notes: 'RSI was above 75, clear overbought. Shorted at ₹142, covered at ₹138.' },
        { id: 3, title: 'INFY Earnings Play', symbol: 'INFY', side: 'long', pnl: '-₹1,870', date: 'Feb 3', notes: 'Tried to play earnings momentum but got stopped out. Lesson: reduce position size around earnings.' },
    ];

    let selectedEntry = null;

    const listContainer = document.getElementById('journal-list');
    const titleInput = document.getElementById('entry-title');
    const symbolInput = document.getElementById('entry-symbol');
    const sideSelect = document.getElementById('entry-side');
    const pnlInput = document.getElementById('entry-pnl');
    const notesTextarea = document.getElementById('entry-notes');
    const newEntryBtn = document.getElementById('new-entry-btn');
    const saveEntryBtn = document.getElementById('save-entry-btn');

    const renderList = () => {
        listContainer.innerHTML = journalEntries.map(entry => `
            <div class="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedEntry?.id === entry.id ? 'bg-primary/10 dark:bg-primary/20' : ''}" data-id="${entry.id}">
                <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold text-sm text-slate-900 dark:text-white">${entry.title}</span>
                    <span class="text-xs font-mono ${entry.pnl.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}">${entry.pnl}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span>${entry.symbol}</span>
                    <span>•</span>
                    <span class="${entry.side === 'long' ? 'text-emerald-500' : 'text-rose-500'}">${entry.side.charAt(0).toUpperCase() + entry.side.slice(1)}</span>
                    <span>•</span>
                    <span>${entry.date}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners
        listContainer.querySelectorAll('[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id);
                selectedEntry = journalEntries.find(e => e.id === id);
                populateEditor();
                renderList(); // Re-render to update selection highlight
            });
        });
    };

    const populateEditor = () => {
        if (!selectedEntry) {
            titleInput.value = '';
            symbolInput.value = '';
            sideSelect.value = 'long';
            pnlInput.value = '';
            notesTextarea.value = '';
            return;
        }
        titleInput.value = selectedEntry.title;
        symbolInput.value = selectedEntry.symbol;
        sideSelect.value = selectedEntry.side;
        pnlInput.value = selectedEntry.pnl;
        notesTextarea.value = selectedEntry.notes;
    };

    newEntryBtn.addEventListener('click', () => {
        selectedEntry = null;
        populateEditor();
        renderList();
        titleInput.focus();
    });

    saveEntryBtn.addEventListener('click', () => {
        const title = titleInput.value.trim() || 'Untitled Entry';
        const symbol = symbolInput.value.trim().toUpperCase() || '—';
        const side = sideSelect.value;
        const pnl = pnlInput.value.trim() || '₹0';
        const notes = notesTextarea.value.trim();

        if (selectedEntry) {
            // Update existing
            selectedEntry.title = title;
            selectedEntry.symbol = symbol;
            selectedEntry.side = side;
            selectedEntry.pnl = pnl;
            selectedEntry.notes = notes;
        } else {
            // Create new
            const newEntry = {
                id: Date.now(),
                title,
                symbol,
                side,
                pnl,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                notes
            };
            journalEntries.unshift(newEntry);
            selectedEntry = newEntry;
        }
        renderList();
        alert('Entry saved!');
    });

    // Initial render
    if (journalEntries.length > 0) {
        selectedEntry = journalEntries[0];
        populateEditor();
    }
    renderList();
});

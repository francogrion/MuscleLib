let searchTimeoutId;
let searchController;

async function searchExercises(query) {
    try {
        if (searchController) {
            searchController.abort();
        }

        searchController = new AbortController();
        const response = await fetch(`${apiBaseUrl}/api/exercises/search?lang=pt&query=${encodeURIComponent(query)}`, {
            signal: searchController.signal,
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.exercises && data.exercises.length > 0) {
            document.dispatchEvent(new CustomEvent('searchResults', { detail: data.exercises }));
        } else {
            console.warn('Nenhum exercício encontrado para a pesquisa:', query);
            clearSearchResults();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        console.error('Erro ao buscar exercícios:', error);
        clearSearchResults();
    } finally {
        searchController = null;
    }
}

function clearSearchResults() {
    document.dispatchEvent(new CustomEvent('clearSearchResults'));
}

function createSearchBar() {
    const searchPlaceholder = document.getElementById('search-placeholder');

    if (!searchPlaceholder) {
        console.error('Placeholder da barra de pesquisa não encontrado!');
        return;
    }

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Pesquisar exercícios...';
    searchInput.className = 'search-input';

    const searchIcon = document.createElement('i');
    searchIcon.className = 'fas fa-search search-icon';

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchIcon);
    searchPlaceholder.appendChild(searchContainer);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        clearTimeout(searchTimeoutId);

        if (!query) {
            if (searchController) {
                searchController.abort();
            }

            clearSearchResults();
            return;
        }

        searchTimeoutId = window.setTimeout(() => {
            searchExercises(query);
        }, 250);
    });
}

createSearchBar();

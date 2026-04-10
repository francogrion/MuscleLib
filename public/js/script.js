let currentPage = 0;
const exercisesPerPage = 50;
let loading = false;
let isShowingSearchResults = false;
const apiBaseUrl = 'https://libapi.vercel.app';
let renderedCardCount = 0;

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) {
            return;
        }

        entry.target.classList.add('show');
        revealObserver.unobserve(entry.target);
    });
}, {
    threshold: 0.15,
});

async function fetchExercises(page = 0, limit = exercisesPerPage) {
    try {
        loading = true;
        const response = await fetch(`${apiBaseUrl}/api/exercises?lang=pt&page=${page}&limit=${limit}`);

        if (!response.ok) {
            throw new Error(`Erro na resposta da API: ${response.statusText}`);
        }

        const exercises = await response.json();

        if (exercises.length > 0) {
            displayExercises(exercises);
            currentPage++;
        }

        loading = false;
    } catch (err) {
        console.error('Erro ao buscar exercícios:', err);
        loading = false;
    }
}

function resetExercisesContainer() {
    const container = document.getElementById('exercises-container');

    if (!container) {
        return null;
    }

    container.querySelectorAll('.exercise-card').forEach((card) => {
        revealObserver.unobserve(card);
    });

    container.replaceChildren();
    renderedCardCount = 0;

    return container;
}

function displayExercises(exercises) {
    const container = document.getElementById('exercises-container');

    if (!container) {
        return;
    }

    exercises.forEach((exercise, index) => {
        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';

        if (exercise.images && exercise.images.length > 0) {
            const img = document.createElement('img');
            const primaryImage = `${apiBaseUrl}/${exercise.images[0]}`;
            const secondaryImage = exercise.images[1] ? `${apiBaseUrl}/${exercise.images[1]}` : null;

            img.src = primaryImage;
            img.alt = exercise.name;
            img.loading = 'lazy';
            img.decoding = 'async';
            exerciseCard.appendChild(img);

            if (secondaryImage) {
                const showSecondaryImage = () => {
                    img.src = secondaryImage;
                };

                const showPrimaryImage = () => {
                    img.src = primaryImage;
                };

                exerciseCard.addEventListener('mouseenter', showSecondaryImage);
                exerciseCard.addEventListener('mouseleave', showPrimaryImage);
                exerciseCard.addEventListener('focusin', showSecondaryImage);
                exerciseCard.addEventListener('focusout', showPrimaryImage);
            }
        }

        const name = document.createElement('h3');
        name.textContent = exercise.name;
        exerciseCard.appendChild(name);

        const details = document.createElement('p');
        details.textContent = `Nível: ${exercise.level} | Categoria: ${exercise.category}`;
        exerciseCard.appendChild(details);

        const force = document.createElement('p');
        force.textContent = `Força: ${exercise.force}`;
        exerciseCard.appendChild(force);

        const equipment = document.createElement('p');
        equipment.textContent = `Equipamento: ${exercise.equipment || 'Nenhum'}`;
        exerciseCard.appendChild(equipment);

        const primaryMuscles = document.createElement('p');
        primaryMuscles.textContent = `Músculo Principal: ${exercise.primaryMuscles.join(', ')}`;
        exerciseCard.appendChild(primaryMuscles);

        const secondaryMuscles = document.createElement('p');
        secondaryMuscles.textContent = `Músculos Secundários: ${exercise.secondaryMuscles && Array.isArray(exercise.secondaryMuscles) && exercise.secondaryMuscles.length > 0
            ? exercise.secondaryMuscles.join(', ')
            : 'Nenhum'
            }`;
        exerciseCard.appendChild(secondaryMuscles);

        const collapseId = `collapseInstructions-${renderedCardCount + index}`;

        const collapseButton = document.createElement('button');
        collapseButton.className = 'collapse-btn btn btn-primary collapse-toggle d-flex justify-content-between align-items-center';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-bs-toggle', 'collapse');
        collapseButton.setAttribute('data-bs-target', `#${collapseId}`);
        collapseButton.innerHTML = 'Mostrar Instruções <i class="collapse-icon fas fa-plus"></i>';
        exerciseCard.appendChild(collapseButton);

        const collapseDiv = document.createElement('div');
        collapseDiv.className = 'collapse';
        collapseDiv.id = collapseId;

        const instructions = document.createElement('div');
        instructions.className = 'card card-body';

        if (exercise.instructions && Array.isArray(exercise.instructions)) {
            exercise.instructions.forEach((step) => {
                const p = document.createElement('p');
                p.textContent = step;
                instructions.appendChild(p);
            });
        }

        collapseDiv.appendChild(instructions);
        exerciseCard.appendChild(collapseDiv);

        collapseButton.addEventListener('click', () => {
            const icon = collapseButton.querySelector('.collapse-icon');

            if (collapseDiv.classList.contains('show')) {
                icon.classList.replace('fa-minus', 'fa-plus');
            } else {
                icon.classList.replace('fa-plus', 'fa-minus');
            }
        });

        collapseDiv.addEventListener('shown.bs.collapse', () => {
            const icon = collapseButton.querySelector('.collapse-icon');
            icon.classList.replace('fa-plus', 'fa-minus');
        });

        collapseDiv.addEventListener('hidden.bs.collapse', () => {
            const icon = collapseButton.querySelector('.collapse-icon');
            icon.classList.replace('fa-minus', 'fa-plus');
        });

        container.appendChild(exerciseCard);
        revealObserver.observe(exerciseCard);
    });

    renderedCardCount += exercises.length;
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !loading && !isShowingSearchResults) {
        fetchExercises(currentPage);
    }
});

document.addEventListener('searchResults', (e) => {
    isShowingSearchResults = true;
    resetExercisesContainer();
    displayExercises(e.detail);
});

document.addEventListener('clearSearchResults', () => {
    isShowingSearchResults = false;
    resetExercisesContainer();
    currentPage = 0;
    fetchExercises(0);
});

fetchExercises();

let currentPage = 0;
const exercisesPerPage = 50;
let loading = false;
let isShowingSearchResults = false;
const apiBaseUrl = 'https://libapi.vercel.app';
let renderedCardCount = 0;
let filterOptionsRequestId = 0;
const storedLanguage =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("musclelib-language")
    : null;
let currentLanguage = storedLanguage || "pt";
const activeFilters = {
  primaryMuscles: "",
  secondaryMuscles: "",
  level: "",
  force: "",
  equipment: "",
  category: "",
};

const filterFields = Object.keys(activeFilters);

const uiText = {
  pt: {
    controlsKicker: "Biblioteca",
    controlsTitle: "Exercicios",
    languageLabel: "Idioma",
    muscleLabel: "Musculo",
    secondaryMuscleLabel: "Musculo secundario",
    difficultyLabel: "Dificuldade",
    equipmentLabel: "Equipamento",
    categoryLabel: "Categoria",
    forceLabel: "Forca",
    allMuscles: "Todos os musculos",
    allSecondaryMuscles: "Todos os secundarios",
    allDifficulties: "Todas as dificuldades",
    allEquipment: "Todos os equipamentos",
    allCategories: "Todas as categorias",
    allForces: "Todas as forcas",
    clearFilters: "Limpar filtros",
    loadingMore: "Carregando mais exercicios...",
    loadingOptions: "Carregando filtros...",
    noResults: "Nenhum exercicio encontrado com estes filtros.",
    activeFilters: "Filtros ativos",
    level: "Nivel",
    category: "Categoria",
    force: "Forca",
    equipment: "Equipamento",
    primaryMuscles: "Musculo principal",
    secondaryMuscles: "Musculos secundarios",
    none: "Nenhum",
    showInstructions: "Mostrar instrucoes",
  },
  en: {
    controlsKicker: "Library",
    controlsTitle: "Exercises",
    languageLabel: "Language",
    muscleLabel: "Muscle",
    secondaryMuscleLabel: "Secondary muscle",
    difficultyLabel: "Difficulty",
    equipmentLabel: "Equipment",
    categoryLabel: "Category",
    forceLabel: "Force",
    allMuscles: "All muscles",
    allSecondaryMuscles: "All secondary muscles",
    allDifficulties: "All difficulties",
    allEquipment: "All equipment",
    allCategories: "All categories",
    allForces: "All forces",
    clearFilters: "Clear filters",
    loadingMore: "Loading more exercises...",
    loadingOptions: "Loading filters...",
    noResults: "No exercises found with these filters.",
    activeFilters: "Active filters",
    level: "Level",
    category: "Category",
    force: "Force",
    equipment: "Equipment",
    primaryMuscles: "Primary muscle",
    secondaryMuscles: "Secondary muscles",
    none: "None",
    showInstructions: "Show instructions",
  },
};

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

function getCurrentLanguage() {
  return currentLanguage;
}

function getActiveFilters() {
  return { ...activeFilters };
}

function getText(key, language = currentLanguage) {
  return uiText[language][key] || uiText.en[key] || key;
}

function buildQueryString(params) {
  return Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}

function buildExerciseUrl(page = 0, limit = exercisesPerPage) {
  const params = {
    lang: currentLanguage,
    page,
    limit,
  };

  filterFields.forEach((field) => {
    if (activeFilters[field]) {
      params[field] = activeFilters[field];
    }
  });

  return `${apiBaseUrl}/api/exercises?${buildQueryString(params)}`;
}

function updateLoadingText() {
  const loadingIndicator = document.getElementById("loading-indicator");

  if (loadingIndicator) {
    loadingIndicator.textContent = getText("loadingMore");
  }
}

function updateFilterStatus() {
  const status = document.getElementById("filter-status");

  if (!status) {
    return;
  }

  const count = filterFields.filter((field) => activeFilters[field]).length;
  status.textContent = count > 0 ? `${getText("activeFilters")}: ${count}` : "";
}

function translateStaticUi() {
  document.documentElement.lang = currentLanguage === "pt" ? "pt-br" : "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    element.textContent = getText(key);
  });
  updateLoadingText();
  updateFilterStatus();
}

function formatOptionLabel(value) {
  if (!value) {
    return "";
  }

  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeLocalizedValue(value, language = currentLanguage) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[language] || value.en || value.pt || "";
  }

  return value;
}

function populateFilterSelect(field, values) {
  const select = document.querySelector(`[data-filter="${field}"]`);

  if (!select) {
    return;
  }

  const selectedValue = activeFilters[field];
  const firstOption = select.querySelector('option[value=""]');
  select.replaceChildren(firstOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = formatOptionLabel(value);
    select.appendChild(option);
  });

  select.value = values.includes(selectedValue) ? selectedValue : "";
  activeFilters[field] = select.value;
}

function clearFilterOptions() {
  filterFields.forEach((field) => {
    const select = document.querySelector(`[data-filter="${field}"]`);

    if (!select) {
      return;
    }

    const firstOption = select.querySelector('option[value=""]');

    if (firstOption) {
      select.replaceChildren(firstOption);
    }

    select.value = "";
    activeFilters[field] = "";
  });
}

async function loadFilterOptions() {
  const requestId = ++filterOptionsRequestId;
  const language = currentLanguage;
  const status = document.getElementById("filter-status");

  if (status) {
    status.textContent = getText("loadingOptions", language);
  }

  try {
    const params = {
      lang: language,
    };
    const response = await fetch(
      `${apiBaseUrl}/api/exercises/filters?${buildQueryString(params)}`,
    );

    if (!response.ok) {
      throw new Error(`Erro na resposta da API: ${response.statusText}`);
    }

    const filterOptions = await response.json();

    if (requestId !== filterOptionsRequestId || language !== currentLanguage) {
      return;
    }

    filterFields.forEach((field) =>
      populateFilterSelect(field, filterOptions[field] || []),
    );
  } catch (err) {
    console.error("Erro ao carregar filtros:", err);
  } finally {
    if (requestId === filterOptionsRequestId && language === currentLanguage) {
      updateFilterStatus();
    }
  }
}

async function fetchExercises(page = 0, limit = exercisesPerPage) {
    try {
        loading = true;
        const response = await fetch(buildExerciseUrl(page, limit));

        if (response.status === 404) {
          if (page === 0) {
            showEmptyState();
          }

          loading = false;
          return;
        }

        if (!response.ok) {
            throw new Error(`Erro na resposta da API: ${response.statusText}`);
        }

        const exercises = await response.json();

        if (exercises.length > 0) {
          displayExercises(exercises);
          currentPage++;
        } else if (page === 0) {
          showEmptyState();
        }

        loading = false;
    } catch (err) {
        console.error("Erro ao buscar exercicios:", err);
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

function showEmptyState() {
  const container = resetExercisesContainer();

  if (!container) {
    return;
  }

  const emptyState = document.createElement("p");
  emptyState.className = "empty-state";
  emptyState.textContent = getText("noResults");
  container.appendChild(emptyState);
}

function formatList(value) {
  const normalizedValue = normalizeLocalizedValue(value);

  return Array.isArray(normalizedValue) && normalizedValue.length > 0
    ? normalizedValue.map(normalizeLocalizedValue).join(", ")
    : getText("none");
}

function matchesActiveFilters(exercise) {
  return filterFields.every((field) => {
    if (!activeFilters[field]) {
      return true;
    }

    const value = normalizeLocalizedValue(exercise[field]);

    if (Array.isArray(value)) {
      return value.some(
        (item) => item.toLowerCase() === activeFilters[field].toLowerCase(),
      );
    }

    return (
      typeof value === "string" &&
      value.toLowerCase() === activeFilters[field].toLowerCase()
    );
  });
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
            const primaryImage = `${apiBaseUrl}/exercises/${exercise.images[0]}`;
            const secondaryImage = exercise.images[1] ? `${apiBaseUrl}/exercises/${exercise.images[1]}` : null;

            img.src = primaryImage;
            img.alt = normalizeLocalizedValue(exercise.name);
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
        name.textContent = normalizeLocalizedValue(exercise.name);
        exerciseCard.appendChild(name);

        const details = document.createElement('p');
        details.textContent = `${getText("level")}: ${normalizeLocalizedValue(exercise.level) || getText("none")} | ${getText("category")}: ${normalizeLocalizedValue(exercise.category) || getText("none")}`;
        exerciseCard.appendChild(details);

        const force = document.createElement('p');
        force.textContent = `${getText("force")}: ${normalizeLocalizedValue(exercise.force) || getText("none")}`;
        exerciseCard.appendChild(force);

        const equipment = document.createElement('p');
        equipment.textContent = `${getText("equipment")}: ${normalizeLocalizedValue(exercise.equipment) || getText("none")}`;
        exerciseCard.appendChild(equipment);

        const primaryMuscles = document.createElement('p');
        primaryMuscles.textContent = `${getText("primaryMuscles")}: ${formatList(exercise.primaryMuscles)}`;
        exerciseCard.appendChild(primaryMuscles);

        const secondaryMuscles = document.createElement('p');
        secondaryMuscles.textContent = `${getText("secondaryMuscles")}: ${formatList(exercise.secondaryMuscles)}`;
        exerciseCard.appendChild(secondaryMuscles);

        const collapseId = `collapseInstructions-${renderedCardCount + index}`;

        const collapseButton = document.createElement('button');
        collapseButton.className = 'collapse-btn btn btn-primary collapse-toggle d-flex justify-content-between align-items-center';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-bs-toggle', 'collapse');
        collapseButton.setAttribute('data-bs-target', `#${collapseId}`);
        collapseButton.innerHTML = `${getText("showInstructions")} <i class="collapse-icon fas fa-plus"></i>`;
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

function reloadExercises() {
  isShowingSearchResults = false;
  resetExercisesContainer();
  currentPage = 0;
  fetchExercises(0);
}

function initFilterControls() {
  const languageSelect = document.getElementById("language-select");

  if (!languageSelect) {
    return;
  }

  languageSelect.value = currentLanguage;
  translateStaticUi();
  loadFilterOptions();

  languageSelect.addEventListener("change", () => {
    currentLanguage = languageSelect.value;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("musclelib-language", currentLanguage);
    }
    clearFilterOptions();
    translateStaticUi();
    loadFilterOptions();
    document.dispatchEvent(
      new CustomEvent("languageChanged", { detail: currentLanguage }),
    );
    reloadExercises();
  });

  document.querySelectorAll("[data-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      activeFilters[select.dataset.filter] = select.value;
      updateFilterStatus();
      reloadExercises();
    });
  });

  const clearButton = document.getElementById("clear-filters");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      filterFields.forEach((field) => {
        activeFilters[field] = "";
        const select = document.querySelector(`[data-filter="${field}"]`);

        if (select) {
          select.value = "";
        }
      });
      updateFilterStatus();
      reloadExercises();
    });
  }
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !loading && !isShowingSearchResults) {
        fetchExercises(currentPage);
    }
});

document.addEventListener('searchResults', (e) => {
    isShowingSearchResults = true;
    resetExercisesContainer();

    const filteredResults = e.detail.filter(matchesActiveFilters);

    if (filteredResults.length > 0) {
      displayExercises(filteredResults);
    } else {
      showEmptyState();
    }
});

document.addEventListener('clearSearchResults', () => {
    reloadExercises();
});

initFilterControls();
fetchExercises();

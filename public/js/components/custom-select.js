class CustomSelect {
  static instances = [];

  static refreshAll() {
    CustomSelect.instances.forEach((cs) => cs.refresh());
  }

  static refreshByFilter(field) {
    const sel = document.querySelector(`[data-filter="${field}"]`);
    if (sel && sel._customSelect) sel._customSelect.refresh();
  }

  constructor(select) {
    this.select = select;
    this.selectedValue = select.value;
    this.isOpen = false;
    this.build();
    this.bind();
    select._customSelect = this;
    CustomSelect.instances.push(this);
  }

  build() {
    this.select.style.display = "none";

    this.wrapper = document.createElement("div");
    this.wrapper.className = "custom-select-wrapper";

    this.trigger = document.createElement("button");
    this.trigger.className = "custom-select-trigger";
    this.trigger.type = "button";
    this.trigger.setAttribute("aria-haspopup", "listbox");
    this.trigger.setAttribute("aria-expanded", "false");

    this.valueDisplay = document.createElement("span");
    this.valueDisplay.className = "custom-select-value";

    const arrow = document.createElement("i");
    arrow.className = "fas fa-chevron-down custom-select-arrow";

    this.trigger.appendChild(this.valueDisplay);
    this.trigger.appendChild(arrow);

    this.dropdown = document.createElement("div");
    this.dropdown.className = "custom-select-dropdown";
    this.dropdown.setAttribute("role", "listbox");

    this.searchWrap = document.createElement("div");
    this.searchWrap.className = "custom-select-search";

    const searchIcon = document.createElement("i");
    searchIcon.className = "fas fa-search custom-select-search-icon";

    this.searchInput = document.createElement("input");
    this.searchInput.className = "custom-select-search-input";
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Buscar...";
    this.searchInput.setAttribute("data-i18n-placeholder", "searchOptions");

    this.searchWrap.appendChild(searchIcon);
    this.searchWrap.appendChild(this.searchInput);

    this.optionsList = document.createElement("ul");
    this.optionsList.className = "custom-select-options";

    this.dropdown.appendChild(this.searchWrap);
    this.dropdown.appendChild(this.optionsList);

    this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
    this.wrapper.appendChild(this.trigger);
    this.wrapper.appendChild(this.dropdown);

    this.refresh();
  }

  refresh() {
    this.optionsList.innerHTML = "";
    this.optionItems = [];
    this.selectedValue = this.select.value;

    const nativeOptions = this.select.querySelectorAll("option");
    nativeOptions.forEach((opt) => {
      const li = document.createElement("li");
      li.className = "custom-select-option";
      li.dataset.value = opt.value;
      li.textContent = opt.textContent;
      li.dataset.searchText = (opt.textContent || "").toLowerCase();
      if (opt.value === this.selectedValue) li.classList.add("selected");
      this.optionsList.appendChild(li);
      this.optionItems.push(li);
    });

    this.updateTriggerText();
  }

  updateTriggerText() {
    const opt = this.select.querySelector(
      `option[value="${CSS.escape(this.selectedValue)}"]`
    );
    this.valueDisplay.textContent = opt ? opt.textContent : "";
  }

  bind() {
    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.searchInput.addEventListener("input", () => this.filterOptions());

    this.optionsList.addEventListener("click", (e) => {
      const li = e.target.closest(".custom-select-option");
      if (li) this.selectOption(li.dataset.value);
    });

    document.addEventListener("click", (e) => {
      if (this.isOpen && !this.wrapper.contains(e.target)) this.close();
    });

    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.close();
        this.trigger.focus();
      }
      if (e.key === "Enter") {
        const visible = this.optionItems.filter((li) => !li.classList.contains("hidden"));
        if (visible.length > 0) {
          this.selectOption(visible[0].dataset.value);
        }
      }
    });

    this.trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this.open();
      }
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.dropdown.classList.add("open");
    this.trigger.classList.add("is-open");
    this.trigger.setAttribute("aria-expanded", "true");
    this.searchInput.value = "";
    this.filterOptions();
    this.positionDropdown();
    requestAnimationFrame(() => this.searchInput.focus());
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.dropdown.classList.remove("open");
    this.trigger.classList.remove("is-open");
    this.trigger.setAttribute("aria-expanded", "false");
  }

  positionDropdown() {
    this.dropdown.style.top = "calc(100% + 4px)";
    this.dropdown.style.bottom = "auto";
    this.dropdown.style.maxHeight = "none";
  }

  filterOptions() {
    const query = this.searchInput.value.toLowerCase().trim();
    this.optionItems.forEach((li) => {
      li.classList.toggle("hidden", !!query && !li.dataset.searchText.includes(query));
    });
  }

  selectOption(value) {
    if (this.selectedValue === value) {
      this.close();
      return;
    }
    this.selectedValue = value;
    this.select.value = value;
    this.optionItems.forEach((li) => {
      li.classList.toggle("selected", li.dataset.value === value);
    });
    this.updateTriggerText();
    this.select.dispatchEvent(new Event("change", { bubbles: true }));
    this.close();
  }

  destroy() {
    const idx = CustomSelect.instances.indexOf(this);
    if (idx > -1) CustomSelect.instances.splice(idx, 1);
    this.wrapper.remove();
    this.select.style.display = "";
    delete this.select._customSelect;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-filter]").forEach((sel) => {
    if (!sel._customSelect) new CustomSelect(sel);
  });
});

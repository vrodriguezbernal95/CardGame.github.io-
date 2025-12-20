// Componente Select con Buscador Integrado
class SearchableSelect {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options.options || []; // Array de {id, text, ...otherFields}
        this.placeholder = options.placeholder || 'Selecciona una opción';
        this.searchPlaceholder = options.searchPlaceholder || 'Buscar...';
        this.noResultsText = options.noResultsText || 'No se encontraron resultados';
        this.onChange = options.onChange || null;

        this.selectedValue = null;
        this.selectedText = null;
        this.filteredOptions = [...this.options];
        this.isOpen = false;

        this.init();
    }

    init() {
        // Ocultar el elemento original
        this.element.style.display = 'none';

        // Crear estructura del componente
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'searchable-select';
        this.wrapper.style.cssText = 'position: relative; width: 100%;';

        // Botón principal (simula el select)
        this.selectButton = document.createElement('button');
        this.selectButton.type = 'button';
        this.selectButton.className = 'searchable-select-button';
        this.selectButton.style.cssText = `
            width: 100%;
            padding: 0.75rem 2.5rem 0.75rem 1rem;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            text-align: left;
            cursor: pointer;
            font-size: 1rem;
            position: relative;
            transition: all 0.2s;
        `;
        this.selectButton.textContent = this.placeholder;

        // Flecha
        const arrow = document.createElement('span');
        arrow.innerHTML = '▼';
        arrow.style.cssText = `
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            font-size: 0.75rem;
            color: #666;
            transition: transform 0.2s;
        `;
        this.selectButton.appendChild(arrow);
        this.arrow = arrow;

        // Dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'searchable-select-dropdown';
        this.dropdown.style.cssText = `
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: none;
            max-height: 300px;
            overflow: hidden;
        `;

        // Campo de búsqueda
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = this.searchPlaceholder;
        this.searchInput.className = 'searchable-select-search';
        this.searchInput.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border: none;
            border-bottom: 1px solid #eee;
            font-size: 0.95rem;
            outline: none;
            box-sizing: border-box;
        `;

        // Lista de opciones
        this.optionsList = document.createElement('div');
        this.optionsList.className = 'searchable-select-options';
        this.optionsList.style.cssText = `
            max-height: 240px;
            overflow-y: auto;
        `;

        // Ensamblar dropdown
        this.dropdown.appendChild(this.searchInput);
        this.dropdown.appendChild(this.optionsList);

        // Ensamblar wrapper
        this.wrapper.appendChild(this.selectButton);
        this.wrapper.appendChild(this.dropdown);

        // Insertar después del elemento original
        this.element.parentNode.insertBefore(this.wrapper, this.element.nextSibling);

        // Event listeners
        this.selectButton.addEventListener('click', () => this.toggle());
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Renderizar opciones iniciales
        this.renderOptions();
    }

    setOptions(options) {
        this.options = options.sort((a, b) => a.text.localeCompare(b.text));
        this.filteredOptions = [...this.options];
        this.renderOptions();
    }

    renderOptions() {
        this.optionsList.innerHTML = '';

        if (this.filteredOptions.length === 0) {
            const noResults = document.createElement('div');
            noResults.style.cssText = 'padding: 1rem; text-align: center; color: #999;';
            noResults.textContent = this.noResultsText;
            this.optionsList.appendChild(noResults);
            return;
        }

        this.filteredOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'searchable-select-option';
            optionEl.style.cssText = `
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: background 0.15s;
                border-bottom: 1px solid #f5f5f5;
            `;
            optionEl.textContent = option.text;
            optionEl.dataset.value = option.id;

            // Marcar si está seleccionado
            if (this.selectedValue == option.id) {
                optionEl.style.backgroundColor = '#e8f4f8';
                optionEl.style.fontWeight = '600';
            }

            optionEl.addEventListener('mouseenter', () => {
                if (this.selectedValue != option.id) {
                    optionEl.style.backgroundColor = '#f8f9fa';
                }
            });

            optionEl.addEventListener('mouseleave', () => {
                if (this.selectedValue != option.id) {
                    optionEl.style.backgroundColor = 'white';
                }
            });

            optionEl.addEventListener('click', () => {
                this.selectOption(option);
            });

            this.optionsList.appendChild(optionEl);
        });
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        if (searchTerm === '') {
            this.filteredOptions = [...this.options];
        } else {
            this.filteredOptions = this.options.filter(option =>
                option.text.toLowerCase().includes(searchTerm)
            );
        }

        this.renderOptions();
    }

    selectOption(option) {
        this.selectedValue = option.id;
        this.selectedText = option.text;

        // Actualizar botón
        const textNode = this.selectButton.childNodes[0];
        textNode.textContent = option.text;

        // Actualizar elemento original
        this.element.value = option.id;

        // Disparar evento change
        const event = new Event('change', { bubbles: true });
        this.element.dispatchEvent(event);

        if (this.onChange) {
            this.onChange(option);
        }

        this.close();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.dropdown.style.display = 'block';
        this.arrow.style.transform = 'translateY(-50%) rotate(180deg)';
        this.selectButton.style.borderColor = 'var(--primary-color, #4a90e2)';

        // Focus en el input de búsqueda
        setTimeout(() => this.searchInput.focus(), 50);

        // Reset búsqueda
        this.searchInput.value = '';
        this.filteredOptions = [...this.options];
        this.renderOptions();
    }

    close() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
        this.arrow.style.transform = 'translateY(-50%) rotate(0deg)';
        this.selectButton.style.borderColor = '#ddd';
    }

    getValue() {
        return this.selectedValue;
    }

    setValue(value, text) {
        const option = this.options.find(opt => opt.id == value);
        if (option) {
            this.selectOption(option);
        } else if (text) {
            // Si no está en las opciones pero tenemos el texto
            this.selectedValue = value;
            this.selectedText = text;
            const textNode = this.selectButton.childNodes[0];
            textNode.textContent = text;
            this.element.value = value;
        }
    }

    clear() {
        this.selectedValue = null;
        this.selectedText = null;
        const textNode = this.selectButton.childNodes[0];
        textNode.textContent = this.placeholder;
        this.element.value = '';
        this.close();
    }

    destroy() {
        this.wrapper.remove();
        this.element.style.display = '';
    }
}

// Estilos adicionales
const style = document.createElement('style');
style.textContent = `
    .searchable-select-options::-webkit-scrollbar {
        width: 8px;
    }

    .searchable-select-options::-webkit-scrollbar-track {
        background: #f1f1f1;
    }

    .searchable-select-options::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    .searchable-select-options::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .searchable-select-button:hover {
        border-color: var(--primary-color, #4a90e2) !important;
    }

    .searchable-select-option:last-child {
        border-bottom: none !important;
    }
`;
document.head.appendChild(style);
